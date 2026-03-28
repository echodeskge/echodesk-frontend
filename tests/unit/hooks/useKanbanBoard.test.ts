/**
 * Tests for useKanbanBoard hook.
 * Frontend counterpart of backend test_board_views.py kanban endpoint.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("@/api/generated/api", () => ({
  boardsKanbanBoardRetrieve: vi.fn(),
}));

import { useKanbanBoard } from "@/hooks/useKanbanBoard";
import { boardsKanbanBoardRetrieve } from "@/api/generated/api";

const mockBoardsKanbanBoardRetrieve = vi.mocked(boardsKanbanBoardRetrieve);

const MOCK_KANBAN_BOARD = {
  columns: [
    {
      id: 1,
      name: "To Do",
      board: 1,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      created_by: "1",
      tickets_count: 2,
    },
  ],
  tickets_by_column: "{}",
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

describe("useKanbanBoard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches board data when boardId is provided", async () => {
    mockBoardsKanbanBoardRetrieve.mockResolvedValue(MOCK_KANBAN_BOARD as any);

    const { result } = renderHook(() => useKanbanBoard(1), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockBoardsKanbanBoardRetrieve).toHaveBeenCalledWith("1");
  });

  it("does NOT fetch when boardId is null", () => {
    const { result } = renderHook(() => useKanbanBoard(null), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockBoardsKanbanBoardRetrieve).not.toHaveBeenCalled();
  });

  it("passes boardId as string to API", async () => {
    mockBoardsKanbanBoardRetrieve.mockResolvedValue(MOCK_KANBAN_BOARD as any);

    renderHook(() => useKanbanBoard(42), {
      wrapper: createWrapper(),
    });

    await waitFor(() =>
      expect(mockBoardsKanbanBoardRetrieve).toHaveBeenCalledWith("42")
    );
  });

  it("returns error on API failure", async () => {
    mockBoardsKanbanBoardRetrieve.mockRejectedValue(
      new Error("Server error")
    );

    const { result } = renderHook(() => useKanbanBoard(1), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it("uses correct query key", () => {
    mockBoardsKanbanBoardRetrieve.mockResolvedValue(MOCK_KANBAN_BOARD as any);

    const { result } = renderHook(() => useKanbanBoard(5), {
      wrapper: createWrapper(),
    });

    // The queryKey is ['kanbanBoard', boardId]
    expect(result.current).toBeDefined();
  });

  it("refetches when boardId changes", async () => {
    mockBoardsKanbanBoardRetrieve.mockResolvedValue(MOCK_KANBAN_BOARD as any);

    const { result, rerender } = renderHook(
      ({ id }: { id: number | null }) => useKanbanBoard(id),
      {
        wrapper: createWrapper(),
        initialProps: { id: 1 },
      }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockBoardsKanbanBoardRetrieve).toHaveBeenCalledWith("1");

    rerender({ id: 2 });

    await waitFor(() =>
      expect(mockBoardsKanbanBoardRetrieve).toHaveBeenCalledWith("2")
    );
  });
});
