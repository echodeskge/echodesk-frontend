import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const nav = vi.hoisted(() => ({
  search: "",
  pathname: "/tickets",
  replace: vi.fn(),
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: nav.replace, push: nav.push }),
  usePathname: () => nav.pathname,
  useSearchParams: () => new URLSearchParams(nav.search),
}));

import {
  SELECTED_BOARD_STORAGE_KEY,
  applyFilterChange,
  nextSort,
  parseTicketSearchParams,
  serializeTicketState,
  useTicketFilters,
} from "@/app/(tenant)/tickets/_hooks/use-ticket-filters";

function lastUrl(): string {
  const call = nav.replace.mock.calls.at(-1);
  return call ? (call[0] as string) : "";
}

beforeEach(() => {
  nav.search = "";
  nav.pathname = "/tickets";
  nav.replace.mockClear();
  nav.push.mockClear();
  window.localStorage.clear();
});

describe("parse / serialise", () => {
  it("parses every param including due", () => {
    const s = parseTicketSearchParams(
      new URLSearchParams(
        "board=3&view=list&assignee=me,12&unassigned=1&priority=high,critical&label=4,9&due=overdue&q=login&sort=priority",
      ),
    );
    expect(s).toEqual({
      boardId: 3,
      view: "list",
      sort: "priority",
      filters: {
        assignee: ["me", "12"],
        unassigned: true,
        priority: ["high", "critical"],
        label: [4, 9],
        due: "overdue",
        q: "login",
      },
    });
  });

  it("drops invalid values", () => {
    const s = parseTicketSearchParams(
      new URLSearchParams("board=abc&view=grid&assignee=bob,0,5&priority=urgent,low&label=x,7&due=soon&sort=manual&view=list"),
    );
    expect(s.boardId).toBeNull();
    expect(s.view).toBe("board"); // first `view` wins in URLSearchParams.get
    expect(s.filters.assignee).toEqual(["5"]);
    expect(s.filters.priority).toEqual(["low"]);
    expect(s.filters.label).toEqual([7]);
    expect(s.filters.due).toBeNull();
  });

  it("never gives list view the manual sort", () => {
    expect(parseTicketSearchParams(new URLSearchParams("view=list&sort=manual")).sort).toBe("created");
    expect(parseTicketSearchParams(new URLSearchParams("")).sort).toBe("manual");
  });

  it("round-trips through serialise, omitting defaults", () => {
    const qs = "board=3&view=list&assignee=me%2C12&unassigned=1&priority=high&label=4&due=week&q=a+b&sort=due";
    expect(serializeTicketState(parseTicketSearchParams(new URLSearchParams(qs)))).toBe(qs);
    expect(serializeTicketState(parseTicketSearchParams(new URLSearchParams("board=2&sort=manual")))).toBe("board=2");
    expect(serializeTicketState(parseTicketSearchParams(new URLSearchParams("view=list&sort=created")))).toBe("view=list");
  });

  it("switching to list view replaces manual sort, keeps others", () => {
    const base = parseTicketSearchParams(new URLSearchParams("board=1"));
    expect(applyFilterChange(base, "view", "list").sort).toBe("created");
    const due = applyFilterChange(base, "sort", "due");
    expect(applyFilterChange(due, "view", "list").sort).toBe("due");
  });
});

describe("cycleSort", () => {
  it("board cycle includes manual", () => {
    const seen = ["manual"];
    let s = "manual" as Parameters<typeof nextSort>[1];
    for (let i = 0; i < 5; i++) {
      s = nextSort("board", s);
      seen.push(s);
    }
    expect(seen).toEqual(["manual", "created", "updated", "priority", "due", "manual"]);
  });

  it("list cycle has no manual", () => {
    expect(nextSort("list", "created")).toBe("updated");
    expect(nextSort("list", "due")).toBe("created");
  });

  it("hook cycles per view through router.replace", () => {
    nav.search = "board=2&sort=due";
    const { result } = renderHook(() => useTicketFilters());
    act(() => result.current.cycleSort());
    expect(lastUrl()).toBe("/tickets?board=2"); // due -> manual (default, omitted)

    nav.search = "board=2&view=list&sort=due";
    const { result: list } = renderHook(() => useTicketFilters());
    act(() => list.current.cycleSort());
    expect(lastUrl()).toBe("/tickets?board=2&view=list"); // due -> created (default)
  });
});

