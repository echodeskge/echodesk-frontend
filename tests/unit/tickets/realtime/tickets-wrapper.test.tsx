/**
 * FE-02: TicketsWrapper - board resolution from the URL / ticket, count
 * invalidation (debounced, own echoes included), unknown frames, 4403.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { MockWebSocket, TENANT } from "./ws-mock";

vi.stubGlobal("WebSocket", MockWebSocket);

const nav = vi.hoisted(() => ({
  pathname: "/tickets",
  search: "",
  replace: vi.fn(),
  push: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => nav.pathname,
  useSearchParams: () => new URLSearchParams(nav.search),
  useRouter: () => ({ replace: nav.replace, push: nav.push }),
}));
vi.mock("@/contexts/TenantContext", () => ({
  useTenant: () => ({ tenant: TENANT, loading: false, error: null, refreshTenant: vi.fn() }),
}));
vi.mock("@/services/auth", () => ({ authService: { isAuthenticated: () => true } }));
vi.mock("@/api/axios", () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast: toastMock }));
vi.mock("next-intl", () => ({
  useTranslations: (ns: string) => (key: string) => `${ns}.${key}`,
}));

import axios from "@/api/axios";
import {
  affectsCounts,
  detailTicketId,
  isBoardPath,
  resolveRealtimeBoardId,
  TicketsWrapper,
} from "@/app/(tenant)/tickets/_components/tickets-wrapper";
import { useTicketsRealtime } from "@/app/(tenant)/tickets/_contexts/tickets-realtime-context";
import { _resetMutations, issueMutationId } from "@/app/(tenant)/tickets/_lib/mutation-id";
import { tk } from "@/app/(tenant)/tickets/_lib/query-keys";
import type { BoardEvent, BoardLite } from "@/app/(tenant)/tickets/_lib/types";

const get = vi.mocked(axios.get);

const board = (id: number, extra: Partial<BoardLite> = {}): BoardLite => ({
  id,
  name: `B${id}`,
  color: "#3b82f6",
  position: 0,
  is_default: false,
  open_count: 0,
  columns_count: 1,
  ...extra,
});

let client: QueryClient;
let boards: BoardLite[];

function mockApi() {
  get.mockImplementation(async (url: string) => {
    if (url === "/api/boards/") return { data: { count: boards.length, next: null, previous: null, results: boards } };
    const m = /^\/api\/tickets\/(\d+)\/$/.exec(url);
    if (m) return { data: { id: Number(m[1]), title: "T", board: { id: 20, name: "S", color: "#000" } } };
    throw new Error(`unexpected GET ${url}`);
  });
}

let realtime: ReturnType<typeof useTicketsRealtime> | null = null;
function Probe() {
  realtime = useTicketsRealtime();
  return <span data-testid="child">child</span>;
}

function renderWrapper() {
  return render(
    <QueryClientProvider client={client}>
      <TicketsWrapper>
        <Probe />
      </TicketsWrapper>
    </QueryClientProvider>,
  );
}

async function flush() {
  // Let react-query resolve the mocked fetches.
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
}

/** Seed queries so invalidation can be observed on their state. */
function seed() {
  const keys = [
    tk.viewCounts(1),
    tk.viewCounts(null),
    tk.viewCounts(4),
    ["ticketColumnCounts", 1, {}],
    ["ticketColumnCounts", 4, {}],
    ["ticketColumnCounts", 2, {}],
    ["kanbanBoard", 1, {}],
    ["kanbanBoard", 1, { q: "x" }],
    ["ticketList", 1, {}],
  ] as const;
  for (const k of keys) client.setQueryData(k as unknown as readonly unknown[], { seeded: true });
  return keys;
}
const invalidated = (key: readonly unknown[]) => client.getQueryState(key)?.isInvalidated === true;

async function openBoardSocket() {
  renderWrapper();
  await flush();
  const ws = MockWebSocket.last!;
  act(() => ws.open());
  act(() => ws.frame({ type: "connection", active_users: [] }));
  return ws;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  MockWebSocket.reset();
  _resetMutations();
  localStorage.clear();
  localStorage.setItem("echodesk_auth_token", "tok");
  nav.pathname = "/tickets";
  nav.search = "?board=1";
  boards = [board(1), board(4, { is_default: true })];
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  mockApi();
  realtime = null;
});

afterEach(() => {
  vi.useRealTimers();
});

