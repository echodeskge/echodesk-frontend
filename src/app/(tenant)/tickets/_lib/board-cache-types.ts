/**
 * Types for the pure kanban cache updaters (`board-cache.ts`, FE-07).
 *
 * The board reads straight from the `tk.board(...)` cache (E21). Updaters take
 * the cached `KanbanResponse` and return a new one (never mutate), so they can
 * be passed to `queryClient.setQueriesData({queryKey: ['kanbanBoard', id]}, fn)`.
 */
import type { KanbanResponse, TicketCard } from "./types";

export type KanbanCache = KanbanResponse;

/** `undefined` in, `undefined` out: setQueriesData calls updaters for empty entries too. */
export type BoardCacheUpdater = (prev: KanbanCache | undefined) => KanbanCache | undefined;

export interface CardLocation {
  columnId: number;
  /** Index within the column's rendered list. */
  index: number;
}

export interface CardMove {
  ticketId: number;
  from: CardLocation;
  to: CardLocation;
}

/** Partial card fields applied by a `ticket_updated` event or an optimistic edit. */
export type CardPatch = Partial<Omit<TicketCard, "id">>;

/** Where a card currently sits in a cache, if anywhere. */
export interface FoundCard {
  card: TicketCard;
  columnId: number;
  index: number;
}
