/**
 * Hand-written types for the tickets redesign data layer (plan §4.2–§4.5).
 *
 * These follow the B1/B2 backend contracts rather than the generated client,
 * because the new filters, the lite payloads and the new operations are
 * reached through `api.ts` (E10). Fields marked "B1"/"B2" only arrive once
 * that backend wave is deployed.
 */
import type {
  TicketAttachment,
  TicketColumn,
  TicketFormSubmission,
  TicketPayment,
  UserMinimal,
  TenantGroupMinimal,
  DepartmentMinimal,
  TicketAssignmentRoleEnum,
} from "@/api/generated/interfaces";
import type { TicketPriority } from "./priority";

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/** Card/list user shape: `{id, name, email}` (name = full name or email). */
export interface UserRef {
  id: number;
  name: string;
  email?: string;
}

export interface TagRef {
  id: number;
  name: string;
  color: string;
}

export type TicketView = "board" | "list";
export type DueFilter = "overdue" | "week" | "none";
export type BoardSort = "manual" | "created" | "updated" | "priority" | "due";
export type ListSort = Exclude<BoardSort, "manual">;
export type TicketSort = BoardSort;

/** Filters shared by the board, list, counts and navigation requests (A4). */
export interface TicketFilters {
  /** "me" and/or user ids. */
  assignee?: string[];
  unassigned?: boolean;
  priority?: TicketPriority[];
  /** Tag ids. */
  label?: number[];
  due?: DueFilter | null;
  q?: string;
}

export interface BoardFilters extends TicketFilters {
  sort?: BoardSort;
}

export interface ListFilters extends TicketFilters {
  sort?: ListSort;
}

export interface NavFilters extends TicketFilters {
  view: TicketView;
  sort?: TicketSort;
}

// ---------------------------------------------------------------------------
// Boards and kanban (A1, A2)
// ---------------------------------------------------------------------------

export interface BoardLite {
  id: number;
  name: string;
  color: string;
  position: number;
  is_default: boolean;
  open_count: number;
  columns_count: number;
}

/** Board access lists from the non-lite `boards/{id}/` (used by pickers). */
export interface BoardAccess {
  id: number;
  name: string;
  board_users: UserMinimal[];
  board_groups: TenantGroupMinimal[];
  order_users: UserMinimal[];
}

export type KanbanColumn = Pick<
  TicketColumn,
  "id" | "name" | "color" | "position" | "is_default" | "is_closed_status" | "track_time" | "board"
> & {
  description?: string;
  /** Unfiltered; clients count rendered cards for the header instead (F20). */
  tickets_count: number;
};

export interface TicketCard {
  id: number;
  title: string;
  priority: TicketPriority | string;
  column_id: number;
  position_in_column: number;
  is_order: boolean;
  is_closed: boolean;
  tags: TagRef[];
  assignees: UserRef[];
  comments_count: number;
  attachments_count: number;
  price: string | null;
  currency: string | null;
  is_paid: boolean;
  payment_due_date: string | null;
  created_at: string;
  updated_at: string;
  /** B1 */
  due_date: string | null;
  is_overdue_task: boolean;
  checklist_items_count: number;
  completed_checklist_items_count: number;
  description_preview: string;
}

export interface KanbanBoardInfo {
  id: number;
  name: string;
  color?: string;
  description?: string;
  is_default?: boolean;
}

export interface KanbanResponse {
  board: KanbanBoardInfo;
  columns: KanbanColumn[];
  tickets_by_column: Record<string, TicketCard[]>;
}

// ---------------------------------------------------------------------------
// List (A3), counts (A5, A5b), navigation (A6)
// ---------------------------------------------------------------------------

export interface TicketListRow {
  id: number;
  title: string;
  priority: TicketPriority | string;
  status: string;
  is_closed: boolean | string;
  column: Pick<TicketColumn, "id" | "name" | "color" | "position" | "is_closed_status" | "board">;
  position_in_column: number;
  created_at: string;
  updated_at: string;
  created_by: UserMinimal | null;
  assigned_to: UserMinimal | null;
  assigned_users: UserMinimal[];
  assigned_groups: TenantGroupMinimal[];
  tags: TagRef[];
  comments_count: number;
  /** B1 */
  attachments_count: number;
  checklist_items_count: number;
  completed_checklist_items_count: number;
  due_date: string | null;
  is_overdue_task: boolean;
}

