"use client";

import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/useDebounce";
import { getColumnCounts, getTicketList, nextPageNumber } from "../_lib/api";
import { tk } from "../_lib/query-keys";
import type { ColumnCounts, KanbanColumn, ListFilters, Paginated, TicketListRow } from "../_lib/types";
import { SEARCH_DEBOUNCE_MS } from "./use-kanban";

/** Paged list rows for a board (A3), always grouped by column on the server. */
export function useTicketList(boardId: number | null, filters: ListFilters = {}) {
  const q = useDebounce(filters.q ?? "", SEARCH_DEBOUNCE_MS);
  const effective: ListFilters = { ...filters, q };
  return useInfiniteQuery<Paginated<TicketListRow>>({
    queryKey: tk.list(boardId ?? 0, effective),
    queryFn: ({ pageParam }) => getTicketList(boardId as number, effective, pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (last) => nextPageNumber(last.next) ?? undefined,
    enabled: !!boardId,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

/** Per-column totals for the list group headers, within the filters (A5b). */
export function useColumnCounts(boardId: number | null, filters: ListFilters = {}) {
  const q = useDebounce(filters.q ?? "", SEARCH_DEBOUNCE_MS);
  const effective: ListFilters = { ...filters, q, sort: undefined };
  return useQuery<ColumnCounts>({
    queryKey: tk.columnCounts(boardId ?? 0, effective),
    queryFn: () => getColumnCounts(boardId as number, effective),
    enabled: !!boardId,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export interface ColumnGroup<C extends Pick<KanbanColumn, "id" | "position"> = KanbanColumn> {
  column: C;
  rows: TicketListRow[];
}

/**
 * Group loaded rows by column: every column appears, in position order,
 * including empty ones; rows keep their server order inside a group. Rows
 * whose column isn't in `columns` (stale cache after a transfer) are dropped.
 */
export function groupByColumn<C extends Pick<KanbanColumn, "id" | "position">>(
  rows: TicketListRow[],
  columns: C[],
): ColumnGroup<C>[] {
  const sorted = [...columns].sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || a.id - b.id);
  const byId = new Map<number, TicketListRow[]>(sorted.map((c) => [c.id, []]));
  for (const row of rows) byId.get(row.column?.id)?.push(row);
  return sorted.map((column) => ({ column, rows: byId.get(column.id) ?? [] }));
}
