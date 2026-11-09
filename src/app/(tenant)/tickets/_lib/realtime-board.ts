/**
 * Applying board WebSocket events to the kanban cache (plan E33, R11, F19).
 *
 * - Own echoes (`client_mutation_id` this tab sent) are ignored: the mutation
 *   already updated or invalidated the cache.
 * - Board unfiltered and manually sorted: foreign moved / updated / created /
 *   deleted events are spliced into the cache with the `board-cache` updaters,
 *   through `setQueriesData` on the `['kanbanBoard', boardId]` prefix.
 * - Any filter active or a non-manual sort: those events invalidate
 *   `['kanbanBoard', boardId]` instead (the server decides membership and order).
 * - `ticket_commented` carries the absolute `comments_count`, which is patched
 *   into every lite cache of the board in both modes: a count never changes
 *   which cards a filter matches, so it needs no refetch.
 * - `ticket_activity` is left to the tickets wrapper (it refetches the board
 *   for checklist / attachment / comment-deleted, which B2 doesn't push).
 *
 * The sidebar counts (view counts, lite boards, column counts) are refreshed
 * by the wrapper for every event, own echoes included (F19), so nothing here
 * touches them.
 */
import type { QueryClient } from "@tanstack/react-query";
import {
  applyCardPatch,
  applyCardUpsert,
  applyCreated,
  applyDelete,
  applyMove,
  findCard,
  hasColumn,
  updateBoardCaches,
  type UpdateResult,
} from "./board-cache";
import { isOwnEvent } from "./mutation-id";
import type { BoardEvent, KanbanResponse } from "./types";

export type RealtimeOutcome = "applied" | "invalidated" | "ignored";

export interface RealtimeBoardOptions {
  /** True when any narrowing filter is active or the sort isn't manual. */
  filtered: boolean;
}

export function invalidateBoard(qc: QueryClient, boardId: number): void {
  qc.invalidateQueries({ queryKey: ["kanbanBoard", boardId] });
}

function applyMovedEvent(
  cache: KanbanResponse,
  e: Extract<BoardEvent, { type: "ticket_moved" }>,
): UpdateResult {
  if (!hasColumn(cache, e.to_column_id)) return { cache, invalidate: true };
  const index = typeof e.position === "number" ? e.position : e.card?.position_in_column;
  if (findCard(cache, e.ticket_id)) {
    return { cache: applyMove(cache, e.ticket_id, e.to_column_id, index, e.card), invalidate: false };
  }
  // A card this cache never had (e.g. it was hidden by a filter until now).
  if (e.card) return applyCardUpsert(cache, { ...e.card, column_id: e.to_column_id });
  return { cache, invalidate: true };
}

/**
 * Apply one board event to the kanban caches of `boardId`.
 * Returns what happened, for tests and logging.
 */
export function applyBoardEvent(
  qc: QueryClient,
  boardId: number,
  event: BoardEvent,
  { filtered }: RealtimeBoardOptions,
): RealtimeOutcome {
  if (event.type === "ticket_activity") return "ignored";

  if (event.type === "ticket_commented") {
    if (typeof event.comments_count !== "number") return "ignored";
    const count = event.comments_count;
    updateBoardCaches(qc, boardId, (c) => applyCardPatch(c, event.ticket_id, { comments_count: count }), "lite");
    return "applied";
  }

  if (isOwnEvent(event)) return "ignored";

  if (filtered) {
    invalidateBoard(qc, boardId);
    return "invalidated";
  }

  let needsRefetch = false;
  switch (event.type) {
    case "ticket_moved":
      needsRefetch = updateBoardCaches(qc, boardId, (c) => applyMovedEvent(c, event));
      break;
    case "ticket_updated":
      if (!event.card) {
        needsRefetch = true;
        break;
      }
      needsRefetch = updateBoardCaches(qc, boardId, (c) => applyCardUpsert(c, event.card!));
      break;
    case "ticket_created":
      if (!event.ticket || typeof event.ticket.id !== "number") {
        needsRefetch = true;
        break;
      }
      needsRefetch = updateBoardCaches(qc, boardId, (c) => applyCreated(c, event.ticket));
      break;
    case "ticket_deleted":
      updateBoardCaches(qc, boardId, (c) => applyDelete(c, event.ticket_id));
      break;
    default:
      return "ignored";
  }

  if (needsRefetch) {
    invalidateBoard(qc, boardId);
    return "invalidated";
  }
  return "applied";
}
