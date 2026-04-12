/**
 * Tests for useWebPush hook.
 * Tests isSupported check, permission state, and subscribe/unsubscribe.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

// Mock axios
vi.mock("@/api/axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import { useWebPush } from "@/hooks/useWebPush";
import axiosInstance from "@/api/axios";

const mockAxiosGet = vi.mocked(axiosInstance.get);
const mockAxiosPost = vi.mocked(axiosInstance.post);

// Mock service worker and push subscription
const mockPushSubscription = {
  toJSON: () => ({
    endpoint: "https://push.example.com/sub/123",
    keys: { p256dh: "key1", auth: "key2" },
  }),
  unsubscribe: vi.fn().mockResolvedValue(true),
};

const mockPushManager = {
  getSubscription: vi.fn().mockResolvedValue(null),
  subscribe: vi.fn().mockResolvedValue(mockPushSubscription),
};

const mockServiceWorkerRegistration = {
  pushManager: mockPushManager,
};

describe("useWebPush", () => {
  beforeEach(() => {
    vi.clearAllMocks();

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
        register: vi
          .fn()
          .mockResolvedValue(mockServiceWorkerRegistration),
        ready: Promise.resolve(mockServiceWorkerRegistration),
      },
      writable: true,
      configurable: true,
    });

    Object.defineProperty(window, "PushManager", {
      value: class {},
      writable: true,
      configurable: true,
    });

    // Reset mock return values
    mockPushManager.getSubscription.mockResolvedValue(null);
    mockPushManager.subscribe.mockResolvedValue(mockPushSubscription);
  });

  it("detects push notification support", () => {
    const { result } = renderHook(() => useWebPush());

    expect(result.current.isSupported).toBe(true);
  });

  it("detects unsupported when PushManager missing", async () => {
    // Remove PushManager to simulate unsupported browser
    const originalPushManager = window.PushManager;
    // @ts-expect-error - intentionally removing for test
    delete window.PushManager;

    const { result } = renderHook(() => useWebPush());

    // isSupported is set in useEffect, wait for the update
    await waitFor(() => expect(result.current.isSupported).toBe(false));

    // Restore
    Object.defineProperty(window, "PushManager", {
      value: originalPushManager,
      writable: true,
      configurable: true,
    });
  });

  it("returns current permission state", () => {
    const { result } = renderHook(() => useWebPush());

    expect(result.current.permission).toBe("default");
  });

  it("returns granted permission when already granted", () => {
    Object.defineProperty(window, "Notification", {
      value: {
        permission: "granted",
        requestPermission: vi.fn().mockResolvedValue("granted"),
      },
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useWebPush());

    expect(result.current.permission).toBe("granted");
  });

  it("requestPermission calls Notification.requestPermission", async () => {
    const { result } = renderHook(() => useWebPush());

    let permission: NotificationPermission = "default";
    await act(async () => {
      permission = await result.current.requestPermission();
    });

    expect(permission).toBe("granted");
    expect(Notification.requestPermission).toHaveBeenCalled();
  });

  it("requestPermission returns denied when not supported", async () => {
    // Remove PushManager to simulate unsupported browser
    const originalPushManager = window.PushManager;
    // @ts-expect-error - intentionally removing for test
    delete window.PushManager;

    const { result } = renderHook(() => useWebPush());

    // Wait for effect to set isSupported to false
    await waitFor(() => expect(result.current.isSupported).toBe(false));

    let permission: NotificationPermission = "default";
    await act(async () => {
      permission = await result.current.requestPermission();
    });

    expect(permission).toBe("denied");

    // Restore
    Object.defineProperty(window, "PushManager", {
      value: originalPushManager,
      writable: true,
      configurable: true,
    });
  });

  it("detects existing subscription on mount", async () => {
    mockPushManager.getSubscription.mockResolvedValue(mockPushSubscription);

    const { result } = renderHook(() => useWebPush());

    await waitFor(() => expect(result.current.isSubscribed).toBe(true));
  });

  it("subscribe returns false when not supported", async () => {
    const originalPushManager = window.PushManager;
    // @ts-expect-error - intentionally removing for test
    delete window.PushManager;

    const { result } = renderHook(() => useWebPush());

    await waitFor(() => expect(result.current.isSupported).toBe(false));

    let subscribed = false;
    await act(async () => {
      subscribed = await result.current.subscribe();
    });

    expect(subscribed).toBe(false);

    Object.defineProperty(window, "PushManager", {
      value: originalPushManager,
      writable: true,
      configurable: true,
    });
  });

  it("sendTestNotification returns false when not subscribed", async () => {
    const { result } = renderHook(() => useWebPush());

    let sent = false;
    await act(async () => {
      sent = await result.current.sendTestNotification();
    });

    expect(sent).toBe(false);
    expect(result.current.error).not.toBeNull();
  });

  it("unsubscribe returns false when not supported", async () => {
    const originalPushManager = window.PushManager;
    // @ts-expect-error - intentionally removing for test
    delete window.PushManager;

    const { result } = renderHook(() => useWebPush());

    await waitFor(() => expect(result.current.isSupported).toBe(false));

    let unsubscribed = false;
    await act(async () => {
      unsubscribed = await result.current.unsubscribe();
    });

    expect(unsubscribed).toBe(false);

    Object.defineProperty(window, "PushManager", {
      value: originalPushManager,
      writable: true,
      configurable: true,
    });
  });

  it("starts in loading false state", () => {
    const { result } = renderHook(() => useWebPush());

    expect(result.current.isLoading).toBe(false);
  });

  it("error is null initially", () => {
    const { result } = renderHook(() => useWebPush());

    expect(result.current.error).toBeNull();
  });

  it("calls onError callback on service worker registration failure", async () => {
    const onError = vi.fn();
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    Object.defineProperty(navigator, "serviceWorker", {
      value: {
        register: vi.fn().mockRejectedValue(new Error("SW registration failed")),
        ready: Promise.resolve(mockServiceWorkerRegistration),
      },
      writable: true,
      configurable: true,
    });

    renderHook(() => useWebPush({ onError }));

    await waitFor(() => expect(onError).toHaveBeenCalled());

    spy.mockRestore();
  });
});
