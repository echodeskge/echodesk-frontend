/**
 * Team chat WebSocket hook: own-message echo routing, send errors, reconnect
 * catch-up and half-open socket detection.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTeamChatWebSocket, takePendingSend } from "@/components/TeamChat/useTeamChatWebSocket";

vi.mock("@/contexts/TenantContext", () => ({
  useTenant: () => ({ tenant: { schema_name: "acme", api_url: "https://acme.api.test" } }),
}));

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static instances: MockWebSocket[] = [];
  readyState = MockWebSocket.CONNECTING;
  sent: Record<string, unknown>[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  constructor(public url: string) {
    MockWebSocket.instances.push(this);
  }
  send(data: string) {
    this.sent.push(JSON.parse(data));
  }
  close() {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.();
  }
  open() {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.();
  }
  receive(frame: Record<string, unknown>) {
    this.onmessage?.({ data: JSON.stringify(frame) });
  }
}

const latest = () => MockWebSocket.instances[MockWebSocket.instances.length - 1];

beforeEach(() => {
  MockWebSocket.instances = [];
  vi.stubGlobal("WebSocket", MockWebSocket);
  localStorage.setItem("echodesk_auth_token", "tok");
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const message = (id: number, senderId: number) => ({
  id,
  conversation_id: 9,
  sender: { id: senderId, email: "", full_name: "", is_online: true },
  message_type: "text",
  text: "hi",
  is_read: false,
  created_at: new Date().toISOString(),
});

describe("useTeamChatWebSocket", () => {
  it("routes a message_sent echo with the recipient and client id of the send", () => {
    const onNewMessage = vi.fn();
    const { result } = renderHook(() => useTeamChatWebSocket({ onNewMessage }));
    act(() => latest().open());

    act(() => {
      result.current.sendMessage(42, "hi", "text", "client-1");
      result.current.sendMessage(43, "yo", "text", "client-2");
    });
    expect(latest().sent[0]).toMatchObject({ type: "message", recipient_id: 42, client_id: "client-1" });

    // Old server: frame carries neither recipient_id nor client_id -> FIFO
    act(() => latest().receive({ type: "message_sent", message: message(1, 7), conversation_id: 9 }));
    expect(onNewMessage).toHaveBeenLastCalledWith(expect.objectContaining({ id: 1 }), 9, {
      recipientId: 42,
      clientId: "client-1",
    });

    // New server: echoes ids explicitly
    act(() =>
      latest().receive({
        type: "message_sent",
        message: message(2, 7),
        conversation_id: 9,
        recipient_id: 43,
        client_id: "client-2",
      })
    );
    expect(onNewMessage).toHaveBeenLastCalledWith(expect.objectContaining({ id: 2 }), 9, {
      recipientId: 43,
      clientId: "client-2",
    });
  });

  it("passes recipient_id of a new_message so own copies from other tabs find their window", () => {
    const onNewMessage = vi.fn();
    renderHook(() => useTeamChatWebSocket({ onNewMessage }));
    act(() => latest().open());
    act(() =>
      latest().receive({
        type: "new_message",
        message: message(5, 7),
        conversation_id: 9,
        sender_id: 7,
        recipient_id: 42,
        other_user_id: 42,
      })
    );
    expect(onNewMessage).toHaveBeenLastCalledWith(expect.objectContaining({ id: 5 }), 9, { recipientId: 42 });

    // Legacy frame without routing keys
    act(() => latest().receive({ type: "new_message", message: message(6, 8), conversation_id: 9 }));
    expect(onNewMessage).toHaveBeenLastCalledWith(expect.objectContaining({ id: 6 }), 9, undefined);
  });

  it("reports a rejected send", () => {
    const onSendError = vi.fn();
    const { result } = renderHook(() => useTeamChatWebSocket({ onSendError }));
    act(() => latest().open());
    act(() => {
      result.current.sendMessage(42, "hi", "text", "c1");
    });
    act(() => latest().receive({ type: "error", message: "Message could not be sent" }));
    expect(onSendError).toHaveBeenCalledWith({ recipientId: 42, clientId: "c1" }, "Message could not be sent");
  });

  it("calls onReconnect only when re-opening after a previous connection", () => {
    vi.useFakeTimers();
    const onReconnect = vi.fn();
    renderHook(() => useTeamChatWebSocket({ onReconnect }));
    act(() => latest().open());
    expect(onReconnect).not.toHaveBeenCalled();

    act(() => latest().close());
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(MockWebSocket.instances).toHaveLength(2);
    act(() => latest().open());
    expect(onReconnect).toHaveBeenCalledTimes(1);
  });

  it("closes a half-open socket when pongs stop arriving", () => {
    vi.useFakeTimers();
    renderHook(() => useTeamChatWebSocket());
    act(() => latest().open());
    const first = latest();
    act(() => {
      vi.advanceTimersByTime(90_000);
    });
    expect(first.readyState).toBe(MockWebSocket.CLOSED);
  });

  it("reconnectNow replaces the socket immediately", () => {
    const { result } = renderHook(() => useTeamChatWebSocket());
    act(() => latest().open());
    act(() => result.current.reconnectNow());
    expect(MockWebSocket.instances).toHaveLength(2);
    expect(MockWebSocket.instances[0].readyState).toBe(MockWebSocket.CLOSED);
  });
});

describe("takePendingSend", () => {
  it("prefers a client id match and falls back to FIFO", () => {
    const q = [
      { recipientId: 1, clientId: "a" },
      { recipientId: 2, clientId: "b" },
      { recipientId: 3 },
    ];
    expect(takePendingSend(q, "b")).toEqual({ recipientId: 2, clientId: "b" });
    expect(takePendingSend(q)).toEqual({ recipientId: 1, clientId: "a" });
    expect(takePendingSend(q, "zzz")).toEqual({ recipientId: 3 });
    expect(takePendingSend(q)).toBeUndefined();
  });
});