export interface ViewCounts {
  mine: number;
  unassigned: number;
  urgent: number;
  due_this_week: number;
}

export interface ColumnCounts {
  counts: Record<string, number>;
}

export interface Navigation {
  index: number | null;
  total: number;
  prev_id: number | null;
  next_id: number | null;
}

// ---------------------------------------------------------------------------
// Detail (A7–A12)
// ---------------------------------------------------------------------------

export interface ViewerPermissions {
  can_edit: boolean;
  can_delete: boolean;
  can_move_to_closed: boolean;
  can_assign: boolean;
  can_change_groups: boolean;
  can_transfer: boolean;
  can_manage_payments: boolean;
  can_view_customer: boolean;
}

export interface TicketCustomer {
  id: number;
  name: string;
  email: string;
  phone: string;
}

export interface TicketReporter {
  id: number;
  name: string;
  initials: string;
  email: string;
}

export interface TicketChecklistItem {
  id: number;
  ticket: number;
  text: string;
  is_checked: boolean;
  position: number;
  created_at: string;
  updated_at: string;
  created_by: UserMinimal | null;
  /** B1 */
  checked_by: { id: number; name: string } | null;
  checked_at: string | null;
}

export interface TicketDetailComment {
  id: number;
  ticket: number;
  user: UserMinimal | null;
  comment: string;
  created_at: string;
  updated_at: string;
  /** B1 */
  is_internal: boolean;
}

export interface TicketDetailAssignment {
  id: number;
  user: UserMinimal;
  role?: TicketAssignmentRoleEnum;
  assigned_at: string;
  assigned_by: UserMinimal | null;
}

export interface TicketDetail {
  id: number;
  title: string;
  description?: string;
  rich_description?: unknown;
  description_format?: "plain" | "html" | "delta" | string;
  status: string;
  priority: TicketPriority | string;
  is_closed: boolean | string;
  is_order?: boolean;
  column: TicketColumn;
  position_in_column?: number;
  created_at: string;
  updated_at: string;
  created_by: UserMinimal | null;
  assigned_to: UserMinimal | null;
  assigned_users: UserMinimal[];
  assignments: TicketDetailAssignment[];
  assigned_groups: TenantGroupMinimal[];
  assigned_department: DepartmentMinimal | null;
  tags: TagRef[];
  comments: TicketDetailComment[];
  comments_count: number;
  checklist_items: TicketChecklistItem[];
  checklist_items_count: number;
  completed_checklist_items_count: number;
  price?: string | null;
  currency?: string | null;
  is_paid?: boolean;
  amount_paid?: string | null;
  payment_due_date?: string | null;
  payments: TicketPayment[];
  remaining_balance: string;
  payment_status: string;
  /** Payment overdue (C3), not the task due date. */
  is_overdue: boolean | string;
  form_submissions: TicketFormSubmission[];
  attachments: TicketAttachment[];
  /** B1 */
  due_date: string | null;
  is_overdue_task: boolean;
  customer: TicketCustomer | null;
  board: { id: number; name: string; color: string };
  reporter: TicketReporter | null;
  /** B2 */
  viewer_permissions: ViewerPermissions;
}

/** Writable fields for `PATCH tickets/{id}/`. */
export interface TicketPatch {
  title?: string;
  description?: string;
  rich_description?: unknown;
  description_format?: "plain" | "html";
  priority?: TicketPriority;
  column_id?: number;
  assigned_to_id?: number | null;
  assigned_user_ids?: number[];
  assignment_roles?: Record<string, TicketAssignmentRoleEnum>;
  assigned_group_ids?: number[];
  assigned_department_id?: number | null;
  tag_ids?: number[];
  due_date?: string | null;
  customer_id?: number | null;
  price?: string | null;
  currency?: string;
  payment_due_date?: string | null;
}

export interface ActivityUser {
  id: number | null;
  name: string;
  email: string;
  /** B1 */
  initials?: string;
}

