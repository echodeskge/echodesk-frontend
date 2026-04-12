/**
 * Tests for useTickets hooks (src/hooks/useTickets.ts).
 * Tests update, delete, and move ticket mutations.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("@/api/generated/api", () => ({
  ticketsDestroy: vi.fn(),
  ticketsPartialUpdate: vi.fn(),
  moveTicketToColumn: vi.fn(),
}));

vi.mock("@/api/axios", () => ({
  default: {
    patch: vi.fn(),
  },
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  useUpdateTicket,
  useDeleteTicket,
  useMoveTicketToColumn,
} from "@/hooks/useTickets";
import { ticketsPartialUpdate, ticketsDestroy } from "@/api/generated/api";
import axiosInstance from "@/api/axios";

const mockTicketsPartialUpdate = vi.mocked(ticketsPartialUpdate);
const mockTicketsDestroy = vi.mocked(ticketsDestroy);
const mockAxiosPatch = vi.mocked(axiosInstance.patch);

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

describe("useTickets (src/hooks/useTickets.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("useUpdateTicket", () => {
    it("calls ticketsPartialUpdate with string id and data", async () => {
      mockTicketsPartialUpdate.mockResolvedValue({
        id: "1",
        title: "Updated",
      } as Awaited<ReturnType<typeof ticketsPartialUpdate>>);

      const { result } = renderHook(() => useUpdateTicket(1), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: 1,
          data: { title: "Updated" },
        } as Parameters<typeof result.current.mutate>[0]);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockTicketsPartialUpdate).toHaveBeenCalledWith("1", {
        title: "Updated",
      });
    });

    it("handles update error", async () => {
      mockTicketsPartialUpdate.mockRejectedValue(new Error("Failed"));

      const { result } = renderHook(() => useUpdateTicket(1), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: 1,
          data: { title: "Bad" },
        } as Parameters<typeof result.current.mutate>[0]);
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("works without boardId", async () => {
      mockTicketsPartialUpdate.mockResolvedValue({
        id: "1",
      } as Awaited<ReturnType<typeof ticketsPartialUpdate>>);

      const { result } = renderHook(() => useUpdateTicket(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: 1,
          data: { title: "Test" },
        } as Parameters<typeof result.current.mutate>[0]);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  describe("useDeleteTicket", () => {
    it("calls ticketsDestroy with string id", async () => {
      mockTicketsDestroy.mockResolvedValue(
        undefined as unknown as Awaited<ReturnType<typeof ticketsDestroy>>
      );

      const { result } = renderHook(() => useDeleteTicket(1), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(42);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockTicketsDestroy).toHaveBeenCalledWith("42");
    });

    it("handles delete error", async () => {
      mockTicketsDestroy.mockRejectedValue(new Error("Not found"));

      const { result } = renderHook(() => useDeleteTicket(1), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(999);
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe("useMoveTicketToColumn", () => {
    it("calls axios.patch with correct URL and data", async () => {
      mockAxiosPatch.mockResolvedValue({ data: { id: 1, column_id: 2 } });

      const { result } = renderHook(() => useMoveTicketToColumn(1), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: 1,
          data: { column_id: 2, position_in_column: 0 },
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockAxiosPatch).toHaveBeenCalledWith("/api/tickets/1/move_to_column/", {
        column_id: 2,
        position_in_column: 0,
      });
    });

    it("handles move error", async () => {
      mockAxiosPatch.mockRejectedValue(new Error("Invalid column"));

      const { result } = renderHook(() => useMoveTicketToColumn(1), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: 1,
          data: { column_id: 999, position_in_column: 0 },
        });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });
});