describe("helpers", () => {
  it("resolveRealtimeBoardId: url board when accessible, else default, else first; null while loading", () => {
    const list = [board(1), board(4, { is_default: true })];
    expect(resolveRealtimeBoardId(1, undefined)).toBeNull();
    expect(resolveRealtimeBoardId(1, list)).toBe(1);
    expect(resolveRealtimeBoardId(23, list)).toBe(4);
    expect(resolveRealtimeBoardId(null, list)).toBe(4);
    expect(resolveRealtimeBoardId(null, [board(2), board(3)])).toBe(2);
    expect(resolveRealtimeBoardId(null, [])).toBeNull();
  });

  it("route matchers", () => {
    expect(isBoardPath("/tickets")).toBe(true);
    expect(isBoardPath("/tickets/")).toBe(true);
    expect(isBoardPath("/tickets/5")).toBe(false);
    expect(detailTicketId("/tickets/5")).toBe(5);
    expect(detailTicketId("/tickets/5/")).toBe(5);
    expect(detailTicketId("/tickets")).toBeNull();
    expect(detailTicketId("/tickets/abc")).toBeNull();
  });

  it("affectsCounts: created/deleted/moved always; updated only for count fields", () => {
    const upd = (changes: Record<string, unknown>) =>
      ({ type: "ticket_updated", ticket_id: 1, changes }) as unknown as BoardEvent;
    expect(affectsCounts({ type: "ticket_created", ticket: {} } as unknown as BoardEvent)).toBe(true);
    expect(affectsCounts({ type: "ticket_deleted", ticket_id: 1 } as BoardEvent)).toBe(true);
    expect(affectsCounts({ type: "ticket_moved", ticket_id: 1, from_column_id: 1, to_column_id: 2 } as BoardEvent)).toBe(true);
    expect(affectsCounts(upd({ assignees: { old: [], new: [] } }))).toBe(true);
    expect(affectsCounts(upd({ is_closed: { old: false, new: true } }))).toBe(true);
    expect(affectsCounts(upd({ priority: { old: "low", new: "high" } }))).toBe(true);
    expect(affectsCounts(upd({ title: { old: "a", new: "b" } }))).toBe(false);
    expect(affectsCounts({ type: "ticket_commented", ticket_id: 1, comment: null } as BoardEvent)).toBe(false);
  });
});

