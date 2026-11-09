/**
 * FE-08 list view: the grid, the sticky header (hidden below a 768px list, DC18), one
 * group per column with the column_counts total (DC17), the rows, the detail
 * link with the filters, infinite scroll, the empty states, the mobile
 * two-line layout and the realtime refresh. Also the view landing
 * (`?view=list&assignee=me`) through the screen.
 */
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import React from "react";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const h = vi.hoisted(() => ({
  profile: null as unknown,
  openTicketCreate: vi.fn(),
  boardHandlers: [] as ((e: unknown) => void)[],
  admin: {
    openCreateBoard: vi.fn(),
    openEditColumns: vi.fn(),
    openManageUsers: vi.fn(),
    openBoardSettings: vi.fn(),
    gates: { canCreateBoard: true, canEditColumns: true, canManageUsers: true, canOpenSettings: true },
  },
  api: {
    getBoardsLite: vi.fn(),
    getKanban: vi.fn(),
    getTicketList: vi.fn(),
    getColumnCounts: vi.fn(),
    getAllPages: vi.fn(),
    getBoardAccess: vi.fn(),
  },
}));

vi.mock("next/navigation", async () => (await import("../screen/helpers")).navigationMock);
vi.mock("@/services/auth", () => ({ authService: { isAuthenticated: () => true } }));
vi.mock("@/hooks/useUserProfile", () => ({ useUserProfile: () => ({ data: h.profile }) }));
vi.mock("@/contexts/TicketCreateContext", () => ({
  useTicketCreate: () => ({ openTicketCreate: h.openTicketCreate }),
}));
vi.mock("@/components/tickets-admin/board-admin-host", () => ({ useBoardAdmin: () => h.admin }));
vi.mock("@/app/(tenant)/tickets/_contexts/tickets-realtime-context", () => ({
  useTicketsRealtime: () => ({ activeUsers: [], wsReady: true }),
  useBoardEvents: (handler: (e: unknown) => void) => {
    // The latest render's handler wins, like the real hook's ref.
    h.boardHandlers[0] = handler;
  },
}));
vi.mock("@/app/(tenant)/tickets/_lib/api", async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  ...h.api,
}));

import { TicketList, listNeedsRefresh, LIST_GRID_TEMPLATE } from "@/app/(tenant)/tickets/_components/list";
import { TicketsScreen } from "@/app/(tenant)/tickets/_components/tickets-screen";
import { EMPTY_FILTERS } from "@/app/(tenant)/tickets/_hooks/use-ticket-filters";
import type { BoardLite, TicketListRow } from "@/app/(tenant)/tickets/_lib/types";
import { AGENT_PROFILE, BOARDS, STAFF_PROFILE, nav, newClient, renderScreen, resetNav } from "../screen/helpers";

const BOARD = BOARDS[0] as BoardLite;

const COLUMNS = [
  // Deliberately out of order: the list sorts by position.
  { id: 13, name: "Done", color: "#22c55e", position: 2, board: 1, is_closed_status: true },
  { id: 11, name: "To do", color: "#64748b", position: 0, board: 1, is_closed_status: false },
  { id: 12, name: "Doing", color: "#3b82f6", position: 1, board: 1, is_closed_status: false },
  { id: 14, name: "Archive", color: "#a855f7", position: 3, board: 1, is_closed_status: true },
];

const user = (id: number, first: string, last: string) => ({ id, email: `${first.toLowerCase()}@x.ge`, first_name: first, last_name: last });

function row(id: number, columnId: number, extra: Partial<TicketListRow> = {}): TicketListRow {
  const col = COLUMNS.find((c) => c.id === columnId)!;
  return {
    id,
    title: `Ticket ${id}`,
    priority: "medium",
    status: col.name,
    is_closed: false,
    column: { id: col.id, name: col.name, color: col.color, position: col.position, is_closed_status: col.is_closed_status, board: 1 },
    position_in_column: 0,
    created_at: "2026-11-05T10:00:00Z",
    updated_at: "2026-11-05T10:00:00Z",
    created_by: null,
    assigned_to: null,
    assigned_users: [],
    assigned_groups: [],
    tags: [],
    comments_count: 0,
    attachments_count: 0,
    checklist_items_count: 0,
    completed_checklist_items_count: 0,
    due_date: null,
    is_overdue_task: false,
    ...extra,
  } as TicketListRow;
}

