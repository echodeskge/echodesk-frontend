/**
 * Tests for api/useTickets hooks (src/hooks/api/useTickets.ts).
 * Tests ticket queries, mutations, boards, columns, tags, comments, and moves.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("@/api/generated", () => ({
  ticketsList: vi.fn(),
  ticketsRetrieve: vi.fn(),
  ticketsCreate: vi.fn(),
  ticketsUpdate: vi.fn(),
  ticketsPartialUpdate: vi.fn(),
  ticketsDestroy: vi.fn(),
  boardsList: vi.fn(),
  boardsKanbanBoardRetrieve: vi.fn(),
  columnsList: vi.fn(),
  tagsList: vi.fn(),
}));

vi.mock("@/api/axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

import {
  useTickets,
  useTicket,
  useTicketHistory,
  useBoards,
  useKanbanBoard,
  useColumns,
  useTags,
  useCreateTicket,
  useUpdateTicket,
  useMoveTicket,
  useDeleteTicket,
  useAddComment,
  ticketKeys,
} from "@/hooks/api/useTickets";

import {
  ticketsList,
  ticketsRetrieve,
  ticketsCreate,
  ticketsPartialUpdate,
  ticketsDestroy,
  boardsList,
  boardsKanbanBoardRetrieve,
  columnsList,
  tagsList,
} from "@/api/generated";

import axios from "@/api/axios";

const mockTicketsList = vi.mocked(ticketsList);
const mockTicketsRetrieve = vi.mocked(ticketsRetrieve);
const mockTicketsCreate = vi.mocked(ticketsCreate);
const mockTicketsPartialUpdate = vi.mocked(ticketsPartialUpdate);
const mockTicketsDestroy = vi.mocked(ticketsDestroy);
const mockBoardsList = vi.mocked(boardsList);
const mockKanbanBoard = vi.mocked(boardsKanbanBoardRetrieve);
const mockColumnsList = vi.mocked(columnsList);
const mockTagsList = vi.mocked(tagsList);
const mockAxiosGet = vi.mocked(axios.get);
const mockAxiosPost = vi.mocked(axios.post);
const mockAxiosPatch = vi.mocked(axios.patch);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("api/useTickets hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==================== Query Keys ====================

  describe("ticketKeys", () => {
    it("generates correct key hierarchy", () => {
      expect(ticketKeys.all).toEqual(["tickets"]);
      expect(ticketKeys.lists()).toEqual(["tickets", "list"]);
      expect(ticketKeys.list({ status: "open" })).toEqual([
        "tickets",
        "list",
        { status: "open" },
      ]);
      expect(ticketKeys.details()).toEqual(["tickets", "detail"]);
      expect(ticketKeys.detail("123")).toEqual(["tickets", "detail", "123"]);
      expect(ticketKeys.history("123")).toEqual([
        "tickets",
        "detail",
        "123",
        "history",
      ]);
      expect(ticketKeys.boards).toEqual(["boards"]);
      expect(ticketKeys.board("1")).toEqual(["boards", "1"]);
      expect(ticketKeys.kanban("1")).toEqual(["boards", "kanban", "1"]);
      expect(ticketKeys.columns).toEqual(["columns"]);
      expect(ticketKeys.tags).toEqual(["tags"]);
    });
  });

  // ==================== Queries ====================

  describe("useTickets", () => {
    it("fetches tickets list", async () => {
      mockTicketsList.mockResolvedValue({
        count: 2,
        results: [
          { id: "1", title: "Bug Report" },
          { id: "2", title: "Feature Request" },
        ],
      } as Awaited<ReturnType<typeof ticketsList>>);

      const { result } = renderHook(() => useTickets(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.count).toBe(2);
    });

    it("passes filters to ticketsList", async () => {
      mockTicketsList.mockResolvedValue({
        count: 0,
        results: [],
      } as Awaited<ReturnType<typeof ticketsList>>);

      renderHook(
        () =>
          useTickets({
            search: "bug",
            ordering: "-created_at",
            page: 2,
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(mockTicketsList).toHaveBeenCalled());
    });

    it("handles API error", async () => {
      mockTicketsList.mockRejectedValue(new Error("Server error"));

      const { result } = renderHook(() => useTickets(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe("useTicket", () => {
    it("fetches a single ticket by ID", async () => {
      mockTicketsRetrieve.mockResolvedValue({
        id: "42",
        title: "Fix login bug",
      } as Awaited<ReturnType<typeof ticketsRetrieve>>);

      const { result } = renderHook(() => useTicket("42"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockTicketsRetrieve).toHaveBeenCalledWith("42");
    });

    it("is disabled when id is empty string", () => {
      const { result } = renderHook(() => useTicket(""), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
      expect(mockTicketsRetrieve).not.toHaveBeenCalled();
    });

    it("can be explicitly disabled", () => {
      const { result } = renderHook(() => useTicket("42", false), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
      expect(mockTicketsRetrieve).not.toHaveBeenCalled();
    });
  });

  describe("useTicketHistory", () => {
    it("fetches ticket history via axios", async () => {
      mockAxiosGet.mockResolvedValue({
        data: [
          { id: 1, action: "created", timestamp: "2024-01-01T00:00:00Z" },
          { id: 2, action: "updated", timestamp: "2024-01-02T00:00:00Z" },
        ],
      });

      const { result } = renderHook(() => useTicketHistory("42"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockAxiosGet).toHaveBeenCalledWith("/api/tickets/42/history/");
    });

    it("is disabled when ticketId is empty", () => {
      const { result } = renderHook(() => useTicketHistory(""), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
      expect(mockAxiosGet).not.toHaveBeenCalled();
    });

    it("can be explicitly disabled", () => {
      const { result } = renderHook(() => useTicketHistory("42", false), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
    });
  });

  describe("useBoards", () => {
    it("fetches boards list", async () => {
      mockBoardsList.mockResolvedValue([
        { id: "1", name: "Development Board" },
      ] as Awaited<ReturnType<typeof boardsList>>);

      const { result } = renderHook(() => useBoards(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockBoardsList).toHaveBeenCalled();
    });
  });

  describe("useKanbanBoard", () => {
    it("fetches kanban board by ID", async () => {
      mockKanbanBoard.mockResolvedValue({
        id: "1",
        name: "Dev Board",
        columns: [],
      } as Awaited<ReturnType<typeof boardsKanbanBoardRetrieve>>);

      const { result } = renderHook(() => useKanbanBoard("1"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockKanbanBoard).toHaveBeenCalledWith("1");
    });

    it("is disabled when boardId is empty", () => {
      const { result } = renderHook(() => useKanbanBoard(""), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
      expect(mockKanbanBoard).not.toHaveBeenCalled();
    });

    it("can be explicitly disabled", () => {
      const { result } = renderHook(() => useKanbanBoard("1", false), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
    });
  });

  describe("useColumns", () => {
    it("fetches columns list", async () => {
      mockColumnsList.mockResolvedValue([
        { id: "1", name: "To Do" },
        { id: "2", name: "In Progress" },
        { id: "3", name: "Done" },
      ] as Awaited<ReturnType<typeof columnsList>>);

      const { result } = renderHook(() => useColumns(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockColumnsList).toHaveBeenCalled();
    });
  });

  describe("useTags", () => {
    it("fetches tags list", async () => {
      mockTagsList.mockResolvedValue([
        { id: "1", name: "bug" },
        { id: "2", name: "feature" },
      ] as Awaited<ReturnType<typeof tagsList>>);

      const { result } = renderHook(() => useTags(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockTagsList).toHaveBeenCalled();
    });
  });

  // ==================== Mutations ====================

  describe("useCreateTicket", () => {
    it("creates a ticket via generated function", async () => {
      mockTicketsCreate.mockResolvedValue({
        id: "10",
        title: "New Bug",
      } as Awaited<ReturnType<typeof ticketsCreate>>);

      const { result } = renderHook(() => useCreateTicket(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          title: "New Bug",
        } as Parameters<typeof result.current.mutate>[0]);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockTicketsCreate).toHaveBeenCalled();
    });

    it("handles create error", async () => {
      mockTicketsCreate.mockRejectedValue(new Error("Validation error"));

      const { result } = renderHook(() => useCreateTicket(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          title: "",
        } as Parameters<typeof result.current.mutate>[0]);
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe("useUpdateTicket", () => {
    it("updates a ticket via generated function", async () => {
      mockTicketsPartialUpdate.mockResolvedValue({
        id: "1",
        title: "Updated Title",
      } as Awaited<ReturnType<typeof ticketsPartialUpdate>>);

      const { result } = renderHook(() => useUpdateTicket(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: "1",
          data: { title: "Updated Title" },
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockTicketsPartialUpdate).toHaveBeenCalledWith("1", {
        title: "Updated Title",
      });
    });

    it("handles update error", async () => {
      mockTicketsPartialUpdate.mockRejectedValue(new Error("Not found"));

      const { result } = renderHook(() => useUpdateTicket(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: "999",
          data: { title: "Bad" },
        });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe("useMoveTicket", () => {
    it("moves a ticket to a new column via axios.patch", async () => {
      mockAxiosPatch.mockResolvedValue({
        data: { id: "1", column_id: "3" },
      });

      const { result } = renderHook(() => useMoveTicket(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ id: "1", columnId: "3" });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockAxiosPatch).toHaveBeenCalledWith(
        "/api/tickets/1/move_to_column/",
        { column_id: "3" }
      );
    });

    it("handles move error", async () => {
      mockAxiosPatch.mockRejectedValue(new Error("Invalid column"));

      const { result } = renderHook(() => useMoveTicket(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ id: "1", columnId: "999" });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe("useDeleteTicket", () => {
    it("deletes a ticket via generated function", async () => {
      mockTicketsDestroy.mockResolvedValue(
        undefined as unknown as Awaited<ReturnType<typeof ticketsDestroy>>
      );

      const { result } = renderHook(() => useDeleteTicket(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate("42");
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockTicketsDestroy).toHaveBeenCalledWith("42");
    });

    it("handles delete error", async () => {
      mockTicketsDestroy.mockRejectedValue(new Error("Permission denied"));

      const { result } = renderHook(() => useDeleteTicket(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate("42");
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe("useAddComment", () => {
    it("adds a comment to a ticket via axios", async () => {
      mockAxiosPost.mockResolvedValue({
        data: { id: 1, content: "This is a comment", ticket: "42" },
      });

      const { result } = renderHook(() => useAddComment(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          ticketId: "42",
          content: "This is a comment",
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockAxiosPost).toHaveBeenCalledWith(
        "/api/tickets/42/comments/",
        { content: "This is a comment" }
      );
    });

    it("handles comment error", async () => {
      mockAxiosPost.mockRejectedValue(new Error("Comment too long"));

      const { result } = renderHook(() => useAddComment(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          ticketId: "42",
          content: "x".repeat(10000),
        });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });
});
