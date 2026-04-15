/**
 * Tests for useNotifications hooks.
 * Frontend counterpart of backend test_notification_views.py:
 *   - useNotificationsUnreadCount polling hook
 *   - useNotifications: permission, subscribe/unsubscribe, test notification
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// Mock service worker and push APIs
const mockPushSubscription = {
  toJSON: () => ({
    endpoint: "https://push.example.com/sub/123",
    keys: { p256dh: "key1", auth: "key2" },
  }),
  unsubscribe: vi.fn().mockResolvedValue(true),
  endpoint: "https://push.example.com/sub/123",
};

const mockPushManager = {
  getSubscription: vi.fn().mockResolvedValue(null),
  subscribe: vi.fn().mockResolvedValue(mockPushSubscription),
};

const mockRegistration = {
  pushManager: mockPushManager,
};

vi.mock("@/api/generated/api", () => ({
  notificationsUnreadCountRetrieve: vi.fn(),
  notificationsVapidPublicKeyRetrieve: vi.fn(),
  notificationsTestCreate: vi.fn(),
}));

vi.mock("@/api/axios", () => ({
  default: {
    post: vi.fn(),
  },
}));

import {
  useNotificationsUnreadCount,
  useNotifications,
} from "@/hooks/useNotifications";
import {
  notificationsUnreadCountRetrieve,
  notificationsVapidPublicKeyRetrieve,
  notificationsTestCreate,
} from "@/api/generated/api";
import axios from "@/api/axios";

const mockUnreadCount = vi.mocked(notificationsUnreadCountRetrieve);
const mockVapidKey = vi.mocked(notificationsVapidPublicKeyRetrieve);
const mockTestCreate = vi.mocked(notificationsTestCreate);
const mockAxiosPost = vi.mocked(axios.post);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

// ---------------------------------------------------------------------------
// useNotificationsUnreadCount
// ---------------------------------------------------------------------------

describe("useNotificationsUnreadCount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns unread count from response", async () => {
    mockUnreadCount.mockResolvedValue({ count: 5 } as any);

    const { result } = renderHook(() => useNotificationsUnreadCount(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(5);
  });

  it("returns 0 when count is missing", async () => {
    mockUnreadCount.mockResolvedValue({} as any);

    const { result } = renderHook(() => useNotificationsUnreadCount(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(0);
  });

  it("returns 0 when count is 0", async () => {
    mockUnreadCount.mockResolvedValue({ count: 0 } as any);

    const { result } = renderHook(() => useNotificationsUnreadCount(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(0);
  });

  it("handles API error", async () => {
    mockUnreadCount.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useNotificationsUnreadCount(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it("accepts custom refetchInterval", async () => {
    mockUnreadCount.mockResolvedValue({ count: 3 } as any);

    const { result } = renderHook(
      () => useNotificationsUnreadCount({ refetchInterval: 60000 }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(3);
  });

  it("can disable polling with refetchInterval: false", async () => {
    mockUnreadCount.mockResolvedValue({ count: 1 } as any);

    const { result } = renderHook(
      () => useNotificationsUnreadCount({ refetchInterval: false }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(1);
  });

  it("handles large unread counts", async () => {
    mockUnreadCount.mockResolvedValue({ count: 999 } as any);

    const { result } = renderHook(() => useNotificationsUnreadCount(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(999);
  });
});

// ---------------------------------------------------------------------------
// useNotifications
// ---------------------------------------------------------------------------

describe("useNotifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPushManager.getSubscription.mockResolvedValue(null);

    // Setup browser APIs
    Object.defineProperty(window, "Notification", {
      value: {
        permission: "default",
        requestPermission: vi.fn().mockResolvedValue("granted"),
      },
      writable: true,
      configurable: true,
    });

    Object.defineProperty(navigator, "serviceWorker", {
      value: {
        ready: Promise.resolve(mockRegistration),
        getRegistration: vi.fn().mockResolvedValue(mockRegistration),
        register: vi.fn().mockResolvedValue(mockRegistration),
      },
      writable: true,
      configurable: true,
    });
  });

  describe("initial state", () => {
    it("returns isSupported true when APIs are available", () => {
      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isSupported).toBe(true);
    });

    it("returns default permission", () => {
      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper(),
      });

      expect(result.current.permission).toBe("default");
    });

    it("returns isSubscribed false initially", () => {
      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isSubscribed).toBe(false);
    });

    it("returns isSubscribing false initially", () => {
      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isSubscribing).toBe(false);
    });

    it("returns isUnsubscribing false initially", () => {
      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isUnsubscribing).toBe(false);
    });

    it("returns isSendingTest false initially", () => {
      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isSendingTest).toBe(false);
    });
  });

  describe("permission detection", () => {
    it("detects granted permission from Notification API", () => {
      Object.defineProperty(window, "Notification", {
        value: {
          permission: "granted",
          requestPermission: vi.fn().mockResolvedValue("granted"),
        },
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper(),
      });

      expect(result.current.permission).toBe("granted");
    });

    it("detects denied permission from Notification API", () => {
      Object.defineProperty(window, "Notification", {
        value: {
          permission: "denied",
          requestPermission: vi.fn().mockResolvedValue("denied"),
        },
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper(),
      });

      expect(result.current.permission).toBe("denied");
    });
  });

  describe("requestPermission", () => {
    it("returns false when not supported", async () => {
      const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const origNotification = window.Notification;
      const origSW = navigator.serviceWorker;
      // @ts-expect-error - intentionally removing for test
      delete window.Notification;
      // @ts-expect-error - intentionally removing for test
      delete navigator.serviceWorker;

      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper(),
      });

      let granted = false;
      await act(async () => {
        granted = await result.current.requestPermission();
      });

      expect(granted).toBe(false);

      // Restore
      Object.defineProperty(window, "Notification", {
        value: origNotification,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(navigator, "serviceWorker", {
        value: origSW,
        writable: true,
        configurable: true,
      });
      spy.mockRestore();
    });

    it("returns false when permission denied", async () => {
      (window.Notification.requestPermission as any).mockResolvedValue(
        "denied"
      );

      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper(),
      });

      let granted = false;
      await act(async () => {
        granted = await result.current.requestPermission();
      });

      expect(granted).toBe(false);
    });
  });

  describe("sendTestNotification", () => {
    it("does not send when permission is not granted", async () => {
      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper(),
      });

      // Permission is "default", not "granted"
      await act(async () => {
        await result.current.sendTestNotification();
      });

      expect(mockTestCreate).not.toHaveBeenCalled();
    });
  });
});
