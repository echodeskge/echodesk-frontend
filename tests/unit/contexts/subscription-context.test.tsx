/**
 * Tests for SubscriptionContext.
 * Verifies hasFeature() logic with various feature keys,
 * superadmin bypass, subscription absence, and isWithinLimit.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import React from "react";
import type { AuthUser } from "@/types/auth";

// ---- Mutable state the mocks read from ----
let mockUser: AuthUser | null = null;
let mockToken: string | null = null;
let mockSubscriptionData: any = null;
let mockQueryError: Error | null = null;
let mockIsLoading = false;

// Mock AuthContext
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: mockUser,
    token: mockToken,
    isAuthenticated: !!mockToken && !!mockUser,
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    checkAuth: vi.fn(),
  }),
}));

// Mock TenantContext
vi.mock("@/contexts/TenantContext", () => ({
  useTenant: () => ({
    tenant: {
      tenant_id: 1,
      tenant_name: "Test",
      schema_name: "test",
      domain_url: "test.echodesk.ge",
      api_url: "https://test.api.echodesk.ge",
    },
    loading: false,
    error: null,
    refreshTenant: vi.fn(),
  }),
}));

// Mock useTenantSubscription
vi.mock("@/hooks/api", () => ({
  useTenantSubscription: () => ({
    data: mockSubscriptionData,
    isLoading: mockIsLoading,
    error: mockQueryError,
    refetch: vi.fn(),
  }),
}));

import {
  SubscriptionProvider,
  useSubscription,
  useFeature,
  useLimit,
} from "@/contexts/SubscriptionContext";
import type {
  SubscriptionFeature,
  SubscriptionFeatures,
} from "@/contexts/SubscriptionContext";

function createWrapper() {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(SubscriptionProvider, null, children);
}

function makeFeatures(
  overrides: Partial<SubscriptionFeatures> = {}
): SubscriptionFeatures {
  return {
    ticket_management: true,
    email_integration: true,
    ip_calling: false,
    facebook_integration: false,
    instagram_integration: false,
    whatsapp_integration: false,
    social_integrations: false,
    advanced_analytics: false,
    api_access: false,
    custom_integrations: false,
    priority_support: false,
    dedicated_account_manager: false,
    ecommerce_crm: false,
    order_management: false,
    booking_management: false,
    leave_management: false,
    invoice_management: false,
    user_management: false,
    settings: true,
    ...overrides,
  };
}

describe("SubscriptionContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = { id: 1, email: "user@test.com", is_staff: false, is_superuser: false };
    mockToken = "test-token";
    mockSubscriptionData = null;
    mockQueryError = null;
    mockIsLoading = false;
  });

  describe("useSubscription outside provider", () => {
    it("throws when used outside SubscriptionProvider", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});

      expect(() => {
        renderHook(() => useSubscription());
      }).toThrow("useSubscription must be used within a SubscriptionProvider");

      spy.mockRestore();
    });
  });

  describe("hasFeature", () => {
    it("returns true for enabled features", () => {
      mockSubscriptionData = {
        has_subscription: true,
        features: makeFeatures({ ticket_management: true }),
      };

      const { result } = renderHook(() => useSubscription(), {
        wrapper: createWrapper(),
      });

      expect(result.current.hasFeature("ticket_management")).toBe(true);
    });

    it("returns false for disabled features", () => {
      mockSubscriptionData = {
        has_subscription: true,
        features: makeFeatures({ ip_calling: false }),
      };

      const { result } = renderHook(() => useSubscription(), {
        wrapper: createWrapper(),
      });

      expect(result.current.hasFeature("ip_calling")).toBe(false);
    });

    it("returns false when no subscription exists", () => {
      mockSubscriptionData = {
        has_subscription: false,
        features: makeFeatures(),
      };

      const { result } = renderHook(() => useSubscription(), {
        wrapper: createWrapper(),
      });

      expect(result.current.hasFeature("ticket_management")).toBe(false);
    });

    it("returns false when subscription is null", () => {
      mockSubscriptionData = null;

      const { result } = renderHook(() => useSubscription(), {
        wrapper: createWrapper(),
      });

      expect(result.current.hasFeature("ticket_management")).toBe(false);
    });

    it("superadmin (is_staff) bypasses all feature checks", () => {
      mockUser = { id: 1, email: "admin@test.com", is_staff: true, is_superuser: false };
      mockSubscriptionData = {
        has_subscription: false,
        features: makeFeatures({ ip_calling: false }),
      };

      const { result } = renderHook(() => useSubscription(), {
        wrapper: createWrapper(),
      });

      // Even though subscription is missing and feature is disabled, staff gets access
      expect(result.current.hasFeature("ip_calling")).toBe(true);
      expect(result.current.hasFeature("advanced_analytics")).toBe(true);
    });

    it("superadmin (is_superuser) bypasses all feature checks", () => {
      mockUser = { id: 1, email: "super@test.com", is_staff: false, is_superuser: true };
      mockSubscriptionData = null;

      const { result } = renderHook(() => useSubscription(), {
        wrapper: createWrapper(),
      });

      expect(result.current.hasFeature("whatsapp_integration")).toBe(true);
    });

    it("checks multiple feature keys correctly", () => {
      mockSubscriptionData = {
        has_subscription: true,
        features: makeFeatures({
          facebook_integration: true,
          instagram_integration: true,
          whatsapp_integration: false,
          ecommerce_crm: true,
        }),
      };

      const { result } = renderHook(() => useSubscription(), {
        wrapper: createWrapper(),
      });

      expect(result.current.hasFeature("facebook_integration")).toBe(true);
      expect(result.current.hasFeature("instagram_integration")).toBe(true);
      expect(result.current.hasFeature("whatsapp_integration")).toBe(false);
      expect(result.current.hasFeature("ecommerce_crm")).toBe(true);
      expect(result.current.hasFeature("api_access")).toBe(false);
    });

    it("checks selected_features fallback from API", () => {
      mockSubscriptionData = {
        has_subscription: true,
        features: makeFeatures(),
        selected_features: [
          { key: "custom_integrations", name: "Custom Integrations" },
        ],
      };

      const { result } = renderHook(() => useSubscription(), {
        wrapper: createWrapper(),
      });

      // custom_integrations is false in features but present in selected_features
      // However, since features[custom_integrations] is explicitly false,
      // the first check returns false (it's !== undefined)
      expect(result.current.hasFeature("custom_integrations")).toBe(false);
    });
  });

  describe("isWithinLimit", () => {
    it("returns true when no subscription (assumes within limits)", () => {
      mockSubscriptionData = null;

      const { result } = renderHook(() => useSubscription(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isWithinLimit("users")).toBe(true);
    });

    it("returns true when no usage_limits available", () => {
      mockSubscriptionData = {
        has_subscription: true,
        features: makeFeatures(),
        // No usage_limits
      };

      const { result } = renderHook(() => useSubscription(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isWithinLimit("users")).toBe(true);
    });

    it("returns true when within limits", () => {
      mockSubscriptionData = {
        has_subscription: true,
        features: makeFeatures(),
        usage_limits: {
          users: { within_limit: true, current: 3, limit: 10, usage_percentage: 30 },
          whatsapp: { within_limit: true, current: 50, limit: 1000, usage_percentage: 5 },
          storage: { within_limit: true, current: 1, limit: 100, usage_percentage: 1 },
        },
      };

      const { result } = renderHook(() => useSubscription(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isWithinLimit("users")).toBe(true);
      expect(result.current.isWithinLimit("whatsapp")).toBe(true);
      expect(result.current.isWithinLimit("storage")).toBe(true);
    });

    it("returns false when exceeding limits", () => {
      mockSubscriptionData = {
        has_subscription: true,
        features: makeFeatures(),
        usage_limits: {
          users: { within_limit: false, current: 11, limit: 10, usage_percentage: 110 },
          whatsapp: { within_limit: true, current: 50, limit: 1000, usage_percentage: 5 },
          storage: { within_limit: true, current: 1, limit: 100, usage_percentage: 1 },
        },
      };

      const { result } = renderHook(() => useSubscription(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isWithinLimit("users")).toBe(false);
      expect(result.current.isWithinLimit("whatsapp")).toBe(true);
    });
  });

  describe("subscription state", () => {
    it("exposes subscription data", () => {
      mockSubscriptionData = {
        has_subscription: true,
        features: makeFeatures(),
        package: { id: 1, name: "Pro", pricing_model: "per_agent" },
        subscription: {
          is_active: true,
          starts_at: "2024-01-01",
          expires_at: null,
          monthly_cost: 29.99,
          agent_count: 5,
        },
      };

      const { result } = renderHook(() => useSubscription(), {
        wrapper: createWrapper(),
      });

      expect(result.current.subscription).not.toBeNull();
      expect(result.current.subscription?.has_subscription).toBe(true);
    });

    it("exposes loading state", () => {
      mockIsLoading = true;

      const { result } = renderHook(() => useSubscription(), {
        wrapper: createWrapper(),
      });

      expect(result.current.loading).toBe(true);
    });

    it("exposes error state on query failure", () => {
      mockQueryError = new Error("Network error");

      const { result } = renderHook(() => useSubscription(), {
        wrapper: createWrapper(),
      });

      expect(result.current.error).toBe("Failed to load subscription");
    });

    it("provides default features on error", () => {
      mockQueryError = new Error("API down");
      mockSubscriptionData = null;

      const { result } = renderHook(() => useSubscription(), {
        wrapper: createWrapper(),
      });

      // On error with no data, subscription fallback has basic features enabled
      expect(result.current.subscription).not.toBeNull();
      expect(result.current.subscription?.error).toBe("Failed to load subscription");
    });
  });

  describe("useFeature convenience hook", () => {
    it("returns feature status", () => {
      mockSubscriptionData = {
        has_subscription: true,
        features: makeFeatures({ ecommerce_crm: true }),
      };

      const { result } = renderHook(() => useFeature("ecommerce_crm"), {
        wrapper: createWrapper(),
      });

      expect(result.current).toBe(true);
    });
  });

  describe("useLimit convenience hook", () => {
    it("returns limit status", () => {
      mockSubscriptionData = {
        has_subscription: true,
        features: makeFeatures(),
        usage_limits: {
          users: { within_limit: true, current: 3, limit: 10, usage_percentage: 30 },
          whatsapp: { within_limit: false, current: 1001, limit: 1000, usage_percentage: 100 },
          storage: { within_limit: true, current: 1, limit: 100, usage_percentage: 1 },
        },
      };

      const { result } = renderHook(() => useLimit("users"), {
        wrapper: createWrapper(),
      });

      expect(result.current).toBe(true);
    });
  });
});
