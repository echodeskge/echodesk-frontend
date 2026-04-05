/**
 * Tests for usePayments and useTenantSubscription hooks.
 * Frontend counterpart of backend test_subscription_views.py:
 *   - useTenantSubscription query
 *   - useSavedCard query
 *   - useInvoices query (via generated API)
 *   - usePackages query
 *   - useUpgradePreview query (disabled without packageId)
 *   - Mutations: useDeleteSavedCard, useManualPayment, useUpgradeSubscription,
 *     useImmediateUpgrade, useScheduleUpgrade, useCancelScheduledUpgrade,
 *     useAddNewCard, useRemoveSavedCard, useSetDefaultCard, useReactivateSubscription
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("@/api/generated", () => ({
  listInvoices: vi.fn(),
}));

vi.mock("@/api/axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/services/auth", () => ({
  authService: {
    isAuthenticated: vi.fn(() => true),
  },
}));

vi.mock("@/services/tenantService", () => ({
  tenantService: {
    getTenantBySubdomain: vi.fn(),
  },
}));

import {
  useSavedCard,
  usePackages,
  useInvoices,
  useUpgradePreview,
  useDeleteSavedCard,
  useManualPayment,
  useUpgradeSubscription,
  useImmediateUpgrade,
  useScheduleUpgrade,
  useCancelScheduledUpgrade,
  useAddNewCard,
  useRemoveSavedCard,
  useSetDefaultCard,
  useReactivateSubscription,
  paymentKeys,
} from "@/hooks/api/usePayments";
import { useTenantSubscription } from "@/hooks/api/useTenant";
import { listInvoices } from "@/api/generated";
import axios from "@/api/axios";

const mockListInvoices = vi.mocked(listInvoices);
const mockAxiosGet = vi.mocked(axios.get);
const mockAxiosPost = vi.mocked(axios.post);
const mockAxiosDelete = vi.mocked(axios.delete);

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

const MOCK_SUBSCRIPTION = {
  has_subscription: true,
  subscription: {
    is_active: true,
    starts_at: "2024-01-01T00:00:00Z",
    monthly_cost: 50.0,
    agent_count: 10,
    subscription_type: "premium",
    is_trial: false,
    next_billing_date: "2024-02-01T00:00:00Z",
  },
  selected_features: [
    { id: 1, key: "whatsapp", name: "WhatsApp", price_per_user_gel: 3.0 },
  ],
};

const MOCK_SAVED_CARD = {
  cards: [
    { id: 1, masked_pan: "****1234", expiry_date: "12/26", is_default: true },
  ],
};

const MOCK_INVOICES = {
  invoices: [
    {
      invoice_number: "INV-202601-0001",
      amount: 50.0,
      currency: "GEL",
      status: "paid",
    },
  ],
};

describe("usePayments & useTenantSubscription hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -- paymentKeys --
  describe("paymentKeys", () => {
    it("builds saved card key", () => {
      expect(paymentKeys.savedCard()).toEqual(["payments", "saved-card"]);
    });

    it("builds invoices key", () => {
      expect(paymentKeys.invoices()).toEqual(["payments", "invoices"]);
    });

    it("builds upgrade preview key with package ID", () => {
      expect(paymentKeys.upgradePreview(5)).toEqual([
        "payments",
        "upgrade-preview",
        5,
      ]);
    });
  });

  // -- useTenantSubscription --
  describe("useTenantSubscription", () => {
    it("fetches subscription data", async () => {
      mockAxiosGet.mockResolvedValue({ data: MOCK_SUBSCRIPTION });

      const { result } = renderHook(() => useTenantSubscription(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.has_subscription).toBe(true);
      expect(result.current.data?.subscription.agent_count).toBe(10);
      expect(mockAxiosGet).toHaveBeenCalledWith("/api/subscription/me/");
    });

    it("can be disabled via options", () => {
      const { result } = renderHook(
        () => useTenantSubscription({ enabled: false }),
        { wrapper: createWrapper() }
      );

      expect(result.current.fetchStatus).toBe("idle");
      expect(mockAxiosGet).not.toHaveBeenCalled();
    });

    it("handles error", async () => {
      mockAxiosGet.mockRejectedValue(new Error("Server error"));

      const { result } = renderHook(() => useTenantSubscription(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // -- useSavedCard --
  describe("useSavedCard", () => {
    it("fetches saved card data", async () => {
      mockAxiosGet.mockResolvedValue({ data: MOCK_SAVED_CARD });

      const { result } = renderHook(() => useSavedCard(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.cards).toHaveLength(1);
      expect(mockAxiosGet).toHaveBeenCalledWith("/api/payments/saved-card/");
    });

    it("handles no card saved (error)", async () => {
      mockAxiosGet.mockRejectedValue(new Error("Not found"));

      const { result } = renderHook(() => useSavedCard(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // -- useInvoices --
  describe("useInvoices", () => {
    it("fetches invoices via generated API", async () => {
      mockListInvoices.mockResolvedValue(MOCK_INVOICES as any);

      const { result } = renderHook(() => useInvoices(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.invoices).toHaveLength(1);
      expect(mockListInvoices).toHaveBeenCalled();
    });

    it("returns empty invoices", async () => {
      mockListInvoices.mockResolvedValue({ invoices: [] } as any);

      const { result } = renderHook(() => useInvoices(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.invoices).toEqual([]);
    });
  });

  // -- usePackages --
  describe("usePackages", () => {
    it("fetches available packages", async () => {
      mockAxiosGet.mockResolvedValue({
        data: [{ id: 1, name: "Basic", price: 29.99 }],
      });

      const { result } = renderHook(() => usePackages(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toHaveLength(1);
      expect(mockAxiosGet).toHaveBeenCalledWith("/api/packages/");
    });
  });

  // -- useUpgradePreview --
  describe("useUpgradePreview", () => {
    it("is disabled by default", () => {
      const { result } = renderHook(() => useUpgradePreview(5), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
      expect(mockAxiosGet).not.toHaveBeenCalled();
    });

    it("is disabled without packageId", () => {
      const { result } = renderHook(
        () => useUpgradePreview(undefined, true),
        { wrapper: createWrapper() }
      );

      expect(result.current.fetchStatus).toBe("idle");
    });

    it("fetches when enabled with packageId", async () => {
      mockAxiosGet.mockResolvedValue({
        data: { prorated_cost: 15.0, new_monthly: 50.0 },
      });

      const { result } = renderHook(() => useUpgradePreview(5, true), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockAxiosGet).toHaveBeenCalledWith("/api/upgrade/preview/", {
        params: { package_id: 5 },
      });
    });
  });

  // -- Mutations --
  describe("useDeleteSavedCard", () => {
    it("calls delete endpoint", async () => {
      mockAxiosDelete.mockResolvedValue({ data: { success: true } });

      const { result } = renderHook(() => useDeleteSavedCard(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate();
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockAxiosDelete).toHaveBeenCalledWith(
        "/api/payments/saved-card/delete/"
      );
    });
  });

  describe("useManualPayment", () => {
    it("posts manual payment data", async () => {
      mockAxiosPost.mockResolvedValue({
        data: { payment_url: "https://pay.example.com" },
      });

      const { result } = renderHook(() => useManualPayment(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ amount: 100, package_id: "5" });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockAxiosPost).toHaveBeenCalledWith("/api/payments/manual/", {
        amount: 100,
        package_id: "5",
      });
    });
  });

  describe("useUpgradeSubscription", () => {
    it("posts upgrade request", async () => {
      mockAxiosPost.mockResolvedValue({ data: { success: true } });

      const { result } = renderHook(() => useUpgradeSubscription(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ package_id: "premium" });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockAxiosPost).toHaveBeenCalledWith(
        "/api/subscription/upgrade/",
        { package_id: "premium" }
      );
    });
  });

  describe("useImmediateUpgrade", () => {
    it("posts immediate upgrade", async () => {
      mockAxiosPost.mockResolvedValue({ data: { success: true } });

      const { result } = renderHook(() => useImmediateUpgrade(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ package_id: 3 });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockAxiosPost).toHaveBeenCalledWith("/api/upgrade/immediate/", {
        package_id: 3,
      });
    });
  });

  describe("useScheduleUpgrade", () => {
    it("posts scheduled upgrade", async () => {
      mockAxiosPost.mockResolvedValue({ data: { success: true } });

      const { result } = renderHook(() => useScheduleUpgrade(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          package_id: 3,
          effective_date: "2024-03-01",
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockAxiosPost).toHaveBeenCalledWith("/api/upgrade/scheduled/", {
        package_id: 3,
        effective_date: "2024-03-01",
      });
    });
  });

  describe("useCancelScheduledUpgrade", () => {
    it("cancels scheduled upgrade", async () => {
      mockAxiosPost.mockResolvedValue({ data: { success: true } });

      const { result } = renderHook(() => useCancelScheduledUpgrade(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate();
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockAxiosPost).toHaveBeenCalledWith(
        "/api/upgrade/cancel-scheduled/"
      );
    });
  });

  describe("useAddNewCard", () => {
    it("posts add card request", async () => {
      mockAxiosPost.mockResolvedValue({
        data: { payment_url: "https://add-card.example.com" },
      });

      const { result } = renderHook(() => useAddNewCard(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ make_default: true });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockAxiosPost).toHaveBeenCalledWith(
        "/api/payments/saved-card/add/",
        { make_default: true }
      );
    });
  });

  describe("useRemoveSavedCard", () => {
    it("deletes card by id", async () => {
      mockAxiosDelete.mockResolvedValue({ data: { success: true } });

      const { result } = renderHook(() => useRemoveSavedCard(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ card_id: 42 });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockAxiosDelete).toHaveBeenCalledWith(
        "/api/payments/saved-card/",
        { data: { card_id: 42 } }
      );
    });
  });

  describe("useSetDefaultCard", () => {
    it("sets default card", async () => {
      mockAxiosPost.mockResolvedValue({ data: { success: true } });

      const { result } = renderHook(() => useSetDefaultCard(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ card_id: 7 });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockAxiosPost).toHaveBeenCalledWith(
        "/api/payments/saved-card/set-default/",
        { card_id: 7 }
      );
    });
  });

  describe("useReactivateSubscription", () => {
    it("reactivates subscription", async () => {
      mockAxiosPost.mockResolvedValue({
        data: { payment_url: "https://reactivate.example.com" },
      });

      const { result } = renderHook(() => useReactivateSubscription(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate();
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockAxiosPost).toHaveBeenCalledWith("/api/payments/reactivate/");
    });

    it("handles reactivation error", async () => {
      mockAxiosPost.mockRejectedValue(new Error("Payment failed"));

      const { result } = renderHook(() => useReactivateSubscription(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate();
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });
});
