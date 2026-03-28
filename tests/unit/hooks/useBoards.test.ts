/**
 * Tests for useBoards hook.
 * Frontend counterpart of backend test_board_views.py list/permissions.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("@/api/generated/api", () => ({
  boardsList: vi.fn(),
}));

vi.mock("@/services/auth", () => ({
  authService: {
    isAuthenticated: vi.fn(() => true),
  },
}));

import { useBoards } from "@/hooks/useBoards";
import { boardsList } from "@/api/generated/api";
import { authService } from "@/services/auth";

const mockBoardsList = vi.mocked(boardsList);
const mockIsAuthenticated = vi.mocked(authService.isAuthenticated);

const MOCK_BOARD = {
  id: 1,
  name: "Main Board",
  description: "Default board",
  is_default: true,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  created_by: "1",
  columns_count: 3,
  order_users: [],
  board_groups: [],
  board_users: [],
  payment_summary: "",
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useBoards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAuthenticated.mockReturnValue(true);
  });

  it("fetches boards when authenticated", async () => {
    mockBoardsList.mockResolvedValue({
      count: 1,
      results: [MOCK_BOARD],
    } as any);

    const { result } = renderHook(() => useBoards(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockBoardsList).toHaveBeenCalled();
  });

  it("extracts results array from paginated response", async () => {
    mockBoardsList.mockResolvedValue({
      count: 1,
      results: [MOCK_BOARD],
    } as any);

    const { result } = renderHook(() => useBoards(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([MOCK_BOARD]);
  });

  it("does NOT fetch when not authenticated", () => {
    mockIsAuthenticated.mockReturnValue(false);

    const { result } = renderHook(() => useBoards(), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockBoardsList).not.toHaveBeenCalled();
  });

  it("returns empty array when no boards", async () => {
    mockBoardsList.mockResolvedValue({
      count: 0,
      results: [],
    } as any);

    const { result } = renderHook(() => useBoards(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it("handles API error", async () => {
    mockBoardsList.mockRejectedValue(new Error("Server error"));

    const { result } = renderHook(() => useBoards(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