export interface ActivityComment {
  type: "comment";
  kind?: "comment";
  id: string;
  comment_id: number;
  text: string;
  created_at: string;
  user: ActivityUser;
  /** B1 */
  is_internal?: boolean;
  edited?: boolean;
}

export interface ActivityEvent {
  type: "event";
  kind?: "history";
  id: string;
  action: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  description: string | null;
  created_at: string;
  user: ActivityUser;
}

export type ActivityItem = ActivityComment | ActivityEvent;

export interface HistoryEntry {
  id: number;
  ticket: number;
  action: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  description: string | null;
  user: UserMinimal | null;
  created_at: string;
}

export interface NewComment {
  ticket: number;
  comment: string;
  is_internal?: boolean;
}

export interface NewChecklistItem {
  ticket: number;
  text: string;
  position?: number;
}

// ---------------------------------------------------------------------------
// Timer (A14) and time in status
// ---------------------------------------------------------------------------

export interface TimeEntry {
  id: number;
  ticket_id: number;
  user: { id: number; name: string; initials: string } | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number;
  is_running: boolean;
}

export interface TimerState {
  running: TimeEntry | null;
  my_total_seconds: number;
  total_seconds: number;
  server_now: string;
  by_user: { user: { id: number; name: string; initials: string } | null; seconds: number }[];
  entries: TimeEntry[];
}

export interface TimerCurrent {
  running: TimeEntry | null;
  server_now: string;
}

export interface TimerConflict {
  code: "timer_running";
  running: { id: number; ticket_id: number; ticket_title: string | null; started_at: string };
}

export interface TimeSummary {
  ticket_id: number;
  total_seconds: number;
  active: {
    log_id: number;
    column: { id: number; name: string; color: string };
    entered_at: string;
    elapsed_seconds: number;
  } | null;
  by_column: {
    column_id: number;
    column_name: string;
    column_color: string;
    total_seconds: number;
    sessions: number;
  }[];
  logs: unknown[];
}

// ---------------------------------------------------------------------------
// Board WebSocket messages (§4.3)
// ---------------------------------------------------------------------------

export interface FieldChange<T = unknown> {
  old: T;
  new: T;
}

interface BoardEventBase {
  client_mutation_id?: string | null;
  actor_id?: number | null;
}

export interface TicketMovedEvent extends BoardEventBase {
  type: "ticket_moved";
  ticket_id: number;
  from_column_id: number | null;
  to_column_id: number;
  position?: number | null;
  updated_by_id?: number | null;
  updated_by_name?: string | null;
  /** B2 */
  card?: TicketCard;
}

export interface TicketUpdatedEvent extends BoardEventBase {
  type: "ticket_updated";
  ticket_id: number;
  changes: Record<string, FieldChange> & {
    tags?: FieldChange<TagRef[]>;
    assignees?: FieldChange<UserRef[]>;
  };
  card?: TicketCard;
  updated_by_id?: number;
  updated_by_name?: string;
}

export interface TicketCreatedEvent extends BoardEventBase {
  type: "ticket_created";
  ticket: TicketCard;
  created_by_id?: number;
  created_by_name?: string;
}

export interface TicketDeletedEvent extends BoardEventBase {
  type: "ticket_deleted";
  ticket_id: number;
  deleted_by_id?: number;
  deleted_by_name?: string;
  reason?: "deleted" | "transferred";
  to_board_id?: number | null;
}

export interface TicketCommentedEvent extends BoardEventBase {
  type: "ticket_commented";
  ticket_id: number;
  comment: { id: number; comment: string; is_internal?: boolean; user?: UserRef; created_at?: string } | null;
  comments_count?: number | null;
  user_id?: number | null;
  user_name?: string | null;
}

export interface TicketActivityEvent extends BoardEventBase {
  type: "ticket_activity";
  ticket_id: number;
  kind: "comment" | "comment_edited" | "comment_deleted" | "attachment" | "checklist" | "history" | "timer" | "form";
}

export type BoardEvent =
  | TicketMovedEvent
  | TicketUpdatedEvent
  | TicketCreatedEvent
  | TicketDeletedEvent
  | TicketCommentedEvent
  | TicketActivityEvent;
