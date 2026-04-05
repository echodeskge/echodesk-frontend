/**
 * Tests for useProducts hooks.
 * Frontend counterpart of backend test_ecommerce_views.py:
 *   - Product list query
 *   - Product detail query
 *   - Create/Update/Delete mutations with cache invalidation
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("@/services/productService", () => ({
  productService: {
    getProducts: vi.fn(),
    getProduct: vi.fn(),
    createProduct: vi.fn(),
    updateProduct: vi.fn(),
    deleteProduct: vi.fn(),
  },
}));

import {
  useProducts,
  useProduct,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
} from "@/hooks/useProducts";
import { productService } from "@/services/productService";

const mockGetProducts = vi.mocked(productService.getProducts);
const mockGetProduct = vi.mocked(productService.getProduct);
const mockCreateProduct = vi.mocked(productService.createProduct);
const mockUpdateProduct = vi.mocked(productService.updateProduct);
const mockDeleteProduct = vi.mocked(productService.deleteProduct);

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

describe("useProducts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("list query", () => {
    it("fetches products", async () => {
      mockGetProducts.mockResolvedValue({
        count: 2,
        results: [
          { id: 1, sku: "SKU-1" },
          { id: 2, sku: "SKU-2" },
        ],
      } as any);

      const { result } = renderHook(() => useProducts(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.count).toBe(2);
      expect(result.current.data?.results).toHaveLength(2);
    });

    it("passes filters to service", async () => {
      mockGetProducts.mockResolvedValue({ count: 0, results: [] } as any);

      renderHook(() => useProducts({ status: "active", page: 2 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() =>
        expect(mockGetProducts).toHaveBeenCalledWith({
          status: "active",
          page: 2,
        })
      );
    });

    it("handles empty results", async () => {
      mockGetProducts.mockResolvedValue({ count: 0, results: [] } as any);

      const { result } = renderHook(() => useProducts(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.results).toEqual([]);
    });

    it("handles API error", async () => {
      mockGetProducts.mockRejectedValue(new Error("Server error"));

      const { result } = renderHook(() => useProducts(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe("useProduct", () => {
    it("fetches product by ID", async () => {
      mockGetProduct.mockResolvedValue({
        id: 1,
        sku: "DET-001",
      } as any);

      const { result } = renderHook(() => useProduct(1), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.sku).toBe("DET-001");
    });

    it("is disabled when id is 0", () => {
      const { result } = renderHook(() => useProduct(0), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
      expect(mockGetProduct).not.toHaveBeenCalled();
    });
  });

  describe("useCreateProduct", () => {
    it("calls createProduct with data", async () => {
      mockCreateProduct.mockResolvedValue({ id: 1, sku: "NEW-001" } as any);

      const { result } = renderHook(() => useCreateProduct(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          sku: "NEW-001",
          name: { en: "New Product" },
          price: "29.99",
        } as any);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockCreateProduct).toHaveBeenCalled();
    });

    it("handles create error", async () => {
      mockCreateProduct.mockRejectedValue(new Error("SKU already exists"));

      const { result } = renderHook(() => useCreateProduct(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ sku: "DUPE" } as any);
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe("useUpdateProduct", () => {
    it("calls updateProduct with id and data", async () => {
      mockUpdateProduct.mockResolvedValue({ price: "49.99" } as any);

      const { result } = renderHook(() => useUpdateProduct(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ id: 1, data: { price: "49.99" } as any });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockUpdateProduct).toHaveBeenCalledWith(1, { price: "49.99" });
    });
  });

  describe("useDeleteProduct", () => {
    it("calls deleteProduct with ID", async () => {
      mockDeleteProduct.mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteProduct(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(1);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockDeleteProduct).toHaveBeenCalledWith(1);
    });

    it("handles delete error", async () => {
      mockDeleteProduct.mockRejectedValue(new Error("Not found"));

      const { result } = renderHook(() => useDeleteProduct(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(999);
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });
});
