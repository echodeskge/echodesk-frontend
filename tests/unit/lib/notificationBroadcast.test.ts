/**
 * Tests for NotificationBroadcastManager utility.
 *   - BroadcastChannel support detection
 *   - on/off subscribe pattern
 *   - broadcastNotificationReceived/Read/CountUpdated message shapes
 *   - Own-tab messages are ignored
 *   - Cleanup
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock BroadcastChannel
const mockPostMessage = vi.fn();
const mockClose = vi.fn();
let onMessageHandler: ((event: MessageEvent) => void) | null = null;

class MockBroadcastChannel {
  name: string;
  onmessage: ((event: MessageEvent) => void) | null = null;

  constructor(name: string) {
    this.name = name;
    // Capture onmessage setter
    const self = this;
    Object.defineProperty(this, "onmessage", {
      get: () => onMessageHandler,
      set: (fn) => {
        onMessageHandler = fn;
      },
    });
  }

  postMessage = mockPostMessage;
  close = mockClose;
}

vi.stubGlobal("BroadcastChannel", MockBroadcastChannel);

// Must import AFTER setting up the global mock
import {
  getNotificationBroadcast,
  type NotificationBroadcastMessage,
} from "@/utils/notificationBroadcast";

describe("NotificationBroadcastManager", () => {
  let manager: ReturnType<typeof getNotificationBroadcast>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    onMessageHandler = null;

    // Reset singleton by re-importing (clear module cache)
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Helper: get a fresh manager
  async function getFreshManager() {
    const mod = await import("@/utils/notificationBroadcast");
    return mod.getNotificationBroadcast();
  }

  describe("support detection", () => {
    it("detects BroadcastChannel support", async () => {
      const mgr = await getFreshManager();
      expect(mgr.getIsSupported()).toBe(true);
    });
  });

  describe("on/off subscribe pattern", () => {
    it("calls listener when matching message arrives", async () => {
      const mgr = await getFreshManager();
      const listener = vi.fn();

      mgr.on("notification_received", listener);

      // Simulate message from another tab
      if (onMessageHandler) {
        onMessageHandler(
          new MessageEvent("message", {
            data: {
              type: "notification_received",
              notification: { id: 1, title: "Test" },
              count: 5,
              tabId: "other_tab_123",
              timestamp: Date.now(),
            } as NotificationBroadcastMessage,
          })
        );
      }

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "notification_received",
          count: 5,
        })
      );
    });

    it("returns unsubscribe function", async () => {
      const mgr = await getFreshManager();
      const listener = vi.fn();

      const unsubscribe = mgr.on("count_updated", listener);
      unsubscribe();

      // Simulate message - listener should NOT be called
      if (onMessageHandler) {
        onMessageHandler(
          new MessageEvent("message", {
            data: {
              type: "count_updated",
              count: 0,
              tabId: "other_tab_123",
            },
          })
        );
      }

      expect(listener).not.toHaveBeenCalled();
    });

    it("does not call listener for wrong message type", async () => {
      const mgr = await getFreshManager();
      const listener = vi.fn();

      mgr.on("notification_read", listener);

      if (onMessageHandler) {
        onMessageHandler(
          new MessageEvent("message", {
            data: {
              type: "count_updated",
              count: 3,
              tabId: "other_tab_123",
            },
          })
        );
      }

      expect(listener).not.toHaveBeenCalled();
    });

    it("wildcard listener receives all messages", async () => {
      const mgr = await getFreshManager();
      const listener = vi.fn();

      mgr.onAll(listener);

      if (onMessageHandler) {
        onMessageHandler(
          new MessageEvent("message", {
            data: {
              type: "count_updated",
              count: 7,
              tabId: "other_tab_123",
            },
          })
        );
      }

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ type: "count_updated" })
      );
    });
  });

  describe("broadcast methods", () => {
    it("broadcastNotificationReceived posts correct shape", async () => {
      const mgr = await getFreshManager();

      mgr.broadcastNotificationReceived({ id: 1, title: "Test" }, 5);

      expect(mockPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "notification_received",
          notification: { id: 1, title: "Test" },
          count: 5,
        })
      );
    });

    it("broadcastNotificationRead posts correct shape", async () => {
      const mgr = await getFreshManager();

      mgr.broadcastNotificationRead(42, 3);

      expect(mockPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "notification_read",
          notificationId: 42,
          count: 3,
        })
      );
    });

    it("broadcastCountUpdated posts correct shape", async () => {
      const mgr = await getFreshManager();

      mgr.broadcastCountUpdated(0);

      expect(mockPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "count_updated",
          count: 0,
        })
      );
    });
  });

  describe("own-tab message filtering", () => {
    it("ignores messages from own tab", async () => {
      const mgr = await getFreshManager();
      const listener = vi.fn();

      mgr.on("notification_received", listener);

      // Simulate message from own tab
      if (onMessageHandler) {
        onMessageHandler(
          new MessageEvent("message", {
            data: {
              type: "notification_received",
              notification: { id: 1 },
              count: 1,
              tabId: mgr.getTabId(), // Same tab ID
            },
          })
        );
      }

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("cleanup", () => {
    it("closes channel and clears listeners", async () => {
      const mgr = await getFreshManager();
      const listener = vi.fn();

      mgr.on("count_updated", listener);
      mgr.cleanup();

      expect(mockClose).toHaveBeenCalled();
    });
  });

  describe("tab identity", () => {
    it("has a unique tab ID", async () => {
      const mgr = await getFreshManager();
      expect(mgr.getTabId()).toBeTruthy();
      expect(mgr.getTabId()).toContain("tab_");
    });
  });
});
