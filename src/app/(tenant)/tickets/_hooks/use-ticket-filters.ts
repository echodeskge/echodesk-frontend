"use client";

/**
 * URL-backed view state for the tickets screens (plan E19, §4.5).
 *
 * `/tickets?board=&view=board|list&assignee=&unassigned=&priority=&label=&due=&q=&sort=`
 *
 * The URL is the source of truth. Changes go through `router.replace` (no
 * history entry per keystroke). `board` falls back to the
 * `echodesk_selected_board_id` localStorage key, which may be unavailable
 * (private mode) and is read inside try/catch.
 */
import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { isTicketPriority, type TicketPriority } from "../_lib/priority";
import type { BoardSort, DueFilter, ListSort, TicketFilters, TicketSort, TicketView } from "../_lib/types";

export const SELECTED_BOARD_STORAGE_KEY = "echodesk_selected_board_id";

export const BOARD_SORT_CYCLE: readonly BoardSort[] = ["manual", "created", "updated", "priority", "due"];
export const LIST_SORT_CYCLE: readonly ListSort[] = ["created", "updated", "priority", "due"];

const DUE_VALUES: readonly DueFilter[] = ["overdue", "week", "none"];

/** Fully-populated filter state (no optional fields). */
export interface ResolvedFilters {
  assignee: string[];
  unassigned: boolean;
  priority: TicketPriority[];
  label: number[];
  due: DueFilter | null;
  q: string;
}

export interface TicketUrlState {
  boardId: number | null;
  view: TicketView;
  sort: TicketSort;
  filters: ResolvedFilters;
}

export type FilterKey = keyof ResolvedFilters | "board" | "view" | "sort";

export const EMPTY_FILTERS: ResolvedFilters = {
  assignee: [],
  unassigned: false,
  priority: [],
  label: [],
  due: null,
  q: "",
};

export function defaultSort(view: TicketView): TicketSort {
  return view === "list" ? "created" : "manual";
}

