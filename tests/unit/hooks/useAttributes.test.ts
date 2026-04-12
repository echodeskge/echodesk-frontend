/**
 * Tests for useAttributes hooks.
 * Tests query and mutation hooks for attribute management.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("@/services/attributeService", () => ({
  attributeService: {
    getAttributes: vi.fn(),
    getAttribute: vi.fn(),
    createAttribute: vi.fn(),
    updateAttribute: vi.fn(),
    deleteAttribute: vi.fn(),
  },
}));

import {
  useAttributes,
  useAttribute,
  useCreateAttribute,
  useUpdateAttribute,
  useDeleteAttribute,
} from "@/hooks/useAttributes";
import { attributeService } from "@/services/attributeService";

const mockGetAttributes = vi.mocked(attributeService.getAttributes);
const mockGetAttribute = vi.mocked(attributeService.getAttribute);
const mockCreateAttribute = vi.mocked(attributeService.createAttribute);
const mockUpdateAttribute = vi.mocked(attributeService.updateAttribute);
const mockDeleteAttribute = vi.mocked(attributeService.deleteAttribute);

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

describe("useAttributes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("list query", () => {
    it("fetches attributes", async () => {
      mockGetAttributes.mockResolvedValue({
        count: 2,
        results: [
          { id: 1, name: "Color", attribute_type: "multiselect" },
          { id: 2, name: "Size", attribute_type: "multiselect" },
        ],
      } as Awaited<ReturnType<typeof attributeService.getAttributes>>);

      const { result } = renderHook(() => useAttributes(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.count).toBe(2);
      expect(result.current.data?.results).toHaveLength(2);
    });

    it("passes filters to service", async () => {
      mockGetAttributes.mockResolvedValue({
        count: 0,
        results: [],
      } as Awaited<ReturnType<typeof attributeService.getAttributes>>);

      renderHook(
        () => useAttributes({ attribute_type: "multiselect", page: 2 }),
        { wrapper: createWrapper() }
      );

      await waitFor(() =>
        expect(mockGetAttributes).toHaveBeenCalledWith({
          attribute_type: "multiselect",
          page: 2,
        })
      );
    });

    it("handles API error", async () => {
      mockGetAttributes.mockRejectedValue(new Error("Server error"));

      const { result } = renderHook(() => useAttributes(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe("useAttribute", () => {
    it("fetches attribute by ID", async () => {
      mockGetAttribute.mockResolvedValue({
        id: 1,
        name: "Color",
        attribute_type: "multiselect",
      } as Awaited<ReturnType<typeof attributeService.getAttribute>>);

      const { result } = renderHook(() => useAttribute(1), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.name).toBe("Color");
    });

    it("is disabled when id is 0", () => {
      const { result } = renderHook(() => useAttribute(0), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
      expect(mockGetAttribute).not.toHaveBeenCalled();
    });
  });

  describe("useCreateAttribute", () => {
    it("calls createAttribute with data", async () => {
      mockCreateAttribute.mockResolvedValue({
        id: 1,
        name: "Material",
      } as Awaited<ReturnType<typeof attributeService.createAttribute>>);

      const { result } = renderHook(() => useCreateAttribute(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          name: "Material",
          attribute_type: "multiselect",
        } as Parameters<typeof result.current.mutate>[0]);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockCreateAttribute).toHaveBeenCalled();
    });

    it("handles create error", async () => {
      mockCreateAttribute.mockRejectedValue(new Error("Duplicate name"));

      const { result } = renderHook(() => useCreateAttribute(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          name: "Color",
        } as Parameters<typeof result.current.mutate>[0]);
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe("useUpdateAttribute", () => {
    it("calls updateAttribute with id and data", async () => {
      mockUpdateAttribute.mockResolvedValue({
        name: "Updated Color",
      } as Awaited<ReturnType<typeof attributeService.updateAttribute>>);

      const { result } = renderHook(() => useUpdateAttribute(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ id: 1, data: { name: "Updated Color" } });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockUpdateAttribute).toHaveBeenCalledWith(1, {
        name: "Updated Color",
      });
    });
  });

  describe("useDeleteAttribute", () => {
    it("calls deleteAttribute with ID", async () => {
      mockDeleteAttribute.mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteAttribute(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(1);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockDeleteAttribute).toHaveBeenCalledWith(1);
    });

    it("handles delete error", async () => {
      mockDeleteAttribute.mockRejectedValue(new Error("Not found"));

      const { result } = renderHook(() => useDeleteAttribute(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(999);
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });
});
