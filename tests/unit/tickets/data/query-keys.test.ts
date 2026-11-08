import { describe, it, expect } from "vitest";
import { normalizeFilters, tk } from "@/app/(tenant)/tickets/_lib/query-keys";

describe("tk query keys", () => {
  it("keeps the legacy kanban prefix: tk.board(1,{q:'x'}) starts with ['kanbanBoard',1]", () => {
    const key = tk.board(1, { q: "x" });
    expect(key.slice(0, 2)).toEqual(["kanbanBoard", 1]);
    expect(key[2]).toEqual({ q: "x" });
  });

  it("tk.boards() starts with ['boards'] so existing invalidations hit it", () => {
    expect(tk.boards()[0]).toBe("boards");
    expect(tk.boards()).toEqual(["boards", "lite"]);
  });

  it("tk.tags() starts with ['tags'] (prefix of the existing useTags key)", () => {
    expect(tk.tags()[0]).toBe("tags");
  });

  it("produces equal keys for equivalent filters", () => {
    expect(tk.board(3, { priority: ["high", "critical"], label: [5, 2], q: "", assignee: [] })).toEqual(
      tk.board(3, { label: [2, 5], priority: ["critical", "high"] }),
    );
    expect(tk.board(3)).toEqual(tk.board(3, {}));
  });

  it("separates boards, lists and tickets", () => {
    expect(tk.list(1, {})).toEqual(["ticketList", 1, {}]);
    expect(tk.columnCounts(1)).toEqual(["ticketColumnCounts", 1, {}]);
    expect(tk.viewCounts(null)).toEqual(["ticketViewCounts", null]);
    expect(tk.ticket(9)).toEqual(["ticket", 9]);
    expect(tk.timerCurrent()).toEqual(["ticketTimer", "current"]);
    expect(tk.timer(9).slice(0, 1)).toEqual(tk.timerCurrent().slice(0, 1));
    expect(tk.navigation(9, { view: "board", sort: "manual" })).toEqual([
      "ticketNav",
      9,
      { view: "board", sort: "manual" },
    ]);
  });
});

describe("normalizeFilters", () => {
  it("drops empty values and sorts arrays", () => {
    expect(
      normalizeFilters({ assignee: ["me", "12", "3"], unassigned: false, due: null, q: "  ", priority: [] }),
    ).toEqual({ assignee: ["3", "12", "me"] });
  });

  it("trims search text", () => {
    expect(normalizeFilters({ q: " login " })).toEqual({ q: "login" });
  });
});
