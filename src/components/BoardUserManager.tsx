"use client";

import { useState, useEffect } from "react";
import { Board, User } from "@/api/generated/interfaces";
import { boardsRetrieve, boardsPartialUpdate } from "@/api/generated/api";
import { ticketService } from "@/services/ticketService";
import MultiUserAssignment, { AssignmentData } from "./MultiUserAssignment";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Users, Info, CheckCircle2, XCircle, Lock, BookOpen } from "lucide-react";
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
        ticketService.getUsers()
      ]);

      setBoard(boardResult);
      setUsers(usersResult.results || []);

      // Set current order users
      const currentOrderUserIds = (boardResult.order_users || []).map(user => user.id);
      setOrderUserIds(currentOrderUserIds);
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

  const handleSave = async () => {
    if (!board) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      await boardsPartialUpdate(board.id.toString(), {
        order_user_ids: orderUserIds
      });

      setSuccess("Order users updated successfully!");

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
      console.error("Failed to update order users:", err);
      setError(err.response?.data?.detail || "Failed to update order users");
    } finally {
      setSaving(false);
    }
  };

  const currentOrderAssignments: AssignmentData[] = orderUserIds.map(userId => ({
    userId,
    role: 'collaborator' as const
  }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[650px] max-h-[90vh] overflow-y-auto">
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
                <Users className="h-5 w-5" />
                <DialogTitle>Manage Order Users</DialogTitle>
              </div>
              <DialogDescription>
                Configure which users can create orders on <strong>{board.name}</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
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

              {/* Current Configuration Display */}
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

              {/* User Selection */}
              <div className="space-y-2">
                <Label className="text-base">Authorized Order Users</Label>
                <MultiUserAssignment
                  users={users}
                  selectedAssignments={currentOrderAssignments}
                  onChange={handleOrderUsersChange}
                  placeholder="Select users who can create orders on this board (leave empty for all users with order permissions)..."
                />
              </div>

              {/* Info Box */}
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
