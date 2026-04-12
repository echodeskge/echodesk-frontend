/**
 * Tests for useTicketColumns hooks.
 * Tests column create, update, delete, and reorder mutations.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("@/api/generated/api", () => ({
  columnsCreate: vi.fn(),
  columnsUpdate: vi.fn(),
  columnsPartialUpdate: vi.fn(),
  columnsDestroy: vi.fn(),
  columnsReorderCreate: vi.fn(),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  useCreateColumn,
  useUpdateColumn,
  useDeleteColumn,
  useReorderColumn,
} from "@/hooks/useTicketColumns";
import {
  columnsCreate,
  columnsPartialUpdate,
  columnsDestroy,
  columnsReorderCreate,
} from "@/api/generated/api";

const mockColumnsCreate = vi.mocked(columnsCreate);
const mockColumnsPartialUpdate = vi.mocked(columnsPartialUpdate);
const mockColumnsDestroy = vi.mocked(columnsDestroy);
const mockColumnsReorderCreate = vi.mocked(columnsReorderCreate);

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

describe("useTicketColumns", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("useCreateColumn", () => {
    it("calls columnsCreate with data", async () => {
      mockColumnsCreate.mockResolvedValue({
        id: 1,
        name: "To Do",
      } as Awaited<ReturnType<typeof columnsCreate>>);

      const { result } = renderHook(() => useCreateColumn(1), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ name: "To Do" } as Parameters<typeof result.current.mutate>[0]);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockColumnsCreate).toHaveBeenCalled();
    });

    it("handles create error", async () => {
      mockColumnsCreate.mockRejectedValue(new Error("Failed"));

      const { result } = renderHook(() => useCreateColumn(1), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ name: "Bad" } as Parameters<typeof result.current.mutate>[0]);
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe("useUpdateColumn", () => {
    it("calls columnsPartialUpdate with id and data", async () => {
      mockColumnsPartialUpdate.mockResolvedValue({
        id: 1,
        name: "Updated",
      } as Awaited<ReturnType<typeof columnsPartialUpdate>>);

      const { result } = renderHook(() => useUpdateColumn(1), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: 1,
          data: { name: "Updated" },
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockColumnsPartialUpdate).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ name: "Updated" })
      );
    });
  });

  describe("useDeleteColumn", () => {
    it("calls columnsDestroy with ID", async () => {
      mockColumnsDestroy.mockResolvedValue(
        undefined as unknown as Awaited<ReturnType<typeof columnsDestroy>>
      );

      const { result } = renderHook(() => useDeleteColumn(1), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(1);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockColumnsDestroy).toHaveBeenCalledWith(1);
    });

    it("handles delete error", async () => {
      mockColumnsDestroy.mockRejectedValue(new Error("Cannot delete"));

      const { result } = renderHook(() => useDeleteColumn(1), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(1);
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe("useReorderColumn", () => {
    it("calls columnsReorderCreate with id and position", async () => {
      mockColumnsReorderCreate.mockResolvedValue(
        {} as Awaited<ReturnType<typeof columnsReorderCreate>>
      );

      const { result } = renderHook(() => useReorderColumn(1), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ id: 1, data: { position: 3 } });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockColumnsReorderCreate).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ position: 3 })
      );
    });
  });

  describe("boardId fallback", () => {
    it("works without boardId (fallback invalidation)", async () => {
      mockColumnsCreate.mockResolvedValue({
        id: 1,
        name: "Test",
      } as Awaited<ReturnType<typeof columnsCreate>>);

      const { result } = renderHook(() => useCreateColumn(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ name: "Test" } as Parameters<typeof result.current.mutate>[0]);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });
});
