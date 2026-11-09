/**
 * FE-02: TicketsRealtimeProvider over the real socket hook and a mock WebSocket.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, renderHook } from "@testing-library/react";
import React from "react";
import { MockWebSocket, TENANT } from "./ws-mock";

vi.stubGlobal("WebSocket", MockWebSocket);
vi.mock("@/contexts/TenantContext", () => ({
  useTenant: () => ({ tenant: TENANT, loading: false, error: null, refreshTenant: vi.fn() }),
}));

import {
  BEING_MOVED_TTL_MS,
  TicketsRealtimeProvider,
  useBoardEvents,
  useTicketsRealtime,
  type TicketsRealtimeValue,
} from "@/app/(tenant)/tickets/_contexts/tickets-realtime-context";

type Props = { onAccessDenied?: () => void; onUnknownFrame?: (f: Record<string, unknown>, b: number | null) => void };

function setup(props: Props = {}) {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <TicketsRealtimeProvider {...props}>{children}</TicketsRealtimeProvider>
  );
  return renderHook(() => useTicketsRealtime(), { wrapper });
}

function connect(result: { current: TicketsRealtimeValue }, boardId = 1) {
  act(() => result.current.setBoardId(boardId));
  const ws = MockWebSocket.last!;
  act(() => ws.open());
  return ws;
}

beforeEach(() => {
  vi.useFakeTimers();
  MockWebSocket.reset();
  localStorage.setItem("echodesk_auth_token", "tok");
});

afterEach(() => {
  vi.useRealTimers();
});

describe("TicketsRealtimeProvider", () => {
  it("does not connect until setBoardId is called", () => {
    const { result } = setup();
    expect(MockWebSocket.instances).toHaveLength(0);
    expect(result.current.boardId).toBeNull();
  });

  it("connects to the board socket on setBoardId", () => {
    const { result } = setup();
    act(() => result.current.setBoardId(7));
    expect(MockWebSocket.last!.url).toBe("ws://demo.api.lvh.me:8010/ws/boards/demo/7/?token=tok");
    expect(result.current.boardId).toBe(7);
  });

  it("wsReady becomes true on the connection frame, not on open", () => {
    const { result } = setup();
    const ws = connect(result);
    expect(result.current.wsReady).toBe(false);
    act(() => ws.frame({ type: "connection", status: "connected", active_users: [{ user_id: 2, user_name: "A" }] }));
    expect(result.current.wsReady).toBe(true);
    expect(result.current.activeUsers).toEqual([{ user_id: 2, user_name: "A" }]);
  });

  it("wsReady drops on an abnormal close", () => {
    const { result } = setup();
    const ws = connect(result);
    act(() => ws.frame({ type: "connection" }));
    act(() => ws.serverClose(1006));
    expect(result.current.wsReady).toBe(false);
  });

  it("subscribe receives board events and unsubscribe stops them", () => {
    const { result } = setup();
    const ws = connect(result);
    const handler = vi.fn();
    let off = () => {};
    act(() => {
      off = result.current.subscribe(handler);
    });
    const moved = { type: "ticket_moved", ticket_id: 1, from_column_id: 1, to_column_id: 2, client_mutation_id: "x" };
    act(() => ws.frame(moved));
    act(() => ws.frame({ type: "ticket_activity", ticket_id: 1, kind: "checklist" }));
    act(() => ws.frame({ type: "user_joined", user_id: 3, user_name: "B" })); // presence: not a board event
    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler).toHaveBeenNthCalledWith(1, moved);

    act(() => off());
    act(() => ws.frame(moved));
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it("one failing subscriber does not stop the others", () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const { result } = setup();
    const ws = connect(result);
    const good = vi.fn();
    act(() => {
      result.current.subscribe(() => {
        throw new Error("boom");
      });
      result.current.subscribe(good);
    });
    act(() => ws.frame({ type: "ticket_created", ticket: { id: 5 } }));
    expect(good).toHaveBeenCalledTimes(1);
    err.mockRestore();
  });

  it("hands unknown frame types to onUnknownFrame with the board id", () => {
    const onUnknownFrame = vi.fn();
    const { result } = setup({ onUnknownFrame });
    const ws = connect(result, 4);
    act(() => ws.frame({ type: "pong" }));
    act(() => ws.frame({ type: "ticket_being_edited", ticket_id: 1, user_id: 2, user_name: "N" }));
    expect(onUnknownFrame).not.toHaveBeenCalled();
    act(() => ws.frame({ type: "ticket_archived", ticket_id: 1 }));
    expect(onUnknownFrame).toHaveBeenCalledWith({ type: "ticket_archived", ticket_id: 1 }, 4);
  });

  it("beingMoved is set and expires after 3s; a repeat restarts the timer", () => {
    const { result } = setup();
    const ws = connect(result);
    act(() => ws.frame({ type: "ticket_being_moved", ticket_id: 9, from_column: 1, user_id: 4, user_name: "Nino" }));
    expect(result.current.beingMoved.get(9)).toEqual({ userId: 4, userName: "Nino" });

    act(() => {
      vi.advanceTimersByTime(BEING_MOVED_TTL_MS - 1000);
    });
    act(() => ws.frame({ type: "ticket_being_moved", ticket_id: 9, from_column: 1, user_id: 4, user_name: "Nino" }));
    act(() => {
      vi.advanceTimersByTime(BEING_MOVED_TTL_MS - 1);
    });
    expect(result.current.beingMoved.has(9)).toBe(true);
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.beingMoved.has(9)).toBe(false);
  });

  it("beingEdited is set by ticket_being_edited and cleared by ticket_editing_stopped", () => {
    const { result } = setup();
    const ws = connect(result);
    act(() => ws.frame({ type: "ticket_being_edited", ticket_id: 3, user_id: 4, user_name: "Nino" }));
    expect(result.current.beingEdited.get(3)).toEqual({ userId: 4, userName: "Nino" });
    // Another user's stop does not clear Nino's mark.
    act(() => ws.frame({ type: "ticket_editing_stopped", ticket_id: 3, user_id: 99 }));
    expect(result.current.beingEdited.has(3)).toBe(true);
    act(() => ws.frame({ type: "ticket_editing_stopped", ticket_id: 3, user_id: 4 }));
    expect(result.current.beingEdited.has(3)).toBe(false);
  });

  it("beingEdited marks of a user who leaves are cleared", () => {
    const { result } = setup();
    const ws = connect(result);
    act(() => ws.frame({ type: "ticket_being_edited", ticket_id: 3, user_id: 4, user_name: "Nino" }));
    act(() => ws.frame({ type: "ticket_being_edited", ticket_id: 5, user_id: 6, user_name: "Gio" }));
    act(() => ws.frame({ type: "user_left", user_id: 4, user_name: "Nino" }));
    expect(result.current.beingEdited.has(3)).toBe(false);
    expect(result.current.beingEdited.has(5)).toBe(true);
  });

  it("sendTicketMoving / sendTicketEditing / sendTicketEditingStopped write the right frames", () => {
    const { result } = setup();
    const ws = connect(result);
    act(() => {
      result.current.sendTicketMoving(11, 2);
      result.current.sendTicketEditing(11, "title");
      result.current.sendTicketEditingStopped(11);
    });
    expect(ws.sentFrames()).toEqual([
      { type: "ticket_moving", ticket_id: 11, from_column: 2 },
      { type: "ticket_editing", ticket_id: 11, field: "title" },
      { type: "ticket_editing_stopped", ticket_id: 11 },
    ]);
  });

  it("setBoardId(null) disconnects with 1000 and resets state", () => {
    const { result } = setup();
    const ws = connect(result);
    act(() => ws.frame({ type: "connection" }));
    act(() => ws.frame({ type: "ticket_being_edited", ticket_id: 3, user_id: 4, user_name: "Nino" }));
    act(() => result.current.setBoardId(null));
    expect(ws.readyState).toBe(MockWebSocket.CLOSED);
    expect(result.current.wsReady).toBe(false);
    expect(result.current.beingEdited.size).toBe(0);
    expect(result.current.boardId).toBeNull();
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(MockWebSocket.instances).toHaveLength(1);
  });

  it("switching boards closes the old socket and opens the new one", () => {
    const { result } = setup();
    const first = connect(result, 1);
    act(() => first.frame({ type: "connection" }));
    act(() => result.current.setBoardId(2));
    expect(first.readyState).toBe(MockWebSocket.CLOSED);
    expect(MockWebSocket.last!.url).toContain("/ws/boards/demo/2/");
    expect(result.current.wsReady).toBe(false);
  });

  it("ignores invalid board ids", () => {
    const { result } = setup();
    act(() => result.current.setBoardId(0));
    act(() => result.current.setBoardId(Number.NaN));
    expect(MockWebSocket.instances).toHaveLength(0);
  });

  it("4403: accessDenied, onAccessDenied once, no reconnect", () => {
    const onAccessDenied = vi.fn();
    const { result } = setup({ onAccessDenied });
    const ws = connect(result, 23);
    act(() => ws.frame({ type: "error", code: "FORBIDDEN", message: "no" }));
    act(() => ws.serverClose(4403));
    act(() => {
      vi.advanceTimersByTime(120_000);
    });
    expect(onAccessDenied).toHaveBeenCalledTimes(1);
    expect(result.current.accessDenied).toBe(true);
    expect(MockWebSocket.instances).toHaveLength(1);

    // A new board starts clean.
    act(() => result.current.setBoardId(1));
    expect(result.current.accessDenied).toBe(false);
  });
});

describe("useTicketsRealtime outside the provider", () => {
  it("returns an inert value", () => {
    const { result } = renderHook(() => useTicketsRealtime());
    expect(result.current.wsReady).toBe(false);
    expect(() => result.current.sendTicketMoving(1, 1)).not.toThrow();
    expect(typeof result.current.subscribe(() => {})).toBe("function");
  });
});

describe("useBoardEvents", () => {
  it("subscribes for the component's lifetime with the latest handler", () => {
    const seen: number[] = [];
    let api: TicketsRealtimeValue | null = null;
    function Probe({ offset }: { offset: number }) {
      api = useTicketsRealtime();
      useBoardEvents((e) => {
        if (e.type === "ticket_deleted") seen.push(e.ticket_id + offset);
      });
      return null;
    }
    const { rerender, unmount } = render(
      <TicketsRealtimeProvider>
        <Probe offset={0} />
      </TicketsRealtimeProvider>,
    );
    act(() => api!.setBoardId(1));
    const ws = MockWebSocket.last!;
    act(() => ws.open());
    act(() => ws.frame({ type: "ticket_deleted", ticket_id: 1 }));
    rerender(
      <TicketsRealtimeProvider>
        <Probe offset={100} />
      </TicketsRealtimeProvider>,
    );
    act(() => ws.frame({ type: "ticket_deleted", ticket_id: 2 }));
    unmount();
    expect(seen).toEqual([1, 102]);
  });
});
