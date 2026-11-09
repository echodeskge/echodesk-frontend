"use client";

/**
 * Tickets route wrapper (plan FE-02).
 *
 * Mounts `TicketsRealtimeProvider` for every `/tickets` route and keeps the
 * socket on the right board:
 * - board page (`/tickets`): the `?board=` / stored board, once the lite
 *   boards confirm it is accessible; otherwise the default (or first) board;
 * - detail page (`/tickets/<id>`): `ticket.board.id` (critic 17).
 *
 * Route-wide cache upkeep, so individual screens don't have to:
 * - created / deleted / moved events, and updates that touch assignees,
 *   priority, due date, column or closed state, invalidate the sidebar view
 *   counts, the lite boards and the column counts, debounced by 1s. Own echoes
 *   count too (F19, E33).
 * - checklist / attachment / comment-deleted activity refetches the board
 *   and list caches (debounced): B2 does not refresh card counters for these.
 * - an unknown frame type invalidates the board (forward compatibility).
 * - 4403: a translated toast and a refetch of the lite boards.
 */
import { Suspense, useCallback, useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useBoardsLite } from "../_hooks/use-boards-lite";
import { useTicket } from "../_hooks/use-ticket";
import { useTicketFilters } from "../_hooks/use-ticket-filters";
import { TicketsRealtimeProvider, useTicketsRealtime } from "../_contexts/tickets-realtime-context";
import { tk } from "../_lib/query-keys";
import type { BoardEvent, BoardLite, TicketDetail } from "../_lib/types";

export const COUNTS_DEBOUNCE_MS = 1000;

/** `ticket_updated` change keys that can move a ticket between saved views or columns. */
const COUNT_FIELDS: ReadonlySet<string> = new Set([
  "assignees",
  "assigned_to",
  "assigned_users",
  "assigned_groups",
  "priority",
  "due_date",
  "column",
  "column_id",
  "status",
  "is_closed",
  "board",
]);

/** `ticket_activity` kinds whose card counters B2 does not push. */
const CARD_REFRESH_KINDS: ReadonlySet<string> = new Set(["checklist", "attachment", "comment_deleted"]);

export function affectsCounts(event: BoardEvent): boolean {
  switch (event.type) {
    case "ticket_created":
    case "ticket_deleted":
    case "ticket_moved":
      return true;
    case "ticket_updated":
      return Object.keys(event.changes ?? {}).some((k) => COUNT_FIELDS.has(k));
    default:
      return false;
  }
}

export function needsCardRefresh(event: BoardEvent): boolean {
  return event.type === "ticket_activity" && CARD_REFRESH_KINDS.has(event.kind);
}

/** The board to listen to on the board page; null while the boards are loading. */
export function resolveRealtimeBoardId(urlBoardId: number | null, boards: BoardLite[] | undefined): number | null {
  if (!boards) return null;
  if (urlBoardId && boards.some((b) => b.id === urlBoardId)) return urlBoardId;
  return (boards.find((b) => b.is_default) ?? boards[0])?.id ?? null;
}

export function detailTicketId(pathname: string | null): number | null {
  const m = /\/tickets\/(\d+)\/?$/.exec(pathname ?? "");
  return m ? Number(m[1]) : null;
}

export function isBoardPath(pathname: string | null): boolean {
  return /\/tickets\/?$/.test(pathname ?? "");
}

function boardOfTicket(ticket: TicketDetail | undefined): number | null {
  return ticket?.board?.id ?? (ticket as { column?: { board?: number } } | undefined)?.column?.board ?? null;
}

export function invalidateCounts(qc: QueryClient, boardIds: Iterable<number>) {
  qc.invalidateQueries({ queryKey: ["ticketViewCounts"] });
  qc.invalidateQueries({ queryKey: tk.boards() });
  for (const id of boardIds) qc.invalidateQueries({ queryKey: ["ticketColumnCounts", id] });
}

/** A trailing debounce that collects board ids between flushes. */
function useBoardDebounce(flush: (boardIds: Set<number>) => void) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef(new Set<number>());
  const flushRef = useRef(flush);
  useEffect(() => {
    flushRef.current = flush;
  });
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  return useCallback((ids: (number | null | undefined)[]) => {
    for (const id of ids) if (typeof id === "number" && id > 0) pending.current.add(id);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      const batch = pending.current;
      pending.current = new Set();
      flushRef.current(batch);
    }, COUNTS_DEBOUNCE_MS);
  }, []);
}

function RealtimeBoardSync() {
  const pathname = usePathname();
  const { boardId: urlBoardId } = useTicketFilters();
  const onBoardPage = isBoardPath(pathname);
  const ticketId = detailTicketId(pathname);
  const boards = useBoardsLite({ enabled: onBoardPage });
  const ticket = useTicket(ticketId, { enabled: ticketId !== null });
  const { setBoardId } = useTicketsRealtime();

  const target = onBoardPage
    ? resolveRealtimeBoardId(urlBoardId, boards.data)
    : ticketId !== null
      ? boardOfTicket(ticket.data)
      : null;

  useEffect(() => {
    setBoardId(target);
  }, [target, setBoardId]);

  return null;
}

function RealtimeCacheSync() {
  const qc = useQueryClient();
  const { subscribe, boardId } = useTicketsRealtime();
  const boardIdRef = useRef(boardId);
  useEffect(() => {
    boardIdRef.current = boardId;
  });

  const scheduleCounts = useBoardDebounce((ids) => invalidateCounts(qc, ids));
  const scheduleCards = useBoardDebounce((ids) => {
    for (const id of ids) {
      qc.invalidateQueries({ queryKey: ["kanbanBoard", id] });
      qc.invalidateQueries({ queryKey: ["ticketList", id] });
    }
  });

  useEffect(
    () =>
      subscribe((event) => {
        const current = boardIdRef.current;
        if (affectsCounts(event)) {
          const extra = event.type === "ticket_deleted" ? event.to_board_id : null;
          scheduleCounts([current, extra]);
        }
        if (needsCardRefresh(event)) scheduleCards([current]);
      }),
    [subscribe, scheduleCounts, scheduleCards],
  );

  return null;
}

export function TicketsWrapper({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const t = useTranslations("tickets");
  const scheduleBoard = useBoardDebounce((ids) => {
    for (const id of ids) qc.invalidateQueries({ queryKey: ["kanbanBoard", id] });
  });

  const onAccessDenied = useCallback(() => {
    toast.error(t("toasts.boardAccessLost"));
    qc.invalidateQueries({ queryKey: tk.boards() });
  }, [qc, t]);

  const onUnknownFrame = useCallback(
    (_frame: Record<string, unknown>, boardId: number | null) => scheduleBoard([boardId]),
    [scheduleBoard],
  );

  return (
    <TicketsRealtimeProvider onAccessDenied={onAccessDenied} onUnknownFrame={onUnknownFrame}>
      <Suspense fallback={null}>
        <RealtimeBoardSync />
      </Suspense>
      <RealtimeCacheSync />
      <TicketsRoot>{children}</TicketsRoot>
    </TicketsRealtimeProvider>
  );
}

function TicketsRoot({ children }: { children: ReactNode }) {
  const { wsReady } = useTicketsRealtime();
  return (
    <div className="flex h-full min-h-0 w-full flex-col" data-testid="tickets-wrapper" data-ws-ready={wsReady}>
      {children}
    </div>
  );
}
