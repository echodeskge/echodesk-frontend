/**
 * Tests for useTimeTracking hooks.
 * Tests time logs query and start/stop tracking mutations.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("@/api/axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/api/generated", () => ({
  timeLogsList: vi.fn(),
}));

// Mock ticketKeys from useTickets
vi.mock("@/hooks/api/useTickets", () => ({
  ticketKeys: {
    all: ["tickets"] as const,
    lists: () => ["tickets", "list"] as const,
    list: (filters: Record<string, any>) => ["tickets", "list", filters] as const,
    details: () => ["tickets", "detail"] as const,
    detail: (id: string) => ["tickets", "detail", id] as const,
    history: (id: string) => ["tickets", "detail", id, "history"] as const,
    boards: ["boards"] as const,
    board: (id: string) => ["boards", id] as const,
    kanban: (id: string) => ["boards", "kanban", id] as const,
    columns: ["columns"] as const,
    tags: ["tags"] as const,
  },
}));

import {
  useTimeLogs,
  useCreateTimeLog,
  useUpdateTimeLog,
  useDeleteTimeLog,
} from "@/hooks/api/useTimeTracking";
import axiosInstance from "@/api/axios";

const mockAxiosGet = vi.mocked(axiosInstance.get);
const mockAxiosPost = vi.mocked(axiosInstance.post);
const mockAxiosPatch = vi.mocked(axiosInstance.patch);
const mockAxiosDelete = vi.mocked(axiosInstance.delete);

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

describe("useTimeTracking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("useTimeLogs", () => {
    it("fetches time logs for ticket", async () => {
      mockAxiosGet.mockResolvedValue({
        data: [
          { id: 1, ticket: 5, time_spent: "01:30:00", description: "Work" },
        ],
      });

      const { result } = renderHook(() => useTimeLogs(5), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockAxiosGet).toHaveBeenCalledWith("/api/time-logs/", {
        params: { ticket: 5 },
      });
    });

    it("is disabled when ticketId is undefined", () => {
      const { result } = renderHook(() => useTimeLogs(undefined), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
      expect(mockAxiosGet).not.toHaveBeenCalled();
    });

    it("is disabled when ticketId is 0", () => {
      const { result } = renderHook(() => useTimeLogs(0), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
    });

    it("handles error", async () => {
      mockAxiosGet.mockRejectedValue(new Error("Server error"));

      const { result } = renderHook(() => useTimeLogs(1), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe("useCreateTimeLog", () => {
    it("creates a time log", async () => {
      mockAxiosPost.mockResolvedValue({
        data: { id: 1, ticket: "5", time_spent: "01:00:00" },
      });

      const { result } = renderHook(() => useCreateTimeLog(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          ticket: "5",
          time_spent: "01:00:00",
          description: "Development work",
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockAxiosPost).toHaveBeenCalledWith("/api/ticket-time-logs/", {
        ticket: "5",
        time_spent: "01:00:00",
        description: "Development work",
      });
    });

    it("handles create error", async () => {
      mockAxiosPost.mockRejectedValue(new Error("Validation error"));

      const { result } = renderHook(() => useCreateTimeLog(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          ticket: "5",
          time_spent: "invalid",
        });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe("useUpdateTimeLog", () => {
    it("updates a time log", async () => {
      mockAxiosPatch.mockResolvedValue({
        data: { id: 1, ticket: "5", time_spent: "02:00:00" },
      });

      const { result } = renderHook(() => useUpdateTimeLog(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: "1",
          data: { time_spent: "02:00:00" },
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockAxiosPatch).toHaveBeenCalledWith(
        "/api/ticket-time-logs/1/",
        { time_spent: "02:00:00" }
      );
    });
  });

  describe("useDeleteTimeLog", () => {
    it("deletes a time log", async () => {
      mockAxiosDelete.mockResolvedValue({ data: {} });

      const { result } = renderHook(() => useDeleteTimeLog(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ id: "1", ticketId: "5" });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockAxiosDelete).toHaveBeenCalledWith(
        "/api/ticket-time-logs/1/"
      );
    });

    it("handles delete error", async () => {
      mockAxiosDelete.mockRejectedValue(new Error("Not found"));

      const { result } = renderHook(() => useDeleteTimeLog(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ id: "999", ticketId: "5" });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });
});
