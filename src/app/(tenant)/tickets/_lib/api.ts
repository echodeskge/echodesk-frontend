/**
 * Typed axios calls for the tickets redesign (plan §4.5, E10, E18).
 *
 * New filters on existing operations are deliberately absent from the
 * OpenAPI schema (so the generated client's positional parameters never
 * shift), so everything here uses the shared axios instance with named
 * params. Every mutating call accepts an optional mutation id that is sent
 * as `X-Client-Mutation` (E11).
 */
import axios from "@/api/axios";
import { mutationHeaders } from "./mutation-id";
import type {
  ActivityItem,
  BoardAccess,
  BoardFilters,
  BoardLite,
  ColumnCounts,
  HistoryEntry,
  KanbanResponse,
  ListFilters,
  NavFilters,
  Navigation,
  NewChecklistItem,
  NewComment,
  Paginated,
  TicketChecklistItem,
  TicketDetail,
  TicketDetailComment,
  TicketFilters,
  TicketListRow,
  TicketPatch,
  TicketSort,
  TimeEntry,
  TimerCurrent,
  TimerState,
  TimeSummary,
  ViewCounts,
} from "./types";
import type { TicketAttachment } from "@/api/generated/interfaces";

export const PAGE_SIZE_ALL = 100;
export const LIST_PAGE_SIZE = 50;
/** Safety stop for getAllPages (100 pages × 100 rows). */
const MAX_PAGES = 100;

type Params = Record<string, string | number | boolean | undefined | null>;

const ORDERING: Record<TicketSort, string> = {
  manual: "position_in_column",
  created: "-created_at",
  updated: "-updated_at",
  priority: "priority_rank",
  due: "due_date",
};

export function sortToOrdering(sort: TicketSort | undefined): string | undefined {
  return sort ? ORDERING[sort] : undefined;
}

/**
 * A4 filter params. `searchParam` is `q` for the kanban and the shared
 * parser (counts, navigation) and `search` for the DRF list endpoint.
 */
export function filtersToParams(
  f: (TicketFilters & { sort?: TicketSort }) | undefined,
  searchParam: "q" | "search" = "q",
): Params {
  const p: Params = {};
  if (!f) return p;
  if (f.assignee?.length) p.assignee = f.assignee.join(",");
  if (f.unassigned) p.unassigned = 1;
  if (f.priority?.length) p.priority__in = f.priority.join(",");
  if (f.label?.length) p.tags__in = f.label.join(",");
  if (f.due) p.due = f.due;
  const q = f.q?.trim();
  if (q) p[searchParam] = q;
  const ordering = sortToOrdering(f.sort);
  if (ordering) p.ordering = ordering;
  return p;
}

function headers(mid?: string | null) {
  const h = mutationHeaders(mid);
  return Object.keys(h).length ? { headers: h } : undefined;
}

