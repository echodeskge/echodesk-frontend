/**
 * Tests for useClients hooks.
 * Tests client list query with search and pagination.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("@/api/generated", () => ({
  ecommerceAdminClientsList: vi.fn(),
  ecommerceAdminClientsRetrieve: vi.fn(),
}));

import { useClients, useClient } from "@/hooks/useClients";
import {
  ecommerceAdminClientsList,
  ecommerceAdminClientsRetrieve,
} from "@/api/generated";

const mockClientsList = vi.mocked(ecommerceAdminClientsList);
const mockClientsRetrieve = vi.mocked(ecommerceAdminClientsRetrieve);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useClients", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("list query", () => {
    it("fetches clients", async () => {
      mockClientsList.mockResolvedValue({
        count: 2,
        results: [
          { id: 1, email: "client1@test.com" },
          { id: 2, email: "client2@test.com" },
        ],
      } as Awaited<ReturnType<typeof ecommerceAdminClientsList>>);

      const { result } = renderHook(() => useClients(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.count).toBe(2);
    });

    it("passes search parameter", async () => {
      mockClientsList.mockResolvedValue({
        count: 0,
        results: [],
      } as Awaited<ReturnType<typeof ecommerceAdminClientsList>>);

      renderHook(() => useClients({ search: "john" }), {
        wrapper: createWrapper(),
      });

      await waitFor(() =>
        expect(mockClientsList).toHaveBeenCalledWith(
          undefined, // is_active
          undefined, // is_verified
          "john", // search
          undefined // page
        )
      );
    });

    it("passes pagination parameter", async () => {
      mockClientsList.mockResolvedValue({
        count: 0,
        results: [],
      } as Awaited<ReturnType<typeof ecommerceAdminClientsList>>);

      renderHook(() => useClients({ page: 3 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() =>
        expect(mockClientsList).toHaveBeenCalledWith(
          undefined, // is_active
          undefined, // is_verified
          undefined, // search
          3 // page
        )
      );
    });

    it("passes filter parameters", async () => {
      mockClientsList.mockResolvedValue({
        count: 0,
        results: [],
      } as Awaited<ReturnType<typeof ecommerceAdminClientsList>>);

      renderHook(
        () => useClients({ is_active: true, is_verified: false, page: 1 }),
        { wrapper: createWrapper() }
      );

      await waitFor(() =>
        expect(mockClientsList).toHaveBeenCalledWith(
          true, // is_active
          false, // is_verified
          undefined, // search
          1 // page
        )
      );
    });

    it("handles empty results", async () => {
      mockClientsList.mockResolvedValue({
        count: 0,
        results: [],
      } as Awaited<ReturnType<typeof ecommerceAdminClientsList>>);

      const { result } = renderHook(() => useClients(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.results).toEqual([]);
    });

    it("handles API error", async () => {
      mockClientsList.mockRejectedValue(new Error("Server error"));

      const { result } = renderHook(() => useClients(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe("useClient", () => {
    it("fetches client by ID", async () => {
      mockClientsRetrieve.mockResolvedValue({
        id: 1,
        email: "client@test.com",
      } as Awaited<ReturnType<typeof ecommerceAdminClientsRetrieve>>);

      const { result } = renderHook(() => useClient(1), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.email).toBe("client@test.com");
    });

    it("is disabled when id is 0", () => {
      const { result } = renderHook(() => useClient(0), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
      expect(mockClientsRetrieve).not.toHaveBeenCalled();
    });
  });
});
