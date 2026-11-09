"use client";

/**
 * The list view (plan §3 List, FE-08, DC17, DC18).
 *
 * Contract for the screen (FE-06 `tickets-screen.tsx`):
 *
 *   <TicketsScreen renderList={(p) => <TicketList {...p} />} />
 *
 * - A sticky 32px header on the list grid, hidden below `md` (DC18).
 * - One 34px group row per column of the board, in position order, empty
 *   columns included. The count is the filtered per-column total from
 *   `column_counts` (A5b), not the number of loaded rows (DC17). Its `+`
 *   opens the create sheet on that column (gated by `canCreateTicket`).
 * - Rows come from `GET tickets/?group=column` (A3) in pages of 50, loaded as
 *   the end of the loaded rows scrolls into view. The server orders by column
 *   first, so a column's rows never split across groups; groups the loaded
 *   pages haven't reached yet show a placeholder row instead of looking empty.
 * - A row opens `/tickets/<id>?<filters>` (back and J/K keep the list order).
 * - Realtime: every board event refetches the list and the column counts
 *   (both prefixes); the server decides membership and order.
 *
 * States: loading, load error (retry), board access lost, zero columns
 * (DC39), no filter matches (Clear).
 */
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Lock, Plus, SearchX } from "lucide-react";
import type { Board, TicketColumn } from "@/api/generated/interfaces";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useBoardAdmin } from "@/components/tickets-admin/board-admin-host";
import { useTicketCreate } from "@/contexts/TicketCreateContext";
import { cn } from "@/lib/utils";
import { ColorDot, EmptyState, RowSkeleton } from "../primitives";
import { BoardNoColumns } from "../board/kanban-board";
import type { ListViewProps } from "../tickets-screen";
import { useBoardEvents } from "../../_contexts/tickets-realtime-context";
import { groupByColumn, useColumnCounts, useTicketList } from "../../_hooks/use-ticket-list";
import { useTicketFilters } from "../../_hooks/use-ticket-filters";
import { useTicketPermissions } from "../../_hooks/use-ticket-permissions";
import { useTicketPickers } from "../../_hooks/use-ticket-pickers";
import { errorStatus } from "../../_lib/api";
import { tk } from "../../_lib/query-keys";
import type { BoardEvent, TicketListRow } from "../../_lib/types";
import { LIST_GRID_CLASS, ListRow } from "./list-row";

export type TicketListProps = ListViewProps;

/** `ticket_activity` kinds that change something a list row shows (the comment count). */
const ROW_ACTIVITY_KINDS = new Set(["comment", "comment_deleted"]);

/** True when a board event can change the list rows or the group totals. */
export function listNeedsRefresh(event: BoardEvent): boolean {
  if (event.type === "ticket_activity") return ROW_ACTIVITY_KINDS.has(event.kind);
  return true;
}

/** Refetch every filter combination of the board's list rows and column totals. */
export function invalidateList(qc: ReturnType<typeof useQueryClient>, boardId: number) {
  qc.invalidateQueries({ queryKey: ["ticketList", boardId] });
  qc.invalidateQueries({ queryKey: ["ticketColumnCounts", boardId] });
}

interface GroupColumn {
  id: number;
  name: string;
  color?: string | null;
  position?: number;
}

