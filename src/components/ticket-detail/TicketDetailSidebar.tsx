"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import type {
  Ticket,
  TicketColumn,
  Tag as TagType,
  TenantGroup,
  Department,
  User,
} from "@/api/generated/interfaces";
import {
  columnsList,
  tagsList,
  tenantGroupsList,
  departmentsList,
  ticketsPartialUpdate,
  usersList,
} from "@/api/generated/api";
import { ticketService } from "@/services/ticketService";
import axiosInstance from "@/api/axios";
import { TicketMetadataField } from "./TicketMetadataField";
import MultiUserAssignment, {
  AssignmentData,
} from "@/components/MultiUserAssignment";
import TimeTracking from "@/components/TimeTracking";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { LabelManagementDialog } from "@/components/LabelManagementDialog";
import {
  Calendar,
  Check,
  ChevronsUpDown,
  Paperclip,
  CheckSquare,
  Clock,
  Plus,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface TicketDetailSidebarProps {
  ticket: Ticket;
  onUpdate: (ticket: Ticket) => void;
}

const PRIORITY_CONFIG: Record<string, { color: string; bg: string }> = {
  critical: { color: "text-red-600", bg: "bg-red-100 dark:bg-red-900/30" },
  urgent: { color: "text-orange-600", bg: "bg-orange-100 dark:bg-orange-900/30" },
  high: { color: "text-red-500", bg: "bg-red-50 dark:bg-red-900/20" },
  medium: { color: "text-yellow-600", bg: "bg-yellow-50 dark:bg-yellow-900/20" },
  low: { color: "text-green-600", bg: "bg-green-50 dark:bg-green-900/20" },
};

export function TicketDetailSidebar({
  ticket,
  onUpdate,
}: TicketDetailSidebarProps) {
  const t = useTranslations("tickets");

  const [columns, setColumns] = useState<TicketColumn[]>([]);
  const [tags, setTags] = useState<TagType[]>([]);
  const [groups, setGroups] = useState<TenantGroup[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>(
    ticket.tags?.map((t) => t.id) || []
  );
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);
  const [groupPopoverOpen, setGroupPopoverOpen] = useState(false);
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>(
    ticket.assigned_groups?.map((g) => g.id) || []
  );
  const [assigneePopoverOpen, setAssigneePopoverOpen] = useState(false);

  useEffect(() => {
    fetchColumns();
    fetchTags();
    fetchGroups();
    fetchDepartments();
    fetchUsers();
  }, []);

  useEffect(() => { setSelectedTagIds(ticket.tags?.map((t) => t.id) || []); }, [ticket.tags]);
  useEffect(() => { setSelectedGroupIds(ticket.assigned_groups?.map((g) => g.id) || []); }, [ticket.assigned_groups]);

  const fetchColumns = async () => { try { const r = await columnsList(); const bid = ticket.column?.board; setColumns(bid ? (r.results || []).filter((c) => c.board === bid) : r.results || []); } catch {} };
  const fetchTags = async () => { try { const r = await tagsList(); setTags(r.results || []); } catch {} };
  const fetchGroups = async () => { try { const r = await tenantGroupsList(); setGroups(r.results || []); } catch {} };
  const fetchDepartments = async () => { try { const r = await departmentsList(); setDepartments(r.results || []); } catch {} };
  const fetchUsers = async () => { try { const r = await usersList(); setUsers(r.results || []); } catch {} };

  // Handlers
  const handleColumnChange = async (columnId: string) => {
    try {
      const response = await axiosInstance.patch(`/api/tickets/${ticket.id}/move_to_column/`, { column_id: parseInt(columnId) });
      onUpdate(response.data);
    } catch { toast.error(t("ticketUpdatedError")); }
  };

  const handlePriorityChange = async (priority: string) => {
    try {
      const updated = await ticketsPartialUpdate(ticket.id.toString(), { priority: priority as any });
      onUpdate(updated);
    } catch { toast.error(t("ticketUpdatedError")); }
  };

  const handleDepartmentChange = async (deptId: string) => {
    try {
      const updated = await ticketsPartialUpdate(ticket.id.toString(), { assigned_department_id: parseInt(deptId) } as any);
      onUpdate(updated);
    } catch { toast.error(t("ticketUpdatedError")); }
  };

  const handleDueDateChange = async (dateStr: string) => {
    try {
      const updated = await ticketsPartialUpdate(ticket.id.toString(), { payment_due_date: dateStr || undefined } as any);
      onUpdate(updated);
    } catch { toast.error(t("ticketUpdatedError")); }
  };

  const handleAddAssignee = async (userId: number) => {
    setAssigneePopoverOpen(false);
    const currentIds = ticket.assigned_users?.map(u => u.id) || [];
    if (currentIds.includes(userId)) return;
    try {
      const updated = await ticketService.updateTicket(ticket.id, {
        assigned_user_ids: [...currentIds, userId],
      });
      onUpdate(updated);
    } catch { toast.error(t("ticketUpdatedError")); }
  };

  const handleRemoveAssignee = async (userId: number) => {
    const currentIds = ticket.assigned_users?.map(u => u.id) || [];
    try {
      const updated = await ticketService.updateTicket(ticket.id, {
        assigned_user_ids: currentIds.filter(id => id !== userId),
      });
      onUpdate(updated);
    } catch { toast.error(t("ticketUpdatedError")); }
  };

  const toggleTag = (tagId: number) => {
    setSelectedTagIds((prev) => prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]);
  };

  const saveTagSelection = async () => {
    setTagPopoverOpen(false);
    try {
      const updated = await ticketService.updateTicket(ticket.id, { tag_ids: selectedTagIds });
      onUpdate(updated);
    } catch { toast.error(t("ticketUpdatedError")); }
  };

  const toggleGroup = (groupId: number) => {
    setSelectedGroupIds((prev) => prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]);
  };

  const saveGroupSelection = async () => {
    setGroupPopoverOpen(false);
    try {
      const updated = await ticketService.updateTicket(ticket.id, { assigned_group_ids: selectedGroupIds });
      onUpdate(updated);
    } catch { toast.error(t("ticketUpdatedError")); }
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const priorityKey = String(ticket.priority || "medium").toLowerCase();
  const pConfig = PRIORITY_CONFIG[priorityKey] || PRIORITY_CONFIG.medium;
  const totalChecklist = Number(ticket.checklist_items_count) || 0;
  const completedChecklist = Number(ticket.completed_checklist_items_count) || 0;
  const checklistProgress = totalChecklist > 0 ? (completedChecklist / totalChecklist) * 100 : 0;
  const assignedUsers = ticket.assigned_users || (ticket.assigned_to ? [ticket.assigned_to] : []);
  const unassignedUsers = users.filter(u => !assignedUsers.some(au => au.id === u.id));

  return (
    <div className="space-y-1">
      {/* Main fields card */}
      <div className="rounded-lg border bg-card px-4 py-2 divide-y divide-border">
        {/* Status */}
        <TicketMetadataField
          label={t("ticketDetail.status")}
          editing={
            <Select value={ticket.column?.id?.toString() || ""} onValueChange={handleColumnChange}>
              <SelectTrigger className="h-7 text-xs border-0 shadow-none p-0 focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {columns.map((col) => (
                  <SelectItem key={col.id} value={col.id.toString()}>
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: col.color || "#3498db" }} />
                      {col.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: ticket.column?.color || "#3498db" }} />
            {ticket.column?.name || "Unknown"}
          </span>
        </TicketMetadataField>

        {/* Priority */}
        <TicketMetadataField
          label={t("ticketDetail.priority")}
          editing={
            <Select value={priorityKey} onValueChange={handlePriorityChange}>
              <SelectTrigger className="h-7 text-xs border-0 shadow-none p-0 focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>
                    <span className={cn("flex items-center gap-2 text-xs font-medium capitalize", cfg.color)}>
                      <span className={cn("h-2 w-2 rounded-full", cfg.bg, cfg.color)} style={{ backgroundColor: "currentColor" }} />
                      {t(`priority.${key}`)}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        >
          <span className={cn("inline-flex items-center gap-1.5 text-sm font-medium capitalize", pConfig.color)}>
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "currentColor" }} />
            {t(`priority.${priorityKey}`)}
          </span>
        </TicketMetadataField>

        {/* Assignees — Linear style: avatar chips */}
        <TicketMetadataField label={t("ticketDetail.assignees")} selfManaged>
          <div className="flex flex-wrap items-center gap-1.5">
            {assignedUsers.map((user) => (
              <div
                key={user.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 pl-0.5 pr-2 py-0.5 text-xs group/chip hover:bg-muted transition-colors"
              >
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-medium">
                    {getInitials(`${user.first_name || ""} ${user.last_name || ""}`)}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium truncate max-w-[80px]">
                  {user.first_name || user.email?.split("@")[0]}
                </span>
                <button
                  onClick={() => handleRemoveAssignee(user.id)}
                  className="opacity-0 group-hover/chip:opacity-100 transition-opacity h-3.5 w-3.5 rounded-full hover:bg-destructive/20 flex items-center justify-center"
                >
                  <X className="h-2.5 w-2.5 text-muted-foreground" />
                </button>
              </div>
            ))}
            <Popover open={assigneePopoverOpen} onOpenChange={setAssigneePopoverOpen}>
              <PopoverTrigger asChild>
                <button className="h-6 w-6 rounded-full border border-dashed border-muted-foreground/30 flex items-center justify-center hover:bg-muted/60 hover:border-muted-foreground/50 transition-colors">
                  <Plus className="h-3 w-3 text-muted-foreground" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-0" align="end">
                <Command>
                  <CommandInput placeholder="Search users..." className="h-8" />
                  <CommandList>
                    <CommandEmpty>No users found</CommandEmpty>
                    <CommandGroup>
                      {unassignedUsers.slice(0, 20).map((user) => (
                        <CommandItem key={user.id} onSelect={() => handleAddAssignee(user.id)} className="text-xs">
                          <Avatar className="h-5 w-5 mr-2">
                            <AvatarFallback className="text-[9px]">
                              {getInitials(`${user.first_name || ""} ${user.last_name || ""}`)}
                            </AvatarFallback>
                          </Avatar>
                          {user.first_name} {user.last_name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </TicketMetadataField>

        {/* Department */}
        <TicketMetadataField
          label={t("ticketDetail.department")}
          editing={
            <Select value={ticket.assigned_department?.id?.toString() || ""} onValueChange={handleDepartmentChange}>
              <SelectTrigger className="h-7 text-xs border-0 shadow-none p-0 focus:ring-0">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id.toString()}>{dept.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        >
          <span className="text-sm">{ticket.assigned_department?.name || <span className="text-muted-foreground">None</span>}</span>
        </TicketMetadataField>

        {/* Tags — inline badges with popover */}
        <TicketMetadataField label={t("ticketDetail.tags")} selfManaged>
          <div className="flex flex-wrap items-center gap-1">
            {(ticket.tags || []).map((tag) => (
              <Badge
                key={tag.id}
                style={{ backgroundColor: tag.color || "#6B7280", color: "#fff" }}
                className="text-[10px] px-1.5 py-0 h-5 font-medium"
              >
                {tag.name}
              </Badge>
            ))}
            <Popover open={tagPopoverOpen} onOpenChange={setTagPopoverOpen}>
              <PopoverTrigger asChild>
                <button className="h-5 rounded-md border border-dashed border-muted-foreground/30 px-1.5 flex items-center gap-0.5 hover:bg-muted/60 hover:border-muted-foreground/50 transition-colors text-[10px] text-muted-foreground">
                  <Plus className="h-2.5 w-2.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-0" align="end">
                <Command>
                  <CommandInput placeholder="Search labels..." className="h-8" />
                  <CommandList>
                    <CommandEmpty>No labels</CommandEmpty>
                    <CommandGroup>
                      {tags.map((tag) => (
                        <CommandItem key={tag.id} value={tag.name} onSelect={() => toggleTag(tag.id)} className="text-xs">
                          <Check className={cn("mr-2 h-3 w-3", selectedTagIds.includes(tag.id) ? "opacity-100" : "opacity-0")} />
                          <Badge style={{ backgroundColor: tag.color || "#6B7280", color: "#fff" }} className="text-[10px] px-1.5 py-0">{tag.name}</Badge>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
                <div className="p-2 border-t flex items-center justify-between">
                  <LabelManagementDialog />
                  <Button size="sm" className="h-6 text-[10px] px-2" onClick={saveTagSelection}>Apply</Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </TicketMetadataField>

        {/* Due Date */}
        <TicketMetadataField
          label={t("ticketDetail.dueDate")}
          editing={
            <input
              type="date"
              className="flex h-7 w-full rounded-md bg-transparent text-sm focus:outline-none"
              value={ticket.payment_due_date || ""}
              onChange={(e) => handleDueDateChange(e.target.value)}
            />
          }
        >
          <span className="flex items-center gap-1.5 text-sm">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            {ticket.payment_due_date ? new Date(ticket.payment_due_date).toLocaleDateString() : <span className="text-muted-foreground">Not set</span>}
          </span>
        </TicketMetadataField>

        {/* Groups — avatar-style chips */}
        <TicketMetadataField label={t("ticketDetail.groups")} selfManaged>
          <div className="flex flex-wrap items-center gap-1.5">
            {(ticket.assigned_groups || []).map((group) => (
              <div
                key={group.id}
                className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 pl-1 pr-2 py-0.5 text-[10px] font-medium group/gchip"
              >
                <Users className="h-3 w-3" />
                <span className="truncate max-w-[80px]">{group.name}</span>
              </div>
            ))}
            <Popover open={groupPopoverOpen} onOpenChange={setGroupPopoverOpen}>
              <PopoverTrigger asChild>
                <button className="h-5 rounded-md border border-dashed border-muted-foreground/30 px-1.5 flex items-center gap-0.5 hover:bg-muted/60 hover:border-muted-foreground/50 transition-colors text-[10px] text-muted-foreground">
                  <Plus className="h-2.5 w-2.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-0" align="end">
                <Command>
                  <CommandInput placeholder="Search groups..." className="h-8" />
                  <CommandList>
                    <CommandEmpty>No groups</CommandEmpty>
                    <CommandGroup>
                      {groups.map((group) => (
                        <CommandItem key={group.id} value={group.name} onSelect={() => toggleGroup(group.id)} className="text-xs">
                          <Check className={cn("mr-2 h-3 w-3", selectedGroupIds.includes(group.id) ? "opacity-100" : "opacity-0")} />
                          <Users className="mr-1.5 h-3 w-3" />
                          {group.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
                <div className="p-2 border-t flex justify-end">
                  <Button size="sm" className="h-6 text-[10px] px-2" onClick={saveGroupSelection}>Apply</Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </TicketMetadataField>
      </div>

      {/* Summary card */}
      <div className="rounded-lg border bg-card px-4 py-3 space-y-3">
        {totalChecklist > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><CheckSquare className="h-3 w-3" />{t("checklist")}</span>
              <span>{completedChecklist}/{totalChecklist}</span>
            </div>
            <Progress value={checklistProgress} className="h-1" />
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><Paperclip className="h-3 w-3" />{t("attachments")}</span>
          <span>{typeof (ticket.attachments as any)?.length === "number" ? (ticket.attachments as any).length : 0}</span>
        </div>

        <TimeTracking ticket={ticket} className="mt-1" />
      </div>

      {/* Dates card */}
      <div className="rounded-lg border bg-card px-4 py-3 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{t("ticketDetail.created")}</span>
          <span>{new Date(ticket.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{t("ticketDetail.updated")}</span>
          <span>{new Date(ticket.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
        </div>
        {ticket.created_by && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Reporter</span>
            <span className="flex items-center gap-1.5">
              <Avatar className="h-4 w-4">
                <AvatarFallback className="text-[8px]">
                  {getInitials(`${ticket.created_by.first_name || ""} ${ticket.created_by.last_name || ""}`)}
                </AvatarFallback>
              </Avatar>
              {ticket.created_by.first_name} {ticket.created_by.last_name}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
