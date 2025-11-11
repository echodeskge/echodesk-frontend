"use client";

import { useState, useEffect } from "react";
import { Board, User, TenantGroup } from "@/api/generated/interfaces";
import { boardsRetrieve, boardsPartialUpdate } from "@/api/generated/api";
import { ticketService } from "@/services/ticketService";
import { useTenantGroups } from "@/hooks/api/useTenant";
import MultiUserAssignment, { AssignmentData } from "./MultiUserAssignment";
import MultiGroupSelection from "./MultiGroupSelection";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Info, CheckCircle2, XCircle, Lock, BookOpen, Shield, UserCog } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BoardUserManagerProps {
  boardId: number | null;
  open: boolean;
  onClose: () => void;
  onSave?: () => void;
}

export default function BoardUserManager({
  boardId,
  open,
  onClose,
  onSave,
}: BoardUserManagerProps) {
  const [board, setBoard] = useState<Board | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [orderUserIds, setOrderUserIds] = useState<number[]>([]);
  const [boardUserIds, setBoardUserIds] = useState<number[]>([]);
  const [assignedGroupIds, setAssignedGroupIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState("order-users");

  // Use React Query hook for tenant groups - only fetch when dialog is open
  const { data: groupsData } = useTenantGroups({ enabled: open && !!boardId });
  const groups = groupsData?.results || [];

  useEffect(() => {
    if (open && boardId) {
      fetchData();
    }
  }, [boardId, open]);

  const fetchData = async () => {
    if (!boardId) return;

    try {
      setLoading(true);
      setError("");

      const [boardResult, usersResult] = await Promise.all([
        boardsRetrieve(boardId.toString()),
        ticketService.getUsers(),
      ]);

      setBoard(boardResult);
      setUsers(usersResult.results || []);
      // Groups are now loaded via React Query hook

      // Set current order users
      const currentOrderUserIds = (boardResult.order_users || []).map(user => user.id);
      setOrderUserIds(currentOrderUserIds);

      // Set current board users
      const currentBoardUserIds = (boardResult.board_users || []).map(user => user.id);
      setBoardUserIds(currentBoardUserIds);

      // Set current assigned groups
      const currentAssignedGroupIds = (boardResult.board_groups || []).map(group => group.id);
      setAssignedGroupIds(currentAssignedGroupIds);
    } catch (err: any) {
      console.error("Failed to fetch data:", err);
      setError(err.response?.data?.detail || "Failed to load board data");
    } finally {
      setLoading(false);
    }
  };

  const handleOrderUsersChange = (assignments: AssignmentData[]) => {
    const userIds = assignments.map(assignment => assignment.userId);
    setOrderUserIds(userIds);
  };

  const handleBoardUsersChange = (assignments: AssignmentData[]) => {
    const userIds = assignments.map(assignment => assignment.userId);
    setBoardUserIds(userIds);
  };

  const handleAssignedGroupsChange = (groupIds: number[]) => {
    setAssignedGroupIds(groupIds);
  };

  const handleSave = async () => {
    if (!board) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      await boardsPartialUpdate(board.id.toString(), {
        order_user_ids: orderUserIds,
        board_user_ids: boardUserIds,
        board_group_ids: assignedGroupIds
      });

      setSuccess("Board access settings updated successfully!");

      // Refresh board data to get updated info
      await fetchData();

      if (onSave) {
        onSave();
      }

      // Auto-close after successful save
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error("Failed to update board settings:", err);
      setError(err.response?.data?.detail || "Failed to update board settings");
    } finally {
      setSaving(false);
    }
  };

  const currentOrderAssignments: AssignmentData[] = orderUserIds.map(userId => ({
    userId,
    role: 'collaborator' as const
  }));

  const currentBoardUserAssignments: AssignmentData[] = boardUserIds.map(userId => ({
    userId,
    role: 'collaborator' as const
  }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[700px] max-h-[90vh] overflow-y-auto overflow-x-hidden">
        {loading ? (
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="text-center">
              <Spinner className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Loading board data...</p>
            </div>
          </div>
        ) : !board ? (
          <div className="p-8 text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-destructive">Failed to load board information</p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                <DialogTitle>Manage Board Access</DialogTitle>
              </div>
              <DialogDescription>
                Control who can access and create orders on <strong>{board.name}</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4 w-full">
              {/* Success/Error Messages */}
              {success && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    {success}
                  </AlertDescription>
                </Alert>
              )}

              {error && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Tabs for different access types */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="order-users" className="flex items-center gap-2">
                    <UserCog className="h-4 w-4" />
                    <span className="hidden sm:inline">Order Users</span>
                    <span className="sm:hidden">Orders</span>
                  </TabsTrigger>
                  <TabsTrigger value="board-users" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span className="hidden sm:inline">Board Users</span>
                    <span className="sm:hidden">Users</span>
                  </TabsTrigger>
                  <TabsTrigger value="board-groups" className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    <span className="hidden sm:inline">Board Groups</span>
                    <span className="sm:hidden">Groups</span>
                  </TabsTrigger>
                </TabsList>

                {/* Order Users Tab */}
                <TabsContent value="order-users" className="space-y-4 mt-4">
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Current Configuration:</p>
                        <div className="flex items-start gap-2">
                          {orderUserIds.length === 0 ? (
                            <>
                              <BookOpen className="h-4 w-4 mt-0.5 text-muted-foreground" />
                              <p className="text-sm text-muted-foreground">
                                No specific users selected - all users with order permissions can create orders
                              </p>
                            </>
                          ) : (
                            <>
                              <Lock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                              <p className="text-sm text-muted-foreground">
                                <Badge variant="secondary" className="mr-1">{orderUserIds.length}</Badge>
                                specific user{orderUserIds.length !== 1 ? 's' : ''} can create orders on this board
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="space-y-2">
                    <Label className="text-base">Authorized Order Users</Label>
                    <MultiUserAssignment
                      users={users}
                      selectedAssignments={currentOrderAssignments}
                      onChange={handleOrderUsersChange}
                      placeholder="Select users who can create orders..."
                    />
                  </div>

                  <Alert className="bg-blue-50 border-blue-200">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">
                      <p className="font-medium mb-2">How This Works:</p>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>If no users are selected, any user with "Orders" permission can create orders</li>
                        <li>If users are selected, only those users can create orders on this board</li>
                        <li>Users still need the "Orders" permission in their group to see the Orders menu</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                </TabsContent>

                {/* Board Users Tab */}
                <TabsContent value="board-users" className="space-y-4 mt-4">
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Current Configuration:</p>
                        <div className="flex items-start gap-2">
                          {boardUserIds.length === 0 ? (
                            <>
                              <BookOpen className="h-4 w-4 mt-0.5 text-muted-foreground" />
                              <p className="text-sm text-muted-foreground">
                                No users assigned - board visibility controlled by other settings
                              </p>
                            </>
                          ) : (
                            <>
                              <Lock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                              <p className="text-sm text-muted-foreground">
                                <Badge variant="secondary" className="mr-1">{boardUserIds.length}</Badge>
                                user{boardUserIds.length !== 1 ? 's' : ''} can access this board
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="space-y-2">
                    <Label className="text-base">Board Access Users</Label>
                    <MultiUserAssignment
                      users={users}
                      selectedAssignments={currentBoardUserAssignments}
                      onChange={handleBoardUsersChange}
                      placeholder="Select users who can access this board..."
                    />
                  </div>

                  <Alert className="bg-blue-50 border-blue-200">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">
                      <p className="font-medium mb-2">Board Visibility:</p>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>These users can view and access the board</li>
                        <li>Separate from "Order Users" who can create orders</li>
                        <li>Users in assigned groups can also see the board</li>
                        <li>If no users, no groups assigned: everyone can see the board</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                </TabsContent>

                {/* Board Groups Tab */}
                <TabsContent value="board-groups" className="space-y-4 mt-4">
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Current Configuration:</p>
                        <div className="flex items-start gap-2">
                          {assignedGroupIds.length === 0 ? (
                            <>
                              <BookOpen className="h-4 w-4 mt-0.5 text-muted-foreground" />
                              <p className="text-sm text-muted-foreground">
                                No groups assigned - board visible to everyone
                              </p>
                            </>
                          ) : (
                            <>
                              <Lock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                              <p className="text-sm text-muted-foreground">
                                <Badge variant="secondary" className="mr-1">{assignedGroupIds.length}</Badge>
                                group{assignedGroupIds.length !== 1 ? 's' : ''} - board restricted to group members only
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="space-y-2">
                    <Label className="text-base">Assigned Tenant Groups</Label>
                    <MultiGroupSelection
                      groups={groups}
                      selectedGroupIds={assignedGroupIds}
                      onChange={handleAssignedGroupsChange}
                      placeholder="Select groups who can access this board..."
                    />
                  </div>

                  <Alert className="bg-blue-50 border-blue-200">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">
                      <p className="font-medium mb-2">Group-Based Access:</p>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>If no groups AND no order users: everyone can see the board</li>
                        <li>If groups assigned: ONLY members of those groups can see the board</li>
                        <li>Users in "Order Users" tab can also see the board</li>
                        <li>Perfect for department/team-specific boards</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                </TabsContent>
              </Tabs>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={onClose}
                disabled={saving}
              >
                Cancel
              </Button>

              <Button
                onClick={handleSave}
                disabled={saving}
              >
                {saving && <Spinner className="mr-2 h-4 w-4" />}
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
