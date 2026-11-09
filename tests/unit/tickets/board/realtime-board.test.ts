/**
 * Realtime application on the kanban (plan E33, R11, WS8).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { applyBoardEvent } from "@/app/(tenant)/tickets/_lib/realtime-board";
import { findCard } from "@/app/(tenant)/tickets/_lib/board-cache";
import { _resetMutations, issueMutationId } from "@/app/(tenant)/tickets/_lib/mutation-id";
import { tk } from "@/app/(tenant)/tickets/_lib/query-keys";
import type { BoardEvent } from "@/app/(tenant)/tickets/_lib/types";
import { ids, makeBoard, makeCard } from "./fixtures";

function setup() {
  const qc = new QueryClient();
  qc.setQueryData(tk.board(1), makeBoard());
  const invalidate = vi.spyOn(qc, "invalidateQueries");
  const setQueries = vi.spyOn(qc, "setQueriesData");
  const board = () => qc.getQueryData<ReturnType<typeof makeBoard>>(tk.board(1));
  /** invalidateQueries calls that would refetch (not the refetchType:'none' stale marks). */
  const refetches = () =>
    invalidate.mock.calls.filter((c) => (c[0] as { refetchType?: string })?.refetchType !== "none");
  return { qc, invalidate, setQueries, board, refetches };
}

const UNFILTERED = { filtered: false };
const FILTERED = { filtered: true };

beforeEach(() => _resetMutations());

describe("own mutations", () => {
  it("ignores an event carrying this tab's mutation id", () => {
    const { qc, board, refetches } = setup();
    const mid = issueMutationId();
    const event: BoardEvent = { type: "ticket_deleted", ticket_id: 1, client_mutation_id: mid };
    expect(applyBoardEvent(qc, 1, event, UNFILTERED)).toBe("ignored");
    expect(applyBoardEvent(qc, 1, event, FILTERED)).toBe("ignored");
    expect(ids(board(), 10)).toEqual([1, 2, 3]);
    expect(refetches()).toHaveLength(0);
  });
});

describe("no filters, manual sort: splice", () => {
  it("ticket_updated with a card → upsert", () => {
    const { qc, board, setQueries } = setup();
    const event: BoardEvent = {
      type: "ticket_updated",
      ticket_id: 2,
      changes: { title: { old: "a", new: "Renamed" } },
      card: makeCard(2, 10, 1, { title: "Renamed" }),
      client_mutation_id: "someone-else",
    };
    expect(applyBoardEvent(qc, 1, event, UNFILTERED)).toBe("applied");
    expect(findCard(board(), 2)?.card.title).toBe("Renamed");
    expect(setQueries).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ["kanbanBoard", 1] }), expect.any(Function));
  });

  it("ticket_updated without a card → refetch", () => {
    const { qc, refetches } = setup();
    const event: BoardEvent = { type: "ticket_updated", ticket_id: 2, changes: {} };
    expect(applyBoardEvent(qc, 1, event, UNFILTERED)).toBe("invalidated");
    expect(refetches()[0][0]).toMatchObject({ queryKey: ["kanbanBoard", 1] });
  });

  it("ticket_moved → move to the server position", () => {
    const { qc, board } = setup();
    const event: BoardEvent = { type: "ticket_moved", ticket_id: 1, from_column_id: 10, to_column_id: 20, position: 1 };
    expect(applyBoardEvent(qc, 1, event, UNFILTERED)).toBe("applied");
    expect(ids(board(), 10)).toEqual([2, 3]);
    expect(ids(board(), 20)).toEqual([4, 1]);
  });

  it("ticket_moved for a card not in the cache inserts it from `card`", () => {
    const { qc, board } = setup();
    const event: BoardEvent = {
      type: "ticket_moved",
      ticket_id: 9,
      from_column_id: 10,
      to_column_id: 30,
      position: 0,
      card: makeCard(9, 30, 0),
    };
    expect(applyBoardEvent(qc, 1, event, UNFILTERED)).toBe("applied");
    expect(ids(board(), 30)).toEqual([9]);
  });

  it("ticket_created → inserted once (dedupe)", () => {
    const { qc, board } = setup();
    const event: BoardEvent = { type: "ticket_created", ticket: makeCard(9, 30, 0) };
    applyBoardEvent(qc, 1, event, UNFILTERED);
    applyBoardEvent(qc, 1, event, UNFILTERED);
    expect(ids(board(), 30)).toEqual([9]);
  });

  it("ticket_deleted → removed", () => {
    const { qc, board } = setup();
    expect(applyBoardEvent(qc, 1, { type: "ticket_deleted", ticket_id: 4 }, UNFILTERED)).toBe("applied");
    expect(ids(board(), 20)).toEqual([]);
  });

  it("a transfer (ticket_deleted reason=transferred) removes the card", () => {
    const { qc, board } = setup();
    const event: BoardEvent = { type: "ticket_deleted", ticket_id: 2, reason: "transferred", to_board_id: 5 };
    expect(applyBoardEvent(qc, 1, event, UNFILTERED)).toBe("applied");
    expect(ids(board(), 10)).toEqual([1, 3]);
  });

  it("an unknown column → refetch instead of splicing", () => {
    const { qc, board, refetches } = setup();
    const created: BoardEvent = { type: "ticket_created", ticket: makeCard(9, 404, 0) };
    expect(applyBoardEvent(qc, 1, created, UNFILTERED)).toBe("invalidated");
    const moved: BoardEvent = { type: "ticket_moved", ticket_id: 1, from_column_id: 10, to_column_id: 404, position: 0 };
    expect(applyBoardEvent(qc, 1, moved, UNFILTERED)).toBe("invalidated");
    expect(ids(board(), 10)).toEqual([1, 2, 3]);
    expect(refetches()).toHaveLength(2);
  });
});

