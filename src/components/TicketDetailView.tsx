"use client";

import { useState, useEffect } from "react";
import type { Ticket, TicketColumn, User } from "@/api/generated/interfaces";
import { ticketService } from "@/services/ticketService";
import { columnsList } from "@/api/generated/api";
import axios from "@/api/axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SubTicketList from "./SubTicketList";
import ChecklistItemList from "./ChecklistItemList";
import AssigneeList from "./AssigneeList";
import MultiUserAssignment, { AssignmentData } from "./MultiUserAssignment";
import TimeTracking from "./TimeTracking";
import {
  Calendar,
  User as UserIcon,
  Tag,
  MessageSquare,
  Edit,
  Save,
  X,
  Clock
} from "lucide-react";

interface TicketDetailViewProps {
  ticket: Ticket;
  onUpdate: (ticket: Ticket) => void;
}

// Helper function to get priority color
function getPriorityColor(priority: string): string {
  const priorityLower = priority.toLowerCase();
  switch (priorityLower) {
    case 'high':
    case 'urgent':
    case 'critical':
      return 'destructive';
    case 'medium':
    case 'normal':
      return 'default';
    case 'low':
      return 'secondary';
    default:
      return 'outline';
  }
}

function getColumnColor(column: TicketColumn | null | undefined): string {
  return column?.color || "#3498db";
}

