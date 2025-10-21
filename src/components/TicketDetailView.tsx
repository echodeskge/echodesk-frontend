"use client";

import { useState, useEffect } from "react";
import { useTranslations } from 'next-intl';
import type { Ticket, TicketColumn, User, Tag as TagType, TenantGroup } from "@/api/generated/interfaces";
import { ticketService } from "@/services/ticketService";
import { columnsList, tagsList, tenantGroupsList } from "@/api/generated/api";
import axios from "@/api/axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { MentionTextarea } from "@/components/MentionTextarea";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import ChecklistItemList from "./ChecklistItemList";
import AssigneeList from "./AssigneeList";
import MultiUserAssignment, { AssignmentData } from "./MultiUserAssignment";
import MultiGroupSelection from "./MultiGroupSelection";
import TimeTracking from "./TimeTracking";
import { LabelManagementDialog } from "./LabelManagementDialog";
import { TicketFormsSection } from "./TicketFormsSection";
import {
  Calendar,
  User as UserIcon,
  Tag,
  MessageSquare,
  Edit,
  Save,
  X,
  Clock,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  const t = useTranslations('tickets');
  const tCommon = useTranslations('common');
  const [ticket, setTicket] = useState<Ticket>(initialTicket);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    title: ticket.title,
    description: ticket.description,
    rich_description: ticket.rich_description || '',
    priority: String(ticket.priority || 'medium'),
  });

  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [tags, setTags] = useState<TagType[]>([]);
  const [columns, setColumns] = useState<TicketColumn[]>([]);
  const [groups, setGroups] = useState<TenantGroup[]>([]);
  const [editingAssignments, setEditingAssignments] = useState(false);
  const [tempAssignments, setTempAssignments] = useState<AssignmentData[]>([]);
  const [editingGroups, setEditingGroups] = useState(false);
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);
  const [editingLabels, setEditingLabels] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [isLabelPopoverOpen, setIsLabelPopoverOpen] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchUsers();
    fetchColumns();
    fetchTags();
    fetchGroups();
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

  const fetchTags = async () => {
    try {
      const result = await tagsList();
      setTags(result.results || []);
    } catch (err) {
      console.error("Error fetching tags:", err);
    }
  };

  const fetchGroups = async () => {
    try {
      const result = await tenantGroupsList();
      setGroups(result.results || []);
    } catch (err) {
      console.error("Error fetching groups:", err);
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
      rich_description: ticket.rich_description || '',
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

  const handleStartEditingLabels = () => {
    setSelectedTagIds(ticket.tags?.map(tag => tag.id) || []);
    setEditingLabels(true);
  };

  const handleCancelEditingLabels = () => {
    setEditingLabels(false);
    setSelectedTagIds([]);
  };

  const handleSaveLabels = async () => {
    try {
      const updatedTicket = await ticketService.updateTicket(ticket.id, {
        tag_ids: selectedTagIds,
      });

      setTicket(updatedTicket);
      onUpdate(updatedTicket);
      setEditingLabels(false);
      setSelectedTagIds([]);
    } catch (err) {
      console.error("Error updating labels:", err);
      setError("Failed to update labels");
    }
  };

  const toggleTag = (tagId: number) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const handleStartEditingGroups = () => {
    setSelectedGroupIds(ticket.assigned_groups?.map(group => group.id) || []);
    setEditingGroups(true);
  };

  const handleCancelEditingGroups = () => {
    setEditingGroups(false);
    setSelectedGroupIds([]);
  };

  const handleSaveGroups = async () => {
    try {
      const updatedTicket = await ticketService.updateTicket(ticket.id, {
        assigned_group_ids: selectedGroupIds,
      });

      setTicket(updatedTicket);
      onUpdate(updatedTicket);
      setEditingGroups(false);
      setSelectedGroupIds([]);
    } catch (err) {
      console.error("Error updating groups:", err);
      setError("Failed to update groups");
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
    <div className="w-full max-w-7xl mx-auto px-4 py-6">
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
                      {t(`priority.${priorityDisplay.toLowerCase()}`)} {t('priority')}
                    </Badge>
                  </div>
                </div>
                {!isEditing ? (
                  <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    {tCommon('edit')}
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button onClick={handleSave} size="sm">
                      <Save className="h-4 w-4 mr-2" />
                      {tCommon('save')}
                    </Button>
                    <Button onClick={handleCancel} variant="outline" size="sm">
                      <X className="h-4 w-4 mr-2" />
                      {tCommon('cancel')}
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">{t('description')}</Label>
                {isEditing ? (
                  <div className="mt-2">
                    <RichTextEditor
                      value={formData.rich_description}
                      onChange={(value) => setFormData({ ...formData, rich_description: value })}
                      placeholder={t('description')}
                    />
                  </div>
                ) : (
                  <div className="mt-2">
                    {ticket.rich_description ? (
                      <div
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: ticket.rich_description }}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {ticket.description || t('description')}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {isEditing && (
                <div>
                  <Label className="text-sm font-medium">{t('priority')}</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => setFormData({ ...formData, priority: value })}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">{t('priority.low')}</SelectItem>
                      <SelectItem value="medium">{t('priority.medium')}</SelectItem>
                      <SelectItem value="high">{t('priority.high')}</SelectItem>
                      <SelectItem value="urgent">{t('priority.urgent')}</SelectItem>
                      <SelectItem value="critical">{t('priority.critical')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Tag className="h-4 w-4 flex-shrink-0" />
                    {t('labels')}
                  </Label>
                  <div className="flex gap-2 flex-shrink-0">
                    <LabelManagementDialog />
                    {!editingLabels && (
                      <Button
                        onClick={handleStartEditingLabels}
                        variant="ghost"
                        size="sm"
                        className="h-auto py-1 px-2 text-xs"
                      >
                        {tCommon('edit')}
                      </Button>
                    )}
                  </div>
                </div>

                {editingLabels ? (
                  <div className="space-y-2">
                    <Popover open={isLabelPopoverOpen} onOpenChange={setIsLabelPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={isLabelPopoverOpen}
                          className="w-full justify-between"
                        >
                          {selectedTagIds.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {selectedTagIds.map((tagId) => {
                                const tag = tags.find((t) => t.id === tagId);
                                if (!tag) return null;
                                return (
                                  <Badge
                                    key={tag.id}
                                    style={{
                                      backgroundColor: tag.color || '#6B7280',
                                      color: '#ffffff',
                                    }}
                                    className="text-xs px-2 py-0.5"
                                  >
                                    {tag.name}
                                  </Badge>
                                );
                              })}
                            </div>
                          ) : (
                            t('selectLabels')
                          )}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput placeholder={t('selectLabels')} />
                          <CommandList>
                            <CommandEmpty>{t('noLabels')}</CommandEmpty>
                            <CommandGroup>
                              {tags.map((tag) => (
                                <CommandItem
                                  key={tag.id}
                                  value={tag.name}
                                  onSelect={() => toggleTag(tag.id)}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedTagIds.includes(tag.id) ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <Badge
                                    style={{
                                      backgroundColor: tag.color || '#6B7280',
                                      color: '#ffffff',
                                    }}
                                    className="text-xs px-2 py-0.5 mr-2"
                                  >
                                    {tag.name}
                                  </Badge>
                                  {tag.description && (
                                    <span className="text-xs text-muted-foreground ml-auto">
                                      {tag.description}
                                    </span>
                                  )}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <div className="flex gap-2">
                      <Button onClick={handleSaveLabels} size="sm" className="flex-1">
                        {tCommon('save')}
                      </Button>
                      <Button onClick={handleCancelEditingLabels} variant="outline" size="sm" className="flex-1">
                        {tCommon('cancel')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {ticket.tags && ticket.tags.length > 0 ? (
                      ticket.tags.map((tag) => (
                        <Badge
                          key={tag.id}
                          style={{
                            backgroundColor: tag.color || '#6B7280',
                            color: '#ffffff',
                          }}
                          className="text-xs px-2 py-1"
                        >
                          {tag.name}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">{t('noLabels')}</p>
                    )}
                  </div>
                )}
              </div>

              <ChecklistItemList
                ticketId={ticket.id}
                items={ticket.checklist_items || []}
                onItemsChange={fetchTicket}
              />
            </CardContent>
          </Card>

          {/* Forms Section */}
          <TicketFormsSection ticket={ticket} onFormSubmitted={fetchTicket} />

          {/* Comments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                {t('comments')} ({ticket.comments_count || 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleAddComment} className="space-y-2">
                <MentionTextarea
                  value={commentText}
                  onChange={setCommentText}
                  placeholder={t('addComment')}
                  className="min-h-[100px]"
                />
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={!commentText.trim() || submittingComment}
                  >
                    {submittingComment ? tCommon('loading') : t('addComment')}
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
                    <p>{t('noComments')}</p>
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
                <Label className="text-sm">{t('column')}</Label>
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
                  <Label className="text-sm">{t('assignedTo')}</Label>
                  {!editingAssignments && (
                    <Button
                      onClick={handleStartEditingAssignments}
                      variant="ghost"
                      size="sm"
                      className="h-auto py-1 px-2 text-xs"
                    >
                      {tCommon('edit')}
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
                      placeholder={t('assignedTo')}
                    />
                    <div className="flex gap-2">
                      <Button onClick={handleSaveAssignments} size="sm" className="flex-1">
                        {tCommon('save')}
                      </Button>
                      <Button onClick={handleCancelEditingAssignments} variant="outline" size="sm" className="flex-1">
                        {tCommon('cancel')}
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

              <Separator />

              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label className="text-sm">Assigned Groups</Label>
                  {!editingGroups && (
                    <Button
                      onClick={handleStartEditingGroups}
                      variant="ghost"
                      size="sm"
                      className="h-auto py-1 px-2 text-xs"
                    >
                      {tCommon('edit')}
                    </Button>
                  )}
                </div>

                {editingGroups ? (
                  <div className="space-y-2">
                    <MultiGroupSelection
                      groups={groups}
                      selectedGroupIds={selectedGroupIds}
                      onChange={setSelectedGroupIds}
                      placeholder="Select groups..."
                    />
                    <div className="flex gap-2">
                      <Button onClick={handleSaveGroups} size="sm" className="flex-1">
                        {tCommon('save')}
                      </Button>
                      <Button onClick={handleCancelEditingGroups} variant="outline" size="sm" className="flex-1">
                        {tCommon('cancel')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {ticket.assigned_groups && ticket.assigned_groups.length > 0 ? (
                      ticket.assigned_groups.map((group) => (
                        <Badge
                          key={group.id}
                          variant="outline"
                          className="text-xs px-2 py-1"
                        >
                          {group.name}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No groups assigned</p>
                    )}
                  </div>
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
                <Label className="text-sm text-muted-foreground">{t('createdBy')}</Label>
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
                  {t('createdAt')}
                </Label>
                <p className="text-sm mt-1">{formatDate(ticket.created_at)}</p>
              </div>

              <Separator />

              <div>
                <Label className="text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {t('updatedAt')}
                </Label>
                <p className="text-sm mt-1">{formatDate(ticket.updated_at)}</p>
              </div>

              <Separator />

              <div>
                <Label className="text-sm text-muted-foreground">Progress</Label>
                <div className="text-sm space-y-1 mt-1">
                  <div>{t('checklist')}: {ticket.completed_checklist_items_count}/{ticket.checklist_items_count}</div>
                  <div>{t('comments')}: {ticket.comments_count}</div>
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