function page(results: TicketListRow[], next: string | null = null) {
  return { count: results.length, next, previous: null, results };
}

type IOCallback = (entries: { isIntersecting: boolean }[]) => void;
const observers: { cb: IOCallback; el: Element | null }[] = [];

class FakeIO {
  private entry: { cb: IOCallback; el: Element | null };
  constructor(cb: IOCallback) {
    this.entry = { cb, el: null };
    observers.push(this.entry);
  }
  observe(el: Element) {
    this.entry.el = el;
  }
  disconnect() {
    const i = observers.indexOf(this.entry);
    if (i >= 0) observers.splice(i, 1);
  }
  unobserve() {}
  takeRecords() {
    return [];
  }
}

function intersect() {
  act(() => {
    for (const o of [...observers]) if (o.el?.isConnected) o.cb([{ isIntersecting: true }]);
  });
}

function renderList(props: Partial<React.ComponentProps<typeof TicketList>> = {}, locale: "en" | "ka" = "en") {
  const client = newClient();
  const utils = renderScreen(
    <TicketList board={BOARD} filters={EMPTY_FILTERS} sort="created" hasActiveFilters={false} {...props} />,
    { locale, client },
  );
  return { ...utils, client };
}

const groupIds = () => screen.getAllByTestId("list-group").map((g) => Number(g.getAttribute("data-column-id")));
const group = (columnId: number) =>
  screen.getAllByTestId("list-group").find((g) => g.getAttribute("data-column-id") === String(columnId))!;
const rowIdsIn = (columnId: number) =>
  within(group(columnId))
    .queryAllByTestId("list-row")
    .map((r) => Number(r.getAttribute("data-ticket-id")));

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

