"use client";

/**
 * "x of n", prev/next and the back link for the detail page (plan A6, E19).
 *
 * The detail URL carries the board page's query (`?board=&view=&assignee=…`),
 * so the position, J/K and "back" follow the order the user came from.
 * Prev/next keep that query and use `router.replace`, so the browser's Back
 * returns to the board instead of walking through every ticket visited.
 */
import { useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getNavigation } from "../../_lib/api";
import { tk } from "../../_lib/query-keys";
import type { NavFilters, Navigation } from "../../_lib/types";
import { retryUnlessDenied } from "../../_hooks/use-ticket";
import {
  EMPTY_FILTERS,
  defaultSort,
  parseTicketSearchParams,
  serializeTicketState,
  type TicketUrlState,
} from "../../_hooks/use-ticket-filters";

/** The board page link for a ticket on `ticketBoardId`, keeping the source filters when they belong to that board. */
export function backHref(state: TicketUrlState, ticketBoardId: number | null | undefined): string {
  const boardId = ticketBoardId ?? state.boardId;
  const sameBoard = !state.boardId || !ticketBoardId || state.boardId === ticketBoardId;
  const next: TicketUrlState = sameBoard
    ? { ...state, boardId }
    : { boardId, view: state.view, sort: defaultSort(state.view), filters: EMPTY_FILTERS };
  const qs = serializeTicketState(next);
  return qs ? `/tickets?${qs}` : "/tickets";
}

/** Another ticket's detail link with the same query string. */
export function ticketDetailHref(id: number, search: string): string {
  const qs = search.replace(/^\?/, "");
  return qs ? `/tickets/${id}?${qs}` : `/tickets/${id}`;
}

export function navFiltersOf(state: TicketUrlState): NavFilters {
  const f = state.filters;
  return {
    view: state.view,
    sort: state.sort,
    assignee: f.assignee,
    unassigned: f.unassigned,
    priority: f.priority,
    label: f.label,
    due: f.due,
    q: f.q,
  };
}

export interface TicketNavigation {
  /** 1-based position, or null while loading / when the ticket doesn't match the filters. */
  position: number | null;
  total: number | null;
  prevId: number | null;
  nextId: number | null;
  goPrev: () => void;
  goNext: () => void;
  /** Detail link for another ticket, keeping the query. */
  hrefFor: (id: number) => string;
  /** The board page with the source filters (or just the ticket's board after a transfer). */
  backHref: string;
  /** The parsed URL state (board, view, sort, filters). */
  urlState: TicketUrlState;
}

export function useTicketNavigation(ticketId: number, ticketBoardId: number | null | undefined): TicketNavigation {
  const router = useRouter();
  const searchParams = useSearchParams();
  const search = searchParams?.toString() ?? "";
  const urlState = useMemo(() => parseTicketSearchParams(new URLSearchParams(search)), [search]);
  const filters = useMemo(() => navFiltersOf(urlState), [urlState]);

  const query = useQuery<Navigation>({
    queryKey: tk.navigation(ticketId, filters),
    queryFn: () => getNavigation(ticketId, filters),
    enabled: Number.isInteger(ticketId) && ticketId > 0,
    placeholderData: keepPreviousData,
    retry: retryUnlessDenied,
    staleTime: 30_000,
  });

  // A placeholder from the previous ticket must not drive this ticket's buttons.
  const nav = query.isPlaceholderData ? undefined : query.data;
  const prevId = nav?.prev_id ?? null;
  const nextId = nav?.next_id ?? null;

  const hrefFor = useCallback((id: number) => ticketDetailHref(id, search), [search]);
  const goPrev = useCallback(() => {
    if (prevId) router.replace(hrefFor(prevId), { scroll: false });
  }, [prevId, router, hrefFor]);
  const goNext = useCallback(() => {
    if (nextId) router.replace(hrefFor(nextId), { scroll: false });
  }, [nextId, router, hrefFor]);

  // `index` is 1-based (B2 `keyset_neighbors`); null when the ticket doesn't match the filters.
  const index = nav?.index;
  return {
    position: typeof index === "number" ? index : null,
    total: typeof index === "number" ? (nav?.total ?? null) : null,
    prevId,
    nextId,
    goPrev,
    goNext,
    hrefFor,
    backHref: backHref(urlState, ticketBoardId),
    urlState,
  };
}
