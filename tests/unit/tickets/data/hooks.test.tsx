/**
 * Data hooks for the tickets redesign, against a real QueryClient with the
 * api module mocked at the axios layer.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("@/api/axios", () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
vi.mock("@/services/auth", () => ({ authService: { isAuthenticated: () => true } }));
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast: toastMock }));
vi.mock("next-intl", () => ({
  useTranslations: (ns: string) => (key: string) => `${ns}.${key}`,
}));

import axios from "@/api/axios";
import { useBoardsLite, useViewCounts } from "@/app/(tenant)/tickets/_hooks/use-boards-lite";
import { useKanban } from "@/app/(tenant)/tickets/_hooks/use-kanban";
import { groupByColumn, useColumnCounts, useTicketList } from "@/app/(tenant)/tickets/_hooks/use-ticket-list";
import { useTicket, useTicketActivity, useTicketHistory } from "@/app/(tenant)/tickets/_hooks/use-ticket";
import { filterUsersForBoard, useTicketPickers } from "@/app/(tenant)/tickets/_hooks/use-ticket-pickers";
import { ticketErrorKey, useTicketMutations } from "@/app/(tenant)/tickets/_hooks/use-ticket-mutations";
import { isOwnMutation } from "@/app/(tenant)/tickets/_lib/mutation-id";
import { tk } from "@/app/(tenant)/tickets/_lib/query-keys";
import type { TicketListRow } from "@/app/(tenant)/tickets/_lib/types";

const get = vi.mocked(axios.get);
const patch = vi.mocked(axios.patch);
const del = vi.mocked(axios.delete);

let client: QueryClient;
function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client }, children);
}

const page = <T,>(results: T[], next: string | null = null) => ({
  data: { count: results.length, next, previous: null, results },
});

beforeEach(() => {
  vi.clearAllMocks();
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useBoardsLite / useViewCounts", () => {
  it("returns an array of lite boards", async () => {
    get.mockResolvedValueOnce(page([{ id: 1, name: "Support", color: "#3b82f6", open_count: 2 }]));
    const { result } = renderHook(() => useBoardsLite(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(Array.isArray(result.current.data)).toBe(true);
    expect(result.current.data?.[0].name).toBe("Support");
    expect(client.getQueryData(tk.boards())).toEqual(result.current.data);
  });

  it("fetches view counts for the board", async () => {
    get.mockResolvedValueOnce({ data: { mine: 1, unassigned: 2, urgent: 3, due_this_week: 4 } });
    const { result } = renderHook(() => useViewCounts(6), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(get).toHaveBeenCalledWith("/api/tickets/view_counts/", { params: { board: 6 } });
  });
});

describe("useKanban", () => {
  it("passes filters and debounces q by 300ms", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    get.mockResolvedValue({ data: { board: { id: 2, name: "B" }, columns: [], tickets_by_column: {} } });
    const { result, rerender } = renderHook(({ q }) => useKanban(2, { q, priority: ["high"] }), {
      wrapper,
      initialProps: { q: "" },
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(get).toHaveBeenLastCalledWith("/api/boards/2/kanban_board/", {
      params: { lite: 1, priority__in: "high" },
    });
    const before = get.mock.calls.length;

    rerender({ q: "l" });
    rerender({ q: "lo" });
    rerender({ q: "log" });
    await act(async () => {
      vi.advanceTimersByTime(299);
    });
    expect(get.mock.calls.length).toBe(before);

    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    await waitFor(() => expect(get.mock.calls.length).toBe(before + 1));
    expect(get).toHaveBeenLastCalledWith("/api/boards/2/kanban_board/", {
      params: { lite: 1, priority__in: "high", q: "log" },
    });
  });

  it("is idle without a board", () => {
    const { result } = renderHook(() => useKanban(null), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");
    expect(get).not.toHaveBeenCalled();
  });
});

const row = (id: number, columnId: number): TicketListRow =>
  ({ id, title: `t${id}`, column: { id: columnId, name: `c${columnId}`, position: columnId } }) as TicketListRow;

describe("useTicketList / groupByColumn / useColumnCounts", () => {
  it("is infinite: loads the next page on demand with group=column", async () => {
    get
      .mockResolvedValueOnce(page([row(1, 10), row(2, 10)], "https://x/api/tickets/?page=2"))
      .mockResolvedValueOnce(page([row(3, 11)]));
    const { result } = renderHook(() => useTicketList(4, { sort: "created" }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(true);
    expect(get).toHaveBeenLastCalledWith("/api/tickets/", {
      params: { board: 4, group: "column", page: 1, page_size: 50, ordering: "-created_at" },
    });

    await act(async () => {
      await result.current.fetchNextPage();
    });
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));
    expect(result.current.hasNextPage).toBe(false);
    expect(get).toHaveBeenLastCalledWith("/api/tickets/", expect.objectContaining({ params: expect.objectContaining({ page: 2 }) }));
  });

  it("groupByColumn returns every column in position order, including empty ones", () => {
    const columns = [
      { id: 12, position: 2, name: "Done" },
      { id: 10, position: 0, name: "New" },
      { id: 11, position: 1, name: "Doing" },
    ];
    const groups = groupByColumn([row(1, 10), row(2, 12), row(3, 10), row(4, 99)], columns);
    expect(groups.map((g) => g.column.id)).toEqual([10, 11, 12]);
    expect(groups.map((g) => g.rows.map((r) => r.id))).toEqual([[1, 3], [], [2]]);
  });

  it("useColumnCounts requests counts with the filters", async () => {
    get.mockResolvedValueOnce({ data: { counts: { "10": 2, "11": 0 } } });
    const { result } = renderHook(() => useColumnCounts(4, { assignee: ["me"], sort: "due" }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.counts["11"]).toBe(0);
    expect(get).toHaveBeenCalledWith("/api/tickets/column_counts/", { params: { board: 4, assignee: "me" } });
  });
});

describe("useTicket / useTicketActivity / useTicketHistory", () => {
  it("useTicket loads the detail into tk.ticket", async () => {
    get.mockResolvedValueOnce({ data: { id: 42, title: "x" } });
    const { result } = renderHook(() => useTicket(42), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(get).toHaveBeenCalledWith("/api/tickets/42/");
    expect(client.getQueryData(tk.ticket(42))).toEqual({ id: 42, title: "x" });
  });

  it("useTicket doesn't retry a 404", async () => {
    const c = new QueryClient(); // default retry would be 3 without the hook's override
    const w = ({ children }: { children: React.ReactNode }) => React.createElement(QueryClientProvider, { client: c }, children);
    get.mockRejectedValue({ response: { status: 404 } });
    const { result } = renderHook(() => useTicket(5), { wrapper: w });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(get).toHaveBeenCalledTimes(1);
  });

  it("useTicketActivity reads the timeline", async () => {
    get.mockResolvedValueOnce({ data: [] });
    const { result } = renderHook(() => useTicketActivity(42), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(get).toHaveBeenCalledWith("/api/tickets/42/activity/");
  });

  // Port of the old api/useTickets useTicketHistory test (F15).
  it("useTicketHistory fetches ticket history on tk.history", async () => {
    get.mockResolvedValueOnce({
      data: [
        { id: 1, action: "created", created_at: "2024-01-01T00:00:00Z" },
        { id: 2, action: "updated", created_at: "2024-01-02T00:00:00Z" },
      ],
    });
    const { result } = renderHook(() => useTicketHistory(42), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(get).toHaveBeenCalledWith("/api/tickets/42/history/");
    expect(result.current.data).toHaveLength(2);
    expect(client.getQueryData(tk.history(42))).toHaveLength(2);
  });

  it("useTicketHistory is disabled without a ticket id", () => {
    const { result } = renderHook(() => useTicketHistory(0), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");
    expect(get).not.toHaveBeenCalled();
  });

  it("useTicketHistory is disabled when enabled is false", () => {
    const { result } = renderHook(() => useTicketHistory(42, { enabled: false }), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("useTicketHistory surfaces errors (a 403 fails at once, no retries)", async () => {
    get.mockRejectedValue({ response: { status: 403 } });
    const { result } = renderHook(() => useTicketHistory(42), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(get).toHaveBeenCalledTimes(1);
  });

  it("server errors are retried twice before failing", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    get.mockRejectedValue({ response: { status: 500 } });
    const { result } = renderHook(() => useTicketHistory(42), { wrapper });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(get).toHaveBeenCalledTimes(3);
  });
});

describe("useTicketPickers", () => {
  const users = [
    { id: 1, email: "a@x", is_staff: true, tenant_groups: [] },
    { id: 2, email: "b@x", is_staff: false, tenant_groups: [{ id: 50 }] },
    { id: 3, email: "c@x", is_staff: false, tenant_groups: [] },
    { id: 4, email: "d@x", is_staff: false, tenant_groups: [{ id: 60 }] },
    { id: 5, email: "e@x", is_staff: false, tenant_groups: [] },
  ];

  it("filterUsersForBoard: open board shows everyone", () => {
    const open = { id: 1, name: "B", board_users: [], board_groups: [], order_users: [] };
    expect(filterUsersForBoard(users, open)).toHaveLength(5);
    expect(filterUsersForBoard(users, null)).toHaveLength(5);
  });

  it("filterUsersForBoard: board users, order users, group members and staff", () => {
    const board = {
      id: 1,
      name: "B",
      board_users: [{ id: 3, email: "c@x", first_name: "", last_name: "" }],
      board_groups: [{ id: 50, name: "G", description: "" }],
      order_users: [{ id: 5, email: "e@x", first_name: "", last_name: "" }],
    };
    expect(filterUsersForBoard(users, board).map((u) => u.id)).toEqual([1, 2, 3, 5]);
  });

  it("pages every list and filters users by board access", async () => {
    get.mockImplementation(async (url: string, config?: { params?: Record<string, unknown> }) => {
      const p = config?.params ?? {};
      if (url === "/api/users/") {
        return p.page === 1 ? page(users.slice(0, 3), "/api/users/?page=2") : page(users.slice(3));
      }
      if (url === "/api/boards/7/") {
        return { data: { id: 7, name: "B", board_users: [{ id: 3 }], board_groups: [{ id: 60 }], order_users: [] } };
      }
      if (url === "/api/columns/") return page([{ id: 2, position: 1 }, { id: 1, position: 0 }]);
      if (url === "/api/tags/") return page([{ id: 9, name: "VIP" }]);
      if (url === "/api/tenant-groups/") return page([{ id: 50, name: "G" }]);
      if (url === "/api/departments/") return page([{ id: 8, name: "D" }]);
      throw new Error(`unexpected ${url}`);
    });
    const { result } = renderHook(() => useTicketPickers(7), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.users.map((u) => u.id)).toEqual([1, 3, 4]);
    expect(result.current.columns.map((c) => c.id)).toEqual([1, 2]);
    expect(result.current.tags).toHaveLength(1);
    expect(result.current.groups).toHaveLength(1);
    expect(result.current.departments).toHaveLength(1);
    for (const url of ["/api/users/", "/api/columns/", "/api/tags/", "/api/tenant-groups/", "/api/departments/"]) {
      expect(get).toHaveBeenCalledWith(url, expect.objectContaining({ params: expect.objectContaining({ page_size: 100 }) }));
    }
    expect(get).toHaveBeenCalledWith("/api/columns/", { params: { board: 7, page_size: 100, page: 1 } });
  });

  it("fetches nothing when disabled", () => {
    renderHook(() => useTicketPickers(7, { enabled: false }), { wrapper });
    expect(get).not.toHaveBeenCalled();
  });
});

describe("useTicketMutations", () => {
  it("patchTicket updates tk.ticket and invalidates the board and list", async () => {
    client.setQueryData(tk.ticket(5), { id: 5, title: "old", board: { id: 2 } });
    patch.mockResolvedValueOnce({ data: { id: 5, title: "new", board: { id: 2 } } });
    const spy = vi.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useTicketMutations(), { wrapper });
    await act(async () => {
      await result.current.patchTicket.mutateAsync({ id: 5, body: { title: "new" } });
    });
    expect(client.getQueryData(tk.ticket(5))).toMatchObject({ title: "new" });
    expect(spy).toHaveBeenCalledWith({ queryKey: ["kanbanBoard", 2] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ["ticketList", 2] });
    expect(spy).toHaveBeenCalledWith({ queryKey: tk.activity(5) });
  });

  it("patchTicket invalidates both boards after a transfer", async () => {
    client.setQueryData(tk.ticket(5), { id: 5, board: { id: 2 } });
    patch.mockResolvedValueOnce({ data: { id: 5, board: { id: 3 } } });
    const spy = vi.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useTicketMutations(), { wrapper });
    await act(async () => {
      await result.current.patchTicket.mutateAsync({ id: 5, body: { column_id: 30 } });
    });
    expect(spy).toHaveBeenCalledWith({ queryKey: ["kanbanBoard", 3] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ["kanbanBoard", 2] });
  });

  it("moveTicket sends a remembered mutation id and omits position to append", async () => {
    patch.mockResolvedValue({ data: { id: 5, column: { board: 2 } } });
    const { result } = renderHook(() => useTicketMutations(), { wrapper });
    await act(async () => {
      await result.current.moveTicket.mutateAsync({ id: 5, columnId: 11, boardId: 2 });
    });
    const [url, body, config] = patch.mock.calls[0] as [string, unknown, { headers: Record<string, string> }];
    expect(url).toBe("/api/tickets/5/move_to_column/");
    expect(body).toEqual({ column_id: 11 });
    const mid = config.headers["X-Client-Mutation"];
    expect(mid).toBeTruthy();
    expect(isOwnMutation(mid)).toBe(true);

    await act(async () => {
      await result.current.moveTicket.mutateAsync({ id: 5, columnId: 11, position: 0, boardId: 2 });
    });
    expect(patch.mock.calls[1][1]).toEqual({ column_id: 11, position_in_column: 0 });
  });

  it("errors surface as translated messages and refetch the board", async () => {
    patch.mockRejectedValueOnce({ response: { status: 500, data: { detail: "boom" } } });
    const spy = vi.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useTicketMutations(), { wrapper });
    await act(async () => {
      await result.current.moveTicket.mutateAsync({ id: 5, columnId: 11, boardId: 2 }).catch(() => undefined);
    });
    expect(toastMock.error).toHaveBeenCalledWith("tickets.toasts.moveError");
    expect(spy).toHaveBeenCalledWith({ queryKey: ["kanbanBoard", 2] });

    patch.mockRejectedValueOnce({ response: { status: 403 } });
    await act(async () => {
      await result.current.patchTicket.mutateAsync({ id: 5, body: { title: "x" } }).catch(() => undefined);
    });
    expect(toastMock.error).toHaveBeenLastCalledWith("tickets.toasts.forbidden");
  });

  it("deleteTicket removes the detail cache and toasts", async () => {
    client.setQueryData(tk.ticket(5), { id: 5 });
    del.mockResolvedValueOnce({ data: null });
    const { result } = renderHook(() => useTicketMutations(), { wrapper });
    await act(async () => {
      await result.current.deleteTicket.mutateAsync({ id: 5, boardId: 2 });
    });
    expect(client.getQueryData(tk.ticket(5))).toBeUndefined();
    expect(toastMock.success).toHaveBeenCalledWith("tickets.toasts.deleted");
  });

  it("ticketErrorKey maps 403 to forbidden and everything else to the fallback", () => {
    expect(ticketErrorKey({ response: { status: 403 } }, "saveError")).toBe("toasts.forbidden");
    expect(ticketErrorKey({ response: { status: 400 } }, "deleteError")).toBe("toasts.deleteError");
    expect(ticketErrorKey(new Error("net"), "moveError")).toBe("toasts.moveError");
  });
});
