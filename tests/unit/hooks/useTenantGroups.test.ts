/**
 * Tests for tenant group hooks.
 * Frontend counterpart of backend test_group_views.py:
 *   - TestTenantGroupCRUD: list, create, update, delete
 *   - TestTenantGroupMembers: (handled by API, not hooks)
 *   - TestAvailableFeatures: available features query
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("@/api/generated", () => ({
  tenantGroupsList: vi.fn(),
  tenantGroupsCreate: vi.fn(),
  tenantGroupsPartialUpdate: vi.fn(),
  tenantGroupsDestroy: vi.fn(),
}));

vi.mock("@/api/axios", () => ({
  default: {
    get: vi.fn(),
  },
}));

vi.mock("@/services/auth", () => ({
  authService: {
    isAuthenticated: vi.fn(() => true),
  },
}));

import {
  useTenantGroups,
  useCreateTenantGroup,
  useUpdateTenantGroup,
  useDeleteTenantGroup,
  useAvailableFeatures,
} from "@/hooks/api/useTenant";
import {
  tenantGroupsList,
  tenantGroupsCreate,
  tenantGroupsPartialUpdate,
  tenantGroupsDestroy,
} from "@/api/generated";
import axios from "@/api/axios";
import { authService } from "@/services/auth";

const mockTenantGroupsList = vi.mocked(tenantGroupsList);
const mockTenantGroupsCreate = vi.mocked(tenantGroupsCreate);
const mockTenantGroupsPartialUpdate = vi.mocked(tenantGroupsPartialUpdate);
const mockTenantGroupsDestroy = vi.mocked(tenantGroupsDestroy);
const mockAxiosGet = vi.mocked(axios.get);
const mockIsAuthenticated = vi.mocked(authService.isAuthenticated);

const MOCK_GROUP = {
  id: 1,
  name: "Support",
  description: "Support team",
  is_active: true,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  member_count: "3",
  features: [],
  feature_keys: "[]",
};

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

describe("useTenantGroups", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAuthenticated.mockReturnValue(true);
  });

  // -- TestTenantGroupCRUD.test_list_tenant_groups --

  describe("list query", () => {
    it("fetches groups when authenticated", async () => {
      mockTenantGroupsList.mockResolvedValue({
        count: 2,
        results: [
          { ...MOCK_GROUP, id: 1, name: "Support" },
          { ...MOCK_GROUP, id: 2, name: "Sales" },
        ],
      } as any);

      const { result } = renderHook(() => useTenantGroups(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.count).toBe(2);
      expect(result.current.data?.results).toHaveLength(2);
    });

    it("does NOT fetch when not authenticated", () => {
      mockIsAuthenticated.mockReturnValue(false);

      const { result } = renderHook(() => useTenantGroups(), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
      expect(mockTenantGroupsList).not.toHaveBeenCalled();
    });

    it("can be disabled via options", () => {
      const { result } = renderHook(
        () => useTenantGroups({ enabled: false }),
        { wrapper: createWrapper() }
      );

      expect(result.current.fetchStatus).toBe("idle");
      expect(mockTenantGroupsList).not.toHaveBeenCalled();
    });

    it("handles API error", async () => {
      mockTenantGroupsList.mockRejectedValue(new Error("Server error"));

      const { result } = renderHook(() => useTenantGroups(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it("returns empty results", async () => {
      mockTenantGroupsList.mockResolvedValue({ count: 0, results: [] } as any);

      const { result } = renderHook(() => useTenantGroups(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.results).toEqual([]);
    });
  });

  // -- TestTenantGroupCRUD.test_create_tenant_group_as_admin --

  describe("useCreateTenantGroup", () => {
    it("calls tenantGroupsCreate with data", async () => {
      mockTenantGroupsCreate.mockResolvedValue({
        name: "New Group",
        description: "Test",
      } as any);

      const { result } = renderHook(() => useCreateTenantGroup(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ name: "New Group", description: "Test" } as any);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockTenantGroupsCreate).toHaveBeenCalledWith(
        { name: "New Group", description: "Test" },
        expect.anything()
      );
    });

    it("handles create error (duplicate name)", async () => {
      mockTenantGroupsCreate.mockRejectedValue(new Error("Group with this name already exists"));

      const { result } = renderHook(() => useCreateTenantGroup(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ name: "Duplicate" } as any);
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // -- TestTenantGroupCRUD.test_update_tenant_group --

  describe("useUpdateTenantGroup", () => {
    it("calls tenantGroupsPartialUpdate with id and data", async () => {
      mockTenantGroupsPartialUpdate.mockResolvedValue({
        name: "Updated Name",
      } as any);

      const { result } = renderHook(() => useUpdateTenantGroup(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: "1",
          data: { name: "Updated Name" },
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockTenantGroupsPartialUpdate).toHaveBeenCalledWith(1, {
        name: "Updated Name",
      });
    });

    it("handles update error", async () => {
      mockTenantGroupsPartialUpdate.mockRejectedValue(new Error("Forbidden"));

      const { result } = renderHook(() => useUpdateTenantGroup(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ id: "1", data: { name: "x" } });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // -- TestTenantGroupCRUD.test_delete_tenant_group --

  describe("useDeleteTenantGroup", () => {
    it("calls tenantGroupsDestroy with group ID", async () => {
      mockTenantGroupsDestroy.mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteTenantGroup(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate("5");
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockTenantGroupsDestroy).toHaveBeenCalledWith(5);
    });

    it("handles delete error", async () => {
      mockTenantGroupsDestroy.mockRejectedValue(new Error("Cannot delete"));

      const { result } = renderHook(() => useDeleteTenantGroup(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate("1");
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // -- TestAvailableFeatures.test_available_features_returns_categories --

  describe("useAvailableFeatures", () => {
    it("fetches available features", async () => {
      mockAxiosGet.mockResolvedValue({
        data: {
          categories: [
            {
              category: "core",
              category_display: "Core Features",
              features: [{ id: 1, key: "tickets", name: "Tickets" }],
            },
          ],
        },
      });

      const { result } = renderHook(() => useAvailableFeatures(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.categories).toHaveLength(1);
      expect(mockAxiosGet).toHaveBeenCalledWith(
        "/api/tenant-groups/available_features/"
      );
    });

    it("handles features fetch error", async () => {
      mockAxiosGet.mockRejectedValue(new Error("Server error"));

      const { result } = renderHook(() => useAvailableFeatures(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });
});
