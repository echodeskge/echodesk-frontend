/**
 * FE-06 toolbar: view segment, Assignee / Priority / Label / Due chips, count,
 * search (debounced into ?q), sort cycle and clear. Every value round-trips
 * through the URL (the stateful next/navigation mock).
 */
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import React from "react";
import { act, fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/navigation", async () => (await import("./helpers")).navigationMock);

import { TicketsToolbar } from "@/app/(tenant)/tickets/_components/toolbar/tickets-toolbar";
import { SEARCH_URL_DEBOUNCE_MS } from "@/app/(tenant)/tickets/_components/toolbar/toolbar-search";
import { lastReplace, nav, renderScreen, resetNav } from "./helpers";

const USERS = [
  { id: 4, name: "Giorgi Kapanadze" },
  { id: 5, name: "Lika Maisuradze" },
];
const TAGS = [
  { id: 10, name: "Login", color: "#a855f7" },
  { id: 11, name: "PBX", color: "#ef4444" },
];

function renderToolbar(props: Partial<React.ComponentProps<typeof TicketsToolbar>> = {}, locale: "en" | "ka" = "en") {
  return renderScreen(<TicketsToolbar count={7} users={USERS} tags={TAGS} {...props} />, { locale });
}

function chip(id: string) {
  return document.querySelector(`[data-filter="${id}"]`) as HTMLElement | null;
}

async function openChip(id: string) {
  await userEvent.setup().click(chip(id)!);
  return (await screen.findByRole("dialog")) as HTMLElement;
}

function option(menu: HTMLElement, value: string) {
  return menu.querySelector(`[data-option="${value}"]`) as HTMLElement;
}

beforeAll(() => {
  // cmdk scrolls the active item into view; jsdom has no scrollIntoView.
  Element.prototype.scrollIntoView = vi.fn();
});

beforeEach(() => resetNav("board=1"));

describe("view segment", () => {
  it("hides List while the list flag is off (DC3)", () => {
    renderToolbar({ listViewEnabled: false });
    const group = screen.getByRole("radiogroup", { name: "View" });
    expect(within(group).getAllByRole("radio").map((r) => r.textContent)).toEqual(["Board"]);
  });

  it("switching to List updates ?view when the flag is on", async () => {
    renderToolbar({ listViewEnabled: true });
    await userEvent.setup().click(screen.getByRole("radio", { name: "List" }));
    expect(lastReplace()?.get("view")).toBe("list");
    expect(lastReplace()?.get("board")).toBe("1");
    expect(screen.getByRole("radio", { name: "List" })).toHaveAttribute("aria-checked", "true");
  });
});

describe("Assignee chip", () => {
  it("offers Me, the users and Unassigned, multi-select", async () => {
    renderToolbar();
    const menu = await openChip("assignee");
    const labels = [...menu.querySelectorAll("[data-option]")].map((o) => o.textContent?.replace(/^[A-Z]{1,2}(?=[A-Z])/, ""));
    expect(menu.querySelectorAll("[data-option]")).toHaveLength(4);
    expect(option(menu, "me")).toHaveTextContent("Me");
    expect(option(menu, "4")).toHaveTextContent("Giorgi Kapanadze");
    expect(option(menu, "__unassigned")).toHaveTextContent("Unassigned");
    expect(labels).toHaveLength(4);

    fireEvent.click(option(menu, "me"));
    expect(lastReplace()?.get("assignee")).toBe("me");
    // Stays open for more picks.
    fireEvent.click(option(await screen.findByRole("dialog"), "4"));
    expect(lastReplace()?.get("assignee")).toBe("me,4");
    fireEvent.click(option(await screen.findByRole("dialog"), "__unassigned"));
    expect(lastReplace()?.get("unassigned")).toBe("1");
    expect(lastReplace()?.get("assignee")).toBe("me,4");
  });

  it("renders the active state with the first value and +n (Me +2)", () => {
    resetNav("board=1&assignee=me,4&unassigned=1");
    renderToolbar();
    const c = chip("assignee")!;
    expect(c).toHaveAttribute("data-active", "true");
    expect(c.querySelector('[data-slot="filter-chip-value"]')).toHaveTextContent("Me +2");
    expect(c.querySelector('[data-slot="filter-chip-plus"]')).toBeNull();
    expect(c.className).toContain("border-solid");
  });

  it("an inactive chip is dashed with a trailing Plus", () => {
    renderToolbar();
    const c = chip("priority")!;
    expect(c).toHaveAttribute("data-active", "false");
    expect(c.className).toContain("border-dashed");
    expect(c.querySelector('[data-slot="filter-chip-plus"]')).not.toBeNull();
  });

  it("unselecting the last value turns the chip inactive", async () => {
    resetNav("board=1&assignee=4");
    renderToolbar();
    expect(chip("assignee")!.querySelector('[data-slot="filter-chip-value"]')).toHaveTextContent("Giorgi Kapanadze");
    const menu = await openChip("assignee");
    fireEvent.click(option(menu, "4"));
    expect(lastReplace()?.has("assignee")).toBe(false);
    expect(chip("assignee")).toHaveAttribute("data-active", "false");
  });
});

describe("Priority and Label chips", () => {
  it("Priority offers the 4 backend values, translated", async () => {
    renderToolbar();
    const menu = await openChip("priority");
    expect([...menu.querySelectorAll("[data-option]")].map((o) => o.getAttribute("data-option"))).toEqual([
      "critical",
      "high",
      "medium",
      "low",
    ]);
    expect(option(menu, "critical")).toHaveTextContent("Critical");
    fireEvent.click(option(menu, "high"));
    fireEvent.click(option(await screen.findByRole("dialog"), "critical"));
    expect(lastReplace()?.get("priority")).toBe("high,critical");
    expect(chip("priority")!.querySelector('[data-slot="filter-chip-value"]')).toHaveTextContent("Critical +1");
  });

  it("Label lists the tags with colour dots", async () => {
    renderToolbar();
    const menu = await openChip("label");
    expect(option(menu, "10")).toHaveTextContent("Login");
    expect(option(menu, "10").querySelector('[data-slot="color-dot"]')).toHaveStyle({ background: "#a855f7" });
    fireEvent.click(option(menu, "11"));
    expect(lastReplace()?.get("label")).toBe("11");
    expect(chip("label")!.querySelector('[data-slot="filter-chip-value"]')).toHaveTextContent("PBX");
  });

  it("translates chip labels in ka", () => {
    renderToolbar({}, "ka");
    expect(chip("assignee")).toHaveTextContent("შემსრულებელი");
    expect(chip("priority")).toHaveTextContent("პრიორიტეტი");
    expect(screen.getByTestId("toolbar-count")).toHaveTextContent("7 ბილეთი");
  });
});

describe("Due chip (DC2)", () => {
  it("is hidden until due is set", () => {
    renderToolbar();
    expect(chip("due")).toBeNull();
  });

  it("shows when ?due is set, with the value", () => {
    resetNav("board=1&due=overdue");
    renderToolbar();
    expect(chip("due")!.querySelector('[data-slot="filter-chip-value"]')).toHaveTextContent("Overdue");
  });

  it("is added from More filters in the Assignee popover and opens", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      renderToolbar();
      const menu = await openChip("assignee");
      fireEvent.click(within(menu).getByTestId("more-filters"));
      await act(async () => {
        vi.advanceTimersByTime(10);
      });
      expect(chip("due")).not.toBeNull();
      const dueMenu = await screen.findByRole("dialog");
      expect([...dueMenu.querySelectorAll("[data-option]")].map((o) => o.textContent)).toEqual([
        "Overdue",
        "This week",
        "No date",
      ]);
      fireEvent.click(option(dueMenu, "week"));
      expect(lastReplace()?.get("due")).toBe("week");
      // Single-select: closes.
      expect(screen.queryByRole("dialog")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("picking the selected value clears it", async () => {
    resetNav("board=1&due=none");
    renderToolbar();
    const menu = await openChip("due");
    fireEvent.click(option(menu, "none"));
    expect(lastReplace()?.has("due")).toBe(false);
  });

  it("More filters is not offered once the Due chip shows", async () => {
    resetNav("board=1&due=week");
    renderToolbar();
    const menu = await openChip("assignee");
    expect(within(menu).queryByTestId("more-filters")).toBeNull();
  });
});

describe("count, search, sort, clear", () => {
  it("shows the ICU count, and hides it while unknown", () => {
    const { unmount } = renderToolbar({ count: 1 });
    expect(screen.getByTestId("toolbar-count")).toHaveTextContent("1 ticket");
    unmount();
    renderToolbar({ count: null });
    expect(screen.queryByTestId("toolbar-count")).toBeNull();
  });

  it("debounces the search into ?q", () => {
    vi.useFakeTimers();
    try {
      renderToolbar();
      const input = screen.getByTestId("toolbar-search-input");
      fireEvent.change(input, { target: { value: "log" } });
      fireEvent.change(input, { target: { value: "login" } });
      expect(nav.replace).not.toHaveBeenCalled();
      act(() => {
        vi.advanceTimersByTime(SEARCH_URL_DEBOUNCE_MS);
      });
      expect(nav.replace).toHaveBeenCalledTimes(1);
      expect(lastReplace()?.get("q")).toBe("login");
    } finally {
      vi.useRealTimers();
    }
  });

  it("the search input is 220px on desktop and collapses behind an icon on mobile", async () => {
    renderToolbar();
    const input = screen.getByTestId("toolbar-search-input");
    expect(input.className).toContain("sm:w-[220px]");
    expect(input.parentElement!.className).toContain("hidden sm:block");
    const open = screen.getByTestId("toolbar-search-open");
    expect(open.className).toContain("sm:hidden");
    await userEvent.setup().click(open);
    expect(input.parentElement!.className).not.toContain("hidden");
    expect(open.className).toMatch(/(^|\s)hidden(\s|$)/);
  });

  it("follows outside changes to ?q", () => {
    resetNav("board=1&q=pbx");
    renderToolbar();
    expect(screen.getByTestId("toolbar-search-input")).toHaveValue("pbx");
  });

  it("the sort button cycles Manual → Created → … and shows its label", async () => {
    const user = userEvent.setup();
    renderToolbar();
    const btn = screen.getByTestId("toolbar-sort");
    expect(btn).toHaveTextContent("Manual");
    expect(btn).toHaveAccessibleName("Sort: Manual");
    await user.click(btn);
    expect(lastReplace()?.get("sort")).toBe("created");
    expect(btn).toHaveTextContent("Created");
    for (const next of ["updated", "priority", "due"]) {
      await user.click(btn);
      expect(lastReplace()?.get("sort")).toBe(next);
    }
    await user.click(btn);
    expect(lastReplace()?.has("sort")).toBe(false);
    expect(btn).toHaveTextContent("Manual");
  });

  it("FilterX clears the filters but keeps board and view, and is disabled with none", async () => {
    resetNav("board=1&view=list&assignee=me&priority=high&label=10&due=overdue&q=x");
    renderToolbar({ listViewEnabled: true });
    const clear = screen.getByTestId("toolbar-clear");
    expect(clear).toBeEnabled();
    expect(clear.querySelector("svg")!.getAttribute("class")).toContain("lucide-funnel-x");
    await userEvent.setup().click(clear);
    const sp = lastReplace()!;
    expect([...sp.keys()].sort()).toEqual(["board", "view"]);
    expect(sp.get("view")).toBe("list");
    expect(chip("due")).toBeNull();
    expect(screen.getByTestId("toolbar-clear")).toBeDisabled();
  });

  it("is disabled with no filters", () => {
    renderToolbar();
    expect(screen.getByTestId("toolbar-clear")).toBeDisabled();
  });
});

describe("layout", () => {
  it("is 44px high and the chips scroll horizontally (390px)", () => {
    renderToolbar();
    expect(screen.getByTestId("tickets-toolbar").className).toContain("h-11");
    const chips = screen.getByTestId("toolbar-chips");
    expect(chips.className).toContain("overflow-x-auto");
    expect(chips.className).toContain("min-w-0");
    expect(chips.className).toContain("flex-1");
    expect(chip("assignee")!.className).toContain("shrink-0");
  });
});

afterEach(() => vi.useRealTimers());
