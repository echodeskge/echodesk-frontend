/**
 * Tests for useBrowserNotifications hook.
 *
 * Covers:
 * - Browser notification support detection
 * - Permission state tracking
 * - requestPermission() flow
 * - showNotification() with callbacks and auto-close
 * - Unsupported browser handling
 * - canShowNotifications derived state
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

// Must set up browser API mocks before importing the hook
let mockNotificationInstance: any = null;

class MockBrowserNotification {
  title: string;
  options: NotificationOptions;
  onclick: (() => void) | null = null;
  close = vi.fn();

  constructor(title: string, options?: NotificationOptions) {
    this.title = title;
    this.options = options || {};
    mockNotificationInstance = this;
  }

  static permission: NotificationPermission = "default";
  static requestPermission = vi.fn<() => Promise<NotificationPermission>>();
}

import { useBrowserNotifications } from "@/hooks/useBrowserNotifications";

describe("useBrowserNotifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockNotificationInstance = null;

    MockBrowserNotification.permission = "default";
    MockBrowserNotification.requestPermission.mockResolvedValue("granted");

    Object.defineProperty(window, "Notification", {
      value: MockBrowserNotification,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // -- Support detection --

  describe("support detection", () => {
    it("detects notification support in browser", () => {
      const { result } = renderHook(() => useBrowserNotifications());

      expect(result.current.isSupported).toBe(true);
    });

    it("detects unsupported when Notification is missing", () => {
      // Temporarily remove Notification
      const original = window.Notification;
      // @ts-expect-error - intentionally removing for test
      delete window.Notification;

      const { result } = renderHook(() => useBrowserNotifications());

      expect(result.current.isSupported).toBe(false);

      // Restore
      Object.defineProperty(window, "Notification", {
        value: original,
        writable: true,
        configurable: true,
      });
    });
  });

  // -- Permission state --

  describe("permission state", () => {
    it("returns current permission from Notification API", () => {
      MockBrowserNotification.permission = "granted";

      const { result } = renderHook(() => useBrowserNotifications());

      expect(result.current.permission).toBe("granted");
    });

    it("returns 'default' when permission not yet requested", () => {
      MockBrowserNotification.permission = "default";

      const { result } = renderHook(() => useBrowserNotifications());

      expect(result.current.permission).toBe("default");
    });

    it("returns 'denied' when permission was denied", () => {
      MockBrowserNotification.permission = "denied";

      const { result } = renderHook(() => useBrowserNotifications());

      expect(result.current.permission).toBe("denied");
    });
  });

  // -- canShowNotifications --

  describe("canShowNotifications", () => {
    it("is true when supported and granted", () => {
      MockBrowserNotification.permission = "granted";

      const { result } = renderHook(() => useBrowserNotifications());

      expect(result.current.canShowNotifications).toBe(true);
    });

    it("is false when supported but not granted", () => {
      MockBrowserNotification.permission = "default";

      const { result } = renderHook(() => useBrowserNotifications());

      expect(result.current.canShowNotifications).toBe(false);
    });

    it("is false when not supported", () => {
      const original = window.Notification;
      // @ts-expect-error - intentionally removing for test
      delete window.Notification;

      const { result } = renderHook(() => useBrowserNotifications());

      expect(result.current.canShowNotifications).toBe(false);

      Object.defineProperty(window, "Notification", {
        value: original,
        writable: true,
        configurable: true,
      });
    });
  });

  // -- requestPermission --

  describe("requestPermission", () => {
    it("requests permission and returns true when granted", async () => {
      MockBrowserNotification.requestPermission.mockResolvedValue("granted");

      const { result } = renderHook(() => useBrowserNotifications());

      let granted = false;
      await act(async () => {
        granted = await result.current.requestPermission();
      });

      expect(granted).toBe(true);
      expect(result.current.permission).toBe("granted");
    });

    it("returns false when permission is denied", async () => {
      MockBrowserNotification.requestPermission.mockResolvedValue("denied");

      const { result } = renderHook(() => useBrowserNotifications());

      let granted = false;
      await act(async () => {
        granted = await result.current.requestPermission();
      });

      expect(granted).toBe(false);
      expect(result.current.permission).toBe("denied");
    });

    it("returns false when not supported", async () => {
      const original = window.Notification;
      // @ts-expect-error - intentionally removing for test
      delete window.Notification;

      const { result } = renderHook(() => useBrowserNotifications());

      let granted = false;
      await act(async () => {
        granted = await result.current.requestPermission();
      });

      expect(granted).toBe(false);

      Object.defineProperty(window, "Notification", {
        value: original,
        writable: true,
        configurable: true,
      });
    });

    it("returns false when requestPermission throws", async () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      MockBrowserNotification.requestPermission.mockRejectedValue(
        new Error("User dismissed")
      );

      const { result } = renderHook(() => useBrowserNotifications());

      let granted = false;
      await act(async () => {
        granted = await result.current.requestPermission();
      });

      expect(granted).toBe(false);
      spy.mockRestore();
    });
  });

  // -- showNotification --

  describe("showNotification", () => {
    it("creates a browser notification when permission granted", () => {
      MockBrowserNotification.permission = "granted";

      const { result } = renderHook(() => useBrowserNotifications());

      const notification = {
        id: 1,
        title: "Test Title",
        message: "Test Message",
      } as any;

      act(() => {
        result.current.showNotification(notification);
      });

      expect(mockNotificationInstance).not.toBeNull();
      expect(mockNotificationInstance.title).toBe("Test Title");
    });

    it("does not create notification when permission is not granted", () => {
      MockBrowserNotification.permission = "default";

      const { result } = renderHook(() => useBrowserNotifications());

      const notification = {
        id: 1,
        title: "Test",
        message: "Message",
      } as any;

      act(() => {
        result.current.showNotification(notification);
      });

      expect(mockNotificationInstance).toBeNull();
    });

    it("calls onClick callback when notification is clicked", () => {
      MockBrowserNotification.permission = "granted";

      const focusSpy = vi.spyOn(window, "focus").mockImplementation(() => {});
      const { result } = renderHook(() => useBrowserNotifications());

      const onClick = vi.fn();
      const notification = {
        id: 1,
        title: "Test",
        message: "Message",
      } as any;

      act(() => {
        result.current.showNotification(notification, onClick);
      });

      // Simulate click
      act(() => {
        mockNotificationInstance.onclick();
      });

      expect(onClick).toHaveBeenCalled();
      expect(focusSpy).toHaveBeenCalled();
      expect(mockNotificationInstance.close).toHaveBeenCalled();

      focusSpy.mockRestore();
    });

    it("auto-closes notification after 5 seconds", () => {
      MockBrowserNotification.permission = "granted";

      const { result } = renderHook(() => useBrowserNotifications());

      const notification = {
        id: 42,
        title: "Auto Close",
        message: "Closes soon",
      } as any;

      act(() => {
        result.current.showNotification(notification);
      });

      expect(mockNotificationInstance.close).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(mockNotificationInstance.close).toHaveBeenCalled();
    });

    it("does not create notification when not supported", () => {
      const original = window.Notification;
      // @ts-expect-error - intentionally removing for test
      delete window.Notification;

      const { result } = renderHook(() => useBrowserNotifications());

      const notification = {
        id: 1,
        title: "Test",
        message: "Message",
      } as any;

      act(() => {
        result.current.showNotification(notification);
      });

      expect(mockNotificationInstance).toBeNull();

      Object.defineProperty(window, "Notification", {
        value: original,
        writable: true,
        configurable: true,
      });
    });
  });
});
