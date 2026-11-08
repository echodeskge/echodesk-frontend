"use client";

import { useQuery } from "@tanstack/react-query";
import { authService } from "@/services/auth";
import { getBoardsLite, getViewCounts } from "../_lib/api";
import { tk } from "../_lib/query-keys";
import type { BoardLite, ViewCounts } from "../_lib/types";

/** Accessible boards, lite shape, every page (A1). `data` is always an array once loaded. */
export function useBoardsLite(options: { enabled?: boolean } = {}) {
  return useQuery<BoardLite[]>({
    queryKey: tk.boards(),
    queryFn: getBoardsLite,
    enabled: options.enabled !== false && authService.isAuthenticated(),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}

/** Sidebar view counts for a board, or across all accessible boards when null (A5). */
export function useViewCounts(boardId: number | null, options: { enabled?: boolean } = {}) {
  return useQuery<ViewCounts>({
    queryKey: tk.viewCounts(boardId),
    queryFn: () => getViewCounts(boardId),
    enabled: options.enabled !== false && authService.isAuthenticated(),
    staleTime: 30_000,
  });
}