beforeEach(() => {
  resetNav("board=1&view=list");
  h.profile = STAFF_PROFILE;
  h.boardHandlers.length = 0;
  h.openTicketCreate.mockReset();
  h.admin.openEditColumns.mockReset();
  observers.length = 0;
  vi.stubGlobal("IntersectionObserver", FakeIO);
  h.api.getBoardsLite.mockResolvedValue(BOARDS);
  h.api.getKanban.mockResolvedValue(null);
  h.api.getBoardAccess.mockResolvedValue(null);
  h.api.getAllPages.mockImplementation(async (url: string) => (url === "/api/columns/" ? COLUMNS : []));
  h.api.getColumnCounts.mockResolvedValue({ counts: { 11: 7, 12: 1, 13: 0, 14: 0 } });
  h.api.getTicketList.mockResolvedValue(page([row(1, 11), row(2, 11), row(3, 12)]));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("layout", () => {
  it("uses the design's grid template on the header and the rows", async () => {
    expect(LIST_GRID_TEMPLATE).toBe("36px 64px minmax(0,1fr) 200px 90px 56px 90px");
    renderList();
    const header = await screen.findByTestId("list-header");
    const cls = "@3xl:grid-cols-[36px_64px_minmax(0,1fr)_200px_90px_56px_90px]";
    expect(header.className).toContain(cls);
    expect(screen.getAllByTestId("list-row")[0].className).toContain(cls);
  });

  it("the sticky header is translated and hidden below a 768px list width (DC18)", async () => {
    renderList();
    const header = await screen.findByTestId("list-header");
    // A container query on the list, not the viewport: with the sidebar open a
    // 768–1023px window would otherwise squeeze the title column to nothing.
    expect(screen.getByTestId("ticket-list").className).toContain("@container");
    expect(header.className).toMatch(/(^|\s)hidden(\s|$)/);
    expect(header.className).toContain("@3xl:grid");
    expect(header.className).toContain("sticky");
    expect(header.className).toContain("h-8");
    expect(header).toHaveTextContent(/IDTitleLabelsAssigneeCreated/);
    // Comments is the rows' icon (the word doesn't fit 56px), labelled by its tooltip.
    const comments = header.querySelector('[data-header="comments"]')!;
    expect(comments).toHaveAttribute("title", "Comments");
    expect(comments.querySelector("svg")).not.toBeNull();
    // Assignee may use the room the icon frees in the comments column.
    expect(header.querySelector('[data-header="assignee"]')!.className).toContain("w-[calc(100%+36px)]");
  });

  it("the header in Georgian", async () => {
    renderList({}, "ka");
    const header = await screen.findByTestId("list-header");
    expect(header).toHaveTextContent("სათაური");
    expect(header).toHaveTextContent("შემსრულებელი");
    expect(header.querySelector('[data-header="comments"]')).toHaveAttribute("title", "კომენტარები");
    expect(header.querySelector('[data-header="id"]')).toHaveTextContent("№");
  });
});

describe("groups (DC17)", () => {
  it("one group per column in position order, empty columns included, totals from column_counts", async () => {
    renderList();
    await screen.findAllByTestId("list-row");
    expect(groupIds()).toEqual([11, 12, 13, 14]);
    const counts = screen.getAllByTestId("list-group-count").map((c) => c.firstChild?.textContent);
    // 7 for "To do" although only 2 of its rows are loaded.
    expect(counts).toEqual(["7", "1", "0", "0"]);
    expect(rowIdsIn(11)).toEqual([1, 2]);
    expect(rowIdsIn(13)).toEqual([]);
    const header = within(group(11)).getByTestId("list-group-header");
    expect(header.className).toContain("h-[34px]");
    expect(header).toHaveTextContent("To do");
    expect(within(group(11)).getByText("7 tickets", { selector: ".sr-only" })).toBeInTheDocument();
  });

  it("a group's + opens the create sheet on that column", async () => {
    renderList();
    await screen.findAllByTestId("list-row");
    const add = within(group(12)).getByTestId("list-group-add");
    expect(add).toHaveAccessibleName("Add ticket");
    await userEvent.setup().click(add);
    expect(h.openTicketCreate).toHaveBeenCalledTimes(1);
    const [board, column] = h.openTicketCreate.mock.calls[0];
    expect(board).toMatchObject({ id: 1, name: "Support" });
    expect(column).toMatchObject({ id: 12, name: "Doing", board: 1 });
  });

  it("no + without create_tickets", async () => {
    h.profile = AGENT_PROFILE;
    renderList();
    await screen.findAllByTestId("list-row");
    expect(screen.queryByTestId("list-group-add")).toBeNull();
  });
});

describe("rows", () => {
  it("priority icon, mono id, title, list-size labels, avatars, comments and date", async () => {
    h.api.getTicketList.mockResolvedValue(
      page([
        row(5, 11, {
          title: "A very long title that should be cut with an ellipsis",
          priority: "critical",
          tags: [
            { id: 1, name: "VIP", color: "#ef4444" },
            { id: 2, name: "Bug", color: "#3b82f6" },
            { id: 3, name: "Billing", color: "#f59e0b" },
            { id: 4, name: "Phone", color: "#10b981" },
          ],
          assigned_to: user(3, "Mariam", "Lomidze") as never,
          assigned_users: [user(3, "Mariam", "Lomidze"), user(2, "Giorgi", "Kapanadze")] as never,
          comments_count: 4,
        }),
        row(6, 11),
      ]),
    );
    renderList();
    const [first, second] = await screen.findAllByTestId("list-row");

    const icon = first.querySelector('[data-slot="priority-icon"]')!;
    expect(icon).toHaveAttribute("title", "Critical");
    expect(icon).toHaveAttribute("data-priority", "critical");
    expect(within(first).getByText("#5")).toHaveClass("font-mono");
    expect(within(first).getByTestId("list-row-title")).toHaveClass("truncate");
    const chips = first.querySelectorAll('[data-slot="label-chip"]');
    expect(chips).toHaveLength(3);
    expect(chips[0].className).toContain("h-5");
    expect(first.querySelector('[data-slot="label-chips-more"]')).toHaveTextContent("+1");
    // assigned_to + assigned_users, deduplicated: MD + GK, 22px.
    expect(first).toHaveTextContent("ML");
    expect(first).toHaveTextContent("GK");
    expect(first.querySelector(".size-\\[22px\\]")).not.toBeNull();
    expect(within(first).getByTestId("list-row-comments")).toHaveTextContent("4");
    expect(within(first).getByTestId("list-row-comments")).toHaveTextContent("4 comments");
    expect(within(first).getByTestId("list-row-date")).toHaveTextContent("Nov 5");

    // No assignees: the dashed unassigned circle; zero comments still shown.
    expect(within(second).getByTitle("Unassigned")).toBeInTheDocument();
    expect(within(second).getByTestId("list-row-comments")).toHaveTextContent("0");
  });

  it("Georgian dates", async () => {
    renderList({}, "ka");
    const [first] = await screen.findAllByTestId("list-row");
    expect(within(first).getByTestId("list-row-date").textContent).not.toMatch(/Nov/);
  });

  it("a row opens the detail with the filters", async () => {
    resetNav("board=1&view=list&priority=high&sort=updated");
    renderList();
    const [first] = await screen.findAllByTestId("list-row");
    const href = "/tickets/1?board=1&view=list&priority=high&sort=updated";
    expect(first).toHaveAttribute("href", href);
    await userEvent.setup().click(first);
    expect(nav.push).toHaveBeenCalledWith(href);
  });

  it("ctrl/cmd click is left to the browser (new tab)", async () => {
    renderList();
    const [first] = await screen.findAllByTestId("list-row");
    fireEvent.click(first, { ctrlKey: true });
    fireEvent.click(first, { metaKey: true });
    expect(nav.push).not.toHaveBeenCalled();
  });

  it("two lines below a 768px list width: line wrappers are flex rows that become grid cells from @3xl", async () => {
    renderList();
    const [first] = await screen.findAllByTestId("list-row");
    expect(first.className).toContain("flex-col");
    expect(first.className).toContain("@3xl:grid");
    expect(first.className).toContain("@3xl:h-10");
    const main = first.querySelector('[data-slot="list-row-main"]')!;
    const meta = first.querySelector('[data-slot="list-row-meta"]')!;
    expect(main.className).toContain("@3xl:contents");
    expect(meta.className).toContain("@3xl:contents");
    // Mobile line 2: chips, avatars, date (comments from md only).
    expect(within(first).getByTestId("list-row-comments").className).toMatch(/(^|\s)hidden(\s|$)/);
  });
});

describe("infinite scroll", () => {
  it("loads the next page when the end of the loaded rows is reached; groups stay put", async () => {
    h.api.getTicketList.mockImplementation(async (_b: number, _f: unknown, p: number) =>
      p === 1
        ? page([row(1, 11), row(2, 11)], "http://x/api/tickets/?page=2")
        : page([row(3, 11), row(4, 12)], null),
    );
    renderList();
    await screen.findAllByTestId("list-row");
    expect(rowIdsIn(11)).toEqual([1, 2]);
    // Groups past the loaded rows with tickets show a placeholder, not "empty".
    expect(group(12)).toHaveAttribute("data-pending", "true");
    expect(group(13)).not.toHaveAttribute("data-pending");
    const sentinel = screen.getByTestId("list-sentinel");
    expect(group(11).contains(sentinel)).toBe(true);

    intersect();
    await waitFor(() => expect(rowIdsIn(12)).toEqual([4]));
    expect(h.api.getTicketList).toHaveBeenLastCalledWith(1, expect.anything(), 2);
    expect(rowIdsIn(11)).toEqual([1, 2, 3]);
    expect(screen.queryByTestId("list-sentinel")).toBeNull();
    expect(group(12)).not.toHaveAttribute("data-pending");
    // Totals come from column_counts, so loading pages never changes them.
    expect(screen.getAllByTestId("list-group-count").map((c) => c.firstChild?.textContent)).toEqual(["7", "1", "0", "0"]);
    expect(h.api.getColumnCounts).toHaveBeenCalledTimes(1);
  });

  it("sends the list filters and sort", async () => {
    resetNav("board=1&view=list&assignee=me&sort=priority");
    renderList({ sort: "priority", hasActiveFilters: true });
    await screen.findAllByTestId("list-row");
    const [boardId, filters, p] = h.api.getTicketList.mock.calls[0];
    expect(boardId).toBe(1);
    expect(p).toBe(1);
    expect(filters).toMatchObject({ assignee: ["me"], sort: "priority" });
  });
});

describe("states", () => {
  it("no filter matches: empty state with Clear", async () => {
    resetNav("board=1&view=list&priority=low");
    h.api.getTicketList.mockResolvedValue(page([]));
    h.api.getColumnCounts.mockResolvedValue({ counts: { 11: 0, 12: 0, 13: 0, 14: 0 } });
    renderList({ hasActiveFilters: true });
    expect(await screen.findByText("No tickets match these filters")).toBeInTheDocument();
    await userEvent.setup().click(screen.getByTestId("list-clear-filters"));
    expect(nav.replace).toHaveBeenLastCalledWith("/tickets?board=1&view=list", { scroll: false });
  });

  it("an empty board without filters still shows every group", async () => {
    h.api.getTicketList.mockResolvedValue(page([]));
    h.api.getColumnCounts.mockResolvedValue({ counts: { 11: 0, 12: 0, 13: 0, 14: 0 } });
    renderList();
    await waitFor(() => expect(screen.getAllByTestId("list-group")).toHaveLength(4));
  });

  it("zero columns: Add column for managers (DC39)", async () => {
    h.api.getAllPages.mockResolvedValue([]);
    renderList();
    await userEvent.setup().click(await screen.findByTestId("kanban-no-columns-add"));
    expect(h.admin.openEditColumns).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
  });

  it("load error with retry", async () => {
    h.api.getTicketList.mockRejectedValueOnce(Object.assign(new Error("x"), { response: { status: 500 } }));
    renderList();
    await userEvent.setup().click(await screen.findByTestId("list-retry"));
    expect(await screen.findAllByTestId("list-row")).toHaveLength(3);
  });

  it("board access lost (403)", async () => {
    h.api.getTicketList.mockRejectedValue(Object.assign(new Error("x"), { response: { status: 403 } }));
    renderList();
    expect(await screen.findByText(/access/i)).toBeInTheDocument();
  });
});

describe("realtime", () => {
  it("a board event invalidates the list and the column counts of the board", async () => {
    const { client } = renderList();
    await screen.findAllByTestId("list-row");
    const spy = vi.spyOn(client, "invalidateQueries");
    act(() => h.boardHandlers[0]({ type: "ticket_moved", ticket_id: 1, from_column_id: 11, to_column_id: 12 }));
    expect(spy).toHaveBeenCalledWith({ queryKey: ["ticketList", 1] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ["ticketColumnCounts", 1] });
    await waitFor(() => expect(h.api.getTicketList.mock.calls.length).toBeGreaterThan(1));
  });

  it("which events refresh the list", () => {
    expect(listNeedsRefresh({ type: "ticket_created" } as never)).toBe(true);
    expect(listNeedsRefresh({ type: "ticket_deleted" } as never)).toBe(true);
    expect(listNeedsRefresh({ type: "ticket_updated" } as never)).toBe(true);
    expect(listNeedsRefresh({ type: "ticket_commented" } as never)).toBe(true);
    expect(listNeedsRefresh({ type: "ticket_activity", kind: "comment_deleted" } as never)).toBe(true);
    expect(listNeedsRefresh({ type: "ticket_activity", kind: "timer" } as never)).toBe(false);
    expect(listNeedsRefresh({ type: "ticket_activity", kind: "checklist" } as never)).toBe(false);
  });
});

describe("view landing", () => {
  it("?view=list&assignee=me renders the list with the Assignee chip active", async () => {
    resetNav("board=1&view=list&assignee=me");
    renderScreen(
      <TicketsScreen renderBoard={() => <div data-testid="board-view" />} renderList={(p) => <TicketList {...p} />} listViewEnabled />,
    );
    expect(await screen.findByTestId("ticket-list")).toBeInTheDocument();
    expect(screen.getByTestId("tickets-screen")).toHaveAttribute("data-state", "list");
    const chip = document.querySelector('button[data-filter="assignee"]')!;
    expect(chip).toHaveAttribute("data-active", "true");
    expect(chip).toHaveTextContent("Me");
    // The toolbar total is the sum of column_counts (7 + 1).
    expect(await screen.findByText("8 tickets")).toBeInTheDocument();
    expect(h.api.getKanban).not.toHaveBeenCalled();
    expect(h.api.getTicketList.mock.calls[0][1]).toMatchObject({ assignee: ["me"] });
  });
});
