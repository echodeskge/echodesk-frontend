/**
 * Pure kanban cache updaters (plan E21, E33, FE-07).
 *
 * The board renders straight from the `tk.board(boardId, filters)` cache. These
 * functions take the cached lite `KanbanResponse` and return a new one; they
 * never mutate their input and return the same reference when nothing changes
 * (so React Query keeps the old data object and nothing re-renders).
 *
 * Positions: on an unfiltered, manually sorted board every column holds every
 * ticket, so a card's index equals its `position_in_column` and the updaters
 * renumber 0..n-1 the way the server does. Filtered or sorted caches are never
 * spliced (E33); they are refetched instead, see `realtime-board.ts`.
 */
import type { QueryClient, QueryKey } from "@tanstack/react-query";
import type { BoardCacheUpdater, CardPatch, FoundCard, KanbanCache } from "./board-cache-types";
import type { KanbanResponse, TicketCard } from "./types";

export type { BoardCacheUpdater, CardPatch, FoundCard, KanbanCache } from "./board-cache-types";

/** Result of an updater that may not be able to apply an event locally. */
export interface UpdateResult {
  cache: KanbanCache;
  /** True when the event can't be applied locally (unknown column, missing card): refetch. */
  invalidate: boolean;
}

const ok = (cache: KanbanCache): UpdateResult => ({ cache, invalidate: false });
const refetch = (cache: KanbanCache): UpdateResult => ({ cache, invalidate: true });

function key(columnId: number | string): string {
  return String(columnId);
}

export function hasColumn(cache: KanbanCache, columnId: number | null | undefined): boolean {
  if (columnId == null) return false;
  return cache.columns.some((c) => c.id === Number(columnId));
}

/** The cards of a column in render order (empty when the column has none). */
export function columnTickets(cache: KanbanCache, columnId: number): TicketCard[] {
  return cache.tickets_by_column[key(columnId)] ?? [];
}

export function findCard(cache: KanbanCache | undefined, ticketId: number): FoundCard | null {
  if (!cache) return null;
  for (const [colKey, cards] of Object.entries(cache.tickets_by_column)) {
    const index = cards.findIndex((c) => c.id === ticketId);
    if (index !== -1) return { card: cards[index], columnId: Number(colKey), index };
  }
  return null;
}

/** Number of cards in the cache (what the board renders). */
export function countCards(cache: KanbanCache | undefined): number {
  if (!cache) return 0;
  return Object.values(cache.tickets_by_column).reduce((n, cards) => n + cards.length, 0);
}

function renumber(cards: TicketCard[], columnId: number): TicketCard[] {
  return cards.map((c, i) =>
    c.position_in_column === i && c.column_id === columnId ? c : { ...c, position_in_column: i, column_id: columnId },
  );
}

function clamp(index: number | null | undefined, length: number): number {
  if (index == null || !Number.isFinite(index)) return length;
  return Math.max(0, Math.min(Math.trunc(index), length));
}

/**
 * Move a card to `toColumnId` at `index` (0-based, in the target column with
 * the card removed, the server's `move_to_column` semantics). Both affected
 * columns are renumbered. Unknown card or column: returned unchanged.
 */
export function applyMove(
  cache: KanbanCache,
  ticketId: number,
  toColumnId: number,
  index?: number | null,
  patch?: CardPatch,
): KanbanCache {
  const found = findCard(cache, ticketId);
  if (!found || !hasColumn(cache, toColumnId)) return cache;
  const from = found.columnId;
  const source = columnTickets(cache, from).filter((c) => c.id !== ticketId);
  const target = from === toColumnId ? source : [...columnTickets(cache, toColumnId)];
  const at = clamp(index, target.length);
  if (from === toColumnId && at === found.index && !patch) return cache;
  const moved: TicketCard = { ...found.card, ...(patch ?? {}), id: ticketId, column_id: toColumnId };
  target.splice(at, 0, moved);
  const tickets_by_column = { ...cache.tickets_by_column, [key(toColumnId)]: renumber(target, toColumnId) };
  if (from !== toColumnId) tickets_by_column[key(from)] = renumber(source, from);
  return { ...cache, tickets_by_column };
}

/**
 * Place a card into the visible list of a column without renumbering the
 * others (an optimistic move on a filtered board, whose positions are absolute
 * and refetched right after). `absolutePosition` is what the request sends.
 */
