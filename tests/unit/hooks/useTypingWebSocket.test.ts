/**
 * Tests for useTypingWebSocket hook.
 * Follows the pattern from useMessagesWebSocket.test.ts.
 * Verifies WebSocket connection, typing indicator events, and cleanup.
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

import { useTypingWebSocket } from "@/hooks/useTypingWebSocket";

describe("useTypingWebSocket", () => {
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
    it("connects to WebSocket with tenant schema, conversationId, and token", () => {
      renderHook(() =>
        useTypingWebSocket({ conversationId: "conv-123" })
      );

      expect(MockWebSocket.lastInstance).not.toBeNull();
      expect(MockWebSocket.lastInstance!.url).toContain(
        "/ws/typing/test_tenant/conv-123/"
      );
      expect(MockWebSocket.lastInstance!.url).toContain("token=test-token");
    });

    it("connects without token when no auth token", () => {
      localStorage.removeItem("echodesk_auth_token");

      renderHook(() =>
        useTypingWebSocket({ conversationId: "conv-123" })
      );

      expect(MockWebSocket.lastInstance).not.toBeNull();
      expect(MockWebSocket.lastInstance!.url).toContain(
        "/ws/typing/test_tenant/conv-123/"
      );
      expect(MockWebSocket.lastInstance!.url).not.toContain("token=");
    });

    it("uses wss protocol for https API URL", () => {
      renderHook(() =>
        useTypingWebSocket({ conversationId: "conv-123" })
      );

      expect(MockWebSocket.lastInstance!.url).toMatch(/^wss:\/\//);
    });

    it("does not connect without conversationId", () => {
      renderHook(() => useTypingWebSocket());

      expect(MockWebSocket.lastInstance).toBeNull();
    });

    it("sets isConnected to true on open", () => {
      const { result } = renderHook(() =>
        useTypingWebSocket({ conversationId: "conv-123" })
      );

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      expect(result.current.isConnected).toBe(true);
    });

    it("sets isConnected to false on error", () => {
      const { result } = renderHook(() =>
        useTypingWebSocket({ conversationId: "conv-123" })
      );

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      act(() => {
        MockWebSocket.lastInstance!.simulateError();
      });

      expect(result.current.isConnected).toBe(false);
    });
  });

  describe("typing events", () => {
    it("handles typing_start event", () => {
      const onTypingUsersChange = vi.fn();

      const { result } = renderHook(() =>
        useTypingWebSocket({
          conversationId: "conv-123",
          onTypingUsersChange,
        })
      );

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      act(() => {
        MockWebSocket.lastInstance!.simulateMessage({
          type: "typing_start",
          user_id: "user-1",
          user_name: "John",
        });
      });

      expect(result.current.typingUsers).toHaveLength(1);
      expect(result.current.typingUsers[0]).toEqual({
        user_id: "user-1",
        user_name: "John",
      });
      expect(onTypingUsersChange).toHaveBeenCalled();
    });

    it("handles typing_stop event", () => {
      const { result } = renderHook(() =>
        useTypingWebSocket({ conversationId: "conv-123" })
      );

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      // Start typing
      act(() => {
        MockWebSocket.lastInstance!.simulateMessage({
          type: "typing_start",
          user_id: "user-1",
          user_name: "John",
        });
      });

      expect(result.current.typingUsers).toHaveLength(1);

      // Stop typing
      act(() => {
        MockWebSocket.lastInstance!.simulateMessage({
          type: "typing_stop",
          user_id: "user-1",
        });
      });

      expect(result.current.typingUsers).toHaveLength(0);
    });

    it("does not duplicate typing users", () => {
      const { result } = renderHook(() =>
        useTypingWebSocket({ conversationId: "conv-123" })
      );

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      // Same user typing_start twice
      act(() => {
        MockWebSocket.lastInstance!.simulateMessage({
          type: "typing_start",
          user_id: "user-1",
          user_name: "John",
        });
      });

      act(() => {
        MockWebSocket.lastInstance!.simulateMessage({
          type: "typing_start",
          user_id: "user-1",
          user_name: "John",
        });
      });

      expect(result.current.typingUsers).toHaveLength(1);
    });

    it("handles multiple typing users", () => {
      const { result } = renderHook(() =>
        useTypingWebSocket({ conversationId: "conv-123" })
      );

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      act(() => {
        MockWebSocket.lastInstance!.simulateMessage({
          type: "typing_start",
          user_id: "user-1",
          user_name: "John",
        });
      });

      act(() => {
        MockWebSocket.lastInstance!.simulateMessage({
          type: "typing_start",
          user_id: "user-2",
          user_name: "Jane",
        });
      });

      expect(result.current.typingUsers).toHaveLength(2);
    });

    it("clears typing users on close", () => {
      const { result } = renderHook(() =>
        useTypingWebSocket({ conversationId: "conv-123" })
      );

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      act(() => {
        MockWebSocket.lastInstance!.simulateMessage({
          type: "typing_start",
          user_id: "user-1",
          user_name: "John",
        });
      });

      act(() => {
        MockWebSocket.lastInstance!.simulateClose(1000);
      });

      expect(result.current.typingUsers).toHaveLength(0);
    });
  });

  describe("send typing", () => {
    it("sendTypingStart sends typing_start message", () => {
      const { result } = renderHook(() =>
        useTypingWebSocket({ conversationId: "conv-123" })
      );

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      let sent = false;
      act(() => {
        sent = result.current.sendTypingStart();
      });

      expect(sent).toBe(true);
      const messages = MockWebSocket.lastInstance!.getSentMessages();
      // Filter out ping messages
      const typingMessages = messages.filter(
        (m) => m.type === "typing_start"
      );
      expect(typingMessages).toHaveLength(1);
    });

    it("sendTypingStop sends typing_stop message", () => {
      const { result } = renderHook(() =>
        useTypingWebSocket({ conversationId: "conv-123" })
      );

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      let sent = false;
      act(() => {
        sent = result.current.sendTypingStop();
      });

      expect(sent).toBe(true);
      const messages = MockWebSocket.lastInstance!.getSentMessages();
      const typingMessages = messages.filter(
        (m) => m.type === "typing_stop"
      );
      expect(typingMessages).toHaveLength(1);
    });

    it("sendTypingStart returns false when not connected", () => {
      const { result } = renderHook(() =>
        useTypingWebSocket({ conversationId: "conv-123" })
      );

      let sent = false;
      act(() => {
        sent = result.current.sendTypingStart();
      });

      expect(sent).toBe(false);
    });

    it("notifyTyping sends typing_start then auto-stops after timeout", () => {
      const { result } = renderHook(() =>
        useTypingWebSocket({ conversationId: "conv-123" })
      );

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      act(() => {
        result.current.notifyTyping();
      });

      const ws = MockWebSocket.lastInstance!;
      const messagesAfterNotify = ws.getSentMessages().filter(
        (m) => m.type === "typing_start"
      );
      expect(messagesAfterNotify.length).toBeGreaterThanOrEqual(1);

      // After 3 seconds, should send typing_stop
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      const stopMessages = ws.getSentMessages().filter(
        (m) => m.type === "typing_stop"
      );
      expect(stopMessages.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("ping/pong", () => {
    it("sends ping every 30 seconds", () => {
      renderHook(() =>
        useTypingWebSocket({ conversationId: "conv-123" })
      );

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      const ws = MockWebSocket.lastInstance!;

      act(() => {
        vi.advanceTimersByTime(30000);
      });

      const pingMessages = ws.getSentMessages().filter(
        (m) => m.type === "ping"
      );
      expect(pingMessages).toHaveLength(1);
    });
  });

  describe("server messages", () => {
    it("handles error message with UNAUTHENTICATED code", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});

      renderHook(() =>
        useTypingWebSocket({ conversationId: "conv-123" })
      );

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      act(() => {
        MockWebSocket.lastInstance!.simulateMessage({
          type: "error",
          message: "Not authenticated",
          code: "UNAUTHENTICATED",
        });
      });

      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it("handles pong silently", () => {
      renderHook(() =>
        useTypingWebSocket({ conversationId: "conv-123" })
      );

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      // Should not throw
      act(() => {
        MockWebSocket.lastInstance!.simulateMessage({ type: "pong" });
      });
    });

    it("handles connection message silently", () => {
      renderHook(() =>
        useTypingWebSocket({ conversationId: "conv-123" })
      );

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      // Should not throw
      act(() => {
        MockWebSocket.lastInstance!.simulateMessage({
          type: "connection",
          message: "Connected",
        });
      });
    });
  });

  describe("reconnection", () => {
    it("reconnects on unexpected close", () => {
      renderHook(() =>
        useTypingWebSocket({ conversationId: "conv-123" })
      );

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      const initialCount = MockWebSocket.instances.length;

      act(() => {
        MockWebSocket.lastInstance!.simulateClose(1006);
      });

      // Reconnect delay is 3000ms
      act(() => {
        vi.advanceTimersByTime(4000);
      });

      expect(MockWebSocket.instances.length).toBeGreaterThan(initialCount);
    });

    it("does not reconnect on auth failure (4001)", () => {
      renderHook(() =>
        useTypingWebSocket({ conversationId: "conv-123" })
      );

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      const instanceCount = MockWebSocket.instances.length;

      act(() => {
        MockWebSocket.lastInstance!.simulateClose(4001);
      });

      act(() => {
        vi.advanceTimersByTime(10000);
      });

      expect(MockWebSocket.instances.length).toBe(instanceCount);
    });
  });

  describe("cleanup", () => {
    it("disconnects on unmount", () => {
      const { unmount } = renderHook(() =>
        useTypingWebSocket({ conversationId: "conv-123" })
      );

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      const instanceCount = MockWebSocket.instances.length;

      unmount();

      // Should not reconnect after unmount
      act(() => {
        vi.advanceTimersByTime(10000);
      });

      expect(MockWebSocket.instances.length).toBe(instanceCount);
    });
  });
});
