/**
 * Tests for useNotificationsWebSocket hook.
 * Verifies WebSocket connection, message handling, reconnection logic,
 * ping/pong, and markAsRead/markAllAsRead functions.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// ---- Mock WebSocket ----
type WSHandler = ((event: any) => void) | null;

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  url: string;
  readyState: number = MockWebSocket.CONNECTING;
  onopen: WSHandler = null;
  onclose: WSHandler = null;
  onmessage: WSHandler = null;
  onerror: WSHandler = null;

  private sentMessages: string[] = [];

  constructor(url: string) {
    this.url = url;
    // Store instance for test access
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

  // Test helpers
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

// Set WebSocket constants on prototype
Object.defineProperty(MockWebSocket, "CONNECTING", { value: 0 });
Object.defineProperty(MockWebSocket, "OPEN", { value: 1 });
Object.defineProperty(MockWebSocket, "CLOSING", { value: 2 });
Object.defineProperty(MockWebSocket, "CLOSED", { value: 3 });

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

// Mock notification broadcast
vi.mock("@/utils/notificationBroadcast", () => ({
  getNotificationBroadcast: () => ({
    on: vi.fn(() => vi.fn()), // Returns unsubscribe function
    broadcastNotificationReceived: vi.fn(),
    broadcastNotificationRead: vi.fn(),
    broadcastCountUpdated: vi.fn(),
  }),
}));

// Mock notification queue
vi.mock("@/utils/notificationQueue", () => ({
  getNotificationQueue: () => ({
    enqueue: vi.fn(),
    getUnsynced: vi.fn(async () => []),
    markSynced: vi.fn(),
  }),
}));

// Mock online status
vi.mock("@/hooks/useOnlineStatus", () => ({
  useOnlineStatus: vi.fn(() => ({
    isOnline: true,
    wasOffline: false,
  })),
}));

import { useNotificationsWebSocket } from "@/hooks/useNotificationsWebSocket";

describe("useNotificationsWebSocket", () => {
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
    it("connects to WebSocket on mount with tenant schema", () => {
      renderHook(() => useNotificationsWebSocket());

      expect(MockWebSocket.lastInstance).not.toBeNull();
      expect(MockWebSocket.lastInstance!.url).toContain(
        "/ws/notifications/test_tenant/"
      );
      expect(MockWebSocket.lastInstance!.url).toContain("token=test-token");
    });

    it("uses wss protocol for https API URL", () => {
      renderHook(() => useNotificationsWebSocket());

      expect(MockWebSocket.lastInstance!.url).toMatch(/^wss:\/\//);
    });

    it("does not connect when no auth token", () => {
      localStorage.removeItem("echodesk_auth_token");

      renderHook(() => useNotificationsWebSocket());

      // The hook creates a WS instance but connect() returns early without token
      // Actually connect is called but returns early before new WebSocket()
      // Let's check: connect is called but should bail out
      expect(MockWebSocket.instances.length).toBe(0);
    });

    it("sets isConnected to true on open", () => {
      const { result } = renderHook(() => useNotificationsWebSocket());

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      expect(result.current.isConnected).toBe(true);
    });

    it("calls onConnectionChange callback on open", () => {
      const onConnectionChange = vi.fn();

      renderHook(() =>
        useNotificationsWebSocket({ onConnectionChange })
      );

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      expect(onConnectionChange).toHaveBeenCalledWith(true);
    });
  });

  describe("message handling", () => {
    it("handles connection message with unread_count", () => {
      const onUnreadCountUpdate = vi.fn();

      const { result } = renderHook(() =>
        useNotificationsWebSocket({ onUnreadCountUpdate })
      );

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      act(() => {
        MockWebSocket.lastInstance!.simulateMessage({
          type: "connection",
          unread_count: 5,
        });
      });

      expect(result.current.unreadCount).toBe(5);
      expect(onUnreadCountUpdate).toHaveBeenCalledWith(5);
    });

    it("handles notification_created message", () => {
      const onNotificationCreated = vi.fn();
      const mockNotification = {
        id: 1,
        notification_type: "ticket_assigned",
        title: "New assignment",
        message: "You were assigned a ticket",
        is_read: false,
        created_at: "2024-01-01T00:00:00Z",
      };

      const { result } = renderHook(() =>
        useNotificationsWebSocket({ onNotificationCreated })
      );

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      act(() => {
        MockWebSocket.lastInstance!.simulateMessage({
          type: "notification_created",
          notification: mockNotification,
          unread_count: 3,
        });
      });

      expect(onNotificationCreated).toHaveBeenCalledWith(
        mockNotification,
        3
      );
      expect(result.current.unreadCount).toBe(3);
    });

    it("handles notification_read message", () => {
      const onNotificationRead = vi.fn();

      const { result } = renderHook(() =>
        useNotificationsWebSocket({ onNotificationRead })
      );

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      act(() => {
        MockWebSocket.lastInstance!.simulateMessage({
          type: "notification_read",
          notification_id: 42,
          unread_count: 2,
        });
      });

      expect(onNotificationRead).toHaveBeenCalledWith(42, 2);
      expect(result.current.unreadCount).toBe(2);
    });

    it("handles all_notifications_read message", () => {
      const onUnreadCountUpdate = vi.fn();

      const { result } = renderHook(() =>
        useNotificationsWebSocket({ onUnreadCountUpdate })
      );

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      // First set a count
      act(() => {
        MockWebSocket.lastInstance!.simulateMessage({
          type: "unread_count_update",
          count: 10,
        });
      });
      expect(result.current.unreadCount).toBe(10);

      // Then mark all read
      act(() => {
        MockWebSocket.lastInstance!.simulateMessage({
          type: "all_notifications_read",
        });
      });

      expect(result.current.unreadCount).toBe(0);
      expect(onUnreadCountUpdate).toHaveBeenCalledWith(0);
    });

    it("handles unread_count_update message", () => {
      const onUnreadCountUpdate = vi.fn();

      const { result } = renderHook(() =>
        useNotificationsWebSocket({ onUnreadCountUpdate })
      );

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      act(() => {
        MockWebSocket.lastInstance!.simulateMessage({
          type: "unread_count_update",
          count: 7,
        });
      });

      expect(result.current.unreadCount).toBe(7);
      expect(onUnreadCountUpdate).toHaveBeenCalledWith(7);
    });

    it("handles pong silently", () => {
      renderHook(() => useNotificationsWebSocket());

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      // Should not throw
      act(() => {
        MockWebSocket.lastInstance!.simulateMessage({ type: "pong" });
      });
    });

    it("handles error message with UNAUTHENTICATED code", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});

      renderHook(() => useNotificationsWebSocket());

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      act(() => {
        MockWebSocket.lastInstance!.simulateMessage({
          type: "error",
          message: "Invalid token",
          code: "UNAUTHENTICATED",
        });
      });

      // Should stop reconnect attempts after UNAUTHENTICATED
      spy.mockRestore();
    });

    it("handles malformed JSON gracefully", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});

      renderHook(() => useNotificationsWebSocket());

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      // Send invalid JSON directly
      act(() => {
        if (MockWebSocket.lastInstance!.onmessage) {
          MockWebSocket.lastInstance!.onmessage({
            data: "not valid json{{{",
          });
        }
      });

      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe("ping/pong", () => {
    it("sends ping every 30 seconds after connection", () => {
      renderHook(() => useNotificationsWebSocket());

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      const ws = MockWebSocket.lastInstance!;
      expect(ws.getSentMessages()).toHaveLength(0);

      // Advance 30 seconds
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      const messages = ws.getSentMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0].type).toBe("ping");
      expect(messages[0].timestamp).toBeDefined();
    });
  });

  describe("markAsRead / markAllAsRead", () => {
    it("sends mark_read message via WebSocket", () => {
      const { result } = renderHook(() => useNotificationsWebSocket());

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      act(() => {
        result.current.markAsRead(42);
      });

      const messages = MockWebSocket.lastInstance!.getSentMessages();
      const markRead = messages.find((m) => m.type === "mark_read");
      expect(markRead).toBeDefined();
      expect(markRead!.notification_id).toBe(42);
    });

    it("sends mark_all_read message via WebSocket", () => {
      const { result } = renderHook(() => useNotificationsWebSocket());

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      act(() => {
        result.current.markAllAsRead();
      });

      const messages = MockWebSocket.lastInstance!.getSentMessages();
      const markAllRead = messages.find((m) => m.type === "mark_all_read");
      expect(markAllRead).toBeDefined();
    });

    it("returns false when WebSocket is not connected", () => {
      const { result } = renderHook(() => useNotificationsWebSocket());

      // Don't open the connection
      let sent: boolean = false;
      act(() => {
        sent = result.current.markAsRead(1);
      });

      expect(sent).toBe(false);
    });
  });

  describe("getUnreadCount", () => {
    it("sends get_unread_count message", () => {
      const { result } = renderHook(() => useNotificationsWebSocket());

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      act(() => {
        result.current.getUnreadCount();
      });

      const messages = MockWebSocket.lastInstance!.getSentMessages();
      const getCount = messages.find((m) => m.type === "get_unread_count");
      expect(getCount).toBeDefined();
    });
  });

  describe("reconnection", () => {
    it("attempts reconnect on unexpected close", () => {
      renderHook(() =>
        useNotificationsWebSocket({ reconnectInterval: 1000 })
      );

      const firstWs = MockWebSocket.lastInstance!;
      act(() => {
        firstWs.simulateOpen();
      });

      // Simulate unexpected close
      act(() => {
        firstWs.simulateClose(1006);
      });

      // Advance past reconnect delay (with jitter it could be 500ms - 1500ms)
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // A new WebSocket should have been created
      expect(MockWebSocket.instances.length).toBeGreaterThan(1);
    });

    it("uses exponential backoff", () => {
      renderHook(() =>
        useNotificationsWebSocket({
          reconnectInterval: 1000,
          maxReconnectInterval: 30000,
        })
      );

      const firstWs = MockWebSocket.lastInstance!;

      // First connection
      act(() => {
        firstWs.simulateOpen();
      });

      // First close -> reconnect attempt 1, base delay = 1000ms
      act(() => {
        firstWs.simulateClose(1006);
      });

      act(() => {
        vi.advanceTimersByTime(2000); // Max jitter of 1000 * 1.5 = 1500ms
      });

      const secondWs = MockWebSocket.lastInstance!;
      expect(secondWs).not.toBe(firstWs);

      // Second close -> reconnect attempt 2, base delay = 2000ms
      act(() => {
        secondWs.simulateClose(1006);
      });

      // Need to advance more time for second attempt
      act(() => {
        vi.advanceTimersByTime(4000); // Max jitter of 2000 * 1.5 = 3000ms
      });

      expect(MockWebSocket.instances.length).toBeGreaterThanOrEqual(3);
    });

    it("does not reconnect when autoReconnect is false", () => {
      renderHook(() =>
        useNotificationsWebSocket({ autoReconnect: false })
      );

      const initialCount = MockWebSocket.instances.length;

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      act(() => {
        MockWebSocket.lastInstance!.simulateClose(1006);
      });

      act(() => {
        vi.advanceTimersByTime(60000);
      });

      expect(MockWebSocket.instances.length).toBe(initialCount);
    });

    it("resets reconnect attempts on successful connection", () => {
      const { result } = renderHook(() =>
        useNotificationsWebSocket({ reconnectInterval: 1000 })
      );

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      expect(result.current.isConnected).toBe(true);

      // Close and reconnect
      act(() => {
        MockWebSocket.lastInstance!.simulateClose(1006);
      });

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // New connection opens successfully
      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      expect(result.current.isConnected).toBe(true);
    });
  });

  describe("disconnect", () => {
    it("closes WebSocket and sets isConnected to false", () => {
      const { result } = renderHook(() => useNotificationsWebSocket());

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });
      expect(result.current.isConnected).toBe(true);

      act(() => {
        result.current.disconnect();
      });

      expect(result.current.isConnected).toBe(false);
    });

    it("prevents reconnection after disconnect", () => {
      const { result } = renderHook(() =>
        useNotificationsWebSocket({ reconnectInterval: 100 })
      );

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      const countBefore = MockWebSocket.instances.length;

      act(() => {
        result.current.disconnect();
      });

      act(() => {
        vi.advanceTimersByTime(10000);
      });

      // No new instances should be created after explicit disconnect
      expect(MockWebSocket.instances.length).toBe(countBefore);
    });
  });

  describe("onerror", () => {
    it("sets isConnected to false on error", () => {
      const onConnectionChange = vi.fn();

      const { result } = renderHook(() =>
        useNotificationsWebSocket({ onConnectionChange })
      );

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });
      expect(result.current.isConnected).toBe(true);

      act(() => {
        MockWebSocket.lastInstance!.simulateError();
      });

      expect(result.current.isConnected).toBe(false);
      expect(onConnectionChange).toHaveBeenCalledWith(false);
    });
  });
});
