/**
 * Tests for useNotifications hooks.
 * Frontend counterpart of backend test_notification_views.py:
 *   - useNotificationsUnreadCount polling hook
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

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

import { useNotificationsUnreadCount } from "@/hooks/useNotifications";
import { notificationsUnreadCountRetrieve } from "@/api/generated/api";

const mockUnreadCount = vi.mocked(notificationsUnreadCountRetrieve);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

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
});
