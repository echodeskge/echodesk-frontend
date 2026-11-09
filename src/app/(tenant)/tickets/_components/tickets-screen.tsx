"use client";

/**
 * The board page (`/tickets`, plan FE-06): picks the board, fills the app
 * header, renders the toolbar and every screen state, and hands the loaded
 * kanban to the board view (FE-07) or the list view (FE-08).
 *
 * Board choice (W11, E19): `?board=` when the lite boards include it, else the
 * stored board (via `useTicketFilters`), else the default board, else the
 * first. An unknown or inaccessible id is replaced in the URL (no history
 * entry), which also updates the stored board.
 *
 * States (W28, DC39), all translated:
 * loading · boards error · no boards (create vs. ask an admin) · board error ·
 * board access lost (403/404) · zero columns (Add column for managers) ·
 * no filter matches (Clear) · the board.
 *
 * The root carries `data-ws-ready` (RM8).
 */
import { useEffect, useMemo, type ReactNode } from "react";
import { AlertCircle, Columns3, KanbanSquare, Lock, SearchX } from "lucide-react";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useBoardAdmin } from "@/components/tickets-admin/board-admin-host";
import { useTicketsRealtime } from "../_contexts/tickets-realtime-context";
import { useBoardsLite } from "../_hooks/use-boards-lite";
import { useKanban } from "../_hooks/use-kanban";
import { useColumnCounts } from "../_hooks/use-ticket-list";
import { useTicketFilters, type ResolvedFilters } from "../_hooks/use-ticket-filters";
import { useTicketPermissions } from "../_hooks/use-ticket-permissions";
import { useTicketPickers } from "../_hooks/use-ticket-pickers";
import { flags } from "../_lib/flags";
import { tk } from "../_lib/query-keys";
import type { BoardLite, KanbanResponse, TicketSort, TicketView } from "../_lib/types";
import { TicketsHeaderBridge } from "./header/tickets-header-bridge";
import { CardSkeleton } from "./primitives/skeletons";
import { EmptyState } from "./primitives/empty-state";
import { resolveRealtimeBoardId } from "./tickets-wrapper";
import { TicketsToolbar, type ToolbarUser } from "./toolbar/tickets-toolbar";

/** What the board view (FE-07) receives. */
export interface BoardViewProps {
  board: BoardLite;
  data: KanbanResponse;
  filters: ResolvedFilters;
  sort: TicketSort;
  isManualSort: boolean;
  hasActiveFilters: boolean;
  isFetching: boolean;
}

/** What the list view (FE-08) receives. */
export interface ListViewProps {
  board: BoardLite;
  filters: ResolvedFilters;
  sort: TicketSort;
  hasActiveFilters: boolean;
}

export interface TicketsScreenProps {
  renderBoard: (props: BoardViewProps) => ReactNode;
  renderList?: (props: ListViewProps) => ReactNode;
  /** Overrides `flags.listViewEnabled` (tests, FE-INT). */
  listViewEnabled?: boolean;
}

export type ScreenState =
  | "loading"
  | "boards-error"
  | "no-boards"
  | "board-error"
  | "no-access"
  | "no-columns"
  | "no-matches"
  | "list"
  | "board";

function httpStatus(error: unknown): number | undefined {
  return (error as { response?: { status?: number } } | null)?.response?.status;
}

export function countCards(data: KanbanResponse | undefined): number {
  if (!data) return 0;
  return Object.values(data.tickets_by_column ?? {}).reduce((n, cards) => n + (cards?.length ?? 0), 0);
}

