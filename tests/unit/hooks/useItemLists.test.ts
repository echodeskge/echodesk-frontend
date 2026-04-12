/**
 * Tests for useItemLists hooks.
 * Tests public item list queries.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("@/services/itemListService", () => ({
  itemListService: {
    getPublicItemLists: vi.fn(),
    getPublicItemListItems: vi.fn(),
  },
}));

import {
  usePublicItemLists,
  usePublicItemListItems,
} from "@/hooks/useItemLists";
import { itemListService } from "@/services/itemListService";

const mockGetPublicItemLists = vi.mocked(itemListService.getPublicItemLists);
const mockGetPublicItemListItems = vi.mocked(
  itemListService.getPublicItemListItems
);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useItemLists", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("usePublicItemLists", () => {
    it("fetches public item lists", async () => {
      mockGetPublicItemLists.mockResolvedValue([
        { id: 1, title: "Price List" },
        { id: 2, title: "Menu" },
      ] as Awaited<ReturnType<typeof itemListService.getPublicItemLists>>);

      const { result } = renderHook(() => usePublicItemLists(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toHaveLength(2);
    });

    it("handles empty results", async () => {
      mockGetPublicItemLists.mockResolvedValue(
        [] as Awaited<ReturnType<typeof itemListService.getPublicItemLists>>
      );

      const { result } = renderHook(() => usePublicItemLists(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual([]);
    });

    it("handles API error", async () => {
      mockGetPublicItemLists.mockRejectedValue(new Error("Server error"));

      const { result } = renderHook(() => usePublicItemLists(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe("usePublicItemListItems", () => {
    it("fetches items for a list", async () => {
      mockGetPublicItemListItems.mockResolvedValue([
        { id: 1, label: "Item A" },
        { id: 2, label: "Item B" },
      ] as Awaited<ReturnType<typeof itemListService.getPublicItemListItems>>);

      const { result } = renderHook(() => usePublicItemListItems(42), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toHaveLength(2);
      expect(mockGetPublicItemListItems).toHaveBeenCalledWith(42);
    });

    it("is disabled when listId is null", () => {
      const { result } = renderHook(() => usePublicItemListItems(null), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
      expect(mockGetPublicItemListItems).not.toHaveBeenCalled();
    });

    it("handles API error", async () => {
      mockGetPublicItemListItems.mockRejectedValue(new Error("Not found"));

      const { result } = renderHook(() => usePublicItemListItems(999), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });
});