function csv(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function positiveInt(value: string | null | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const n = Number(value);
  return n > 0 ? n : null;
}

export function readStoredBoardId(): number | null {
  try {
    if (typeof window === "undefined") return null;
    return positiveInt(window.localStorage.getItem(SELECTED_BOARD_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function writeStoredBoardId(id: number | null): void {
  try {
    if (typeof window === "undefined") return;
    if (id) window.localStorage.setItem(SELECTED_BOARD_STORAGE_KEY, String(id));
    else window.localStorage.removeItem(SELECTED_BOARD_STORAGE_KEY);
  } catch {
    // Storage blocked (private mode, quota): the URL still carries the board.
  }
}

/** Parse the query string; `fallbackBoardId` is used when `board` is absent or invalid. */
export function parseTicketSearchParams(
  sp: URLSearchParams | { get(name: string): string | null },
  fallbackBoardId: number | null = null,
): TicketUrlState {
  const view: TicketView = sp.get("view") === "list" ? "list" : "board";
  const rawSort = sp.get("sort") as TicketSort | null;
  const cycle: readonly string[] = view === "list" ? LIST_SORT_CYCLE : BOARD_SORT_CYCLE;
  const sort: TicketSort = rawSort && cycle.includes(rawSort) ? rawSort : defaultSort(view);
  const assignee = csv(sp.get("assignee")).filter((a) => a === "me" || positiveInt(a) !== null);
  const due = sp.get("due") as DueFilter | null;
  return {
    boardId: positiveInt(sp.get("board")) ?? fallbackBoardId,
    view,
    sort,
    filters: {
      assignee: [...new Set(assignee)],
      unassigned: sp.get("unassigned") === "1",
      priority: [...new Set(csv(sp.get("priority")).filter(isTicketPriority))],
      label: [...new Set(csv(sp.get("label")).map(positiveInt).filter((n): n is number => n !== null))],
      due: due && DUE_VALUES.includes(due) ? due : null,
      q: sp.get("q") ?? "",
    },
  };
}

/** Canonical query string (no leading "?"); defaults are omitted. */
export function serializeTicketState(state: TicketUrlState): string {
  const p = new URLSearchParams();
  if (state.boardId) p.set("board", String(state.boardId));
  if (state.view === "list") p.set("view", "list");
  const f = state.filters;
  if (f.assignee.length) p.set("assignee", f.assignee.join(","));
  if (f.unassigned) p.set("unassigned", "1");
  if (f.priority.length) p.set("priority", f.priority.join(","));
  if (f.label.length) p.set("label", f.label.join(","));
  if (f.due) p.set("due", f.due);
  if (f.q.trim()) p.set("q", f.q);
  if (state.sort !== defaultSort(state.view)) p.set("sort", state.sort);
  return p.toString();
}

export function hasActive(f: ResolvedFilters): boolean {
  return Boolean(f.assignee.length || f.unassigned || f.priority.length || f.label.length || f.due || f.q.trim());
}

export function nextSort(view: TicketView, current: TicketSort): TicketSort {
  const cycle: readonly TicketSort[] = view === "list" ? LIST_SORT_CYCLE : BOARD_SORT_CYCLE;
  const i = cycle.indexOf(current);
  return cycle[(i + 1) % cycle.length];
}

/** Apply one change to a state (pure). */
export function applyFilterChange(state: TicketUrlState, key: FilterKey, value: unknown): TicketUrlState {
  switch (key) {
    case "board":
      return { ...state, boardId: typeof value === "number" && value > 0 ? value : null };
    case "view": {
      const view: TicketView = value === "list" ? "list" : "board";
      // Manual sort doesn't exist in list view; other sorts carry over.
      const sort = view === "list" && state.sort === "manual" ? defaultSort("list") : state.sort;
      return { ...state, view, sort };
    }
    case "sort": {
      const cycle: readonly string[] = state.view === "list" ? LIST_SORT_CYCLE : BOARD_SORT_CYCLE;
      const sort = typeof value === "string" && cycle.includes(value) ? (value as TicketSort) : defaultSort(state.view);
      return { ...state, sort };
    }
    default: {
      const filters = { ...state.filters };
      switch (key) {
        case "assignee":
          filters.assignee = Array.isArray(value) ? value.map(String) : [];
          break;
        case "unassigned":
          filters.unassigned = Boolean(value);
          break;
        case "priority":
          filters.priority = Array.isArray(value) ? value.filter(isTicketPriority) : [];
          break;
        case "label":
          filters.label = Array.isArray(value) ? value.map(Number).filter((n) => Number.isInteger(n) && n > 0) : [];
          break;
        case "due":
          filters.due = typeof value === "string" && (DUE_VALUES as readonly string[]).includes(value) ? (value as DueFilter) : null;
          break;
        case "q":
          filters.q = typeof value === "string" ? value : "";
          break;
      }
      return { ...state, filters };
    }
  }
}

export interface UseTicketFilters {
  filters: ResolvedFilters;
  /** Filters + sort in the shape the data hooks take. */
  queryFilters: TicketFilters & { sort: TicketSort };
  boardId: number | null;
  view: TicketView;
  sort: TicketSort;
  setFilter: (key: FilterKey, value: unknown) => void;
  setFilters: (changes: Partial<Record<FilterKey, unknown>>) => void;
  clear: () => void;
  cycleSort: () => void;
  toQueryString: () => string;
  hasActiveFilters: boolean;
  isManualSort: boolean;
}

export function useTicketFilters(): UseTicketFilters {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams?.toString() ?? "";

  const state = useMemo(
    () => parseTicketSearchParams(new URLSearchParams(search), readStoredBoardId()),
    [search],
  );

  const commit = useCallback(
    (next: TicketUrlState) => {
      if (next.boardId !== state.boardId) writeStoredBoardId(next.boardId);
      const qs = serializeTicketState(next);
      router.replace(qs ? `${pathname}?${qs}` : pathname || "/tickets", { scroll: false });
    },
    [router, pathname, state.boardId],
  );

  const setFilters = useCallback(
    (changes: Partial<Record<FilterKey, unknown>>) => {
      let next = state;
      for (const [k, v] of Object.entries(changes)) next = applyFilterChange(next, k as FilterKey, v);
      commit(next);
    },
    [state, commit],
  );

  const setFilter = useCallback((key: FilterKey, value: unknown) => setFilters({ [key]: value }), [setFilters]);

  const clear = useCallback(
    () => commit({ boardId: state.boardId, view: state.view, sort: defaultSort(state.view), filters: EMPTY_FILTERS }),
    [state, commit],
  );

  const cycleSort = useCallback(
    () => commit({ ...state, sort: nextSort(state.view, state.sort) }),
    [state, commit],
  );

  const toQueryString = useCallback(() => serializeTicketState(state), [state]);

  const queryFilters = useMemo(() => {
    const f = state.filters;
    return {
      assignee: f.assignee,
      unassigned: f.unassigned,
      priority: f.priority,
      label: f.label,
      due: f.due,
      q: f.q,
      sort: state.sort,
    };
  }, [state]);

  return {
    filters: state.filters,
    queryFilters,
    boardId: state.boardId,
    view: state.view,
    sort: state.sort,
    setFilter,
    setFilters,
    clear,
    cycleSort,
    toQueryString,
    hasActiveFilters: hasActive(state.filters),
    isManualSort: state.view === "board" && state.sort === "manual",
  };
}
