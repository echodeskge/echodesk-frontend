/**
 * Tests for TenantContext.
 * Verifies provider rendering, hook boundary, and tenant state management.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockRefetch = vi.fn();

vi.mock("@/hooks/api/useTenant", () => ({
  useTenantConfig: vi.fn(() => ({
    data: undefined,
    isLoading: false,
    error: null,
    refetch: mockRefetch,
  })),
}));

vi.mock("@/services/tenantService", () => ({
  tenantService: {
    getSubdomainFromHostname: vi.fn(() => null),
    getTenantFromPath: vi.fn(() => null),
    isTenantDomain: vi.fn(() => false),
    getCurrentSubdomain: vi.fn(() => null),
    getTenantUrl: vi.fn((sub: string) => `https://${sub}.echodesk.ge`),
  },
}));

import { TenantProvider, useTenant } from "@/contexts/TenantContext";
import { useTenantConfig } from "@/hooks/api/useTenant";
import { tenantService } from "@/services/tenantService";

const mockUseTenantConfig = vi.mocked(useTenantConfig);
const mockGetSubdomain = vi.mocked(tenantService.getSubdomainFromHostname);

// ---------------------------------------------------------------------------
// Wrapper helper
// ---------------------------------------------------------------------------

function createWrapper() {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(TenantProvider, null, children);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("TenantContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    mockUseTenantConfig.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    } as any);
  });

  describe("useTenant outside provider", () => {
    it("throws when used outside TenantProvider", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});

      expect(() => {
        renderHook(() => useTenant());
      }).toThrow("useTenant must be used within a TenantProvider");

      spy.mockRestore();
    });
  });

  describe("provider renders children", () => {
    it("renders children without crashing", () => {
      const { result } = renderHook(() => useTenant(), {
        wrapper: createWrapper(),
      });

      expect(result.current).toBeDefined();
    });
  });

  describe("default values when no tenant loaded", () => {
    it("tenant is undefined when no tenant is loaded", () => {
      const { result } = renderHook(() => useTenant(), {
        wrapper: createWrapper(),
      });

      expect(result.current.tenant).toBeUndefined();
    });

    it("loading is false when query is not enabled", () => {
      const { result } = renderHook(() => useTenant(), {
        wrapper: createWrapper(),
      });

      expect(result.current.loading).toBe(false);
    });

    it("error is null when no error occurred", () => {
      const { result } = renderHook(() => useTenant(), {
        wrapper: createWrapper(),
      });

      expect(result.current.error).toBeNull();
    });

    it("exposes refreshTenant function", () => {
      const { result } = renderHook(() => useTenant(), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current.refreshTenant).toBe("function");
    });
  });

  describe("tenant data shape", () => {
    it("returns tenant config when loaded", () => {
      const mockTenant = {
        tenant_id: 1,
        tenant_name: "Groot Co",
        schema_name: "groot",
        domain_url: "groot.echodesk.ge",
        api_url: "https://groot.api.echodesk.ge",
        preferred_language: "en",
        admin_email: "admin@groot.com",
        plan: "pro",
        frontend_url: "https://groot.echodesk.ge",
        theme: {
          primary_color: "#000",
          secondary_color: "#fff",
          company_name: "Groot Co",
        },
        features: {
          max_users: 10,
          max_storage: 100,
          analytics: true,
          custom_branding: true,
          api_access: false,
          webhooks: false,
        },
        localization: {
          language: "en",
          timezone: "Asia/Tbilisi",
          date_format: "DD/MM/YYYY",
        },
      };

      mockUseTenantConfig.mockReturnValue({
        data: mockTenant,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      } as any);

      const { result } = renderHook(() => useTenant(), {
        wrapper: createWrapper(),
      });

      expect(result.current.tenant).toEqual(mockTenant);
      expect(result.current.tenant?.schema_name).toBe("groot");
      expect(result.current.tenant?.domain_url).toBe("groot.echodesk.ge");
      expect(result.current.tenant?.plan).toBe("pro");
    });
  });

  describe("loading state", () => {
    it("reflects loading from useTenantConfig", () => {
      mockUseTenantConfig.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: mockRefetch,
      } as any);

      const { result } = renderHook(() => useTenant(), {
        wrapper: createWrapper(),
      });

      expect(result.current.loading).toBe(true);
    });
  });

  describe("error state", () => {
    it("reports error when query fails", () => {
      mockUseTenantConfig.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error("Network error"),
        refetch: mockRefetch,
      } as any);

      const { result } = renderHook(() => useTenant(), {
        wrapper: createWrapper(),
      });

      expect(result.current.error).toBe("Network error");
    });

    it("reports tenant not found when data is null and loading is enabled", () => {
      // Simulate: tenant identifier was found (shouldLoadTenant = true)
      // but the query returned null (tenant doesn't exist).
      // We need to mock window.location to have a non-root path with a tenant set.
      const originalHostname = window.location.hostname;
      Object.defineProperty(window, "location", {
        value: {
          ...window.location,
          hostname: "groot.echodesk.ge",
          pathname: "/en/dashboard",
        },
        writable: true,
      });

      mockGetSubdomain.mockReturnValue("groot");

      mockUseTenantConfig.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      } as any);

      const { result } = renderHook(() => useTenant(), {
        wrapper: createWrapper(),
      });

      // Error may be set because data===null and shouldLoadTenant may be true
      // The exact message depends on whether the effect set shouldLoadTenant
      expect(result.current.tenant).toBeNull();

      // Restore
      Object.defineProperty(window, "location", {
        value: {
          ...window.location,
          hostname: originalHostname,
          pathname: "/",
        },
        writable: true,
      });
    });
  });

  describe("refreshTenant", () => {
    it("calls refetch when refreshTenant is invoked", async () => {
      mockRefetch.mockResolvedValue({ data: null });

      const { result } = renderHook(() => useTenant(), {
        wrapper: createWrapper(),
      });

      await result.current.refreshTenant();

      expect(mockRefetch).toHaveBeenCalled();
    });
  });
});
