"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/useDebounce";
import { getKanban } from "../_lib/api";
import { tk } from "../_lib/query-keys";
import type { BoardFilters, KanbanResponse } from "../_lib/types";

export const SEARCH_DEBOUNCE_MS = 300;

/**
 * Lite kanban payload for a board with the A4 filters (A2). The search text
 * is debounced by 300ms so typing doesn't fire a request per key; the other
 * filters apply immediately. The previous board stays on screen while a new
 * filter combination loads.
 */
export function useKanban(boardId: number | null, filters: BoardFilters = {}) {
  const q = useDebounce(filters.q ?? "", SEARCH_DEBOUNCE_MS);
  const effective: BoardFilters = { ...filters, q };
  return useQuery<KanbanResponse>({
    queryKey: tk.board(boardId ?? 0, effective),
    queryFn: () => getKanban(boardId as number, effective),
    enabled: !!boardId,
    placeholderData: (prev, prevQuery) =>
      prevQuery && prevQuery.queryKey[1] === boardId ? keepPreviousData(prev) : undefined,
    staleTime: 30_000,
    gcTime: 2 * 60_000,
    refetchOnWindowFocus: true,
  });
}
