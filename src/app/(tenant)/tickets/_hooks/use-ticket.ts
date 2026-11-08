"use client";

import { useQuery } from "@tanstack/react-query";
import { errorStatus, getActivity, getHistory, getTicket } from "../_lib/api";
import { tk } from "../_lib/query-keys";
import type { ActivityItem, HistoryEntry, TicketDetail } from "../_lib/types";

/** Don't retry "not found" / "forbidden": the screen shows its error state at once. */
export function retryUnlessDenied(failureCount: number, error: unknown): boolean {
  const status = errorStatus(error);
  if (status === 401 || status === 403 || status === 404) return false;
  return failureCount < 2;
}

function validId(id: number | null | undefined): id is number {
  return typeof id === "number" && Number.isInteger(id) && id > 0;
}

/** Full ticket detail (A7). */
export function useTicket(id: number | null | undefined, options: { enabled?: boolean } = {}) {
  return useQuery<TicketDetail>({
    queryKey: tk.ticket(id ?? 0),
    queryFn: () => getTicket(id as number),
    enabled: options.enabled !== false && validId(id),
    retry: retryUnlessDenied,
    staleTime: 30_000,
  });
}

/** Comments + history timeline, oldest first (A9). */
export function useTicketActivity(id: number | null | undefined, options: { enabled?: boolean } = {}) {
  return useQuery<ActivityItem[]>({
    queryKey: tk.activity(id ?? 0),
    queryFn: () => getActivity(id as number),
    enabled: options.enabled !== false && validId(id),
    retry: retryUnlessDenied,
    staleTime: 30_000,
  });
}

/** History & transfers dialog data (A10); replaces the deleted api/useTickets hook. */
export function useTicketHistory(id: number | null | undefined, options: { enabled?: boolean } = {}) {
  return useQuery<HistoryEntry[]>({
    queryKey: tk.history(id ?? 0),
    queryFn: () => getHistory(id as number),
    enabled: options.enabled !== false && validId(id),
    retry: retryUnlessDenied,
  });
}
