/**
 * Tests for useTicketBoardWebSocket hook.
 * Verifies WebSocket connection, ticket event handling (moved, updated,
 * created, deleted), user presence (joined/left/active_users), and reconnection.
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
      tenant_name: "Test Tenant",
    },
    loading: false,
    error: null,
    refreshTenant: vi.fn(),
  })),
}));

import { useTicketBoardWebSocket } from "@/hooks/useTicketBoardWebSocket";

describe("useTicketBoardWebSocket", () => {
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
    it("connects to WebSocket with board ID and tenant schema", () => {
      renderHook(() =>
        useTicketBoardWebSocket({ boardId: 42 })
      );

      // The hook first sets tenantSchema in a useEffect, then connects
      // We may need to flush effects
      expect(MockWebSocket.lastInstance).not.toBeNull();
      expect(MockWebSocket.lastInstance!.url).toContain(
        "/ws/boards/test_tenant/42/"
      );
      expect(MockWebSocket.lastInstance!.url).toContain("token=test-token");
    });

    it("uses wss protocol for https API URL", () => {
      renderHook(() =>
        useTicketBoardWebSocket({ boardId: 1 })
      );

      expect(MockWebSocket.lastInstance!.url).toMatch(/^wss:\/\//);
    });

    it("does not connect when boardId is 'none'", () => {
      renderHook(() =>
        useTicketBoardWebSocket({ boardId: "none" })
      );

      expect(MockWebSocket.instances.length).toBe(0);
    });

    it("does not connect when no auth token", () => {
      localStorage.removeItem("echodesk_auth_token");
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});

      renderHook(() =>
        useTicketBoardWebSocket({ boardId: 1 })
      );

      // connect() should bail early without token
      expect(MockWebSocket.instances.length).toBe(0);
      spy.mockRestore();
    });

    it("sets isConnected to true on open", () => {
      const { result } = renderHook(() =>
        useTicketBoardWebSocket({ boardId: 1 })
      );

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      expect(result.current.isConnected).toBe(true);
    });

    it("calls onConnectionChange callback on open", () => {
      const onConnectionChange = vi.fn();

      renderHook(() =>
        useTicketBoardWebSocket({ boardId: 1, onConnectionChange })
      );

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      expect(onConnectionChange).toHaveBeenCalledWith(true);
    });
  });

  describe("ticket event handling", () => {
    it("handles ticket_moved event", () => {
      const onTicketMoved = vi.fn();

      renderHook(() =>
        useTicketBoardWebSocket({ boardId: 1, onTicketMoved })
      );

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      const moveData = {
        type: "ticket_moved",
        ticket_id: 10,
        from_column_id: 1,
        to_column_id: 2,
        position: 0,
        updated_by_id: 1,
        updated_by_name: "John",
      };

      act(() => {
        MockWebSocket.lastInstance!.simulateMessage(moveData);
      });

      expect(onTicketMoved).toHaveBeenCalledWith(moveData);
    });

    it("handles ticket_updated event", () => {
      const onTicketUpdated = vi.fn();

      renderHook(() =>
        useTicketBoardWebSocket({ boardId: 1, onTicketUpdated })
      );

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      const updateData = {
        type: "ticket_updated",
        ticket_id: 10,
        changes: { title: "New Title" },
        updated_by_id: 1,
        updated_by_name: "John",
      };

      act(() => {
        MockWebSocket.lastInstance!.simulateMessage(updateData);
      });

      expect(onTicketUpdated).toHaveBeenCalledWith(updateData);
    });

    it("handles ticket_created event", () => {
      const onTicketCreated = vi.fn();

      renderHook(() =>
        useTicketBoardWebSocket({ boardId: 1, onTicketCreated })
      );

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      const ticketData = {
        id: 100,
        title: "New Ticket",
        status: "open",
      };

      act(() => {
        MockWebSocket.lastInstance!.simulateMessage({
          type: "ticket_created",
          ticket: ticketData,
        });
      });

      expect(onTicketCreated).toHaveBeenCalledWith(ticketData);
    });

    it("handles ticket_deleted event", () => {
      const onTicketDeleted = vi.fn();

      renderHook(() =>
        useTicketBoardWebSocket({ boardId: 1, onTicketDeleted })
      );

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      act(() => {
        MockWebSocket.lastInstance!.simulateMessage({
          type: "ticket_deleted",
          ticket_id: 55,
        });
      });

      expect(onTicketDeleted).toHaveBeenCalledWith(55);
    });

    it("handles ticket_being_moved event", () => {
      const onTicketBeingMoved = vi.fn();

      renderHook(() =>
        useTicketBoardWebSocket({ boardId: 1, onTicketBeingMoved })
      );

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      const movingData = {
        type: "ticket_being_moved",
        ticket_id: 10,
        from_column: 1,
        user_id: 2,
        user_name: "Jane",
      };

      act(() => {
        MockWebSocket.lastInstance!.simulateMessage(movingData);
      });

      expect(onTicketBeingMoved).toHaveBeenCalledWith(movingData);
    });

    it("handles ticket_being_edited event", () => {
      const onTicketBeingEdited = vi.fn();

      renderHook(() =>
        useTicketBoardWebSocket({ boardId: 1, onTicketBeingEdited })
      );

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      const editingData = {
        type: "ticket_being_edited",
        ticket_id: 10,
        user_id: 2,
        user_name: "Jane",
      };

      act(() => {
        MockWebSocket.lastInstance!.simulateMessage(editingData);
      });

      expect(onTicketBeingEdited).toHaveBeenCalledWith(editingData);
    });

    it("handles ticket_editing_stopped event", () => {
      const onTicketEditingStopped = vi.fn();

      renderHook(() =>
        useTicketBoardWebSocket({ boardId: 1, onTicketEditingStopped })
      );

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      act(() => {
        MockWebSocket.lastInstance!.simulateMessage({
          type: "ticket_editing_stopped",
          ticket_id: 10,
          user_id: 2,
        });
      });

      expect(onTicketEditingStopped).toHaveBeenCalledWith(10, 2);
    });
  });

  describe("user presence", () => {
    it("handles connection message with active_users", () => {
      const { result } = renderHook(() =>
        useTicketBoardWebSocket({ boardId: 1 })
      );

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      act(() => {
        MockWebSocket.lastInstance!.simulateMessage({
          type: "connection",
          active_users: [
            { user_id: 1, user_name: "Alice", user_email: "alice@test.com" },
            { user_id: 2, user_name: "Bob", user_email: "bob@test.com" },
          ],
        });
      });

      expect(result.current.activeUsers).toHaveLength(2);
      expect(result.current.activeUsersCount).toBe(2);
    });

    it("handles user_joined event", () => {
      const onUserJoined = vi.fn();

      const { result } = renderHook(() =>
        useTicketBoardWebSocket({ boardId: 1, onUserJoined })
      );

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      // Start with empty active users
      act(() => {
        MockWebSocket.lastInstance!.simulateMessage({
          type: "connection",
          active_users: [],
        });
      });

      expect(result.current.activeUsers).toHaveLength(0);

      act(() => {
        MockWebSocket.lastInstance!.simulateMessage({
          type: "user_joined",
          user_id: 5,
          user_name: "Charlie",
          user_email: "charlie@test.com",
        });
      });

      expect(result.current.activeUsers).toHaveLength(1);
      expect(result.current.activeUsers[0].user_name).toBe("Charlie");
      expect(onUserJoined).toHaveBeenCalled();
    });

    it("handles user_left event", () => {
      const onUserLeft = vi.fn();

      const { result } = renderHook(() =>
        useTicketBoardWebSocket({ boardId: 1, onUserLeft })
      );

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      // Set initial users
      act(() => {
        MockWebSocket.lastInstance!.simulateMessage({
          type: "connection",
          active_users: [
            { user_id: 1, user_name: "Alice", user_email: "alice@test.com" },
            { user_id: 2, user_name: "Bob", user_email: "bob@test.com" },
          ],
        });
      });

      expect(result.current.activeUsers).toHaveLength(2);

      act(() => {
        MockWebSocket.lastInstance!.simulateMessage({
          type: "user_left",
          user_id: 1,
          user_name: "Alice",
        });
      });

      expect(result.current.activeUsers).toHaveLength(1);
      expect(result.current.activeUsers[0].user_name).toBe("Bob");
      expect(onUserLeft).toHaveBeenCalledWith(1, "Alice");
    });

    it("handles active_users bulk update", () => {
      const { result } = renderHook(() =>
        useTicketBoardWebSocket({ boardId: 1 })
      );

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      act(() => {
        MockWebSocket.lastInstance!.simulateMessage({
          type: "active_users",
          users: [
            { user_id: 10, user_name: "Dave", user_email: "dave@test.com" },
          ],
        });
      });

      expect(result.current.activeUsers).toHaveLength(1);
      expect(result.current.activeUsersCount).toBe(1);
    });
  });

  describe("send functions", () => {
    it("notifyTicketMoving sends correct message", () => {
      const { result } = renderHook(() =>
        useTicketBoardWebSocket({ boardId: 1 })
      );

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      act(() => {
        result.current.notifyTicketMoving(10, 1);
      });

      const messages = MockWebSocket.lastInstance!.getSentMessages();
      const moveMsg = messages.find((m) => m.type === "ticket_moving");
      expect(moveMsg).toBeDefined();
      expect(moveMsg!.ticket_id).toBe(10);
      expect(moveMsg!.from_column).toBe(1);
    });

    it("notifyTicketEditing sends correct message", () => {
      const { result } = renderHook(() =>
        useTicketBoardWebSocket({ boardId: 1 })
      );

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      act(() => {
        result.current.notifyTicketEditing(15);
      });

      const messages = MockWebSocket.lastInstance!.getSentMessages();
      const editMsg = messages.find((m) => m.type === "ticket_editing");
      expect(editMsg).toBeDefined();
      expect(editMsg!.ticket_id).toBe(15);
    });

    it("notifyTicketEditingStopped sends correct message", () => {
      const { result } = renderHook(() =>
        useTicketBoardWebSocket({ boardId: 1 })
      );

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      act(() => {
        result.current.notifyTicketEditingStopped(15);
      });

      const messages = MockWebSocket.lastInstance!.getSentMessages();
      const stopMsg = messages.find(
        (m) => m.type === "ticket_editing_stopped"
      );
      expect(stopMsg).toBeDefined();
      expect(stopMsg!.ticket_id).toBe(15);
    });

    it("requestActiveUsers sends correct message", () => {
      const { result } = renderHook(() =>
        useTicketBoardWebSocket({ boardId: 1 })
      );

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      act(() => {
        result.current.requestActiveUsers();
      });

      const messages = MockWebSocket.lastInstance!.getSentMessages();
      const activeMsg = messages.find(
        (m) => m.type === "get_active_users"
      );
      expect(activeMsg).toBeDefined();
    });
  });

  describe("ping/pong", () => {
    it("sends ping every 30 seconds", () => {
      renderHook(() =>
        useTicketBoardWebSocket({ boardId: 1 })
      );

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      const ws = MockWebSocket.lastInstance!;

      act(() => {
        vi.advanceTimersByTime(30000);
      });

      const messages = ws.getSentMessages();
      const pingMessages = messages.filter((m) => m.type === "ping");
      expect(pingMessages).toHaveLength(1);
      expect(pingMessages[0].timestamp).toBeDefined();
    });

    it("handles pong silently", () => {
      renderHook(() =>
        useTicketBoardWebSocket({ boardId: 1 })
      );

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      // Should not throw
      act(() => {
        MockWebSocket.lastInstance!.simulateMessage({ type: "pong" });
      });
    });
  });

  describe("reconnection", () => {
    it("reconnects on abnormal close (code !== 1000)", () => {
      renderHook(() =>
        useTicketBoardWebSocket({
          boardId: 1,
          reconnectInterval: 1000,
        })
      );

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      const initialCount = MockWebSocket.instances.length;

      act(() => {
        MockWebSocket.lastInstance!.simulateClose(1006);
      });

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(MockWebSocket.instances.length).toBeGreaterThan(initialCount);
    });

    it("does NOT reconnect on normal close (code 1000)", () => {
      renderHook(() =>
        useTicketBoardWebSocket({
          boardId: 1,
          reconnectInterval: 100,
        })
      );

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      const initialCount = MockWebSocket.instances.length;

      // Normal close with code 1000
      act(() => {
        MockWebSocket.lastInstance!.simulateClose(1000);
      });

      act(() => {
        vi.advanceTimersByTime(10000);
      });

      expect(MockWebSocket.instances.length).toBe(initialCount);
    });

    it("does not reconnect when autoReconnect is false", () => {
      renderHook(() =>
        useTicketBoardWebSocket({
          boardId: 1,
          autoReconnect: false,
        })
      );

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      const initialCount = MockWebSocket.instances.length;

      act(() => {
        MockWebSocket.lastInstance!.simulateClose(1006);
      });

      act(() => {
        vi.advanceTimersByTime(60000);
      });

      expect(MockWebSocket.instances.length).toBe(initialCount);
    });

    it("tracks reconnect attempts", () => {
      const { result } = renderHook(() =>
        useTicketBoardWebSocket({
          boardId: 1,
          reconnectInterval: 500,
          maxReconnectInterval: 30000,
        })
      );

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      expect(result.current.reconnectAttempts).toBe(0);

      // First abnormal close
      act(() => {
        MockWebSocket.lastInstance!.simulateClose(1006);
      });

      // The state update happens via setReconnectAttempts
      expect(result.current.reconnectAttempts).toBe(1);
    });

    it("resets reconnect attempts on successful reconnection", () => {
      const { result } = renderHook(() =>
        useTicketBoardWebSocket({
          boardId: 1,
          reconnectInterval: 500,
        })
      );

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      act(() => {
        MockWebSocket.lastInstance!.simulateClose(1006);
      });

      expect(result.current.reconnectAttempts).toBe(1);

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // New WS opens
      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      expect(result.current.reconnectAttempts).toBe(0);
    });
  });

  describe("disconnect", () => {
    it("closes connection and clears active users", () => {
      const { result } = renderHook(() =>
        useTicketBoardWebSocket({ boardId: 1 })
      );

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      act(() => {
        MockWebSocket.lastInstance!.simulateMessage({
          type: "connection",
          active_users: [
            { user_id: 1, user_name: "Alice", user_email: "a@test.com" },
          ],
        });
      });

      expect(result.current.activeUsers).toHaveLength(1);

      act(() => {
        result.current.disconnect();
      });

      expect(result.current.isConnected).toBe(false);
      expect(result.current.activeUsers).toHaveLength(0);
    });
  });

  describe("error handling", () => {
    it("handles error message from server", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});

      renderHook(() =>
        useTicketBoardWebSocket({ boardId: 1 })
      );

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      act(() => {
        MockWebSocket.lastInstance!.simulateMessage({
          type: "error",
          message: "Board not found",
        });
      });

      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it("handles malformed JSON gracefully", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});

      renderHook(() =>
        useTicketBoardWebSocket({ boardId: 1 })
      );

      act(() => {
        MockWebSocket.lastInstance!.simulateOpen();
      });

      act(() => {
        if (MockWebSocket.lastInstance!.onmessage) {
          MockWebSocket.lastInstance!.onmessage({ data: "invalid{json" });
        }
      });

      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });
});
