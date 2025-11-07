"use client";

import { useState, useEffect } from "react";
import {
  ticketService,
  CreateTicketData,
  UpdateTicketData,
} from "@/services/ticketService";
import { columnsList, boardsList, tenantGroupsList } from "@/api/generated/api";
import type {
  Ticket,
  User,
  Tag,
  TicketColumn,
  Board,
  TenantGroup,
} from "@/api/generated/interfaces";
import SimpleRichTextEditor from "./SimpleRichTextEditor";
import MultiUserAssignment, { AssignmentData } from "./MultiUserAssignment";
import MultiGroupSelection from "./MultiGroupSelection";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface TicketFormProps {
  ticket?: Ticket; // If provided, we're editing; otherwise creating
  onSave?: (ticket: Ticket) => void;
  onCancel?: () => void;
}

export default function TicketForm({
  ticket,
  onSave,
  onCancel,
}: TicketFormProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    rich_description: "",
    description_format: "html" as "plain" | "html" | "delta",
    priority: "medium" as "low" | "medium" | "high" | "critical",
    assigned_to_id: 0,
    board_id: 0,
    column_id: 0,
    tag_ids: [] as number[],
  });

  const [assignments, setAssignments] = useState<AssignmentData[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);

  const [users, setUsers] = useState<User[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [groups, setGroups] = useState<TenantGroup[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [columns, setColumns] = useState<TicketColumn[]>([]);
  const [allColumns, setAllColumns] = useState<TicketColumn[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fetchingData, setFetchingData] = useState(true);

  const isEditing = !!ticket;

  useEffect(() => {
    // Initialize form data if editing
    if (ticket) {
      setFormData({
        title: ticket.title,
        description: ticket.description || "",
        rich_description:
          ticket.rich_description ||
          ((ticket.description_format as any) === "html"
            ? ticket.description || ""
            : ""),
        description_format: (ticket.description_format as any) || "html",
        priority: (ticket.priority as any) || "medium",
        assigned_to_id: ticket.assigned_to?.id || 0,
        board_id: ticket.column?.board || 0,
        column_id: ticket.column?.id || 0,
        tag_ids: ticket.tags ? ticket.tags.map((tag) => tag.id) : [],
      });

      // Initialize assignments from existing ticket
      if (ticket.assignments && ticket.assignments.length > 0) {
        const existingAssignments: AssignmentData[] = ticket.assignments.map(
          (assignment) => ({
            userId: assignment.user.id,
            role: (assignment.role as any) || "collaborator",
          })
        );
        setAssignments(existingAssignments);
      } else if (ticket.assigned_to) {
        // If no multi-assignments but has assigned_to, create assignment
        setAssignments([
          {
            userId: ticket.assigned_to.id,
            role: "primary",
          },
        ]);
      }

      // Initialize group assignments from existing ticket
      if (ticket.assigned_groups && ticket.assigned_groups.length > 0) {
        setSelectedGroupIds(ticket.assigned_groups.map(group => group.id));
      }
    }

    // Fetch users and tags
    fetchFormData();
  }, [ticket]);

  // Filter columns based on selected board
  useEffect(() => {
    if (formData.board_id && allColumns.length > 0) {
      const filteredColumns = allColumns.filter(
        (col) => col.board === formData.board_id
      );
      setColumns(filteredColumns);

      // Reset column selection if current column doesn't belong to selected board
      if (
        formData.column_id &&
        !filteredColumns.find((col) => col.id === formData.column_id)
      ) {
        // Set default column for the selected board or first column
        const defaultColumn =
          filteredColumns.find((col) => col.is_default) || filteredColumns[0];
        setFormData((prev) => ({
          ...prev,
          column_id: defaultColumn ? defaultColumn.id : 0,
        }));
      }
    } else {
      setColumns([]);
    }
  }, [formData.board_id, allColumns]);

  // Filter users based on selected board
  const filteredUsers = (() => {
    if (!formData.board_id || !boards.length) {
      return users; // If no board selected, show all users
    }

    const selectedBoard = boards.find(board => board.id === formData.board_id);
    if (!selectedBoard) {
      return users; // If board not found, show all users
    }

    const hasUserRestrictions = selectedBoard.board_users && selectedBoard.board_users.length > 0;
    const hasGroupRestrictions = selectedBoard.board_groups && selectedBoard.board_groups.length > 0;

    // If board has no restrictions at all, show all users
    if (!hasUserRestrictions && !hasGroupRestrictions) {
      return users;
    }

    // Collect user IDs from both board_users and users in board_groups
    const allowedUserIds = new Set<number>();

    // Add directly assigned users
    if (hasUserRestrictions) {
      selectedBoard.board_users.forEach(u => allowedUserIds.add(u.id));
    }

    // Add users from board_groups
    if (hasGroupRestrictions) {
      selectedBoard.board_groups.forEach(group => {
        // Find users who belong to this group
        users.forEach(user => {
          if (user.tenant_groups && user.tenant_groups.some(ug => ug.id === group.id)) {
            allowedUserIds.add(user.id);
          }
        });
      });
    }

    // Filter users to only include those allowed
    // Always include staff/superadmin users (they can access all boards)
    return users.filter(user => user.is_staff || allowedUserIds.has(user.id));
  })();

  const fetchFormData = async () => {
    try {
      setFetchingData(true);
      const [usersResult, tagsResult, groupsResult, boardsResult, columnsResult] =
        await Promise.all([
          ticketService.getUsers(),
          ticketService.getTags(),
          tenantGroupsList(),
          boardsList(),
          columnsList(),
        ]);

      setUsers(usersResult.results || []);
      setTags(tagsResult.results || []);
      setGroups(groupsResult.results || []);
      setBoards(boardsResult.results || []);
      setAllColumns(columnsResult.results || []);

      // Set default board if creating new ticket
      if (
        !ticket &&
        boardsResult.results &&
        boardsResult.results.length > 0 &&
        formData.board_id === 0
      ) {
        const defaultBoard =
          boardsResult.results.find((board) => board.is_default) ||
          boardsResult.results[0];
        setFormData((prev) => ({ ...prev, board_id: defaultBoard.id }));
      }
    } catch (err) {
      console.error("Error fetching form data:", err);
      setError("Failed to load form data");
    } finally {
      setFetchingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      let savedTicket: Ticket;

      // Prepare assignment data
      const assigned_user_ids = assignments.map((a) => a.userId);
      const assignment_roles: Record<string, string> = {};
      assignments.forEach((a) => {
        assignment_roles[a.userId.toString()] = a.role;
      });

      // Set primary assignee (first primary role or first assignment)
      const primaryAssignment =
        assignments.find((a) => a.role === "primary") || assignments[0];
      const assigned_to_id =
        primaryAssignment?.userId || formData.assigned_to_id || undefined;

      if (isEditing && ticket) {
        // Update existing ticket
        const updateData: UpdateTicketData = {
          title: formData.title,
          description:
            formData.description_format === "html"
              ? formData.rich_description
              : formData.description,
          rich_description:
            formData.description_format === "html"
              ? formData.rich_description
              : null,
          description_format: formData.description_format,
          priority: formData.priority,
          assigned_to_id,
          assigned_user_ids,
          assigned_group_ids: selectedGroupIds,
          assignment_roles,
          column_id: formData.column_id || undefined,
          tag_ids: formData.tag_ids,
        };

        savedTicket = await ticketService.updateTicket(ticket.id, updateData);
      } else {
        // Create new ticket
        const createData: CreateTicketData = {
          title: formData.title,
          description:
            formData.description_format === "html"
              ? formData.rich_description
              : formData.description,
          rich_description:
            formData.description_format === "html"
              ? formData.rich_description
              : null,
          description_format: formData.description_format,
          priority: formData.priority,
          assigned_to_id,
          assigned_user_ids,
          assigned_group_ids: selectedGroupIds,
          assignment_roles,
          column_id: formData.column_id || undefined,
          tag_ids: formData.tag_ids,
        };

        savedTicket = await ticketService.createTicket(createData);
      }

      if (onSave) {
        onSave(savedTicket);
      }
    } catch (err) {
      console.error("Error saving ticket:", err);
      setError(err instanceof Error ? err.message : "Failed to save ticket");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    field: string,
    value: string | number | number[]
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleRichTextChange = (html: string) => {
    setFormData((prev) => ({
      ...prev,
      rich_description: html,
      // Keep plain description in sync for fallback
      description: html.replace(/<[^>]*>/g, ""), // Strip HTML tags for plain text fallback
    }));
  };

  const handleDescriptionFormatChange = (
    format: "plain" | "html" | "delta"
  ) => {
    setFormData((prev) => ({
      ...prev,
      description_format: format,
    }));
  };

  const handleTagToggle = (tagId: number) => {
    const currentTags = formData.tag_ids;
    const newTags = currentTags.includes(tagId)
      ? currentTags.filter((id) => id !== tagId)
      : [...currentTags, tagId];

    handleInputChange("tag_ids", newTags);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "#e74c3c";
      case "high":
        return "#e67e22";
      case "medium":
        return "#f39c12";
      case "low":
        return "#27ae60";
      default:
        return "#95a5a6";
    }
  };

  if (fetchingData) {
    return (
      <div className="h-full flex items-center justify-center">
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <div className="flex items-center space-x-2">
              <Spinner className="h-6 w-6" />
              <span className="text-muted-foreground">
                Loading form data...
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full p-6 max-w-4xl mx-auto">
      {/* Header */}
      <Card className="mb-6 shadow-none border border-gray-200">
        <CardHeader>
          <CardTitle className="text-2xl">
            {isEditing ? `Edit Ticket #${ticket?.id}` : "Create New Ticket"}
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Error Message */}
      {error && (
        <Card className="mb-6 shadow-none border-destructive bg-destructive/10">
          <CardContent className="pt-6">
            <p className="text-destructive text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card className="shadow-none border border-gray-200">
          <CardContent className="pt-6 space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                required
                placeholder="Enter ticket title..."
              />
            </div>

            {/* Description Format Toggle */}
            <div className="space-y-2">
              <Label>Description Format</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={
                    formData.description_format === "plain"
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={() => handleDescriptionFormatChange("plain")}
                >
                  Plain Text
                </Button>
                <Button
                  type="button"
                  variant={
                    formData.description_format === "html"
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={() => handleDescriptionFormatChange("html")}
                >
                  Rich Text
                </Button>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              {formData.description_format === "html" ? (
                <SimpleRichTextEditor
                  value={formData.rich_description}
                  onChange={handleRichTextChange}
                  placeholder="Describe the issue or request in detail..."
                />
              ) : (
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    handleInputChange("description", e.target.value)
                  }
                  required
                  placeholder="Describe the issue or request in detail..."
                  rows={6}
                  className="resize-y"
                />
              )}
            </div>

            {/* Board Selection */}
            <div className="space-y-2">
              <Label htmlFor="board">Board *</Label>
              <Select
                value={
                  formData.board_id > 0 ? formData.board_id.toString() : ""
                }
                onValueChange={(value) =>
                  handleInputChange("board_id", parseInt(value) || 0)
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Board" />
                </SelectTrigger>
                <SelectContent className="bg-white" style={{ backgroundColor: 'white' }}>
                  {boards.map((board) => (
                    <SelectItem key={board.id} value={board.id.toString()} className="hover:bg-gray-100 cursor-pointer">
                      {board.name} {board.is_default ? "(Default)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority and Status Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Priority */}
              <div className="space-y-2">
                <Label>Priority</Label>
                <div className="grid grid-cols-2 gap-2">
                  {["low", "medium", "high", "critical"].map((priority) => (
                    <Button
                      key={priority}
                      type="button"
                      variant={
                        formData.priority === priority ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => handleInputChange("priority", priority)}
                      className="capitalize hover:opacity-80 transition-opacity"
                      style={{
                        backgroundColor:
                          formData.priority === priority
                            ? getPriorityColor(priority)
                            : undefined,
                        borderColor: getPriorityColor(priority),
                        color:
                          formData.priority === priority
                            ? "white"
                            : getPriorityColor(priority),
                      }}
                    >
                      {priority}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={
                    formData.column_id > 0 ? formData.column_id.toString() : ""
                  }
                  onValueChange={(value) =>
                    handleInputChange("column_id", parseInt(value) || 0)
                  }
                  disabled={!formData.board_id || columns.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        !formData.board_id
                          ? "Select a board first"
                          : columns.length === 0
                            ? "No statuses available for this board"
                            : "Select Status"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className="bg-white" style={{ backgroundColor: 'white' }}>
                    {columns.map((column) => (
                      <SelectItem key={column.id} value={column.id.toString()} className="hover:bg-gray-100 cursor-pointer">
                        {column.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Multi-User Assignment */}
            <div className="space-y-2">
              <Label>Assign Users</Label>
              <MultiUserAssignment
                users={filteredUsers}
                assignments={ticket?.assignments}
                selectedAssignments={assignments}
                onChange={setAssignments}
                disabled={loading}
                placeholder="Select users to assign to this ticket..."
              />
            </div>

            {/* Multi-Group Selection */}
            <div className="space-y-2">
              <Label>Assign Groups</Label>
              <MultiGroupSelection
                groups={groups}
                selectedGroupIds={selectedGroupIds}
                onChange={setSelectedGroupIds}
                disabled={loading}
                placeholder="Select groups to assign to this ticket..."
              />
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleTagToggle(tag.id)}
                      className="inline-block"
                    >
                      <Badge
                        variant={
                          formData.tag_ids.includes(tag.id)
                            ? "default"
                            : "outline"
                        }
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                      >
                        {tag.name}
                      </Badge>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}

              <Button
                type="submit"
                disabled={
                  loading ||
                  !formData.title.trim() ||
                  (!formData.description.trim() &&
                    !formData.rich_description.trim()) ||
                  !formData.board_id
                }
              >
                {loading && <Spinner className="mr-2 h-4 w-4" />}
                {loading
                  ? "Saving..."
                  : isEditing
                    ? "Update Ticket"
                    : "Create Ticket"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
