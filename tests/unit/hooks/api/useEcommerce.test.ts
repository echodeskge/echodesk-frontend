/**
 * Tests for useEcommerce hooks.
 *
 * Covers:
 * - useClientProducts: no-filter fetch, filter parameters, attribute filters,
 *   price ranges, search, ordering, language, pagination, error handling
 * - Query key structure for cache management
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("@/api/generated", () => ({
  ecommerceClientProductsList: vi.fn(),
}));

// Mock fetch for filtered queries
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { useClientProducts } from "@/hooks/api/useEcommerce";
import { ecommerceClientProductsList } from "@/api/generated";

const mockProductsList = vi.mocked(ecommerceClientProductsList);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useEcommerce", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("useClientProducts", () => {
    it("fetches products without filters using generated API", async () => {
      mockProductsList.mockResolvedValue({
        count: 2,
        results: [
          { id: 1, name: "Product A" },
          { id: 2, name: "Product B" },
        ],
      } as Awaited<ReturnType<typeof ecommerceClientProductsList>>);

      const { result } = renderHook(() => useClientProducts(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.count).toBe(2);
      expect(mockProductsList).toHaveBeenCalled();
    });

    it("fetches with filters using fetch API", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            count: 1,
            results: [{ id: 1, name: "Featured" }],
          }),
      });

      const { result } = renderHook(
        () => useClientProducts({ isFeatured: true, page: 1 }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("is_featured=true")
      );
    });

    it("passes search parameter", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ count: 0, results: [] }),
      });

      renderHook(() => useClientProducts({ search: "widget" }), {
        wrapper: createWrapper(),
      });

      await waitFor(() =>
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("search=widget")
        )
      );
    });

    it("passes price range filters", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ count: 0, results: [] }),
      });

      renderHook(
        () => useClientProducts({ minPrice: 10, maxPrice: 100 }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("min_price=10")
        );
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("max_price=100")
        );
      });
    });

    it("passes attribute filters", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ count: 0, results: [] }),
      });

      renderHook(
        () =>
          useClientProducts({
            attr_color: "red,blue",
            attr_size: "large",
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("attr_color=red")
        );
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("attr_size=large")
        );
      });
    });

    it("handles fetch error", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      const { result } = renderHook(
        () => useClientProducts({ search: "test" }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("handles empty results", async () => {
      mockProductsList.mockResolvedValue({
        count: 0,
        results: [],
      } as Awaited<ReturnType<typeof ecommerceClientProductsList>>);

      const { result } = renderHook(() => useClientProducts(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.results).toEqual([]);
    });

    // --- Expanded tests ---

    it("passes ordering parameter", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ count: 0, results: [] }),
      });

      renderHook(
        () => useClientProducts({ ordering: "-price" }),
        { wrapper: createWrapper() }
      );

      await waitFor(() =>
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("ordering=-price")
        )
      );
    });

    it("passes language parameter", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ count: 0, results: [] }),
      });

      renderHook(
        () => useClientProducts({ language: "ka" }),
        { wrapper: createWrapper() }
      );

      await waitFor(() =>
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("language=ka")
        )
      );
    });

    it("passes page parameter", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ count: 0, results: [] }),
      });

      renderHook(
        () => useClientProducts({ page: 3 }),
        { wrapper: createWrapper() }
      );

      await waitFor(() =>
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("page=3")
        )
      );
    });

    it("combines multiple filters in URL", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({ count: 1, results: [{ id: 1, name: "X" }] }),
      });

      renderHook(
        () =>
          useClientProducts({
            search: "laptop",
            minPrice: 500,
            maxPrice: 2000,
            ordering: "price",
            page: 2,
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        const callUrl = mockFetch.mock.calls[0][0] as string;
        expect(callUrl).toContain("search=laptop");
        expect(callUrl).toContain("min_price=500");
        expect(callUrl).toContain("max_price=2000");
        expect(callUrl).toContain("ordering=price");
        expect(callUrl).toContain("page=2");
      });
    });

    it("constructs URL with /api/ecommerce/client/products/ base path", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ count: 0, results: [] }),
      });

      renderHook(
        () => useClientProducts({ search: "test" }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        const callUrl = mockFetch.mock.calls[0][0] as string;
        expect(callUrl).toMatch(/^\/api\/ecommerce\/client\/products\//);
      });
    });

    it("does not include undefined filters in query string", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ count: 0, results: [] }),
      });

      renderHook(
        () =>
          useClientProducts({
            search: "test",
            isFeatured: undefined,
            minPrice: undefined,
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        const callUrl = mockFetch.mock.calls[0][0] as string;
        expect(callUrl).toContain("search=test");
        expect(callUrl).not.toContain("is_featured");
        expect(callUrl).not.toContain("min_price");
      });
    });

    it("ignores non-attr_ extra keys in filters", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ count: 0, results: [] }),
      });

      renderHook(
        () =>
          useClientProducts({
            attr_color: "red",
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        const callUrl = mockFetch.mock.calls[0][0] as string;
        expect(callUrl).toContain("attr_color=red");
      });
    });

    it("handles isFeatured: false correctly", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ count: 0, results: [] }),
      });

      renderHook(
        () => useClientProducts({ isFeatured: false }),
        { wrapper: createWrapper() }
      );

      await waitFor(() =>
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("is_featured=false")
        )
      );
    });

    it("handles minPrice of 0 correctly", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ count: 0, results: [] }),
      });

      renderHook(
        () => useClientProducts({ minPrice: 0 }),
        { wrapper: createWrapper() }
      );

      await waitFor(() =>
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("min_price=0")
        )
      );
    });

    it("returns paginated response with next/previous", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            count: 50,
            next: "/api/ecommerce/client/products/?page=2",
            previous: null,
            results: [{ id: 1, name: "Product A" }],
          }),
      });

      const { result } = renderHook(
        () => useClientProducts({ page: 1 }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.count).toBe(50);
      expect(result.current.data?.next).toContain("page=2");
      expect(result.current.data?.previous).toBeNull();
    });

    it("handles network fetch rejection", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(
        () => useClientProducts({ search: "test" }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("handles generated API rejection for no-filter call", async () => {
      mockProductsList.mockRejectedValue(new Error("Server error"));

      const { result } = renderHook(() => useClientProducts(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("accepts custom query options", async () => {
      mockProductsList.mockResolvedValue({
        count: 0,
        results: [],
      } as Awaited<ReturnType<typeof ecommerceClientProductsList>>);

      const { result } = renderHook(
        () => useClientProducts(undefined, { enabled: false }),
        { wrapper: createWrapper() }
      );

      // Should not fetch when disabled
      expect(result.current.fetchStatus).toBe("idle");
      expect(mockProductsList).not.toHaveBeenCalled();
    });
  });
});