describe("TicketsWrapper", () => {
  it("renders children inside the tickets root with data-ws-ready", async () => {
    renderWrapper();
    expect(screen.getByTestId("child")).toBeTruthy();
    const root = screen.getByTestId("tickets-wrapper");
    expect(root.getAttribute("data-ws-ready")).toBe("false");
    await flush();
    act(() => MockWebSocket.last!.open());
    act(() => MockWebSocket.last!.frame({ type: "connection" }));
    expect(root.getAttribute("data-ws-ready")).toBe("true");
  });

  it("board page: connects to the ?board= board once the lite boards confirm it", async () => {
    renderWrapper();
    expect(MockWebSocket.instances).toHaveLength(0); // waits for boards
    await flush();
    expect(MockWebSocket.last!.url).toContain("/ws/boards/demo/1/");
    expect(realtime!.boardId).toBe(1);
  });

  it("board page: an inaccessible ?board= falls back to the default board", async () => {
    nav.search = "?board=23";
    renderWrapper();
    await flush();
    expect(MockWebSocket.last!.url).toContain("/ws/boards/demo/4/");
  });

  it("board page: no ?board= uses the stored board", async () => {
    nav.search = "";
    localStorage.setItem("echodesk_selected_board_id", "1");
    renderWrapper();
    await flush();
    expect(MockWebSocket.last!.url).toContain("/ws/boards/demo/1/");
  });

  it("detail page: setBoardId(ticket.board.id)", async () => {
    nav.pathname = "/tickets/77";
    nav.search = "";
    renderWrapper();
    await flush();
    expect(get).toHaveBeenCalledWith("/api/tickets/77/");
    expect(get).not.toHaveBeenCalledWith("/api/boards/", expect.anything());
    expect(MockWebSocket.last!.url).toContain("/ws/boards/demo/20/");
    expect(realtime!.boardId).toBe(20);
  });

  it("created/deleted/moved invalidate view counts, lite boards and column counts, debounced by 1s", async () => {
    const ws = await openBoardSocket();
    seed();
    client.setQueryData(tk.boards(), boards);

    act(() => ws.frame({ type: "ticket_created", ticket: { id: 9 }, client_mutation_id: null }));
    act(() => ws.frame({ type: "ticket_moved", ticket_id: 9, from_column_id: 1, to_column_id: 2 }));
    act(() => {
      vi.advanceTimersByTime(999);
    });
    expect(invalidated(tk.viewCounts(1))).toBe(false);

    const spy = vi.spyOn(client, "invalidateQueries");
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(invalidated(tk.viewCounts(1))).toBe(true);
    expect(invalidated(tk.viewCounts(null))).toBe(true);
    expect(invalidated(tk.boards())).toBe(true);
    expect(invalidated(["ticketColumnCounts", 1, {}])).toBe(true);
    expect(invalidated(["ticketColumnCounts", 2, {}])).toBe(false);
    // One flush for both events.
    expect(spy.mock.calls.filter(([f]) => JSON.stringify(f?.queryKey) === '["boards","lite"]')).toHaveLength(1);
  });

  it("own mutations still invalidate the counts (F19)", async () => {
    const ws = await openBoardSocket();
    seed();
    const mid = issueMutationId();
    act(() => ws.frame({ type: "ticket_deleted", ticket_id: 9, client_mutation_id: mid }));
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(invalidated(tk.viewCounts(1))).toBe(true);
    expect(invalidated(["ticketColumnCounts", 1, {}])).toBe(true);
  });

  it("a transfer also invalidates the destination board's column counts", async () => {
    const ws = await openBoardSocket();
    seed();
    act(() => ws.frame({ type: "ticket_deleted", ticket_id: 9, reason: "transferred", to_board_id: 4 }));
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(invalidated(["ticketColumnCounts", 1, {}])).toBe(true);
    expect(invalidated(["ticketColumnCounts", 4, {}])).toBe(true);
  });

  it("updated events invalidate counts only for assignee / closed (etc.) changes", async () => {
    const ws = await openBoardSocket();
    seed();
    act(() => ws.frame({ type: "ticket_updated", ticket_id: 1, changes: { title: { old: "a", new: "b" } } }));
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(invalidated(tk.viewCounts(1))).toBe(false);

    act(() =>
      ws.frame({ type: "ticket_updated", ticket_id: 1, changes: { assignees: { old: [], new: [{ id: 3 }] } } }),
    );
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(invalidated(tk.viewCounts(1))).toBe(true);
  });

  it("unknown frame types invalidate the board (every filter variant), debounced", async () => {
    const ws = await openBoardSocket();
    seed();
    act(() => ws.frame({ type: "ticket_archived", ticket_id: 1 }));
    expect(invalidated(["kanbanBoard", 1, {}])).toBe(false);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(invalidated(tk.board(1))).toBe(true);
    expect(invalidated(["kanbanBoard", 1, { q: "x" }])).toBe(true);
    expect(invalidated(tk.viewCounts(1))).toBe(false);
  });

  it("checklist / attachment activity refreshes the board and list caches (B2 counters)", async () => {
    const ws = await openBoardSocket();
    seed();
    act(() => ws.frame({ type: "ticket_activity", ticket_id: 1, kind: "timer" }));
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(invalidated(["kanbanBoard", 1, {}])).toBe(false);

    act(() => ws.frame({ type: "ticket_activity", ticket_id: 1, kind: "checklist" }));
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(invalidated(["kanbanBoard", 1, {}])).toBe(true);
    expect(invalidated(["ticketList", 1, {}])).toBe(true);
  });

  it("4403: translated toast, lite boards invalidated, no reconnect", async () => {
    const ws = await openBoardSocket();
    client.setQueryData(tk.boards(), boards);
    act(() => ws.frame({ type: "error", code: "FORBIDDEN", message: "no" }));
    act(() => ws.serverClose(4403));
    expect(toastMock.error).toHaveBeenCalledWith("tickets.toasts.boardAccessLost");
    expect(invalidated(tk.boards())).toBe(true);
    const count = MockWebSocket.instances.length;
    act(() => {
      vi.advanceTimersByTime(120_000);
    });
    // A refetch of the boards may move to another board, but never re-dials board 1.
    expect(MockWebSocket.instances.slice(count).some((w) => w.url.includes("/ws/boards/demo/1/"))).toBe(false);
  });

  it("unmount closes the socket and cancels pending debounces", async () => {
    const view = renderWrapper();
    await flush();
    const ws = MockWebSocket.last!;
    act(() => ws.open());
    seed();
    act(() => ws.frame({ type: "ticket_created", ticket: { id: 1 } }));
    view.unmount();
    expect(ws.readyState).toBe(MockWebSocket.CLOSED);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(invalidated(tk.viewCounts(1))).toBe(false);
  });
});
