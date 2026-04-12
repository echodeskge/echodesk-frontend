/**
 * Tests for useUserProfile hook.
 * Tests fetching user profile when authenticated.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("@/services/auth", () => ({
  authService: {
    getProfile: vi.fn(),
    isAuthenticated: vi.fn(() => true),
  },
}));

import { useUserProfile } from "@/hooks/useUserProfile";
import { authService } from "@/services/auth";

const mockGetProfile = vi.mocked(authService.getProfile);
const mockIsAuthenticated = vi.mocked(authService.isAuthenticated);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useUserProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAuthenticated.mockReturnValue(true);
  });

  it("fetches user profile when authenticated", async () => {
    mockGetProfile.mockResolvedValue({
      id: 1,
      email: "user@test.com",
      first_name: "Test",
      last_name: "User",
    } as Awaited<ReturnType<typeof authService.getProfile>>);

    const { result } = renderHook(() => useUserProfile(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.email).toBe("user@test.com");
    expect(result.current.data?.first_name).toBe("Test");
  });

  it("does NOT fetch when not authenticated", () => {
    mockIsAuthenticated.mockReturnValue(false);

    const { result } = renderHook(() => useUserProfile(), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockGetProfile).not.toHaveBeenCalled();
  });

  it("handles API error", async () => {
    mockGetProfile.mockRejectedValue(new Error("Unauthorized"));

    const { result } = renderHook(() => useUserProfile(), {
      wrapper: createWrapper(),
    });

    // The hook has retry: 1, so wait a bit longer for both retries to fail
    await waitFor(() => expect(result.current.isError).toBe(true), {
      timeout: 5000,
    });
  });

  it("returns loading state initially", () => {
    mockGetProfile.mockReturnValue(new Promise(() => {})); // Never resolves

    const { result } = renderHook(() => useUserProfile(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });
});