function userName(u: { full_name?: string; first_name?: string; last_name?: string; email?: string }): string {
  return u.full_name?.trim() || `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || u.email || "";
}

export function TicketsScreen({ renderBoard, renderList, listViewEnabled = flags.listViewEnabled }: TicketsScreenProps) {
  const t = useTranslations("ticketsScreen");
  const tTickets = useTranslations("tickets");
  const qc = useQueryClient();
  const { wsReady } = useTicketsRealtime();
  const perms = useTicketPermissions();
  const admin = useBoardAdmin();
  const { boardId: urlBoardId, view: urlView, filters, queryFilters, sort, isManualSort, hasActiveFilters, setFilter, clear } =
    useTicketFilters();

  const view: TicketView = listViewEnabled && renderList ? urlView : "board";
  const boards = useBoardsLite();
  const boardId = resolveRealtimeBoardId(urlBoardId, boards.data);
  const board = boards.data?.find((b) => b.id === boardId) ?? null;

  // Replace an unknown / inaccessible / missing board in the URL (W11).
  useEffect(() => {
    if (boards.data && boardId !== null && boardId !== urlBoardId) setFilter("board", boardId);
  }, [boards.data, boardId, urlBoardId, setFilter]);

  const kanban = useKanban(view === "board" ? boardId : null, queryFilters);
  const columnCounts = useColumnCounts(view === "list" ? boardId : null, {
    ...queryFilters,
    sort: sort === "manual" ? undefined : sort,
  });
  const pickers = useTicketPickers(boardId, { enabled: boardId !== null });

  const toolbarUsers: ToolbarUser[] = useMemo(
    () =>
      pickers.users
        .filter((u) => u.is_active !== false)
        .map((u) => ({ id: u.id, name: userName(u) }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [pickers.users],
  );

  const kanbanStatus = httpStatus(kanban.error);
  const accessLost = !!kanban.error && (kanbanStatus === 403 || kanbanStatus === 404);
  useEffect(() => {
    // The board may have been taken away: refetch the list so the fallback picks another one.
    if (accessLost) qc.invalidateQueries({ queryKey: tk.boards() });
  }, [accessLost, qc]);

  const selectBoard = (id: number) => setFilter("board", id);
  const createBoard = () => admin.openCreateBoard({ onCreated: (b) => selectBoard(b.id) });

  const total = view === "board" ? countCards(kanban.data) : sumCounts(columnCounts.data?.counts);
  const kanbanReady = view === "board" && !!kanban.data && kanban.data.board?.id === boardId;
  const countReady = view === "board" ? kanbanReady : !!columnCounts.data;

  let state: ScreenState;
  if (boards.isLoading) state = "loading";
  else if (boards.isError) state = "boards-error";
  else if (!boards.data?.length || !board) state = "no-boards";
  else if (view === "list") state = "list";
  else if (accessLost) state = "no-access";
  else if (kanban.isError && !kanbanReady) state = "board-error";
  else if (!kanbanReady) state = "loading";
  else if (kanban.data!.columns.length === 0) state = "no-columns";
  else if (hasActiveFilters && total === 0) state = "no-matches";
  else state = "board";

  const showToolbar = board !== null && state !== "no-access" && state !== "board-error" && state !== "no-columns";

  let body: ReactNode;
  switch (state) {
    case "loading":
      body = <BoardSkeleton />;
      break;
    case "boards-error":
      body = (
        <EmptyState
          icon={AlertCircle}
          title={t("board.errorBoards")}
          action={<RetryButton label={t("board.retry")} onClick={() => boards.refetch()} />}
        />
      );
      break;
    case "no-boards":
      body = perms.canCreateBoard ? (
        <EmptyState
          icon={KanbanSquare}
          title={t("board.noBoards")}
          description={t("board.noBoardsHint")}
          action={
            <Button size="sm" onClick={createBoard} data-testid="create-board">
              {t("board.createBoard")}
            </Button>
          }
        />
      ) : (
        <EmptyState icon={Lock} title={t("board.noBoardsAccess")} description={t("board.noBoardsAccessHint")} />
      );
      break;
    case "no-access":
      body = <EmptyState icon={Lock} title={tTickets("toasts.boardAccessLost")} />;
      break;
    case "board-error":
      body = (
        <EmptyState
          icon={AlertCircle}
          title={t("board.errorKanban")}
          action={<RetryButton label={t("board.retry")} onClick={() => kanban.refetch()} />}
        />
      );
      break;
    case "no-columns":
      body = perms.canManageColumns ? (
        <EmptyState
          icon={Columns3}
          title={t("board.noColumns")}
          description={t("board.noColumnsHint")}
          action={
            <Button size="sm" onClick={() => board && admin.openEditColumns(board)} data-testid="add-column">
              {t("board.addColumn")}
            </Button>
          }
        />
      ) : (
        <EmptyState icon={Columns3} title={t("board.noColumns")} />
      );
      break;
    case "no-matches":
      body = (
        <EmptyState
          icon={SearchX}
          title={t("board.noMatches")}
          action={
            <Button size="sm" variant="outline" onClick={clear} data-testid="clear-filters">
              {t("board.clearFilters")}
            </Button>
          }
        />
      );
      break;
    case "list":
      body = renderList!({ board: board!, filters, sort, hasActiveFilters });
      break;
    case "board":
      body = renderBoard({
        board: board!,
        data: kanban.data!,
        filters,
        sort,
        isManualSort,
        hasActiveFilters,
        isFetching: kanban.isFetching,
      });
      break;
  }

  return (
    <div
      data-testid="tickets-screen"
      data-ws-ready={wsReady ? "true" : "false"}
      data-state={state}
      className="flex min-h-0 w-full flex-1 flex-col"
    >
      {boards.data && <TicketsHeaderBridge boards={boards.data} currentBoard={board} onSelectBoard={selectBoard} />}
      {showToolbar && (
        <TicketsToolbar
          count={countReady ? total : null}
          users={toolbarUsers}
          tags={pickers.tags.map((tag) => ({ id: tag.id, name: tag.name, color: tag.color ?? "" }))}
          listViewEnabled={listViewEnabled && !!renderList}
          boardId={boardId}
        />
      )}
      <div className="flex min-h-0 flex-1 flex-col" data-testid="tickets-body">
        {body}
      </div>
    </div>
  );
}

function sumCounts(counts: Record<string, number> | undefined): number {
  return Object.values(counts ?? {}).reduce((n, c) => n + (c ?? 0), 0);
}

function RetryButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button size="sm" variant="outline" onClick={onClick} data-testid="retry">
      {label}
    </Button>
  );
}

/** Column-shaped placeholders while the boards or the kanban load. */
function BoardSkeleton() {
  return (
    <div aria-busy="true" data-testid="board-skeleton" className="flex min-h-0 flex-1 gap-3 overflow-hidden p-3">
      {[3, 2, 1, 1].map((cards, i) => (
        <div key={i} className="flex w-[min(85vw,272px)] shrink-0 flex-col gap-2 rounded-lg bg-muted/50 p-1.5 pt-2.5">
          <div className="mx-1 mb-1 h-4 w-24 rounded bg-muted" />
          {Array.from({ length: cards }, (_, j) => (
            <CardSkeleton key={j} />
          ))}
        </div>
      ))}
    </div>
  );
}