export function applyVisibleMove(
  cache: KanbanCache,
  ticketId: number,
  toColumnId: number,
  visibleIndex: number,
  absolutePosition?: number,
): KanbanCache {
  const found = findCard(cache, ticketId);
  if (!found || !hasColumn(cache, toColumnId)) return cache;
  const from = found.columnId;
  const source = columnTickets(cache, from).filter((c) => c.id !== ticketId);
  const target = from === toColumnId ? source : [...columnTickets(cache, toColumnId)];
  const moved: TicketCard = {
    ...found.card,
    column_id: toColumnId,
    ...(absolutePosition !== undefined ? { position_in_column: absolutePosition } : {}),
  };
  target.splice(clamp(visibleIndex, target.length), 0, moved);
  const tickets_by_column = { ...cache.tickets_by_column, [key(toColumnId)]: target };
  if (from !== toColumnId) tickets_by_column[key(from)] = source;
  return { ...cache, tickets_by_column };
}

/** Reorder the columns (drag a header); `position` is renumbered 0..n-1. */
export function applyReorderColumns(cache: KanbanCache, fromIndex: number, toIndex: number): KanbanCache {
  const n = cache.columns.length;
  if (fromIndex === toIndex || fromIndex < 0 || fromIndex >= n) return cache;
  const columns = [...cache.columns];
  const [moved] = columns.splice(fromIndex, 1);
  columns.splice(clamp(toIndex, columns.length), 0, moved);
  return { ...cache, columns: columns.map((c, i) => (c.position === i ? c : { ...c, position: i })) };
}

/**
 * Insert or refresh a card from a server `card` payload (lite shape).
 * - unknown column → `invalidate` (a column added elsewhere; refetch);
 * - known card, same column → replaced in place;
 * - known card, other column → moved to `card.position_in_column`;
 * - new card → inserted at `card.position_in_column` (appended when absent).
 */
export function applyCardUpsert(cache: KanbanCache, card: TicketCard): UpdateResult {
  if (!hasColumn(cache, card.column_id)) return refetch(cache);
  const found = findCard(cache, card.id);
  if (found && found.columnId === card.column_id) {
    const cards = [...columnTickets(cache, found.columnId)];
    cards[found.index] = { ...found.card, ...card, position_in_column: found.card.position_in_column };
    return ok({ ...cache, tickets_by_column: { ...cache.tickets_by_column, [key(found.columnId)]: cards } });
  }
  if (found) return ok(applyMove(cache, card.id, card.column_id, card.position_in_column, card));
  const target = [...columnTickets(cache, card.column_id)];
  target.splice(clamp(card.position_in_column, target.length), 0, card);
  return ok({
    ...cache,
    tickets_by_column: { ...cache.tickets_by_column, [key(card.column_id)]: renumber(target, card.column_id) },
  });
}

/** `ticket_created`: an upsert that never duplicates an id already on the board. */
export function applyCreated(cache: KanbanCache, card: TicketCard): UpdateResult {
  return applyCardUpsert(cache, card);
}

/** Patch fields of a card in place (no move). Unknown card: unchanged. */
export function applyCardPatch(cache: KanbanCache, ticketId: number, patch: CardPatch): KanbanCache {
  const found = findCard(cache, ticketId);
  if (!found) return cache;
  const changed = Object.entries(patch).some(([k, v]) => (found.card as unknown as Record<string, unknown>)[k] !== v);
  if (!changed) return cache;
  const cards = [...columnTickets(cache, found.columnId)];
  cards[found.index] = { ...found.card, ...patch, id: ticketId };
  return { ...cache, tickets_by_column: { ...cache.tickets_by_column, [key(found.columnId)]: cards } };
}

/** Remove a card (deleted, or transferred to another board). Unknown card: unchanged. */
export function applyDelete(cache: KanbanCache, ticketId: number): KanbanCache {
  const found = findCard(cache, ticketId);
  if (!found) return cache;
  const rest = columnTickets(cache, found.columnId).filter((c) => c.id !== ticketId);
  return {
    ...cache,
    tickets_by_column: { ...cache.tickets_by_column, [key(found.columnId)]: renumber(rest, found.columnId) },
  };
}

