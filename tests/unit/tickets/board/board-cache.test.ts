/**
 * Pure kanban cache updaters (plan FE-07). Ports the kanbanReducer cases
 * (reorder columns, reorder tasks, move across columns, upsert, delete) to the
 * lite cache shape, plus the filtered absolute-position translation and the
 * `setQueriesData` application on the `['kanbanBoard', id]` prefix (R11).
 */
import { describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import {
  applyCardPatch,
  applyCardUpsert,
  applyCreated,
  applyDelete,
  applyMove,
  applyReorderColumns,
  applyVisibleMove,
  columnTickets,
  computeAbsolutePosition,
  countCards,
  findCard,
  isLiteBoardKey,
  isUnfilteredBoardKey,
  updateBoardCaches,
} from "@/app/(tenant)/tickets/_lib/board-cache";
import { tk } from "@/app/(tenant)/tickets/_lib/query-keys";
import { ids, makeBoard, makeCard, positions } from "./fixtures";

describe("findCard / columnTickets / countCards", () => {
  it("locates a card with its column and index", () => {
    const board = makeBoard();
    expect(findCard(board, 2)).toMatchObject({ columnId: 10, index: 1, card: { id: 2 } });
    expect(findCard(board, 99)).toBeNull();
    expect(findCard(undefined, 1)).toBeNull();
    expect(columnTickets(board, 30)).toEqual([]);
    expect(columnTickets(board, 404)).toEqual([]);
    expect(countCards(board)).toBe(4);
  });
});

describe("applyMove", () => {
  it("reorders within a column and renumbers positions", () => {
    const board = makeBoard();
    const next = applyMove(board, 3, 10, 0);
    expect(ids(next, 10)).toEqual([3, 1, 2]);
    expect(positions(next, 10)).toEqual([0, 1, 2]);
    expect(ids(board, 10)).toEqual([1, 2, 3]); // input untouched
  });

  it("moves down within a column using the index without the card (server semantics)", () => {
    const next = applyMove(makeBoard(), 1, 10, 2);
    expect(ids(next, 10)).toEqual([2, 3, 1]);
  });

  it("moves across columns, renumbering both and setting column_id", () => {
    const next = applyMove(makeBoard(), 2, 20, 0);
    expect(ids(next, 10)).toEqual([1, 3]);
    expect(positions(next, 10)).toEqual([0, 1]);
    expect(ids(next, 20)).toEqual([2, 4]);
    expect(positions(next, 20)).toEqual([0, 1]);
    expect(findCard(next, 2)?.card.column_id).toBe(20);
  });

  it("drops into an empty column and appends when the index is absent or too large", () => {
    expect(ids(applyMove(makeBoard(), 1, 30, 0), 30)).toEqual([1]);
    expect(ids(applyMove(makeBoard(), 1, 20), 20)).toEqual([4, 1]);
    expect(ids(applyMove(makeBoard(), 1, 20, 99), 20)).toEqual([4, 1]);
  });

  it("returns the same reference for a no-op, an unknown card or an unknown column", () => {
    const board = makeBoard();
    expect(applyMove(board, 2, 10, 1)).toBe(board);
    expect(applyMove(board, 99, 10, 0)).toBe(board);
    expect(applyMove(board, 1, 404, 0)).toBe(board);
  });

  it("applies a card patch while moving", () => {
    const next = applyMove(makeBoard(), 1, 20, 1, { title: "Renamed" });
    expect(findCard(next, 1)?.card.title).toBe("Renamed");
  });
});

describe("applyVisibleMove (filtered optimistic move)", () => {
  it("places the card at the visible index without renumbering the others", () => {
    const board = makeBoard();
    const next = applyVisibleMove(board, 1, 20, 1, 7);
    expect(ids(next, 20)).toEqual([4, 1]);
    expect(findCard(next, 1)?.card).toMatchObject({ column_id: 20, position_in_column: 7 });
    expect(positions(next, 10)).toEqual([1, 2]); // not renumbered
  });
});

describe("applyReorderColumns", () => {
  it("moves a column and renumbers position", () => {
    const next = applyReorderColumns(makeBoard(), 0, 2);
    expect(next.columns.map((c) => c.id)).toEqual([20, 30, 10]);
    expect(next.columns.map((c) => c.position)).toEqual([0, 1, 2]);
  });

  it("is a no-op for the same index or an out-of-range source", () => {
    const board = makeBoard();
    expect(applyReorderColumns(board, 1, 1)).toBe(board);
    expect(applyReorderColumns(board, 9, 0)).toBe(board);
  });
});

describe("applyCardUpsert / applyCreated", () => {
  it("replaces a known card in place, keeping its position", () => {
    const board = makeBoard();
    const res = applyCardUpsert(board, makeCard(2, 10, 9, { title: "New title", comments_count: 3 }));
    expect(res.invalidate).toBe(false);
    expect(ids(res.cache, 10)).toEqual([1, 2, 3]);
    expect(findCard(res.cache, 2)?.card).toMatchObject({ title: "New title", comments_count: 3, position_in_column: 1 });
  });

  it("moves a known card whose column changed", () => {
    const res = applyCardUpsert(makeBoard(), makeCard(1, 20, 1));
    expect(ids(res.cache, 10)).toEqual([2, 3]);
    expect(ids(res.cache, 20)).toEqual([4, 1]);
  });

  it("inserts a new card at its position", () => {
    const res = applyCardUpsert(makeBoard(), makeCard(9, 10, 1));
    expect(ids(res.cache, 10)).toEqual([1, 9, 2, 3]);
    expect(positions(res.cache, 10)).toEqual([0, 1, 2, 3]);
  });

  it("signals a refetch for an unknown column", () => {
    const board = makeBoard();
    const res = applyCardUpsert(board, makeCard(9, 404, 0));
    expect(res).toEqual({ cache: board, invalidate: true });
  });

  it("applyCreated never duplicates an id already on the board", () => {
    const once = applyCreated(makeBoard(), makeCard(9, 30, 0)).cache;
    const twice = applyCreated(once, makeCard(9, 30, 0)).cache;
    expect(ids(twice, 30)).toEqual([9]);
    expect(applyCreated(makeBoard(), makeCard(4, 20, 0)).cache.tickets_by_column["20"]).toHaveLength(1);
  });
});

describe("applyCardPatch / applyDelete", () => {
  it("patches fields in place and keeps the reference when nothing changes", () => {
    const board = makeBoard();
    expect(findCard(applyCardPatch(board, 4, { comments_count: 5 }), 4)?.card.comments_count).toBe(5);
    expect(applyCardPatch(board, 4, { comments_count: 0 })).toBe(board);
    expect(applyCardPatch(board, 99, { comments_count: 1 })).toBe(board);
  });

  it("removes a card and renumbers its column", () => {
    const board = makeBoard();
    const next = applyDelete(board, 1);
    expect(ids(next, 10)).toEqual([2, 3]);
    expect(positions(next, 10)).toEqual([0, 1]);
    expect(applyDelete(board, 99)).toBe(board);
  });
});

describe("computeAbsolutePosition (filters active, E20)", () => {
  // Full column 10: positions 0..5; the filter shows ids 11 (pos 1), 13 (pos 3), 15 (pos 5).
  const visible = [makeCard(11, 10, 1), makeCard(13, 10, 3), makeCard(15, 10, 5)];

  it("drop before a visible card → that card's absolute index", () => {
    expect(computeAbsolutePosition(visible, 0, makeCard(40, 20, 0), 10)).toBe(1);
    expect(computeAbsolutePosition(visible, 1, makeCard(40, 20, 0), 10)).toBe(3);
  });

  it("drop after the last visible card → just after it", () => {
    expect(computeAbsolutePosition(visible, 3, makeCard(40, 20, 0), 10)).toBe(6);
  });

  it("an empty visible list → undefined (append)", () => {
    expect(computeAbsolutePosition([], 0, makeCard(40, 20, 0), 10)).toBeUndefined();
  });

  it("within the same column, excludes the dragged card and shifts neighbours below it", () => {
    // Dragging id 11 (pos 1) down to after 13 (visible index 1 once 11 is removed → before 15).
    expect(computeAbsolutePosition(visible, 1, visible[0], 10)).toBe(4);
    // Dragging 15 (pos 5) up to the top: neighbour 11 sits above it, no shift.
    expect(computeAbsolutePosition(visible, 0, visible[2], 10)).toBe(1);
  });
});

describe("query cache application (R11)", () => {
  it("recognises unfiltered and lite board keys", () => {
    expect(isUnfilteredBoardKey(tk.board(1))).toBe(true);
    expect(isUnfilteredBoardKey(tk.board(1, { sort: "manual" }))).toBe(true);
    expect(isUnfilteredBoardKey(tk.board(1, { sort: "priority" }))).toBe(false);
    expect(isUnfilteredBoardKey(tk.board(1, { q: "x" }))).toBe(false);
    expect(isUnfilteredBoardKey(tk.board(1, { assignee: ["me"] }))).toBe(false);
    expect(isUnfilteredBoardKey(["kanbanBoard", 1])).toBe(false); // legacy non-lite
    expect(isLiteBoardKey(tk.board(1, { q: "x" }))).toBe(true);
    expect(isLiteBoardKey(["kanbanBoard", 1])).toBe(false);
  });

  it("applies updaters with setQueriesData on the ['kanbanBoard', id] prefix", () => {
    const qc = new QueryClient();
    const spy = vi.spyOn(qc, "setQueriesData");
    qc.setQueryData(tk.board(1), makeBoard());
    qc.setQueryData(tk.board(1, { q: "x" }), makeBoard());
    qc.setQueryData(["kanbanBoard", 1], { legacy: true });
    qc.setQueryData(tk.board(2), makeBoard());

    updateBoardCaches(qc, 1, (c) => applyDelete(c, 1));

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ["kanbanBoard", 1] }), expect.any(Function));
    expect(ids(qc.getQueryData(tk.board(1)), 10)).toEqual([2, 3]);
    // Filtered variants are not spliced, only marked stale.
    expect(ids(qc.getQueryData(tk.board(1, { q: "x" })), 10)).toEqual([1, 2, 3]);
    expect(qc.getQueryState(tk.board(1, { q: "x" }))?.isInvalidated).toBe(true);
    expect(qc.getQueryData(["kanbanBoard", 1])).toEqual({ legacy: true });
    expect(ids(qc.getQueryData(tk.board(2)), 10)).toEqual([1, 2, 3]);
  });

  it("reports when an updater asks for a refetch", () => {
    const qc = new QueryClient();
    qc.setQueryData(tk.board(1), makeBoard());
    expect(updateBoardCaches(qc, 1, (c) => applyCardUpsert(c, makeCard(9, 404, 0)))).toBe(true);
    expect(updateBoardCaches(qc, 1, (c) => applyCardUpsert(c, makeCard(9, 10, 0)))).toBe(false);
  });

  it("'lite' scope patches every lite cache of the board", () => {
    const qc = new QueryClient();
    qc.setQueryData(tk.board(1), makeBoard());
    qc.setQueryData(tk.board(1, { q: "x" }), makeBoard());
    updateBoardCaches(qc, 1, (c) => applyCardPatch(c, 4, { comments_count: 7 }), "lite");
    expect(findCard(qc.getQueryData(tk.board(1)), 4)?.card.comments_count).toBe(7);
    expect(findCard(qc.getQueryData(tk.board(1, { q: "x" })), 4)?.card.comments_count).toBe(7);
  });
});