export function TicketDetailView({ ticket: initialTicket, onUpdate }: TicketDetailViewProps) {
  const [ticket, setTicket] = useState<Ticket>(initialTicket);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    title: ticket.title,
    description: ticket.description,
    priority: String(ticket.priority || 'medium'),
  });

  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [columns, setColumns] = useState<TicketColumn[]>([]);
  const [editingAssignments, setEditingAssignments] = useState(false);
  const [tempAssignments, setTempAssignments] = useState<AssignmentData[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchUsers();
    fetchColumns();
  }, []);

  useEffect(() => {
    setTicket(initialTicket);
  }, [initialTicket]);

  const fetchTicket = async () => {
    try {
      const result = await ticketService.getTicket(ticket.id);
      setTicket(result);
      onUpdate(result);
    } catch (err) {
      console.error("Error fetching ticket:", err);
    }
  };

  const fetchUsers = async () => {
    try {
      const result = await ticketService.getUsers();
      setUsers(result.results || []);
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  };

  const fetchColumns = async () => {
    try {
      const result = await columnsList();
      // Filter columns to only show those from the ticket's board
      const boardId = ticket.column?.board;
      const filteredColumns = boardId
        ? (result.results || []).filter(col => col.board === boardId)
        : result.results || [];
      setColumns(filteredColumns);
    } catch (err) {
      console.error("Error fetching columns:", err);
    }
  };

  const handleSave = async () => {
    // TODO: Implement update API call
    console.log("Saving ticket:", formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData({
      title: ticket.title,
      description: ticket.description,
      priority: String(ticket.priority || 'medium'),
    });
    setIsEditing(false);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      setSubmittingComment(true);
      await ticketService.addComment(ticket.id, commentText);
      setCommentText("");
      await fetchTicket();
    } catch (err) {
      console.error("Error adding comment:", err);
      setError("Failed to add comment");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleColumnChange = async (columnId: string) => {
    try {
      const response = await axios.patch(
        `/api/tickets/${ticket.id}/move_to_column/`,
        { column_id: parseInt(columnId) }
      );
      setTicket(response.data);
      onUpdate(response.data);
    } catch (err) {
      console.error("Error moving ticket:", err);
      setError("Failed to move ticket");
    }
  };

  const handleStartEditingAssignments = () => {
    const currentAssignments: AssignmentData[] = [];

    if (ticket.assignments && ticket.assignments.length > 0) {
      currentAssignments.push(
        ...ticket.assignments.map((assignment) => ({
          userId: assignment.user.id,
          role: (assignment.role as any) || "collaborator",
        }))
      );
    } else if (ticket.assigned_to) {
      currentAssignments.push({
        userId: ticket.assigned_to.id,
        role: "primary",
      });
    }

    setTempAssignments(currentAssignments);
    setEditingAssignments(true);
  };

  const handleCancelEditingAssignments = () => {
    setEditingAssignments(false);
    setTempAssignments([]);
  };

  const handleSaveAssignments = async () => {
    try {
      const assigned_user_ids = tempAssignments.map((a) => a.userId);
      const assignment_roles: Record<string, string> = {};
      tempAssignments.forEach((a) => {
        assignment_roles[a.userId.toString()] = a.role;
      });

      const primaryAssignment =
        tempAssignments.find((a) => a.role === "primary") || tempAssignments[0];
      const assigned_to_id = primaryAssignment?.userId;

      const updatedTicket = await ticketService.updateTicket(ticket.id, {
        assigned_to_id,
        assigned_user_ids,
        assignment_roles,
      });

      setTicket(updatedTicket);
      onUpdate(updatedTicket);
      setEditingAssignments(false);
      setTempAssignments([]);
    } catch (err) {
      console.error("Error updating assignments:", err);
      setError("Failed to update assignments");
    }
  };

  const priorityDisplay = String(ticket.priority || 'Medium');
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="container max-w-7xl py-6">
      {error && (
        <div className="bg-destructive/10 text-destructive border border-destructive/20 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  {isEditing ? (
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="text-2xl font-bold h-auto"
                    />
                  ) : (
                    <CardTitle className="text-2xl">{ticket.title}</CardTitle>
                  )}
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={getPriorityColor(priorityDisplay) as any}
                      style={{
                        backgroundColor: ticket.column?.color ? `${ticket.column.color}20` : undefined,
                        color: ticket.column?.color || undefined,
                        borderColor: ticket.column?.color || undefined
                      }}
                      className="border"
                    >
                      {ticket.column?.name || 'Unknown'}
                      {ticket.column?.track_time && <Clock className="ml-1 h-3 w-3" />}
                    </Badge>
                    <Badge variant={getPriorityColor(priorityDisplay) as any}>
                      {priorityDisplay} Priority
                    </Badge>
                  </div>
                </div>
                {!isEditing ? (
                  <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button onClick={handleSave} size="sm">
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                    <Button onClick={handleCancel} variant="outline" size="sm">
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Description</Label>
                {isEditing ? (
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="mt-2 min-h-[150px]"
                  />
                ) : (
                  <div className="mt-2">
                    {(ticket.description_format as any) === "html" && ticket.rich_description ? (
                      <div
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: ticket.rich_description }}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {ticket.description || 'No description provided'}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {isEditing && (
                <div>
                  <Label className="text-sm font-medium">Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => setFormData({ ...formData, priority: value })}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {ticket.tags && ticket.tags.length > 0 && (
                <div>
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Tags
                  </Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {ticket.tags.map((tag) => (
                      <Badge key={tag.id} variant="secondary">
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <ChecklistItemList
                ticketId={ticket.id}
                items={ticket.checklist_items || []}
                onItemsChange={fetchTicket}
              />
            </CardContent>
          </Card>

          {/* Sub-tickets */}
          <Card>
            <CardContent className="pt-6">
              <SubTicketList
                parentTicketId={ticket.id}
                subTickets={ticket.sub_tickets || []}
                onSubTicketsChange={fetchTicket}
              />
            </CardContent>
          </Card>

          {/* Comments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Comments ({ticket.comments_count || 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleAddComment} className="space-y-2">
                <Textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment..."
                  className="min-h-[100px]"
                />
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={!commentText.trim() || submittingComment}
                  >
                    {submittingComment ? "Adding..." : "Add Comment"}
                  </Button>
                </div>
              </form>

              <div className="space-y-4">
                {ticket.comments && ticket.comments.length > 0 ? (
                  ticket.comments.map((comment) => (
                    <Card key={comment.id}>
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {comment.user.first_name?.[0]}{comment.user.last_name?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">
                              {comment.user.first_name} {comment.user.last_name}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(comment.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {comment.comment}
                        </p>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No comments yet. Be the first to comment!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm">Column</Label>
                <Select
                  value={ticket.column?.id?.toString() || ""}
                  onValueChange={handleColumnChange}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {columns.map((column) => (
                      <SelectItem key={column.id} value={column.id.toString()}>
                        {column.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label className="text-sm">Assigned Users</Label>
                  {!editingAssignments && (
                    <Button
                      onClick={handleStartEditingAssignments}
                      variant="ghost"
                      size="sm"
                      className="h-auto py-1 px-2 text-xs"
                    >
                      Edit
                    </Button>
                  )}
                </div>

                {editingAssignments ? (
                  <div className="space-y-2">
                    <MultiUserAssignment
                      users={users}
                      assignments={ticket.assignments}
                      selectedAssignments={tempAssignments}
                      onChange={setTempAssignments}
                      placeholder="Assign users..."
                    />
                    <div className="flex gap-2">
                      <Button onClick={handleSaveAssignments} size="sm" className="flex-1">
                        Save
                      </Button>
                      <Button onClick={handleCancelEditingAssignments} variant="outline" size="sm" className="flex-1">
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <AssigneeList
                    assigned_to={ticket.assigned_to}
                    assigned_users={ticket.assigned_users}
                    assignments={ticket.assignments}
                    showRoles={true}
                    size="medium"
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Details Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm text-muted-foreground">Created By</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {ticket.created_by?.first_name?.[0]}{ticket.created_by?.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">
                    {ticket.created_by?.first_name} {ticket.created_by?.last_name}
                  </span>
                </div>
              </div>

              <Separator />

              <div>
                <Label className="text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Created
                </Label>
                <p className="text-sm mt-1">{formatDate(ticket.created_at)}</p>
              </div>

              <Separator />

              <div>
                <Label className="text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Last Updated
                </Label>
                <p className="text-sm mt-1">{formatDate(ticket.updated_at)}</p>
              </div>

              <Separator />

              <div>
                <Label className="text-sm text-muted-foreground">Progress</Label>
                <div className="text-sm space-y-1 mt-1">
                  <div>Sub-tickets: {ticket.completed_sub_tickets_count}/{ticket.sub_tickets_count}</div>
                  <div>Checklist: {ticket.completed_checklist_items_count}/{ticket.checklist_items_count}</div>
                  <div>Comments: {ticket.comments_count}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Time Tracking */}
          <TimeTracking ticket={ticket} />
        </div>
      </div>
    </div>
  );
}
