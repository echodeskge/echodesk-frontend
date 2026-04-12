/**
 * Tests for useTenant hooks.
 * Tests tenant info, subscription, groups, and appearance settings.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("@/api/axios", () => ({
  default: {
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/api/generated", () => ({
  tenantGroupsList: vi.fn(),
  tenantGroupsCreate: vi.fn(),
  tenantGroupsPartialUpdate: vi.fn(),
  tenantGroupsDestroy: vi.fn(),
}));

vi.mock("@/services/tenantService", () => ({
  tenantService: {
    getTenantBySubdomain: vi.fn(),
    getCurrentSubdomain: vi.fn(() => "test-tenant"),
    getPublicTenantApiUrl: vi.fn(() => "https://test.api.com"),
  },
}));

vi.mock("@/services/auth", () => ({
  authService: {
    isAuthenticated: vi.fn(() => true),
  },
}));

import {
  useTenantConfig,
  useTenantSettings,
  useTenantSubscription,
  useTenantGroups,
  useAvailableFeatures,
  useUpdateTenantSettings,
  useUploadTenantLogo,
  useRemoveTenantLogo,
  useCreateTenantGroup,
  useUpdateTenantGroup,
  useDeleteTenantGroup,
  useDashboardAppearance,
  useUpdateDashboardAppearance,
  useResetDashboardAppearance,
} from "@/hooks/api/useTenant";
import axiosInstance from "@/api/axios";
import { tenantGroupsList, tenantGroupsCreate, tenantGroupsPartialUpdate, tenantGroupsDestroy } from "@/api/generated";
import { tenantService } from "@/services/tenantService";
import { authService } from "@/services/auth";

const mockAxiosGet = vi.mocked(axiosInstance.get);
const mockAxiosPatch = vi.mocked(axiosInstance.patch);
const mockAxiosPost = vi.mocked(axiosInstance.post);
const mockAxiosDelete = vi.mocked(axiosInstance.delete);
const mockTenantGroupsList = vi.mocked(tenantGroupsList);
const mockTenantGroupsCreate = vi.mocked(tenantGroupsCreate);
const mockTenantGroupsPartialUpdate = vi.mocked(tenantGroupsPartialUpdate);
const mockTenantGroupsDestroy = vi.mocked(tenantGroupsDestroy);
const mockGetTenantBySubdomain = vi.mocked(tenantService.getTenantBySubdomain);
const mockIsAuthenticated = vi.mocked(authService.isAuthenticated);

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

describe("useTenant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAuthenticated.mockReturnValue(true);
  });

  describe("useTenantConfig", () => {
    it("fetches tenant config by subdomain", async () => {
      mockGetTenantBySubdomain.mockResolvedValue({
        schema_name: "test",
        name: "Test Tenant",
        api_url: "https://test.api.com",
      } as Awaited<ReturnType<typeof tenantService.getTenantBySubdomain>>);

      const { result } = renderHook(() => useTenantConfig("test-tenant"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockGetTenantBySubdomain).toHaveBeenCalledWith("test-tenant");
    });

    it("is disabled when subdomain is null", () => {
      const { result } = renderHook(() => useTenantConfig(null), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
      expect(mockGetTenantBySubdomain).not.toHaveBeenCalled();
    });

    it("respects enabled option", () => {
      const { result } = renderHook(
        () => useTenantConfig("test", { enabled: false }),
        { wrapper: createWrapper() }
      );

      expect(result.current.fetchStatus).toBe("idle");
    });
  });

  describe("useTenantSettings", () => {
    it("fetches tenant settings", async () => {
      mockAxiosGet.mockResolvedValue({
        data: { company_name: "Test Co", timezone: "UTC" },
      });

      const { result } = renderHook(() => useTenantSettings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockAxiosGet).toHaveBeenCalledWith("/api/tenant-settings/");
    });
  });

  describe("useTenantSubscription", () => {
    it("fetches subscription info", async () => {
      mockAxiosGet.mockResolvedValue({
        data: { plan: "pro", status: "active" },
      });

      const { result } = renderHook(() => useTenantSubscription(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockAxiosGet).toHaveBeenCalledWith("/api/subscription/me/");
    });

    it("respects enabled option", () => {
      const { result } = renderHook(
        () => useTenantSubscription({ enabled: false }),
        { wrapper: createWrapper() }
      );

      expect(result.current.fetchStatus).toBe("idle");
    });
  });

  describe("useTenantGroups", () => {
    it("fetches groups when authenticated", async () => {
      mockTenantGroupsList.mockResolvedValue({
        count: 1,
        results: [{ id: 1, name: "Admin" }],
      } as Awaited<ReturnType<typeof tenantGroupsList>>);

      const { result } = renderHook(() => useTenantGroups(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockTenantGroupsList).toHaveBeenCalled();
    });

    it("does NOT fetch when not authenticated", () => {
      mockIsAuthenticated.mockReturnValue(false);

      const { result } = renderHook(() => useTenantGroups(), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
    });
  });

  describe("useAvailableFeatures", () => {
    it("fetches available features", async () => {
      mockAxiosGet.mockResolvedValue({
        data: ["feature_1", "feature_2"],
      });

      const { result } = renderHook(() => useAvailableFeatures(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockAxiosGet).toHaveBeenCalledWith(
        "/api/tenant-groups/available_features/"
      );
    });
  });

  describe("useUpdateTenantSettings", () => {
    it("updates settings via PATCH", async () => {
      mockAxiosPatch.mockResolvedValue({ data: { company_name: "Updated" } });

      const { result } = renderHook(() => useUpdateTenantSettings(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ company_name: "Updated" });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockAxiosPatch).toHaveBeenCalledWith("/api/tenant-settings/", {
        company_name: "Updated",
      });
    });
  });

  describe("useUploadTenantLogo", () => {
    it("uploads logo as FormData", async () => {
      mockAxiosPost.mockResolvedValue({ data: { logo_url: "/logo.png" } });

      const { result } = renderHook(() => useUploadTenantLogo(), {
        wrapper: createWrapper(),
      });

      const formData = new FormData();
      await act(async () => {
        result.current.mutate(formData);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockAxiosPost).toHaveBeenCalledWith(
        "/api/tenant-settings/upload-logo/",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
    });
  });

  describe("useRemoveTenantLogo", () => {
    it("removes logo", async () => {
      mockAxiosDelete.mockResolvedValue({ data: {} });

      const { result } = renderHook(() => useRemoveTenantLogo(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate();
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockAxiosDelete).toHaveBeenCalledWith(
        "/api/tenant-settings/remove-logo/"
      );
    });
  });

  describe("useCreateTenantGroup", () => {
    it("calls tenantGroupsCreate", async () => {
      mockTenantGroupsCreate.mockResolvedValue({
        id: 2,
        name: "Manager",
      } as Awaited<ReturnType<typeof tenantGroupsCreate>>);

      const { result } = renderHook(() => useCreateTenantGroup(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          name: "Manager",
        } as Parameters<typeof result.current.mutate>[0]);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockTenantGroupsCreate).toHaveBeenCalled();
    });
  });

  describe("useUpdateTenantGroup", () => {
    it("calls tenantGroupsPartialUpdate with numeric id", async () => {
      mockTenantGroupsPartialUpdate.mockResolvedValue({
        id: 1,
        name: "Updated",
      } as Awaited<ReturnType<typeof tenantGroupsPartialUpdate>>);

      const { result } = renderHook(() => useUpdateTenantGroup(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ id: "1", data: { name: "Updated" } });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockTenantGroupsPartialUpdate).toHaveBeenCalledWith(1, {
        name: "Updated",
      });
    });
  });

  describe("useDeleteTenantGroup", () => {
    it("calls tenantGroupsDestroy with numeric id", async () => {
      mockTenantGroupsDestroy.mockResolvedValue(
        undefined as unknown as Awaited<ReturnType<typeof tenantGroupsDestroy>>
      );

      const { result } = renderHook(() => useDeleteTenantGroup(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate("1");
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockTenantGroupsDestroy).toHaveBeenCalledWith(1);
    });
  });

  describe("useDashboardAppearance", () => {
    it("fetches appearance when authenticated", async () => {
      mockAxiosGet.mockResolvedValue({
        data: { primary_color: "#000000" },
      });

      const { result } = renderHook(() => useDashboardAppearance(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockAxiosGet).toHaveBeenCalledWith("/api/dashboard-appearance/");
    });

    it("does NOT fetch when not authenticated", () => {
      mockIsAuthenticated.mockReturnValue(false);

      const { result } = renderHook(() => useDashboardAppearance(), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
    });
  });

  describe("useUpdateDashboardAppearance", () => {
    it("updates appearance via PATCH", async () => {
      mockAxiosPatch.mockResolvedValue({
        data: { primary_color: "#FF0000" },
      });

      const { result } = renderHook(() => useUpdateDashboardAppearance(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ primary_color: "#FF0000" });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockAxiosPatch).toHaveBeenCalledWith(
        "/api/dashboard-appearance/update/",
        { primary_color: "#FF0000" }
      );
    });
  });

  describe("useResetDashboardAppearance", () => {
    it("resets appearance", async () => {
      mockAxiosPost.mockResolvedValue({ data: {} });

      const { result } = renderHook(() => useResetDashboardAppearance(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate();
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockAxiosPost).toHaveBeenCalledWith(
        "/api/dashboard-appearance/reset/"
      );
    });
  });
});