describe("useTicketFilters", () => {
  it("exposes the parsed state", () => {
    nav.search = "board=5&priority=critical&q=x";
    const { result } = renderHook(() => useTicketFilters());
    expect(result.current.boardId).toBe(5);
    expect(result.current.view).toBe("board");
    expect(result.current.filters.priority).toEqual(["critical"]);
    expect(result.current.queryFilters).toMatchObject({ priority: ["critical"], q: "x", sort: "manual" });
    expect(result.current.hasActiveFilters).toBe(true);
    expect(result.current.isManualSort).toBe(true);
    expect(result.current.toQueryString()).toBe("board=5&priority=critical&q=x");
  });

  it("setFilter writes the URL with router.replace, never push", () => {
    nav.search = "board=5";
    const { result } = renderHook(() => useTicketFilters());
    act(() => result.current.setFilter("assignee", ["me"]));
    expect(lastUrl()).toBe("/tickets?board=5&assignee=me");
    expect(nav.replace).toHaveBeenCalledWith("/tickets?board=5&assignee=me", { scroll: false });
    act(() => result.current.setFilter("due", "none"));
    expect(lastUrl()).toBe("/tickets?board=5&due=none");
    expect(nav.push).not.toHaveBeenCalled();
  });

  it("setFilters applies several changes in one replace", () => {
    nav.search = "board=5";
    const { result } = renderHook(() => useTicketFilters());
    act(() => result.current.setFilters({ view: "list", priority: ["high", "critical"], unassigned: true }));
    expect(nav.replace).toHaveBeenCalledTimes(1);
    expect(lastUrl()).toBe("/tickets?board=5&view=list&unassigned=1&priority=high%2Ccritical");
  });

  it("clear() keeps board and view", () => {
    nav.search = "board=5&view=list&assignee=me&priority=low&label=3&due=week&q=abc&sort=priority";
    const { result } = renderHook(() => useTicketFilters());
    act(() => result.current.clear());
    expect(lastUrl()).toBe("/tickets?board=5&view=list");
  });

  it("hasActiveFilters ignores sort; isManualSort is board-view manual only", () => {
    nav.search = "board=5&sort=priority";
    const { result } = renderHook(() => useTicketFilters());
    expect(result.current.hasActiveFilters).toBe(false);
    expect(result.current.isManualSort).toBe(false);

    nav.search = "board=5&view=list";
    const { result: list } = renderHook(() => useTicketFilters());
    expect(list.current.isManualSort).toBe(false);
  });

  it("falls back to the stored board when the URL has none, and stores a new board", () => {
    window.localStorage.setItem(SELECTED_BOARD_STORAGE_KEY, "7");
    nav.search = "";
    const { result } = renderHook(() => useTicketFilters());
    expect(result.current.boardId).toBe(7);
    act(() => result.current.setFilter("board", 9));
    expect(lastUrl()).toBe("/tickets?board=9");
    expect(window.localStorage.getItem(SELECTED_BOARD_STORAGE_KEY)).toBe("9");
  });

  it("the URL board wins over the stored one", () => {
    window.localStorage.setItem(SELECTED_BOARD_STORAGE_KEY, "7");
    nav.search = "board=2";
    const { result } = renderHook(() => useTicketFilters());
    expect(result.current.boardId).toBe(2);
  });

  it("survives localStorage throwing (private mode)", () => {
    const getSpy = vi.spyOn(window.localStorage, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    const setSpy = vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    try {
      nav.search = "";
      const { result } = renderHook(() => useTicketFilters());
      expect(result.current.boardId).toBeNull();
      expect(() => act(() => result.current.setFilter("board", 4))).not.toThrow();
      expect(lastUrl()).toBe("/tickets?board=4");
    } finally {
      getSpy.mockRestore();
      setSpy.mockRestore();
    }
  });
});
