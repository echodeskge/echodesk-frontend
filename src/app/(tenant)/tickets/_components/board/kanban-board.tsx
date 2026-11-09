"use client";

/**
 * The kanban board (plan FE-07, E20, E21, E33, R11, R12).
 *
 * Contract for the screen (FE-06 `tickets-screen.tsx`):
 *
 *   <KanbanBoard boardId={boardId} />
 *
 * It reads the URL state itself (`useTicketFilters`) and renders straight from
 * `useKanban(boardId, queryFilters)`, i.e. the `tk.board(boardId, filters)`
 * cache, so the screen can call the same hook for its count and states without
 * a second request. It renders its own loading skeleton, load error and the
 * zero-columns state (DC39); "no boards" / "no access" / "no matches" belong to
 * the screen.
 *
 * Drag and drop (`@hello-pangea/dnd`: mouse, touch and keyboard):
 * - drag start cancels in-flight kanban fetches (R12) and sends `ticket_moving`;
 * - cards: optimistic local move, then `move_to_column` with a mutation id; on
 *   error the board is refetched (never a snapshot restore) and a toast shown;
 * - with filters active the drop index becomes the visible neighbour's
 *   absolute position (`computeAbsolutePosition`);
 * - with a non-manual sort, reordering inside a column is disabled and
 *   cross-column moves omit `position_in_column` (the server appends);
 * - columns reorder by dragging the header (`manage_columns` only).
 *
 * Realtime: foreign board events are applied per E33 (`realtime-board.ts`).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable, type BeforeCapture, type DragStart, type DropResult } from "@hello-pangea/dnd";
import { AlertTriangle, Columns3, Plus } from "lucide-react";
import { toast } from "sonner";
import { columnsDestroy, columnsReorderCreate } from "@/api/generated/api";
import type { Board, TicketColumn } from "@/api/generated/interfaces";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useBoardAdmin } from "@/components/tickets-admin/board-admin-host";
import { httpStatus, invalidateBoardColumns } from "@/components/tickets-admin/admin-api";
import { useTicketCreate } from "@/contexts/TicketCreateContext";
import { cn } from "@/lib/utils";
import { CardSkeleton, EmptyState } from "../primitives";
import { useKanban } from "../../_hooks/use-kanban";
import { useTicketFilters } from "../../_hooks/use-ticket-filters";
import { useTicketMutations } from "../../_hooks/use-ticket-mutations";
import { useTicketPermissions } from "../../_hooks/use-ticket-permissions";
import { useBoardEvents, useTicketsRealtime } from "../../_contexts/tickets-realtime-context";
import {
  applyDelete,
  applyMove,
  applyReorderColumns,
  applyVisibleMove,
  columnTickets,
  computeAbsolutePosition,
  findCard,
} from "../../_lib/board-cache";
import { applyBoardEvent } from "../../_lib/realtime-board";
import type { KanbanColumn as KanbanColumnData, KanbanResponse, TicketCard as TicketCardData } from "../../_lib/types";
import { COLUMN_WIDTH_CLASS, KanbanColumn } from "./kanban-column";
import { ColumnSheet } from "./column-sheet";
import type { CardPresence } from "./ticket-card";

export const BOARD_DROPPABLE_ID = "board";

export interface KanbanBoardProps {
  boardId: number;
  className?: string;
}

function parseId(prefix: string, value: string): number | null {
  if (!value.startsWith(prefix)) return null;
  const n = Number(value.slice(prefix.length));
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * Where a dropped card goes: the optimistic cache and the request position.
 * Pure, exported for tests.
 */
export function planCardDrop(
  cache: KanbanResponse,
  result: Pick<DropResult, "draggableId" | "source" | "destination">,
  opts: { hasActiveFilters: boolean; isManualSort: boolean },
): { ticketId: number; toColumnId: number; position: number | undefined; next: KanbanResponse } | null {
  const { destination, source } = result;
  if (!destination) return null;
  const ticketId = parseId("ticket-", result.draggableId);
  const fromColumnId = parseId("col-", source.droppableId);
  const toColumnId = parseId("col-", destination.droppableId);
  if (!ticketId || !fromColumnId || !toColumnId) return null;
  const sameColumn = fromColumnId === toColumnId;
  if (sameColumn && source.index === destination.index) return null;
  // E20: no reordering inside a column under a non-manual sort.
  if (sameColumn && !opts.isManualSort) return null;
  const found = findCard(cache, ticketId);
  if (!found) return null;

  if (!opts.isManualSort) {
    return {
      ticketId,
      toColumnId,
      position: undefined,
      next: applyVisibleMove(cache, ticketId, toColumnId, destination.index),
    };
  }
  if (opts.hasActiveFilters) {
    const position = computeAbsolutePosition(
      columnTickets(cache, toColumnId),
      destination.index,
      found.card,
      toColumnId,
    );
    return {
      ticketId,
      toColumnId,
      position,
      next: applyVisibleMove(cache, ticketId, toColumnId, destination.index, position),
    };
  }
  return {
    ticketId,
    toColumnId,
    position: destination.index,
    next: applyMove(cache, ticketId, toColumnId, destination.index),
  };
}

function BoardSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 gap-3 overflow-hidden p-3" data-testid="kanban-skeleton" aria-busy="true">
      {[3, 2, 2, 1].map((n, i) => (
        <div key={i} className={cn("flex shrink-0 flex-col gap-1.5 rounded-lg bg-muted/50 p-1.5 pt-9", COLUMN_WIDTH_CLASS)}>
          {Array.from({ length: n }, (_, j) => (
            <CardSkeleton key={j} />
          ))}
        </div>
      ))}
    </div>
  );
}

export interface BoardNoColumnsProps {
  canManageColumns: boolean;
  onAddColumn?: () => void;
}

/** A board with zero columns (DC39): managers get "Add column", everyone else text only. */
export function BoardNoColumns({ canManageColumns, onAddColumn }: BoardNoColumnsProps) {
  const t = useTranslations("ticketsScreen.board");
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center" data-testid="kanban-no-columns">
      <EmptyState
        icon={Columns3}
        title={t("noColumns")}
        description={canManageColumns ? t("noColumnsHint") : undefined}
        action={
          canManageColumns ? (
            <Button size="sm" onClick={onAddColumn} data-testid="kanban-no-columns-add">
              <Plus className="size-3.5" aria-hidden="true" />
              {t("addColumn")}
            </Button>
          ) : undefined
        }
      />
    </div>
  );
}

