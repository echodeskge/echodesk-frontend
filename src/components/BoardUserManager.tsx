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
import { Users, Info, CheckCircle2, XCircle, Lock, BookOpen, Shield, UserCog, Send } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import axios from "@/api/axios";

interface TelegramConnection {
  id: number;
  chat_id: string;
  is_active: boolean;
  has_token: boolean;
  created_at: string;
  updated_at: string;
}

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

  // Telegram state
  const [telegramConn, setTelegramConn] = useState<TelegramConnection | null>(null);
  const [telegramBotToken, setTelegramBotToken] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [telegramActive, setTelegramActive] = useState(true);
  const [telegramLoading, setTelegramLoading] = useState(false);
  const [telegramTesting, setTelegramTesting] = useState(false);
  const [telegramSaving, setTelegramSaving] = useState(false);
  const [telegramError, setTelegramError] = useState("");
  const [telegramSuccess, setTelegramSuccess] = useState("");

  // Use React Query hook for tenant groups - only fetch when dialog is open
  const { data: groupsData } = useTenantGroups({ enabled: open && !!boardId });
  const groups = groupsData?.results || [];

  useEffect(() => {
    if (open && boardId) {
      fetchData();
    }
  }, [boardId, open]);

  useEffect(() => {
    if (open && boardId && activeTab === "telegram") {
      fetchTelegramConnection();
    }
  }, [activeTab, boardId, open]);

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

  const fetchTelegramConnection = async () => {
    if (!boardId) return;
    setTelegramLoading(true);
    setTelegramError("");
    try {
      const res = await axios.get(`/api/boards/${boardId}/telegram-connection/`);
      const conn = res.data as TelegramConnection;
      setTelegramConn(conn);
      setTelegramChatId(conn.chat_id);
      setTelegramActive(conn.is_active);
      setTelegramBotToken("");
    } catch (err: any) {
      if (err.response?.status === 404) {
        setTelegramConn(null);
        setTelegramBotToken("");
        setTelegramChatId("");
        setTelegramActive(true);
      } else {
        setTelegramError("Failed to load Telegram connection");
      }
    } finally {
      setTelegramLoading(false);
    }
  };

  const handleTelegramTest = async () => {
    if (!boardId) return;
    setTelegramTesting(true);
    setTelegramError("");
    setTelegramSuccess("");
    try {
      const payload: Record<string, string> = {};
      if (telegramBotToken) payload.bot_token_raw = telegramBotToken;
      if (telegramChatId) payload.chat_id = telegramChatId;
      await axios.post(`/api/boards/${boardId}/telegram-connection/test/`, payload);
      setTelegramSuccess("Test message sent! Check your Telegram chat.");
    } catch (err: any) {
      setTelegramError(err.response?.data?.detail || err.response?.data?.message || "Test failed");
    } finally {
      setTelegramTesting(false);
    }
  };

  const handleTelegramSave = async () => {
    if (!boardId) return;
    if (!telegramChatId) {
      setTelegramError("Chat ID is required");
      return;
    }
    if (!telegramConn && !telegramBotToken) {
      setTelegramError("Bot token is required for new connections");
      return;
    }

    setTelegramSaving(true);
    setTelegramError("");
    setTelegramSuccess("");
    try {
      const payload: Record<string, any> = {
        chat_id: telegramChatId,
        is_active: telegramActive,
      };
      if (telegramBotToken) payload.bot_token_raw = telegramBotToken;

      if (telegramConn) {
        await axios.put(`/api/boards/${boardId}/telegram-connection/`, payload);
      } else {
        await axios.post(`/api/boards/${boardId}/telegram-connection/`, payload);
      }
      setTelegramSuccess("Telegram connection saved!");
      setTelegramBotToken("");
      await fetchTelegramConnection();
    } catch (err: any) {
      setTelegramError(err.response?.data?.detail || "Failed to save");
    } finally {
      setTelegramSaving(false);
    }
  };

  const handleTelegramDisconnect = async () => {
    if (!boardId) return;
    setTelegramSaving(true);
    setTelegramError("");
    setTelegramSuccess("");
    try {
      await axios.delete(`/api/boards/${boardId}/telegram-connection/`);
      setTelegramConn(null);
      setTelegramBotToken("");
      setTelegramChatId("");
      setTelegramActive(true);
      setTelegramSuccess("Telegram connection removed.");
    } catch (err: any) {
      setTelegramError(err.response?.data?.detail || "Failed to disconnect");
    } finally {
      setTelegramSaving(false);
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
                <TabsList className="grid w-full grid-cols-4">
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
                  <TabsTrigger value="telegram" className="flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    <span className="hidden sm:inline">Telegram</span>
                    <span className="sm:hidden">TG</span>
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
                        <li>If no users are selected, any user with &quot;Orders&quot; permission can create orders</li>
                        <li>If users are selected, only those users can create orders on this board</li>
                        <li>Users still need the &quot;Orders&quot; permission in their group to see the Orders menu</li>
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
                        <li>Separate from &quot;Order Users&quot; who can create orders</li>
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
                        <li>Users in &quot;Order Users&quot; tab can also see the board</li>
                        <li>Perfect for department/team-specific boards</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                </TabsContent>

                {/* Telegram Tab */}
                <TabsContent value="telegram" className="space-y-4 mt-4">
                  {telegramLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Spinner className="h-6 w-6" />
                    </div>
                  ) : (
                    <>
                      {/* Connection status */}
                      <Card className="bg-muted/50">
                        <CardContent className="pt-4">
                          <div className="flex items-center gap-2">
                            <Send className="h-4 w-4 text-muted-foreground" />
                            <p className="text-sm font-medium">Status:</p>
                            {telegramConn ? (
                              <Badge variant="default" className="bg-green-600">Connected</Badge>
                            ) : (
                              <Badge variant="secondary">Not Connected</Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Messages */}
                      {telegramSuccess && (
                        <Alert className="bg-green-50 border-green-200">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <AlertDescription className="text-green-800">{telegramSuccess}</AlertDescription>
                        </Alert>
                      )}
                      {telegramError && (
                        <Alert variant="destructive">
                          <XCircle className="h-4 w-4" />
                          <AlertDescription>{telegramError}</AlertDescription>
                        </Alert>
                      )}

                      {/* Form */}
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="bot-token">Bot Token</Label>
                          <Input
                            id="bot-token"
                            type="password"
                            placeholder={telegramConn ? "Leave empty to keep current token" : "Paste bot token from @BotFather"}
                            value={telegramBotToken}
                            onChange={(e) => setTelegramBotToken(e.target.value)}
                          />
                          <p className="text-xs text-muted-foreground">
                            Get from <strong>@BotFather</strong> on Telegram. Create a bot and copy the token.
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="chat-id">Chat ID</Label>
                          <Input
                            id="chat-id"
                            placeholder="e.g. -1001234567890"
                            value={telegramChatId}
                            onChange={(e) => setTelegramChatId(e.target.value)}
                          />
                          <p className="text-xs text-muted-foreground">
                            Add the bot to your group, then send a message and check
                            {" "}<code className="text-xs bg-muted px-1 rounded">https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</code>
                          </p>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="tg-active">Active</Label>
                            <p className="text-xs text-muted-foreground">Send notifications for new tickets</p>
                          </div>
                          <Switch
                            id="tg-active"
                            checked={telegramActive}
                            onCheckedChange={setTelegramActive}
                          />
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleTelegramTest}
                          disabled={telegramTesting || telegramSaving || (!telegramBotToken && !telegramConn)}
                        >
                          {telegramTesting ? <Spinner className="mr-2 h-3 w-3" /> : <Send className="mr-2 h-3 w-3" />}
                          Test Connection
                        </Button>

                        <Button
                          size="sm"
                          onClick={handleTelegramSave}
                          disabled={telegramSaving || telegramTesting}
                        >
                          {telegramSaving && <Spinner className="mr-2 h-3 w-3" />}
                          {telegramConn ? "Update" : "Save"}
                        </Button>

                        {telegramConn && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleTelegramDisconnect}
                            disabled={telegramSaving || telegramTesting}
                          >
                            Disconnect
                          </Button>
                        )}
                      </div>

                      {/* Setup instructions */}
                      <Alert className="bg-blue-50 border-blue-200">
                        <Info className="h-4 w-4 text-blue-600" />
                        <AlertDescription className="text-blue-800">
                          <p className="font-medium mb-2">Setup Instructions:</p>
                          <ol className="list-decimal list-inside space-y-1 text-sm">
                            <li>Open Telegram and search for <strong>@BotFather</strong></li>
                            <li>Send <code className="bg-white/50 px-1 rounded">/newbot</code> and follow the prompts</li>
                            <li>Copy the bot token and paste it above</li>
                            <li>Add the bot to your group/channel</li>
                            <li>Send a message in the group, then find the Chat ID from the API</li>
                            <li>Click &quot;Test Connection&quot; to verify, then &quot;Save&quot;</li>
                          </ol>
                        </AlertDescription>
                      </Alert>
                    </>
                  )}
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
