/**
 * FE-06 board page: board choice and fallback (W11), every screen state in
 * staff and non-staff variants (W28, DC39), the hand-off to the board view,
 * and `data-ws-ready` on the root (RM8).
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import React from "react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const h = vi.hoisted(() => ({
  profile: null as unknown,
  wsReady: false,
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
    getColumnCounts: vi.fn(),
    getAllPages: vi.fn(),
    getBoardAccess: vi.fn(),
  },
}));

vi.mock("next/navigation", async () => (await import("./helpers")).navigationMock);
vi.mock("@/services/auth", () => ({ authService: { isAuthenticated: () => true } }));
vi.mock("@/hooks/useUserProfile", () => ({ useUserProfile: () => ({ data: h.profile }) }));
vi.mock("@/contexts/TicketCreateContext", () => ({ useTicketCreate: () => ({ openTicketCreate: vi.fn() }) }));
vi.mock("@/components/tickets-admin/board-admin-host", () => ({ useBoardAdmin: () => h.admin }));
vi.mock("@/app/(tenant)/tickets/_contexts/tickets-realtime-context", () => ({
  useTicketsRealtime: () => ({ activeUsers: [], wsReady: h.wsReady }),
}));
vi.mock("@/app/(tenant)/tickets/_lib/api", async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  ...h.api,
}));

import { TicketsScreen, type BoardViewProps } from "@/app/(tenant)/tickets/_components/tickets-screen";
import { SELECTED_BOARD_STORAGE_KEY } from "@/app/(tenant)/tickets/_hooks/use-ticket-filters";
import type { KanbanResponse } from "@/app/(tenant)/tickets/_lib/types";
import { AGENT_PROFILE, BOARDS, STAFF_PROFILE, lastReplace, nav, renderScreen, resetNav } from "./helpers";

class HttpError extends Error {
  response: { status: number };
  constructor(status: number) {
    super(`HTTP ${status}`);
    this.response = { status };
  }
}

function card(id: number, column_id: number) {
  return {
    id,
    title: `Ticket ${id}`,
    priority: "medium",
    column_id,
    position_in_column: 0,
    is_order: false,
    is_closed: false,
    tags: [],
    assignees: [],
    comments_count: 0,
    attachments_count: 0,
    price: null,
    currency: null,
    is_paid: false,
    payment_due_date: null,
    created_at: "2026-11-05T10:00:00Z",
    updated_at: "2026-11-05T10:00:00Z",
    due_date: null,
    is_overdue_task: false,
    checklist_items_count: 0,
    completed_checklist_items_count: 0,
    description_preview: "",
  };
}

function kanban(boardId: number, cards: Record<number, number[]> = { 11: [1, 2], 12: [3] }): KanbanResponse {
  const columns = Object.keys(cards).map((id, i) => ({
    id: Number(id),
    name: `Col ${id}`,
    color: "#3b82f6",
    position: i,
    is_default: i === 0,
    is_closed_status: false,
    track_time: false,
    board: boardId,
    tickets_count: 99,
  }));
  return {
    board: { id: boardId, name: BOARDS.find((b) => b.id === boardId)?.name ?? "?" },
    columns,
    tickets_by_column: Object.fromEntries(
      Object.entries(cards).map(([col, ids]) => [col, ids.map((id) => card(id, Number(col)))]),
    ),
  } as unknown as KanbanResponse;
}

const renderBoard = vi.fn((p: BoardViewProps) => (
  <div data-testid="board-view" data-board={p.board.id} data-manual={String(p.isManualSort)} />
));

function renderPage(locale: "en" | "ka" = "en") {
  return renderScreen(<TicketsScreen renderBoard={renderBoard} />, { locale });
}

const state = () => screen.getByTestId("tickets-screen").getAttribute("data-state");

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

beforeEach(() => {
  resetNav("");
  h.profile = STAFF_PROFILE;
  h.wsReady = false;
  h.api.getBoardsLite.mockResolvedValue(BOARDS);
  h.api.getKanban.mockImplementation(async (id: number) => kanban(id));
  h.api.getColumnCounts.mockResolvedValue({ counts: {} });
  h.api.getAllPages.mockResolvedValue([]);
  h.api.getBoardAccess.mockResolvedValue(null);
});

describe("board choice (W11)", () => {
  it("uses ?board when the lite boards include it", async () => {
    resetNav("board=2");
    renderPage();
    expect(await screen.findByTestId("board-view")).toHaveAttribute("data-board", "2");
    expect(h.api.getKanban).toHaveBeenCalledWith(2, expect.anything());
    expect(nav.replace).not.toHaveBeenCalled();
  });

  it("replaces an unknown board with the default board", async () => {
    resetNav("board=99&priority=high");
    renderPage();
    await waitFor(() => expect(lastReplace()?.get("board")).toBe("1"));
    expect(lastReplace()?.get("priority")).toBe("high");
    expect(localStorage.getItem(SELECTED_BOARD_STORAGE_KEY)).toBe("1");
    expect(h.api.getKanban).not.toHaveBeenCalledWith(99, expect.anything());
  });

  it("falls back to the stored board without ?board", async () => {
    localStorage.setItem(SELECTED_BOARD_STORAGE_KEY, "3");
    h.api.getKanban.mockImplementation(async (id: number) => kanban(id));
    renderPage();
    expect(await screen.findByTestId("board-view")).toHaveAttribute("data-board", "3");
  });

  it("uses the first board when none is default", async () => {
    h.api.getBoardsLite.mockResolvedValue(BOARDS.map((b) => ({ ...b, is_default: false })).slice(1));
    renderPage();
    await waitFor(() => expect(lastReplace()?.get("board")).toBe("2"));
  });
});

describe("states", () => {
  it("shows the skeleton while loading", () => {
    h.api.getBoardsLite.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(state()).toBe("loading");
    expect(screen.getByTestId("board-skeleton")).toBeInTheDocument();
    expect(screen.queryByTestId("tickets-toolbar")).toBeNull();
  });

  it("boards error, with retry", async () => {
    h.api.getBoardsLite.mockRejectedValueOnce(new HttpError(500));
    renderPage();
    expect(await screen.findByText("Couldn't load boards")).toBeInTheDocument();
    await userEvent.setup().click(screen.getByTestId("retry"));
    expect(await screen.findByTestId("board-view")).toBeInTheDocument();
  });

  it("no boards (staff): create a board, then land on it", async () => {
    h.api.getBoardsLite.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText("No boards yet")).toBeInTheDocument();
    expect(screen.getByText("Create a board to start tracking tickets.")).toBeInTheDocument();
    await userEvent.setup().click(screen.getByTestId("create-board"));
    expect(h.admin.openCreateBoard).toHaveBeenCalledTimes(1);
    h.admin.openCreateBoard.mock.calls[0][0].onCreated({ id: 7, name: "New" });
    expect(lastReplace()?.get("board")).toBe("7");
  });

  it("no boards (non-staff without create_boards): ask an admin, no button", async () => {
    h.profile = AGENT_PROFILE;
    h.api.getBoardsLite.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText("You don't have access to any boards")).toBeInTheDocument();
    expect(screen.getByText("Ask an administrator to add you to a board.")).toBeInTheDocument();
    expect(screen.queryByTestId("create-board")).toBeNull();
  });

  it("no boards (non-staff with create_boards) offers create", async () => {
    h.profile = { ...AGENT_PROFILE, permissions_list: ["create_boards"] };
    h.api.getBoardsLite.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByTestId("create-board")).toBeInTheDocument();
  });

  it("board error, with retry", async () => {
    resetNav("board=1");
    h.api.getKanban.mockRejectedValueOnce(new HttpError(500));
    renderPage();
    expect(await screen.findByText("Couldn't load this board")).toBeInTheDocument();
    expect(state()).toBe("board-error");
    await userEvent.setup().click(screen.getByTestId("retry"));
    expect(await screen.findByTestId("board-view")).toBeInTheDocument();
  });

  it("no access to the board (404): message and the boards are refetched", async () => {
    resetNav("board=2");
    h.api.getKanban.mockRejectedValue(new HttpError(404));
    renderPage();
    expect(await screen.findByText("You no longer have access to this board")).toBeInTheDocument();
    expect(state()).toBe("no-access");
    await waitFor(() => expect(h.api.getBoardsLite).toHaveBeenCalledTimes(2));
  });

  it("no matches with filters: message and Clear", async () => {
    resetNav("board=1&priority=low&q=zzz");
    h.api.getKanban.mockImplementation(async (id: number) => kanban(id, { 11: [], 12: [] }));
    renderPage();
    expect(await screen.findByText("No tickets match these filters")).toBeInTheDocument();
    expect(screen.getByTestId("toolbar-count")).toHaveTextContent("0 tickets");
    await userEvent.setup().click(screen.getByTestId("clear-filters"));
    const sp = lastReplace()!;
    expect([...sp.keys()]).toEqual(["board"]);
  });

  it("an empty board without filters still renders the board", async () => {
    resetNav("board=1");
    h.api.getKanban.mockImplementation(async (id: number) => kanban(id, { 11: [], 12: [] }));
    renderPage();
    expect(await screen.findByTestId("board-view")).toBeInTheDocument();
  });

  it("zero columns (manager): EmptyState with Add column (DC39)", async () => {
    resetNav("board=3");
    h.api.getKanban.mockImplementation(async (id: number) => kanban(id, {}));
    renderPage();
    expect(await screen.findByText("This board has no columns")).toBeInTheDocument();
    expect(screen.getByText("Add a column to start adding tickets.")).toBeInTheDocument();
    await userEvent.setup().click(screen.getByTestId("add-column"));
    expect(h.admin.openEditColumns).toHaveBeenCalledWith(expect.objectContaining({ id: 3, name: "Internal" }));
  });

  it("zero columns (no manage_columns): text only", async () => {
    h.profile = AGENT_PROFILE;
    resetNav("board=3");
    h.api.getKanban.mockImplementation(async (id: number) => kanban(id, {}));
    renderPage();
    expect(await screen.findByText("This board has no columns")).toBeInTheDocument();
    expect(screen.queryByTestId("add-column")).toBeNull();
    expect(screen.queryByText("Add a column to start adding tickets.")).toBeNull();
  });

  it("states are translated (ka)", async () => {
    h.profile = AGENT_PROFILE;
    h.api.getBoardsLite.mockResolvedValue([]);
    renderPage("ka");
    expect(await screen.findByText("არცერთ დაფაზე წვდომა არ გაქვთ")).toBeInTheDocument();
  });
});

describe("board hand-off", () => {
  it("renders the board view with the toolbar count from the rendered cards", async () => {
    resetNav("board=1");
    renderPage();
    expect(await screen.findByTestId("board-view")).toHaveAttribute("data-manual", "true");
    expect(state()).toBe("board");
    expect(screen.getByTestId("toolbar-count")).toHaveTextContent("3 tickets");
    const props = renderBoard.mock.calls.at(-1)![0];
    expect(props.board.id).toBe(1);
    expect(props.data.columns).toHaveLength(2);
    expect(props.sort).toBe("manual");
  });

  it("sends the URL filters to the kanban request", async () => {
    resetNav("board=1&assignee=me&priority=high,critical&due=week&sort=priority");
    renderPage();
    await screen.findByTestId("board-view");
    expect(h.api.getKanban).toHaveBeenLastCalledWith(
      1,
      expect.objectContaining({ assignee: ["me"], priority: ["high", "critical"], due: "week", sort: "priority" }),
    );
    expect(renderBoard.mock.calls.at(-1)![0].isManualSort).toBe(false);
  });

  it("treats ?view=list as the board while the list flag is off", async () => {
    resetNav("board=1&view=list");
    renderPage();
    expect(await screen.findByTestId("board-view")).toBeInTheDocument();
    expect(h.api.getColumnCounts).not.toHaveBeenCalled();
  });

  it("renders the list view when enabled", async () => {
    resetNav("board=1&view=list");
    h.api.getColumnCounts.mockResolvedValue({ counts: { 11: 2, 12: 3 } });
    renderScreen(
      <TicketsScreen renderBoard={renderBoard} renderList={() => <div data-testid="list-view" />} listViewEnabled />,
    );
    expect(await screen.findByTestId("list-view")).toBeInTheDocument();
    expect(await screen.findByText("5 tickets")).toBeInTheDocument();
    expect(h.api.getKanban).not.toHaveBeenCalled();
  });
});

describe("realtime readiness (RM8)", () => {
  it("the root carries data-ws-ready", async () => {
    resetNav("board=1");
    const { unmount } = renderPage();
    expect(screen.getByTestId("tickets-screen")).toHaveAttribute("data-ws-ready", "false");
    unmount();
    h.wsReady = true;
    renderPage();
    expect(screen.getByTestId("tickets-screen")).toHaveAttribute("data-ws-ready", "true");
  });
});