export function TicketList({ board, hasActiveFilters }: TicketListProps) {
  const t = useTranslations("ticketsScreen");
  const tTickets = useTranslations("tickets");
  const qc = useQueryClient();
  const perms = useTicketPermissions();
  const admin = useBoardAdmin();
  const { openTicketCreate } = useTicketCreate();
  const { queryFilters, sort, clear, toQueryString } = useTicketFilters();
  const boardId = board.id;

  const pickers = useTicketPickers(boardId);
  const columnsQuery = pickers.queries.columns;
  const columns = pickers.columns as GroupColumn[];
  // Same key as the screen's call, so the toolbar total and the group totals share one request.
  const listFilters = useMemo(
    () => ({ ...queryFilters, sort: sort === "manual" ? undefined : sort }),
    [queryFilters, sort],
  );
  const counts = useColumnCounts(boardId, listFilters);
  const list = useTicketList(boardId, listFilters);
  const query = toQueryString();

  // --- realtime ------------------------------------------------------------
  useBoardEvents(
    useCallback(
      (event: BoardEvent) => {
        if (listNeedsRefresh(event)) invalidateList(qc, boardId);
      },
      [qc, boardId],
    ),
  );

  // --- rows and groups -----------------------------------------------------
  const rows = useMemo<TicketListRow[]>(() => {
    const seen = new Set<number>();
    const out: TicketListRow[] = [];
    // A row can move between pages while paging (a refetch, a concurrent edit): keep the first.
    for (const page of list.data?.pages ?? []) {
      for (const row of page.results ?? []) {
        if (seen.has(row.id)) continue;
        seen.add(row.id);
        out.push(row);
      }
    }
    return out;
  }, [list.data]);

  const groups = useMemo(() => groupByColumn(rows, columns), [rows, columns]);
  const hasMore = !!list.hasNextPage;
  // The last group the loaded pages reached; later groups with tickets are still pending.
  const frontier = useMemo(() => {
    if (!hasMore) return groups.length - 1;
    for (let i = groups.length - 1; i >= 0; i--) if (groups[i].rows.length > 0) return i;
    return -1;
  }, [groups, hasMore]);

  // --- infinite scroll -----------------------------------------------------
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { fetchNextPage, isFetchingNextPage } = list;
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !isFetchingNextPage) void fetchNextPage();
      },
      { root: scrollRef.current, rootMargin: "0px 0px 400px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, isFetchingNextPage, fetchNextPage, frontier, rows.length]);

  const onAddTicket = useCallback(
    (column: GroupColumn) =>
      openTicketCreate(board as unknown as Board, { ...column, board: boardId } as unknown as TicketColumn),
    [openTicketCreate, board, boardId],
  );

  // --- states ----------------------------------------------------------------
  const listStatus = errorStatus(list.error) ?? errorStatus(columnsQuery.error);
  const accessLost = listStatus === 403 || listStatus === 404;
  useEffect(() => {
    if (accessLost) qc.invalidateQueries({ queryKey: tk.boards() });
  }, [accessLost, qc]);

  const total = counts.data ? Object.values(counts.data.counts ?? {}).reduce((n, c) => n + (c ?? 0), 0) : null;

  if (accessLost) {
    return <EmptyState icon={Lock} title={tTickets("toasts.boardAccessLost")} />;
  }
  if ((list.isError && !list.data) || (columnsQuery.isError && !columnsQuery.data)) {
    return (
      <EmptyState
        icon={AlertCircle}
        title={t("board.errorKanban")}
        action={
          <Button
            size="sm"
            variant="outline"
            data-testid="list-retry"
            onClick={() => {
              void list.refetch();
              void columnsQuery.refetch();
            }}
          >
            {t("board.retry")}
          </Button>
        }
      />
    );
  }
  if (!columnsQuery.data || !list.data) {
    return <ListSkeleton />;
  }
  if (columns.length === 0) {
    return (
      <BoardNoColumns
        canManageColumns={perms.canManageColumns}
        onAddColumn={() => admin.openEditColumns({ id: board.id, name: board.name, color: board.color })}
      />
    );
  }
  if (hasActiveFilters && rows.length === 0 && !hasMore && (total === null || total === 0)) {
    return (
      <EmptyState
        icon={SearchX}
        title={t("board.noMatches")}
        action={
          <Button size="sm" variant="outline" onClick={clear} data-testid="list-clear-filters">
            {t("board.clearFilters")}
          </Button>
        }
      />
    );
  }

  return (
    <div
      ref={scrollRef}
      data-testid="ticket-list"
      data-fetching={list.isFetching ? "true" : "false"}
      className="min-h-0 flex-1 overflow-auto"
    >
      <div
        aria-hidden="true"
        data-testid="list-header"
        className={cn(
          "sticky top-0 z-[1] hidden h-8 items-center border-b bg-background px-4 md:grid",
          "text-[11px] font-medium uppercase tracking-[.03em] text-muted-foreground",
          LIST_GRID_CLASS,
        )}
      >
        <span />
        {(["id", "title", "labels", "assignee", "comments", "created"] as const).map((key) => (
          <span
            key={key}
            title={t(`list.${key}`)}
            className={cn("truncate pr-2", (key === "comments" || key === "created") && "pr-0 text-right")}
          >
            {t(`list.${key}`)}
          </span>
        ))}
      </div>

      {groups.map(({ column, rows: groupRows }, i) => {
        const count = counts.data?.counts?.[String(column.id)];
        const pending = hasMore && i > frontier && (count ?? 1) > 0;
        const headingId = `list-group-${column.id}`;
        return (
          <section
            key={column.id}
            aria-labelledby={headingId}
            data-testid="list-group"
            data-column-id={column.id}
            data-pending={pending ? "true" : undefined}
          >
            <div className="flex h-[34px] items-center gap-2 border-b bg-muted/50 px-4" data-testid="list-group-header">
              <ColorDot color={column.color ?? undefined} size={8} />
              <h3 id={headingId} className="truncate text-[13px] font-semibold">
                {column.name}
              </h3>
              {typeof count === "number" && (
                <span
                  className="text-xs tabular-nums text-muted-foreground"
                  data-testid="list-group-count"
                  title={t("list.groupCount", { count })}
                >
                  <span aria-hidden="true">{count}</span>
                  <span className="sr-only">{t("list.groupCount", { count })}</span>
                </span>
              )}
              {perms.canCreateTicket && (
                <button
                  type="button"
                  onClick={() => onAddTicket(column)}
                  aria-label={t("board.addTicket")}
                  title={t("board.addTicket")}
                  data-testid="list-group-add"
                  className="ml-auto inline-flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  <Plus aria-hidden="true" size={14} />
                </button>
              )}
            </div>
            {groupRows.map((row) => (
              <ListRow key={row.id} row={row} query={query} />
            ))}
            {pending && <RowSkeleton />}
            {i === frontier && hasMore && <div ref={sentinelRef} data-testid="list-sentinel" className="h-px" />}
          </section>
        );
      })}
      {frontier < 0 && hasMore && <div ref={sentinelRef} data-testid="list-sentinel" className="h-px" />}

      {isFetchingNextPage && (
        <div
          role="status"
          data-testid="list-loading-more"
          className="flex h-10 items-center justify-center gap-2 text-xs text-muted-foreground"
        >
          <Spinner className="size-3.5" />
          {t("list.loadingMore")}
        </div>
      )}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div aria-busy="true" data-testid="list-skeleton" className="min-h-0 flex-1 overflow-hidden">
      <div className="hidden h-8 border-b md:block" />
      {[4, 3, 2].map((n, g) => (
        <div key={g}>
          <div className="flex h-[34px] items-center gap-2 border-b bg-muted/50 px-4">
            <span className="size-2 rounded-full bg-muted" />
            <span className="h-3 w-24 rounded bg-muted" />
          </div>
          {Array.from({ length: n }, (_, j) => (
            <RowSkeleton key={j} />
          ))}
        </div>
      ))}
    </div>
  );
}
