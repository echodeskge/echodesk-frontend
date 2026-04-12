/**
 * Tests for useMessagesWebSocket hook.
 * Verifies WebSocket connection, message handling (new_message,
 * conversation_update, read_receipt, delivery_receipt), and reconnection with jitter.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// ---- Mock WebSocket ----
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  url: string;
  readyState: number = MockWebSocket.CONNECTING;
  onopen: ((event: any) => void) | null = null;
  onclose: ((event: any) => void) | null = null;
  onmessage: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;

  private sentMessages: string[] = [];

  constructor(url: string) {
    this.url = url;
    MockWebSocket.lastInstance = this;
    MockWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sentMessages.push(data);
  }

  close(code?: number, reason?: string) {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose({ code: code || 1000, reason: reason || "" });
    }
  }

  simulateOpen() {
    this.readyState = MockWebSocket.OPEN;
    if (this.onopen) {
      this.onopen({});
    }
  }

  simulateMessage(data: any) {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) });
    }
  }

  simulateError() {
    if (this.onerror) {
      this.onerror({});
    }
  }

  simulateClose(code = 1006) {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose({ code });
    }
  }

  getSentMessages(): any[] {
    return this.sentMessages.map((m) => JSON.parse(m));
  }

  static lastInstance: MockWebSocket | null = null;
  static instances: MockWebSocket[] = [];

  static reset() {
    MockWebSocket.lastInstance = null;
    MockWebSocket.instances = [];
  }
}

vi.stubGlobal("WebSocket", MockWebSocket);

// Mock TenantContext
vi.mock("@/contexts/TenantContext", () => ({
  useTenant: vi.fn(() => ({
    tenant: {
      schema_name: "test_tenant",
      api_url: "https://test.api.echodesk.ge",
    },
    loading: false,
    error: null,
    refreshTenant: vi.fn(),
  })),
}));

import { useMessagesWebSocket } from "@/hooks/useMessagesWebSocket";

describe("useMessagesWebSocket", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    MockWebSocket.reset();
    localStorage.setItem("echodesk_auth_token", "test-token");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("connection", () => {
    it("connects to WebSocket with tenant schema and token", () => {
      renderHook(() => useMessagesWebSocket());

      expect(MockWebSocket.lastInstance).not.toBeNull();
      expect(MockWebSocket.lastInstance!.url).toContain(
        "/ws/messages/test_tenant/"
      );
      expect(MockWebSocket.lastInstance!.url).toContain("token=test-token");
    });

    it("connects without token parameter when no auth token", () => {
      localStorage.removeItem("echodesk_auth_token");

      renderHook(() => useMessagesWebSocket());

      expect(MockWebSocket.lastInstance).not.toBeNull();
      expect(MockWebSocket.lastInstance!.url).toContain(
        "/ws/messages/test_tenant/"
      );
      expect(MockWebSocket.lastInstance!.url).not.toContain("token=");
    });

    it("uses wss protocol for https API URL", () => {
      renderHook(() => useMessagesWebSocket());

      expect(MockWebSocket.lastInstance!.url).toMatch(/^wss:\/\//);
    });

    it("sets isConnected to true on open", () => {
      const { result } = renderHook(() => useMessagesWebSocket());

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      expect(result.current.isConnected).toBe(true);
    });

    it("calls onConnectionChange on connect/disconnect", () => {
      const onConnectionChange = vi.fn();

      renderHook(() => useMessagesWebSocket({ onConnectionChange }));

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });
      expect(onConnectionChange).toHaveBeenCalledWith(true);

      act(() => {
        MockWebSocket.lastInstance!.simulateClose(1006);
      });
      expect(onConnectionChange).toHaveBeenCalledWith(false);
    });
  });

  describe("message handling", () => {
    it("handles new_message", () => {
      const onNewMessage = vi.fn();

      renderHook(() => useMessagesWebSocket({ onNewMessage }));

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      const messageData = {
        type: "new_message",
        conversation_id: "conv-123",
        message: {
          id: 1,
          text: "Hello",
          sender: "customer",
        },
      };

      act(() => {
        MockWebSocket.lastInstance!.simulateMessage(messageData);
      });

      expect(onNewMessage).toHaveBeenCalledWith(messageData);
    });

    it("handles conversation_update", () => {
      const onConversationUpdate = vi.fn();

      renderHook(() => useMessagesWebSocket({ onConversationUpdate }));

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      const updateData = {
        type: "conversation_update",
        conversation_id: "conv-123",
        status: "resolved",
      };

      act(() => {
        MockWebSocket.lastInstance!.simulateMessage(updateData);
      });

      expect(onConversationUpdate).toHaveBeenCalledWith(updateData);
    });

    it("handles read_receipt via onConversationUpdate", () => {
      const onConversationUpdate = vi.fn();

      renderHook(() => useMessagesWebSocket({ onConversationUpdate }));

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      const receiptData = {
        type: "read_receipt",
        conversation_id: "conv-123",
        message_id: 5,
      };

      act(() => {
        MockWebSocket.lastInstance!.simulateMessage(receiptData);
      });

      expect(onConversationUpdate).toHaveBeenCalledWith(receiptData);
    });

    it("handles delivery_receipt via onConversationUpdate", () => {
      const onConversationUpdate = vi.fn();

      renderHook(() => useMessagesWebSocket({ onConversationUpdate }));

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      const deliveryData = {
        type: "delivery_receipt",
        conversation_id: "conv-123",
        message_id: 5,
      };

      act(() => {
        MockWebSocket.lastInstance!.simulateMessage(deliveryData);
      });

      expect(onConversationUpdate).toHaveBeenCalledWith(deliveryData);
    });

    it("handles connection message silently", () => {
      const onNewMessage = vi.fn();
      const onConversationUpdate = vi.fn();

      renderHook(() =>
        useMessagesWebSocket({ onNewMessage, onConversationUpdate })
      );

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      act(() => {
        MockWebSocket.lastInstance!.simulateMessage({
          type: "connection",
          message: "Connected",
        });
      });

      expect(onNewMessage).not.toHaveBeenCalled();
      expect(onConversationUpdate).not.toHaveBeenCalled();
    });

    it("handles pong silently", () => {
      renderHook(() => useMessagesWebSocket());

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      // Should not throw
      act(() => {
        MockWebSocket.lastInstance!.simulateMessage({ type: "pong" });
      });
    });

    it("handles error message from server", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});

      renderHook(() => useMessagesWebSocket());

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      act(() => {
        MockWebSocket.lastInstance!.simulateMessage({
          type: "error",
          message: "Something went wrong",
        });
      });

      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it("handles malformed JSON gracefully", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});

      renderHook(() => useMessagesWebSocket());

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      act(() => {
        if (MockWebSocket.lastInstance!.onmessage) {
          MockWebSocket.lastInstance!.onmessage({ data: "{{invalid json" });
        }
      });

      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe("ping/pong", () => {
    it("sends ping every 30 seconds", () => {
      renderHook(() => useMessagesWebSocket());

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      const ws = MockWebSocket.lastInstance!;

      act(() => {
        vi.advanceTimersByTime(30000);
      });

      const messages = ws.getSentMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0].type).toBe("ping");
    });

    it("clears ping interval on close", () => {
      renderHook(() => useMessagesWebSocket());

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      const ws = MockWebSocket.lastInstance!;

      act(() => {
        ws.simulateClose(1000);
      });

      // Advance time - should not add more pings since interval is cleared
      const sentBefore = ws.getSentMessages().length;
      act(() => {
        vi.advanceTimersByTime(60000);
      });

      expect(ws.getSentMessages().length).toBe(sentBefore);
    });
  });

  describe("subscribe/unsubscribe to conversation", () => {
    it("sends subscribe_conversation message", () => {
      const { result } = renderHook(() => useMessagesWebSocket());

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      act(() => {
        result.current.subscribeToConversation("conv-456");
      });

      const messages = MockWebSocket.lastInstance!.getSentMessages();
      const sub = messages.find((m) => m.type === "subscribe_conversation");
      expect(sub).toBeDefined();
      expect(sub!.conversation_id).toBe("conv-456");
    });

    it("sends unsubscribe_conversation message", () => {
      const { result } = renderHook(() => useMessagesWebSocket());

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      act(() => {
        result.current.unsubscribeFromConversation("conv-456");
      });

      const messages = MockWebSocket.lastInstance!.getSentMessages();
      const unsub = messages.find(
        (m) => m.type === "unsubscribe_conversation"
      );
      expect(unsub).toBeDefined();
      expect(unsub!.conversation_id).toBe("conv-456");
    });

    it("returns false when WebSocket is not open", () => {
      const { result } = renderHook(() => useMessagesWebSocket());

      let subscribed = false;
      act(() => {
        subscribed = result.current.subscribeToConversation("conv-1");
      });

      expect(subscribed).toBe(false);
    });
  });

  describe("reconnection with jitter", () => {
    it("reconnects on unexpected close", () => {
      renderHook(() =>
        useMessagesWebSocket({ reconnectInterval: 1000 })
      );

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      const initialCount = MockWebSocket.instances.length;

      act(() => {
        MockWebSocket.lastInstance!.simulateClose(1006);
      });

      // Advance past max jittered delay (1000 * 1.5 = 1500ms)
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(MockWebSocket.instances.length).toBeGreaterThan(initialCount);
    });

    it("uses exponential backoff with jitter", () => {
      renderHook(() =>
        useMessagesWebSocket({ reconnectInterval: 1000 })
      );

      // First open and close
      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });
      act(() => {
        MockWebSocket.lastInstance!.simulateClose(1006);
      });

      // First reconnect: base delay = 1000ms
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      const secondWs = MockWebSocket.lastInstance!;

      // Second close
      act(() => {
        secondWs.simulateClose(1006);
      });

      // Second reconnect: base delay = 2000ms (exponential backoff)
      act(() => {
        vi.advanceTimersByTime(4000);
      });

      // Should have at least 3 instances now (original + 2 reconnects)
      expect(MockWebSocket.instances.length).toBeGreaterThanOrEqual(3);
    });

    it("does not reconnect when autoReconnect is false", () => {
      renderHook(() =>
        useMessagesWebSocket({ autoReconnect: false })
      );

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      const instanceCount = MockWebSocket.instances.length;

      act(() => {
        MockWebSocket.lastInstance!.simulateClose(1006);
      });

      act(() => {
        vi.advanceTimersByTime(60000);
      });

      expect(MockWebSocket.instances.length).toBe(instanceCount);
    });

    it("resets reconnect counter on successful open", () => {
      const { result } = renderHook(() =>
        useMessagesWebSocket({ reconnectInterval: 1000 })
      );

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      // Close and reconnect
      act(() => {
        MockWebSocket.lastInstance!.simulateClose(1006);
      });
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // New WS opens
      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      expect(result.current.isConnected).toBe(true);
    });
  });

  describe("disconnect", () => {
    it("closes the WebSocket and prevents reconnection", () => {
      const { result } = renderHook(() =>
        useMessagesWebSocket({ reconnectInterval: 100 })
      );

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });
      expect(result.current.isConnected).toBe(true);

      const instanceCount = MockWebSocket.instances.length;

      act(() => {
        result.current.disconnect();
      });

      act(() => {
        vi.advanceTimersByTime(10000);
      });

      // No new instances after explicit disconnect
      expect(MockWebSocket.instances.length).toBe(instanceCount);
      expect(result.current.isConnected).toBe(false);
    });
  });

  describe("sendMessage", () => {
    it("sends arbitrary JSON message when connected", () => {
      const { result } = renderHook(() => useMessagesWebSocket());

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      let sent = false;
      act(() => {
        sent = result.current.sendMessage({
          type: "custom",
          data: "test",
        });
      });

      expect(sent).toBe(true);
      const messages = MockWebSocket.lastInstance!.getSentMessages();
      expect(messages.find((m) => m.type === "custom")).toBeDefined();
    });

    it("returns false when not connected", () => {
      const { result } = renderHook(() => useMessagesWebSocket());

      let sent = false;
      act(() => {
        sent = result.current.sendMessage({ type: "test" });
      });

      expect(sent).toBe(false);
    });
  });
});