/**
 * With filters active the board shows a subset of each column, so a drop index
 * is translated into the absolute `position_in_column` of the visible neighbour
 * (E20). `visible` is the destination column's rendered list *without* the
 * dragged card (hello-pangea's destination index semantics).
 *
 * - drop before a visible card → that card's absolute index;
 * - drop after the last visible card → just after it;
 * - nothing visible → `undefined` (the request omits the position; the server appends).
 *
 * When the card moves within its own column and sat above the neighbour, the
 * neighbour's index drops by one once the card is taken out (the server
 * indexes the column without the moved ticket).
 */
export function computeAbsolutePosition(
  visible: Pick<TicketCard, "id" | "position_in_column">[],
  dropIndex: number,
  dragged?: Pick<TicketCard, "id" | "column_id" | "position_in_column"> | null,
  destColumnId?: number,
): number | undefined {
  const list = dragged ? visible.filter((c) => c.id !== dragged.id) : visible;
  if (list.length === 0) return undefined;
  const sameColumn = !!dragged && destColumnId !== undefined && dragged.column_id === destColumnId;
  const adjust = (p: number) => (sameColumn && dragged!.position_in_column < p ? p - 1 : p);
  const at = clamp(dropIndex, list.length);
  if (at < list.length) return adjust(list[at].position_in_column);
  return adjust(list[list.length - 1].position_in_column) + 1;
}

// ---------------------------------------------------------------------------
// Applying updaters to the React Query cache (R11)
// ---------------------------------------------------------------------------

/** Filter keys that narrow a board (sort excluded). */
const NARROWING_KEYS = ["assignee", "unassigned", "priority", "label", "due", "q"] as const;

/**
 * True for a lite kanban key with no narrowing filter and manual sort:
 * `['kanbanBoard', id, {}]` or `['kanbanBoard', id, {sort: 'manual'}]`. The
 * legacy two-element key (the non-lite payload) is never matched.
 */
export function isUnfilteredBoardKey(queryKey: QueryKey): boolean {
  if (queryKey.length !== 3 || queryKey[0] !== "kanbanBoard") return false;
  const f = queryKey[2] as Record<string, unknown> | null;
  if (!f || typeof f !== "object") return false;
  if (NARROWING_KEYS.some((k) => k in f)) return false;
  return f.sort === undefined || f.sort === "manual";
}

/** True for any lite kanban key of the redesign (`tk.board(...)`). */
export function isLiteBoardKey(queryKey: QueryKey): boolean {
  return queryKey.length === 3 && queryKey[0] === "kanbanBoard" && typeof queryKey[2] === "object";
}

function isKanbanResponse(value: unknown): value is KanbanResponse {
  return (
    !!value &&
    typeof value === "object" &&
    Array.isArray((value as KanbanResponse).columns) &&
    !!(value as KanbanResponse).tickets_by_column
  );
}

/**
 * Apply an updater through `setQueriesData` on the `['kanbanBoard', boardId]`
 * prefix (R11), limited by `scope`:
 * - `unfiltered`: only the unfiltered, manually sorted caches; every other
 *   variant of that board is marked stale (refetched when next shown);
 * - `lite`: every lite cache of the board (field patches that never change
 *   which cards a filter matches, e.g. a comment count);
 * - `active`: the lite caches currently on screen (optimistic drags).
 *
 * Returns true when any cache asked for a refetch (`UpdateResult.invalidate`).
 */
export function updateBoardCaches(
  qc: QueryClient,
  boardId: number,
  updater: (cache: KanbanCache) => KanbanCache | UpdateResult,
  scope: "unfiltered" | "lite" | "active" = "unfiltered",
): boolean {
  let invalidate = false;
  const predicate = scope === "unfiltered" ? isUnfilteredBoardKey : isLiteBoardKey;
  const wrapped: BoardCacheUpdater = (prev) => {
    if (!isKanbanResponse(prev)) return prev;
    const result = updater(prev);
    if ("invalidate" in result && "cache" in result) {
      if (result.invalidate) invalidate = true;
      return result.cache;
    }
    return result as KanbanCache;
  };
  qc.setQueriesData<KanbanCache>(
    {
      queryKey: ["kanbanBoard", boardId],
      predicate: (q) => predicate(q.queryKey),
      ...(scope === "active" ? { type: "active" as const } : {}),
    },
    wrapped,
  );
  if (scope === "unfiltered") {
    qc.invalidateQueries({
      queryKey: ["kanbanBoard", boardId],
      predicate: (q) => isLiteBoardKey(q.queryKey) && !isUnfilteredBoardKey(q.queryKey),
      refetchType: "none",
    });
  }
  return invalidate;
}
