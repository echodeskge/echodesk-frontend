/**
 * Tests for useEcommerce hooks.
 * Tests client-facing product list query with filtering.
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
  });
});
