/**
 * Kanban board: data, DnD, column admin, realtime (plan FE-07: E20, E33, R11, R12, DC39).
 *
 * `@hello-pangea/dnd` is replaced by a pass-through mock, so the tests drive
 * `onDragStart` / `onDragEnd` directly; the real QueryClient, the api module
 * (axios mocked) and `useTicketMutations` run for real.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import en from "@/i18n/messages/en.json";
import type { BoardEvent, KanbanResponse } from "@/app/(tenant)/tickets/_lib/types";
import type { TicketPermissions } from "@/app/(tenant)/tickets/_hooks/use-ticket-permissions";
import { _resetMutations, isOwnMutation } from "@/app/(tenant)/tickets/_lib/mutation-id";
import { makeBoard, makeCard } from "./fixtures";
import type { DndState } from "./dnd-mock";

const dnd = vi.hoisted(() => ({ ctx: null, over: null }) as DndState);
vi.mock("@hello-pangea/dnd", async () => (await import("./dnd-mock")).createDndMock(dnd));

const nav = vi.hoisted(() => ({ search: "board=1", push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: nav.push, replace: nav.replace }),
  usePathname: () => "/tickets",
  useSearchParams: () => new URLSearchParams(nav.search),
}));

vi.mock("@/api/axios", () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
vi.mock("@/services/auth", () => ({ authService: { isAuthenticated: () => true } }));

const gen = vi.hoisted(() => ({
  columnsReorderCreate: vi.fn(),
  columnsDestroy: vi.fn(),
  columnsCreate: vi.fn(),
  columnsUpdate: vi.fn(),
  boardsDefaultRetrieve: vi.fn(),
}));
vi.mock("@/api/generated/api", () => gen);

const perms = vi.hoisted(() => ({ current: {} as TicketPermissions }));
vi.mock("@/app/(tenant)/tickets/_hooks/use-ticket-permissions", () => ({
  useTicketPermissions: () => perms.current,
}));

const create = vi.hoisted(() => ({ openTicketCreate: vi.fn() }));
vi.mock("@/contexts/TicketCreateContext", () => ({ useTicketCreate: () => create }));

const admin = vi.hoisted(() => ({ openEditColumns: vi.fn() }));
vi.mock("@/components/tickets-admin/board-admin-host", () => ({ useBoardAdmin: () => admin }));

const rt = vi.hoisted(() => ({
  handler: null as null | ((e: unknown) => void),
  sendTicketMoving: vi.fn(),
  boardId: 1 as number | null,
}));
vi.mock("@/app/(tenant)/tickets/_contexts/tickets-realtime-context", () => ({
  useTicketsRealtime: () => ({
    boardId: rt.boardId,
    beingMoved: new Map(),
    beingEdited: new Map(),
    sendTicketMoving: rt.sendTicketMoving,
  }),
  useBoardEvents: (h: (e: unknown) => void) => {
    rt.handler = h;
  },
}));

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

import axios from "@/api/axios";
import { KanbanBoard, planCardDrop } from "@/app/(tenant)/tickets/_components/board/kanban-board";

const get = vi.mocked(axios.get);
const patch = vi.mocked(axios.patch);
const del = vi.mocked(axios.delete);

const ALL: TicketPermissions = {
  canCreateTicket: true,
  canDeleteTickets: true,
  canCreateBoard: true,
  canEditBoard: true,
  canDeleteBoard: true,
  canSetDefaultBoard: true,
  canManageColumns: true,
  canManageTags: true,
  hasSocialFeature: true,
  isStaff: true,
};
const AGENT: TicketPermissions = {
  ...ALL,
  canDeleteTickets: false,
  canCreateBoard: false,
  canEditBoard: false,
  canDeleteBoard: false,
  canSetDefaultBoard: false,
  canManageColumns: false,
  isStaff: false,
};

class HttpError extends Error {
  response: { status: number; data: unknown };
  constructor(status: number) {
    super(`HTTP ${status}`);
    this.response = { status, data: {} };
  }
}

let server: KanbanResponse;
let qc: QueryClient;

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function routeGet() {
  get.mockImplementation(async (url: string) => {
    if (url === "/api/boards/1/kanban_board/") return { data: structuredClone(server) };
    throw new HttpError(404);
  });
}

function renderBoard() {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } });
  const spies = {
    invalidate: vi.spyOn(qc, "invalidateQueries"),
    cancel: vi.spyOn(qc, "cancelQueries"),
  };
  render(
    <QueryClientProvider client={qc}>
      <NextIntlClientProvider locale="en" messages={en} timeZone="Asia/Tbilisi">
        <KanbanBoard boardId={1} />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
  return spies;
}

function column(id: number) {
  return screen.getAllByTestId("kanban-column").find((c) => c.getAttribute("data-column-id") === String(id))!;
}

function cardIds(columnId: number): number[] {
  return within(column(columnId))
    .queryAllByTestId("ticket-card")
    .map((c) => Number(c.getAttribute("data-ticket-id")));
}

function refetchKeys(invalidate: ReturnType<typeof vi.spyOn>) {
  return invalidate.mock.calls
    .filter((c) => (c[0] as { refetchType?: string })?.refetchType !== "none")
    .map((c) => (c[0] as { queryKey?: unknown })?.queryKey);
}

function dragStart(draggableId: string, droppableId: string, type = "CARD") {
  act(() => dnd.ctx!.onDragStart!({ draggableId, type, source: { droppableId, index: 0 }, mode: "FLUID" }));
}

function dragEnd(draggableId: string, from: [string, number], to: [string, number] | null, type = "CARD") {
  act(() =>
    dnd.ctx!.onDragEnd!({
      draggableId,
      type,
      reason: "DROP",
      mode: "FLUID",
      source: { droppableId: from[0], index: from[1] },
      destination: to ? { droppableId: to[0], index: to[1] } : null,
      combine: null,
    }),
  );
}

beforeEach(() => {
  _resetMutations();
  nav.search = "board=1";
  perms.current = ALL;
  rt.boardId = 1;
  rt.handler = null;
  server = makeBoard();
  routeGet();
  gen.columnsReorderCreate.mockResolvedValue({});
});

describe("rendering", () => {
  it("loads the lite kanban and renders columns and cards", async () => {
    renderBoard();
    expect(screen.getByTestId("kanban-skeleton")).toBeInTheDocument();
    await screen.findByTestId("kanban-board");
    expect(get).toHaveBeenCalledWith("/api/boards/1/kanban_board/", { params: { lite: 1 } });
    expect(screen.getAllByTestId("kanban-column").map((c) => c.getAttribute("data-column-id"))).toEqual(["10", "20", "30"]);
    expect(cardIds(10)).toEqual([1, 2, 3]);
    expect(within(column(10)).getByTestId("kanban-column-count")).toHaveTextContent("3");
  });

  it("shows the load error with a retry", async () => {
    get.mockRejectedValue(new HttpError(500));
    renderBoard();
    expect(await screen.findByText("Couldn't load this board")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("zero columns: Add column for managers (DC39)", async () => {
    server = makeBoard({ columns: [], tickets_by_column: {} });
    renderBoard();
    expect(await screen.findByText("This board has no columns")).toBeInTheDocument();
    expect(screen.getByTestId("kanban-no-columns-add")).toHaveTextContent("Add column");
  });

  it("zero columns: text only for everyone else (DC39)", async () => {
    perms.current = AGENT;
    server = makeBoard({ columns: [], tickets_by_column: {} });
    renderBoard();
    expect(await screen.findByText("This board has no columns")).toBeInTheDocument();
    expect(screen.queryByTestId("kanban-no-columns-add")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("the + Add column box is shown for manage_columns and hidden otherwise", async () => {
    renderBoard();
    await screen.findByTestId("kanban-board");
    expect(screen.getByTestId("kanban-add-column")).toHaveTextContent("Add column");
  });

  it("hides + Add column, the column menus and column drag without manage_columns", async () => {
    perms.current = AGENT;
    renderBoard();
    await screen.findByTestId("kanban-board");
    expect(screen.queryByTestId("kanban-add-column")).toBeNull();
    expect(screen.queryByTestId("kanban-column-menu")).toBeNull();
    expect(screen.getByTestId("kanban-board").querySelector('[data-droppable-id="board"]')).toHaveAttribute(
      "data-drop-disabled",
      "true",
    );
  });

  it("+ opens the create sheet for that board and column", async () => {
    const user = userEvent.setup();
    renderBoard();
    await screen.findByTestId("kanban-board");
    await user.click(within(column(20)).getByTestId("kanban-column-add"));
    expect(create.openTicketCreate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, name: "Support" }),
      expect.objectContaining({ id: 20 }),
    );
  });

  it("Edit all columns… opens the board admin column editor", async () => {
    const user = userEvent.setup();
    renderBoard();
    await screen.findByTestId("kanban-board");
    await user.click(within(column(10)).getByTestId("kanban-column-menu"));
    await user.click(await screen.findByText("Edit all columns…"));
    expect(admin.openEditColumns).toHaveBeenCalledWith(expect.objectContaining({ id: 1, name: "Support" }));
  });
});

describe("drag and drop", () => {
  it("drag start cancels in-flight kanban fetches (R12) and sends ticket_moving", async () => {
    const { cancel } = renderBoard();
    await screen.findByTestId("kanban-board");
    dragStart("ticket-2", "col-10");
    expect(cancel).toHaveBeenCalledWith({ queryKey: ["kanbanBoard", 1] });
    expect(rt.sendTicketMoving).toHaveBeenCalledWith(2, 10);
  });

  it("moves a card across columns optimistically and sends move_to_column with a mutation id", async () => {
    patch.mockResolvedValue({ data: { id: 2, board: { id: 1 } } });
    renderBoard();
    await screen.findByTestId("kanban-board");
    dragStart("ticket-2", "col-10");
    dragEnd("ticket-2", ["col-10", 1], ["col-20", 0]);
    expect(cardIds(20)).toEqual([2, 4]);
    expect(cardIds(10)).toEqual([1, 3]);
    await waitFor(() => expect(patch).toHaveBeenCalled());
    const [url, body, config] = patch.mock.calls[0] as [string, unknown, { headers: Record<string, string> }];
    expect(url).toBe("/api/tickets/2/move_to_column/");
    expect(body).toEqual({ column_id: 20, position_in_column: 0 });
    expect(isOwnMutation(config.headers["X-Client-Mutation"])).toBe(true);
  });

  it("reorders within a column (manual sort)", async () => {
    patch.mockResolvedValue({ data: { id: 3 } });
    renderBoard();
    await screen.findByTestId("kanban-board");
    dragEnd("ticket-3", ["col-10", 2], ["col-10", 0]);
    expect(cardIds(10)).toEqual([3, 1, 2]);
    await waitFor(() => expect(patch).toHaveBeenCalledWith("/api/tickets/3/move_to_column/", { column_id: 10, position_in_column: 0 }, expect.anything()));
  });

  it("drops onto an empty column", async () => {
    patch.mockResolvedValue({ data: { id: 1 } });
    renderBoard();
    await screen.findByTestId("kanban-board");
    dragEnd("ticket-1", ["col-10", 0], ["col-30", 0]);
    expect(cardIds(30)).toEqual([1]);
    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith("/api/tickets/1/move_to_column/", { column_id: 30, position_in_column: 0 }, expect.anything()),
    );
  });

  it("a card drag grows the lists before measuring so a lifted card fits an empty column (keyboard DnD)", async () => {
    renderBoard();
    await screen.findByTestId("kanban-board");
    const lists = () => screen.getAllByTestId("kanban-column-list");
    expect(lists().every((l) => !l.className.includes("min-h-[160px]"))).toBe(true);

    // Column drags leave the lists alone.
    act(() => dnd.ctx!.onBeforeCapture!({ draggableId: "column-10", mode: "SNAP" }));
    expect(lists().every((l) => !l.className.includes("min-h-[160px]"))).toBe(true);

    act(() => dnd.ctx!.onBeforeCapture!({ draggableId: "ticket-1", mode: "SNAP" }));
    expect(lists().every((l) => l.className.includes("min-h-[160px]"))).toBe(true);

    dragEnd("ticket-1", ["col-10", 0], null);
    expect(lists().every((l) => !l.className.includes("min-h-[160px]"))).toBe(true);
  });

  it("does nothing without a destination or for the same spot", async () => {
    renderBoard();
    await screen.findByTestId("kanban-board");
    dragEnd("ticket-1", ["col-10", 0], null);
    dragEnd("ticket-1", ["col-10", 0], ["col-10", 0]);
    expect(patch).not.toHaveBeenCalled();
  });

  it("on a 500: invalidates (no snapshot restore) and toasts", async () => {
    patch.mockRejectedValue(new HttpError(500));
    const { invalidate } = renderBoard();
    await screen.findByTestId("kanban-board");
    dragEnd("ticket-2", ["col-10", 1], ["col-20", 0]);
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Couldn't move the ticket"));
    expect(refetchKeys(invalidate)).toContainEqual(["kanbanBoard", 1]);
    // Back to the server state through the refetch.
    await waitFor(() => expect(cardIds(10)).toEqual([1, 2, 3]));
  });

  it("a 403 move shows the permission toast", async () => {
    patch.mockRejectedValue(new HttpError(403));
    renderBoard();
    await screen.findByTestId("kanban-board");
    dragEnd("ticket-2", ["col-10", 1], ["col-20", 0]);
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("You don't have permission to do that"));
  });

  it("a foreign move applied while the mutation is pending survives the failed mutation's refetch", async () => {
    const pending = deferred<never>();
    patch.mockReturnValue(pending.promise);
    renderBoard();
    await screen.findByTestId("kanban-board");

    dragStart("ticket-2", "col-10");
    dragEnd("ticket-2", ["col-10", 1], ["col-20", 0]);
    await waitFor(() => expect(cardIds(20)).toEqual([2, 4]));

    // Someone else moves ticket 1 to Done; the server now has it there.
    server = makeBoard({
      tickets_by_column: {
        "10": [makeCard(2, 10, 0), makeCard(3, 10, 1)],
        "20": [makeCard(4, 20, 0)],
        "30": [makeCard(1, 30, 0)],
      },
    });
    act(() =>
      rt.handler!({
        type: "ticket_moved",
        ticket_id: 1,
        from_column_id: 10,
        to_column_id: 30,
        position: 0,
        client_mutation_id: "other-tab",
      } satisfies BoardEvent),
    );
    await waitFor(() => expect(cardIds(30)).toEqual([1]));

    await act(async () => {
      pending.reject(new HttpError(500));
      await pending.promise.catch(() => {});
    });
    await waitFor(() => expect(cardIds(10)).toEqual([2, 3]));
    expect(cardIds(30)).toEqual([1]); // not overwritten by a stale snapshot
    expect(cardIds(20)).toEqual([4]);
  });

  it("column reorder calls columnsReorderCreate with the new position", async () => {
    renderBoard();
    await screen.findByTestId("kanban-board");
    dragEnd("column-10", ["board", 0], ["board", 2], "COLUMN");
    expect(screen.getAllByTestId("kanban-column").map((c) => c.getAttribute("data-column-id"))).toEqual(["20", "30", "10"]);
    await waitFor(() => expect(gen.columnsReorderCreate).toHaveBeenCalledWith(10, { position: 2 }));
  });

  it("a failed column reorder toasts and refetches", async () => {
    gen.columnsReorderCreate.mockRejectedValue(new HttpError(500));
    const { invalidate } = renderBoard();
    await screen.findByTestId("kanban-board");
    dragEnd("column-10", ["board", 0], ["board", 1], "COLUMN");
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Couldn't reorder the columns"));
    expect(refetchKeys(invalidate)).toContainEqual(["kanbanBoard", 1]);
  });

  it("column reorder is ignored without manage_columns", async () => {
    perms.current = AGENT;
    renderBoard();
    await screen.findByTestId("kanban-board");
    dragEnd("column-10", ["board", 0], ["board", 2], "COLUMN");
    expect(gen.columnsReorderCreate).not.toHaveBeenCalled();
  });

  it("sort ≠ manual: reordering within a column is disabled, cross-column moves omit the position", async () => {
    nav.search = "board=1&sort=priority";
    patch.mockResolvedValue({ data: { id: 1 } });
    renderBoard();
    await screen.findByTestId("kanban-board");
    expect(get).toHaveBeenCalledWith("/api/boards/1/kanban_board/", { params: { lite: 1, ordering: "priority_rank" } });

    dragStart("ticket-1", "col-10");
    expect(within(column(10)).getByTestId("kanban-column-list")).toHaveAttribute("data-drop-disabled", "true");
    expect(within(column(20)).getByTestId("kanban-column-list")).toHaveAttribute("data-drop-disabled", "false");

    dragEnd("ticket-1", ["col-10", 0], ["col-10", 2]);
    expect(patch).not.toHaveBeenCalled();

    dragEnd("ticket-1", ["col-10", 0], ["col-20", 0]);
    await waitFor(() => expect(patch).toHaveBeenCalledWith("/api/tickets/1/move_to_column/", { column_id: 20 }, expect.anything()));
  });

  it("filters active: the drop index becomes the visible neighbour's absolute position", async () => {
    nav.search = "board=1&priority=high";
    // The filtered payload keeps absolute positions: column 20 shows only ticket 4 at position 2.
    server = makeBoard({
      tickets_by_column: {
        "10": [makeCard(1, 10, 3, { priority: "high" })],
        "20": [makeCard(4, 20, 2, { priority: "high" })],
        "30": [],
      },
    });
    patch.mockResolvedValue({ data: { id: 1 } });
    renderBoard();
    await screen.findByTestId("kanban-board");
    expect(screen.getByTestId("kanban-board")).toHaveAttribute("data-filtered", "true");
    dragEnd("ticket-1", ["col-10", 0], ["col-20", 0]);
    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith("/api/tickets/1/move_to_column/", { column_id: 20, position_in_column: 2 }, expect.anything()),
    );
  });
});

describe("planCardDrop", () => {
  const opts = { hasActiveFilters: false, isManualSort: true };
  it("returns null for malformed ids and unknown cards", () => {
    const board = makeBoard();
    expect(planCardDrop(board, { draggableId: "x", source: { droppableId: "col-10", index: 0 }, destination: { droppableId: "col-20", index: 0 } }, opts)).toBeNull();
    expect(planCardDrop(board, { draggableId: "ticket-99", source: { droppableId: "col-10", index: 0 }, destination: { droppableId: "col-20", index: 0 } }, opts)).toBeNull();
  });
});

describe("realtime (E33)", () => {
  it("unfiltered: a foreign event is applied to the cache without a refetch", async () => {
    const { invalidate } = renderBoard();
    await screen.findByTestId("kanban-board");
    get.mockClear();
    act(() => rt.handler!({ type: "ticket_created", ticket: makeCard(9, 30, 0, { title: "Fresh" }) } satisfies BoardEvent));
    await waitFor(() => expect(cardIds(30)).toEqual([9]));
    expect(refetchKeys(invalidate)).not.toContainEqual(["kanbanBoard", 1]);
    expect(get).not.toHaveBeenCalled();
  });

  it("filtered: a foreign event refetches the board", async () => {
    nav.search = "board=1&q=login";
    const { invalidate } = renderBoard();
    await screen.findByTestId("kanban-board");
    act(() => rt.handler!({ type: "ticket_deleted", ticket_id: 1 } satisfies BoardEvent));
    expect(refetchKeys(invalidate)).toContainEqual(["kanbanBoard", 1]);
  });

  it("ticket_commented updates the card's comment count", async () => {
    renderBoard();
    await screen.findByTestId("kanban-board");
    act(() => rt.handler!({ type: "ticket_commented", ticket_id: 4, comment: null, comments_count: 6 } satisfies BoardEvent));
    await waitFor(() =>
      expect(within(column(20)).getByTestId("card-comments")).toHaveTextContent("6"),
    );
  });

  it("ignores events while the socket is on another board", async () => {
    rt.boardId = 2;
    renderBoard();
    await screen.findByTestId("kanban-board");
    act(() => rt.handler!({ type: "ticket_deleted", ticket_id: 1 } satisfies BoardEvent));
    expect(cardIds(10)).toEqual([1, 2, 3]);
  });
});

describe("deleting", () => {
  it("staff delete a ticket from the card menu after confirming", async () => {
    const user = userEvent.setup();
    del.mockResolvedValue({ data: {} });
    renderBoard();
    await screen.findByTestId("kanban-board");
    const card = within(column(10)).getAllByTestId("ticket-card")[0];
    await user.click(within(card).getByTestId("card-menu-trigger"));
    await user.click(await screen.findByTestId("card-menu-delete"));
    const dialog = await screen.findByTestId("delete-ticket-dialog");
    expect(dialog).toHaveTextContent("Delete ticket #1?");
    await user.click(within(dialog).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(del).toHaveBeenCalledWith("/api/tickets/1/", expect.anything()));
    await waitFor(() => expect(cardIds(10)).toEqual([2, 3]));
  });

  it("non-staff never see Delete on cards (admin-only)", async () => {
    const user = userEvent.setup();
    perms.current = { ...AGENT, canDeleteTickets: true };
    renderBoard();
    await screen.findByTestId("kanban-board");
    const card = within(column(10)).getAllByTestId("ticket-card")[0];
    await user.click(within(card).getByTestId("card-menu-trigger"));
    await screen.findByTestId("card-menu-open");
    expect(screen.queryByTestId("card-menu-delete")).toBeNull();
  });

  it("deleting a non-empty column shows the server's has-tickets message", async () => {
    const user = userEvent.setup();
    gen.columnsDestroy.mockRejectedValue(new HttpError(400));
    renderBoard();
    await screen.findByTestId("kanban-board");
    await user.click(within(column(10)).getByTestId("kanban-column-menu"));
    await user.click(await screen.findByText("Delete column"));
    const dialog = await screen.findByTestId("delete-column-dialog");
    await user.click(within(dialog).getByRole("button", { name: "Delete column" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Move the tickets out of this column before deleting it.");
    expect(gen.columnsDestroy).toHaveBeenCalledWith(10);
  });

  it("deleting an empty column succeeds", async () => {
    const user = userEvent.setup();
    gen.columnsDestroy.mockResolvedValue({});
    const { invalidate } = renderBoard();
    await screen.findByTestId("kanban-board");
    await user.click(within(column(30)).getByTestId("kanban-column-menu"));
    await user.click(await screen.findByText("Delete column"));
    const dialog = await screen.findByTestId("delete-column-dialog");
    await user.click(within(dialog).getByRole("button", { name: "Delete column" }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Column deleted"));
    expect(refetchKeys(invalidate)).toContainEqual(["kanbanBoard", 1]);
  });
});
