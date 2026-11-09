"use client";

/**
 * One kanban column (plan §3 Kanban, F20, DC11, DC12, DC15).
 *
 * 272px wide (min(85vw, 272px) on phones, snap-aligned), radius 8, muted/0.5.
 * Header (36px, the drag handle for column reorder): dot, title 13/600,
 * count = the cards rendered from `tickets_by_column[col]` (never the
 * unfiltered `tickets_count`), `+` (canCreateTicket) and `…` (manage_columns).
 * The card list is a hello-pangea `Droppable`; while a card is over it the
 * list gets a 2px dashed outline and a tint of the column colour (.15s).
 */
import { memo } from "react";
import { useTranslations } from "next-intl";
import { Draggable, Droppable } from "@hello-pangea/dnd";
import { Ellipsis, Pencil, Plus, Settings, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ColorDot } from "../primitives";
import { TicketCard, type CardPresence } from "./ticket-card";
import type { KanbanColumn as KanbanColumnData, TicketCard as TicketCardData } from "../../_lib/types";

export const COLUMN_WIDTH_CLASS = "w-[min(85vw,272px)] md:w-[272px]";

/** `#rrggbb` → `#rrggbbAA`; anything else falls back to the muted foreground. */
export function tint(color: string | null | undefined, alpha = "14"): string {
  return color && /^#[0-9a-f]{6}$/i.test(color) ? `${color}${alpha}` : "hsl(var(--muted-foreground) / 0.08)";
}

export interface KanbanColumnProps {
  column: KanbanColumnData;
  index: number;
  cards: TicketCardData[];
  query?: string;
  canCreateTicket: boolean;
  canManageColumns: boolean;
  canDeleteTickets: boolean;
  /** Drop disabled for this column (a non-manual sort forbids reordering inside the source column). */
  dropDisabled?: boolean;
  presenceFor?: (ticketId: number) => CardPresence | null;
  onAddTicket?: (column: KanbanColumnData) => void;
  onEditColumn?: (column: KanbanColumnData) => void;
  onEditAllColumns?: () => void;
  onDeleteColumn?: (column: KanbanColumnData) => void;
  onDeleteTicket?: (card: TicketCardData) => void;
}

const ICON_BUTTON =
  "inline-flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 data-[state=open]:bg-background data-[state=open]:text-foreground";

function KanbanColumnImpl({
  column,
  index,
  cards,
  query,
  canCreateTicket,
  canManageColumns,
  canDeleteTickets,
  dropDisabled = false,
  presenceFor,
  onAddTicket,
  onEditColumn,
  onEditAllColumns,
  onDeleteColumn,
  onDeleteTicket,
}: KanbanColumnProps) {
  const t = useTranslations("ticketsScreen.board");

  return (
    <Draggable draggableId={`column-${column.id}`} index={index} isDragDisabled={!canManageColumns}>
      {(colProvided, colSnapshot) => (
        <section
          ref={colProvided.innerRef}
          {...colProvided.draggableProps}
          data-testid="kanban-column"
          data-column-id={column.id}
          aria-label={column.name}
          className={cn(
            "flex max-h-full shrink-0 snap-start flex-col rounded-lg bg-muted/50",
            COLUMN_WIDTH_CLASS,
            colSnapshot.isDragging && "shadow-[0_8px_24px_rgb(0_0_0/.12)]",
          )}
        >
          <header
            {...colProvided.dragHandleProps}
            className={cn(
              "flex h-9 shrink-0 items-center gap-2 rounded-t-lg pl-2.5 pr-1.5 outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              canManageColumns && "cursor-grab",
            )}
            data-testid="kanban-column-header"
          >
            <ColorDot color={column.color} size={8} />
            <h3 className="min-w-0 truncate text-[13px] font-semibold" title={column.name}>
              {column.name}
            </h3>
            <span className="text-xs text-muted-foreground tabular-nums" data-testid="kanban-column-count">
              {cards.length}
            </span>
            <span className="ml-auto flex shrink-0 gap-0.5">
              {canCreateTicket && (
                <button
                  type="button"
                  className={ICON_BUTTON}
                  aria-label={t("addTicket")}
                  title={t("addTicket")}
                  data-testid="kanban-column-add"
                  onClick={() => onAddTicket?.(column)}
                >
                  <Plus aria-hidden="true" size={14} />
                </button>
              )}
              {canManageColumns && (
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={ICON_BUTTON}
                      aria-label={t("columnActions", { name: column.name })}
                      data-testid="kanban-column-menu"
                    >
                      <Ellipsis aria-hidden="true" size={14} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-[180px] shadow-popover-sm">
                    <DropdownMenuItem className="text-[13px]" onSelect={() => onEditColumn?.(column)}>
                      <Pencil aria-hidden="true" />
                      {t("editColumn")}
                    </DropdownMenuItem>
                    {canCreateTicket && (
                      <DropdownMenuItem className="text-[13px]" onSelect={() => onAddTicket?.(column)}>
                        <Plus aria-hidden="true" />
                        {t("addTicket")}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem className="text-[13px]" onSelect={() => onEditAllColumns?.()}>
                      <Settings aria-hidden="true" />
                      {t("editAllColumns")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      className="text-[13px]"
                      onSelect={() => onDeleteColumn?.(column)}
                    >
                      <Trash2 aria-hidden="true" />
                      {t("deleteColumn")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </span>
          </header>

          <Droppable droppableId={`col-${column.id}`} type="CARD" isDropDisabled={dropDisabled}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                data-testid="kanban-column-list"
                data-drag-over={snapshot.isDraggingOver ? "true" : undefined}
                className={cn(
                  "mx-1.5 mb-1.5 flex min-h-[60px] flex-col gap-1.5 overflow-y-auto rounded-md outline-2 outline-offset-0 outline-transparent transition-[background-color,outline-color] duration-150",
                  snapshot.isDraggingOver && "outline-dashed",
                )}
                style={
                  snapshot.isDraggingOver
                    ? { outlineColor: column.color || "hsl(var(--border))", backgroundColor: tint(column.color) }
                    : undefined
                }
              >
                {cards.map((card, i) => (
                  <Draggable key={card.id} draggableId={`ticket-${card.id}`} index={i}>
                    {(cardProvided, cardSnapshot) => (
                      <TicketCard
                        ref={cardProvided.innerRef}
                        {...cardProvided.draggableProps}
                        {...cardProvided.dragHandleProps}
                        card={card}
                        query={query}
                        canDelete={canDeleteTickets}
                        onDelete={onDeleteTicket}
                        presence={presenceFor?.(card.id) ?? null}
                        isDragging={cardSnapshot.isDragging}
                        style={cardProvided.draggableProps.style}
                      />
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
                {cards.length === 0 && !snapshot.isDraggingOver && (
                  <p className="px-2 py-3 text-center text-xs text-muted-foreground" data-testid="kanban-column-empty">
                    {t("emptyColumn")}
                  </p>
                )}
                {canCreateTicket && (
                  <button
                    type="button"
                    data-testid="kanban-column-add-ghost"
                    onClick={() => onAddTicket?.(column)}
                    className="flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    <Plus aria-hidden="true" size={14} />
                    {t("addTicket")}
                  </button>
                )}
              </div>
            )}
          </Droppable>
        </section>
      )}
    </Draggable>
  );
}

export const KanbanColumn = memo(KanbanColumnImpl);
