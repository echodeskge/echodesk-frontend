/**
 * React Query keys for the tickets redesign (plan §4.4).
 *
 * Prefixes stay compatible with existing invalidations elsewhere in the app:
 * `['boards']` hits `tk.boards()`, `['kanbanBoard', id]` hits every filtered
 * `tk.board(id, f)`, and `['tags']` hits `tk.tags()`.
 *
 * Filter objects are normalised (empty values dropped, arrays sorted) so two
 * equivalent filter states always produce the same key.
 */
import type { BoardFilters, ListFilters, NavFilters, TicketFilters } from "./types";

type AnyFilters = TicketFilters & { sort?: string; view?: string };

export function normalizeFilters<T extends AnyFilters>(f?: T | null): Partial<T> {
  const out: Record<string, unknown> = {};
  if (!f) return out as Partial<T>;
  for (const [k, v] of Object.entries(f)) {
    if (v === undefined || v === null || v === false || v === "") continue;
    if (Array.isArray(v)) {
      if (v.length === 0) continue;
      out[k] = [...v].map((x) => (typeof x === "number" ? x : String(x))).sort((a, b) =>
        String(a).localeCompare(String(b), "en", { numeric: true }),
      );
      continue;
    }
    out[k] = typeof v === "string" ? v.trim() || undefined : v;
    if (out[k] === undefined) delete out[k];
  }
  return out as Partial<T>;
}

export const tk = {
  /** Prefix ['boards'] invalidations still hit it. */
  boards: () => ["boards", "lite"] as const,
  /** Prefix ['kanbanBoard', id] = the legacy invalidations. */
  board: (boardId: number, f?: BoardFilters) => ["kanbanBoard", boardId, normalizeFilters(f)] as const,
  columns: (boardId: number) => ["ticketColumns", boardId] as const,
  columnCounts: (boardId: number, f?: ListFilters) =>
    ["ticketColumnCounts", boardId, normalizeFilters(f)] as const,
  list: (boardId: number, f: ListFilters) => ["ticketList", boardId, normalizeFilters(f)] as const,
  viewCounts: (boardId: number | null) => ["ticketViewCounts", boardId] as const,
  ticket: (id: number) => ["ticket", id] as const,
  navigation: (id: number, f: NavFilters) => ["ticketNav", id, normalizeFilters(f)] as const,
  activity: (id: number) => ["ticketActivity", id] as const,
  history: (id: number) => ["ticketHistory", id] as const,
  timer: (id: number) => ["ticketTimer", id] as const,
  timerCurrent: () => ["ticketTimer", "current"] as const,
  timeSummary: (id: number) => ["ticketTimeSummary", id] as const,
  users: (boardId: number | null) => ["ticketUsers", boardId] as const,
  groups: () => ["ticketGroups"] as const,
  departments: () => ["ticketDepartments"] as const,
  /**
   * Deviation from §4.4 (`['tags']`): the existing `useTags` stores the
   * paginated response under `['tags']`, and the pickers store every page as
   * an array. Sharing the exact key would hand one shape to the other.
   * `['tags', 'all']` keeps prefix invalidations (`['tags']`) working.
   */
  tags: () => ["tags", "all"] as const,
  forms: () => ["ticketForms"] as const,
};