describe("any filter active or sort ≠ manual: invalidate, never splice (R11)", () => {
  const events: BoardEvent[] = [
    { type: "ticket_updated", ticket_id: 2, changes: {}, card: makeCard(2, 10, 1, { title: "x" }) },
    { type: "ticket_moved", ticket_id: 1, from_column_id: 10, to_column_id: 20, position: 0 },
    { type: "ticket_created", ticket: makeCard(9, 30, 0) },
    { type: "ticket_deleted", ticket_id: 4 },
  ];
  for (const event of events) {
    it(`${event.type} → invalidateQueries(['kanbanBoard', id])`, () => {
      const { qc, board, setQueries, refetches } = setup();
      expect(applyBoardEvent(qc, 1, event, FILTERED)).toBe("invalidated");
      expect(refetches().map((c) => (c[0] as { queryKey: unknown }).queryKey)).toEqual([["kanbanBoard", 1]]);
      expect(setQueries).not.toHaveBeenCalled();
      expect(board()).toEqual(makeBoard());
    });
  }
});

describe("ticket_commented and ticket_activity", () => {
  it("ticket_commented updates comments_count (in both modes, it never changes filter membership)", () => {
    const { qc, board, refetches } = setup();
    qc.setQueryData(tk.board(1, { q: "x" }), makeBoard());
    const event: BoardEvent = { type: "ticket_commented", ticket_id: 3, comment: null, comments_count: 4 };
    expect(applyBoardEvent(qc, 1, event, FILTERED)).toBe("applied");
    expect(findCard(board(), 3)?.card.comments_count).toBe(4);
    expect(findCard(qc.getQueryData(tk.board(1, { q: "x" })), 3)?.card.comments_count).toBe(4);
    expect(refetches()).toHaveLength(0);
  });

  it("ticket_commented without a count is ignored", () => {
    const { qc } = setup();
    expect(applyBoardEvent(qc, 1, { type: "ticket_commented", ticket_id: 3, comment: null }, UNFILTERED)).toBe("ignored");
  });

  it("ticket_activity is left to the wrapper", () => {
    const { qc, refetches } = setup();
    expect(applyBoardEvent(qc, 1, { type: "ticket_activity", ticket_id: 3, kind: "checklist" }, UNFILTERED)).toBe(
      "ignored",
    );
    expect(refetches()).toHaveLength(0);
  });
});