/** Page number from a DRF `next` URL (absolute or relative); null when absent. */
export function nextPageNumber(next: string | null | undefined): number | null {
  if (!next) return null;
  try {
    const page = new URL(next, "http://x.invalid").searchParams.get("page");
    const n = page ? Number(page) : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

/**
 * Fetch every page of a DRF list (WS12). Follows `next` by page number
 * against `url` (the `next` host can differ from the API host behind a
 * proxy), with `page_size=100`, until `next` is null.
 * Also accepts unpaginated array responses.
 */
export async function getAllPages<T>(url: string, params: Params = {}): Promise<T[]> {
  const out: T[] = [];
  let page: number | null = 1;
  for (let i = 0; page && i < MAX_PAGES; i++) {
    const { data } = await axios.get<Paginated<T> | T[]>(url, {
      params: { ...params, page_size: PAGE_SIZE_ALL, page },
    });
    if (Array.isArray(data)) return data;
    out.push(...(data.results ?? []));
    const next = nextPageNumber(data.next);
    page = next && next > page ? next : null;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Boards, kanban, list, counts
// ---------------------------------------------------------------------------

export function getBoardsLite(): Promise<BoardLite[]> {
  return getAllPages<BoardLite>("/api/boards/", { lite: 1 });
}

export async function getBoardAccess(boardId: number): Promise<BoardAccess> {
  const { data } = await axios.get<BoardAccess>(`/api/boards/${boardId}/`);
  return data;
}

export async function getKanban(boardId: number, f?: BoardFilters): Promise<KanbanResponse> {
  const params = filtersToParams(f, "q");
  // Manual is the server default; send nothing so the request matches today's.
  if (params.ordering === ORDERING.manual) delete params.ordering;
  const { data } = await axios.get<KanbanResponse>(`/api/boards/${boardId}/kanban_board/`, {
    params: { lite: 1, ...params },
  });
  return data;
}

export async function getTicketList(
  boardId: number,
  f: ListFilters,
  page: number = 1,
): Promise<Paginated<TicketListRow>> {
  const { data } = await axios.get<Paginated<TicketListRow>>("/api/tickets/", {
    params: {
      board: boardId,
      group: "column",
      page,
      page_size: LIST_PAGE_SIZE,
      ...filtersToParams(f, "search"),
    },
  });
  return data;
}

export async function getColumnCounts(boardId: number, f?: ListFilters): Promise<ColumnCounts> {
  const params = filtersToParams(f, "q");
  delete params.ordering;
  const { data } = await axios.get<ColumnCounts>("/api/tickets/column_counts/", {
    params: { board: boardId, ...params },
  });
  return data;
}

export async function getViewCounts(boardId: number | null): Promise<ViewCounts> {
  const { data } = await axios.get<ViewCounts>("/api/tickets/view_counts/", {
    params: boardId ? { board: boardId } : {},
  });
  return data;
}

// ---------------------------------------------------------------------------
// Ticket detail
// ---------------------------------------------------------------------------

export async function getTicket(id: number): Promise<TicketDetail> {
  const { data } = await axios.get<TicketDetail>(`/api/tickets/${id}/`);
  return data;
}

export async function getNavigation(id: number, f: NavFilters): Promise<Navigation> {
  const { view, ...rest } = f;
  const { data } = await axios.get<Navigation>(`/api/tickets/${id}/navigation/`, {
    params: { view, ...filtersToParams(rest, "q") },
  });
  return data;
}

export async function getActivity(id: number): Promise<ActivityItem[]> {
  const { data } = await axios.get<ActivityItem[]>(`/api/tickets/${id}/activity/`);
  return data;
}

export async function getHistory(id: number): Promise<HistoryEntry[]> {
  const { data } = await axios.get<HistoryEntry[]>(`/api/tickets/${id}/history/`);
  return data;
}

export async function patchTicket(id: number, body: TicketPatch, mid?: string | null): Promise<TicketDetail> {
  const { data } = await axios.patch<TicketDetail>(`/api/tickets/${id}/`, body, headers(mid));
  return data;
}

export async function moveTicket(
  id: number,
  body: { column_id: number; position_in_column?: number },
  mid?: string | null,
): Promise<TicketDetail> {
  const { data } = await axios.patch<TicketDetail>(`/api/tickets/${id}/move_to_column/`, body, headers(mid));
  return data;
}

export async function deleteTicket(id: number, mid?: string | null): Promise<void> {
  await axios.delete(`/api/tickets/${id}/`, headers(mid));
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

export async function createComment(body: NewComment, mid?: string | null): Promise<TicketDetailComment> {
  const { data } = await axios.post<TicketDetailComment>("/api/comments/", body, headers(mid));
  return data;
}

export async function updateComment(
  id: number,
  body: { comment: string },
  mid?: string | null,
): Promise<TicketDetailComment> {
  const { data } = await axios.patch<TicketDetailComment>(`/api/comments/${id}/`, body, headers(mid));
  return data;
}

export async function deleteComment(id: number, mid?: string | null): Promise<void> {
  await axios.delete(`/api/comments/${id}/`, headers(mid));
}

// ---------------------------------------------------------------------------
// Attachments
// ---------------------------------------------------------------------------

export async function uploadAttachment(
  ticketId: number,
  file: File,
  onProgress?: (percent: number) => void,
  mid?: string | null,
): Promise<TicketAttachment> {
  const form = new FormData();
  form.append("ticket", String(ticketId));
  form.append("file", file);
  const { data } = await axios.post<TicketAttachment>("/api/attachments/", form, {
    headers: { "Content-Type": "multipart/form-data", ...mutationHeaders(mid) },
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
    },
  });
  return data;
}

export async function deleteAttachment(id: number, mid?: string | null): Promise<void> {
  await axios.delete(`/api/attachments/${id}/`, headers(mid));
}

// ---------------------------------------------------------------------------
// Checklist
// ---------------------------------------------------------------------------

export async function checklistCreate(body: NewChecklistItem, mid?: string | null): Promise<TicketChecklistItem> {
  const { data } = await axios.post<TicketChecklistItem>("/api/checklist-items/", body, headers(mid));
  return data;
}

export async function checklistUpdate(
  id: number,
  body: { text?: string },
  mid?: string | null,
): Promise<TicketChecklistItem> {
  const { data } = await axios.patch<TicketChecklistItem>(`/api/checklist-items/${id}/`, body, headers(mid));
  return data;
}

export async function checklistDelete(id: number, mid?: string | null): Promise<void> {
  await axios.delete(`/api/checklist-items/${id}/`, headers(mid));
}

export async function checklistToggle(id: number, mid?: string | null): Promise<TicketChecklistItem> {
  const { data } = await axios.patch<TicketChecklistItem>(
    `/api/checklist-items/${id}/toggle_check/`,
    {},
    headers(mid),
  );
  return data;
}

export async function checklistReorder(
  id: number,
  position: number,
  mid?: string | null,
): Promise<TicketChecklistItem> {
  const { data } = await axios.patch<TicketChecklistItem>(
    `/api/checklist-items/${id}/reorder/`,
    { position },
    headers(mid),
  );
  return data;
}

// ---------------------------------------------------------------------------
// Timer (A14) and time in status
// ---------------------------------------------------------------------------

export async function timerGet(ticketId: number): Promise<TimerState> {
  const { data } = await axios.get<TimerState>(`/api/tickets/${ticketId}/timer/`);
  return data;
}

export async function timerStart(
  ticketId: number,
  opts: { switch?: boolean } = {},
  mid?: string | null,
): Promise<TimeEntry> {
  const body = opts.switch ? { switch: true } : {};
  const { data } = await axios.post<TimeEntry>(`/api/tickets/${ticketId}/timer/start/`, body, headers(mid));
  return data;
}

export async function timerStop(ticketId: number, mid?: string | null): Promise<TimeEntry> {
  const { data } = await axios.post<TimeEntry>(`/api/tickets/${ticketId}/timer/stop/`, {}, headers(mid));
  return data;
}

export async function timerCurrent(): Promise<TimerCurrent> {
  const { data } = await axios.get<TimerCurrent>("/api/time-entries/current/");
  return data;
}

export async function timerStopCurrent(mid?: string | null): Promise<TimeEntry> {
  const { data } = await axios.post<TimeEntry>("/api/time-entries/current/stop/", {}, headers(mid));
  return data;
}

export async function getTimeSummary(ticketId: number): Promise<TimeSummary> {
  const { data } = await axios.get<TimeSummary>("/api/time-logs/ticket_summary/", {
    params: { ticket: ticketId },
  });
  return data;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/** HTTP status of an axios error, if any. */
export function errorStatus(error: unknown): number | undefined {
  const e = error as { response?: { status?: number } } | null;
  return e?.response?.status;
}