export function KanbanBoard({ boardId, className }: KanbanBoardProps) {
  const t = useTranslations("ticketsScreen.board");
  const tCard = useTranslations("ticketsScreen.card");
  const tAdmin = useTranslations("tickets.boardAdmin.columns");
  const tToasts = useTranslations("tickets.toasts");
  const tCommon = useTranslations("common");
  const qc = useQueryClient();
  const { queryFilters, hasActiveFilters, isManualSort, toQueryString } = useTicketFilters();
  const kanban = useKanban(boardId, queryFilters);
  const perms = useTicketPermissions();
  const admin = useBoardAdmin();
  const { openTicketCreate } = useTicketCreate();
  const realtime = useTicketsRealtime();
  const { moveTicket, deleteTicket } = useTicketMutations();

  /** Optimistic board shown from a drop until the cache catches up (no snap-back frame). */
  const [override, setOverride] = useState<KanbanResponse | null>(null);
  const [draggingFrom, setDraggingFrom] = useState<number | null>(null);
  const [cardDragActive, setCardDragActive] = useState(false);
  const [sheet, setSheet] = useState<{ column: KanbanColumnData | null } | null>(null);
  const [deletingColumn, setDeletingColumn] = useState<KanbanColumnData | null>(null);
  const [columnDeleteBusy, setColumnDeleteBusy] = useState(false);
  const [columnDeleteError, setColumnDeleteError] = useState<string | null>(null);
  const [deletingTicket, setDeletingTicket] = useState<TicketCardData | null>(null);

  useEffect(() => {
    setOverride(null);
  }, [kanban.data]);

  const data = override ?? kanban.data;
  const filtered = hasActiveFilters || !isManualSort;
  const query = toQueryString();

  // --- realtime (E33) ------------------------------------------------------
  const realtimeBoardId = realtime.boardId;
  useBoardEvents(
    useCallback(
      (event) => {
        if (realtimeBoardId !== null && realtimeBoardId !== boardId) return;
        applyBoardEvent(qc, boardId, event, { filtered });
      },
      [qc, boardId, filtered, realtimeBoardId],
    ),
  );

  const { beingEdited, beingMoved } = realtime;
  const presenceFor = useCallback(
    (ticketId: number): CardPresence | null => {
      const edit = beingEdited.get(ticketId);
      if (edit) return { kind: "editing", userName: edit.userName };
      const move = beingMoved.get(ticketId);
      if (move) return { kind: "moving", userName: move.userName };
      return null;
    },
    [beingEdited, beingMoved],
  );

  // --- writes into the visible cache ---------------------------------------
  const writeActive = useCallback(
    (next: KanbanResponse) => {
      setOverride(next);
      qc.setQueriesData<KanbanResponse>(
        { queryKey: ["kanbanBoard", boardId], type: "active", predicate: (q) => q.queryKey.length === 3 },
        (prev) => (prev ? next : prev),
      );
    },
    [qc, boardId],
  );

  // Runs inside flushSync before @hello-pangea measures the lists.
  const onBeforeCapture = useCallback((before: BeforeCapture) => {
    if (before.draggableId.startsWith("ticket-")) setCardDragActive(true);
  }, []);

  const onDragStart = useCallback(
    (start: DragStart) => {
      void qc.cancelQueries({ queryKey: ["kanbanBoard", boardId] });
      if (start.type === "CARD") {
        const ticketId = parseId("ticket-", start.draggableId);
        const fromColumnId = parseId("col-", start.source.droppableId);
        setDraggingFrom(fromColumnId);
        if (ticketId) realtime.sendTicketMoving(ticketId, fromColumnId);
      }
    },
    [qc, boardId, realtime],
  );

  const onDragEnd = useCallback(
    (result: DropResult) => {
      setDraggingFrom(null);
      setCardDragActive(false);
      const cache = data;
      if (!cache || !result.destination) return;

      if (result.type === "COLUMN") {
        const from = result.source.index;
        const to = result.destination.index;
        if (from === to || !perms.canManageColumns) return;
        const column = cache.columns[from];
        if (!column) return;
        writeActive(applyReorderColumns(cache, from, to));
        columnsReorderCreate(column.id, { position: to })
          .then(() => invalidateBoardColumns(qc, boardId))
          .catch(() => {
            toast.error(tToasts("columnReorderError"));
            void qc.invalidateQueries({ queryKey: ["kanbanBoard", boardId] });
          });
        return;
      }

      const plan = planCardDrop(cache, result, { hasActiveFilters, isManualSort });
      if (!plan) return;
      writeActive(plan.next);
      moveTicket.mutate({ id: plan.ticketId, columnId: plan.toColumnId, position: plan.position, boardId });
    },
    [data, perms.canManageColumns, writeActive, qc, boardId, tToasts, hasActiveFilters, isManualSort, moveTicket],
  );

  // --- column and ticket actions -------------------------------------------
  const boardForCreate = data?.board;
  const onAddTicket = useCallback(
    (column: KanbanColumnData) => {
      openTicketCreate(
        (boardForCreate ?? { id: boardId }) as unknown as Board,
        column as unknown as TicketColumn,
      );
    },
    [openTicketCreate, boardForCreate, boardId],
  );
  const onEditColumn = useCallback((column: KanbanColumnData) => setSheet({ column }), []);
  const onEditAllColumns = useCallback(
    () => admin.openEditColumns({ id: boardId, name: boardForCreate?.name, color: boardForCreate?.color }),
    [admin, boardId, boardForCreate],
  );
  const onDeleteColumn = useCallback((column: KanbanColumnData) => {
    setColumnDeleteError(null);
    setDeletingColumn(column);
  }, []);
  const onDeleteTicket = useCallback((card: TicketCardData) => setDeletingTicket(card), []);

  const confirmDeleteColumn = async () => {
    if (!deletingColumn) return;
    setColumnDeleteBusy(true);
    setColumnDeleteError(null);
    try {
      await columnsDestroy(deletingColumn.id);
      toast.success(tToasts("columnDeleted"));
      setDeletingColumn(null);
      await invalidateBoardColumns(qc, boardId);
    } catch (error) {
      const message = httpStatus(error) === 400 ? tAdmin("hasTickets") : tToasts("columnError");
      setColumnDeleteError(message);
      toast.error(message);
    } finally {
      setColumnDeleteBusy(false);
    }
  };

  const confirmDeleteTicket = () => {
    const card = deletingTicket;
    if (!card) return;
    setDeletingTicket(null);
    deleteTicket.mutate(
      { id: card.id, boardId },
      {
        onSuccess: () => {
          qc.setQueriesData<KanbanResponse>(
            { queryKey: ["kanbanBoard", boardId], predicate: (q) => q.queryKey.length === 3 },
            (prev) => (prev ? applyDelete(prev, card.id) : prev),
          );
        },
      },
    );
  };

  const columns = useMemo(() => data?.columns ?? [], [data]);

  // --- states ---------------------------------------------------------------
  if (!data) {
    if (kanban.isError) {
      return (
        <div className="flex min-h-0 flex-1 items-center justify-center" data-testid="kanban-error">
          <EmptyState
            icon={AlertTriangle}
            title={t("errorKanban")}
            action={
              <Button size="sm" variant="outline" onClick={() => void kanban.refetch()}>
                {t("retry")}
              </Button>
            }
          />
        </div>
      );
    }
    return <BoardSkeleton />;
  }

  const nextPosition = columns.length;
  const sheetEl = (
    <ColumnSheet
      open={sheet !== null}
      onClose={() => setSheet(null)}
      boardId={boardId}
      boardName={data.board?.name}
      column={sheet?.column ?? null}
      nextPosition={nextPosition}
    />
  );

  if (columns.length === 0) {
    return (
      <>
        <BoardNoColumns canManageColumns={perms.canManageColumns} onAddColumn={() => setSheet({ column: null })} />
        {perms.canManageColumns && sheetEl}
      </>
    );
  }

  return (
    <>
      <DragDropContext onBeforeCapture={onBeforeCapture} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div
          data-testid="kanban-board"
          data-board-id={boardId}
          data-filtered={filtered ? "true" : "false"}
          className={cn(
            "min-h-0 flex-1 snap-x snap-mandatory scroll-px-3 overflow-auto p-3 md:snap-none",
            className,
          )}
        >
          <Droppable
            droppableId={BOARD_DROPPABLE_ID}
            type="COLUMN"
            direction="horizontal"
            isDropDisabled={!perms.canManageColumns}
          >
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="flex h-full w-max min-w-full items-start gap-3"
              >
                {columns.map((column, index) => (
                  <KanbanColumn
                    key={column.id}
                    column={column}
                    index={index}
                    cards={columnTickets(data, column.id)}
                    query={query}
                    canCreateTicket={perms.canCreateTicket}
                    canManageColumns={perms.canManageColumns}
                    canDeleteTickets={perms.isStaff}
                    dropDisabled={!isManualSort && draggingFrom === column.id}
                    cardDragActive={cardDragActive}
                    presenceFor={presenceFor}
                    onAddTicket={onAddTicket}
                    onEditColumn={onEditColumn}
                    onEditAllColumns={onEditAllColumns}
                    onDeleteColumn={onDeleteColumn}
                    onDeleteTicket={onDeleteTicket}
                  />
                ))}
                {provided.placeholder}
                {perms.canManageColumns && (
                  <button
                    type="button"
                    data-testid="kanban-add-column"
                    onClick={() => setSheet({ column: null })}
                    className={cn(
                      "flex h-9 shrink-0 snap-start items-center gap-1.5 rounded-lg border border-dashed px-2.5 text-[13px] text-muted-foreground hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                      COLUMN_WIDTH_CLASS,
                    )}
                  >
                    <Plus aria-hidden="true" size={14} />
                    {t("addColumn")}
                  </button>
                )}
              </div>
            )}
          </Droppable>
        </div>
      </DragDropContext>

      {perms.canManageColumns && sheetEl}

      <AlertDialog
        open={deletingColumn !== null}
        onOpenChange={(next) => !next && !columnDeleteBusy && setDeletingColumn(null)}
      >
        <AlertDialogContent data-testid="delete-column-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>{tAdmin("deleteConfirm", { name: deletingColumn?.name ?? "" })}</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingColumn && (deletingColumn.tickets_count ?? 0) > 0 ? tAdmin("hasTickets") : tAdmin("deleteBody")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {columnDeleteError && (
            <p
              role="alert"
              className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-[13px] text-destructive"
            >
              {columnDeleteError}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={columnDeleteBusy}>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={columnDeleteBusy}
              onClick={(e) => {
                e.preventDefault();
                void confirmDeleteColumn();
              }}
            >
              {columnDeleteBusy && <Spinner className="size-3.5" />}
              {t("deleteColumn")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deletingTicket !== null} onOpenChange={(next) => !next && setDeletingTicket(null)}>
        <AlertDialogContent data-testid="delete-ticket-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>{tCard("deleteConfirmTitle", { id: deletingTicket?.id ?? "" })}</AlertDialogTitle>
            <AlertDialogDescription>{tCard("deleteConfirmBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCard("cancel")}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={confirmDeleteTicket}>
              {tCard("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
