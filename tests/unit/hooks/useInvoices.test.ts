/**
 * Tests for useInvoices hooks.
 * Tests list, get single, create, update, and delete mutations.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("@/services/invoiceService", () => ({
  invoiceService: {
    getInvoices: vi.fn(),
    getInvoice: vi.fn(),
    getInvoiceStats: vi.fn(),
    createInvoice: vi.fn(),
    updateInvoice: vi.fn(),
    deleteInvoice: vi.fn(),
    duplicateInvoice: vi.fn(),
    finalizeInvoice: vi.fn(),
    markInvoiceAsPaid: vi.fn(),
    sendInvoiceEmail: vi.fn(),
    downloadInvoicePDF: vi.fn(),
    downloadInvoiceExcel: vi.fn(),
    getSettings: vi.fn(),
    updateSettings: vi.fn(),
    uploadLogo: vi.fn(),
    uploadBadge: vi.fn(),
    uploadSignature: vi.fn(),
    removeLogo: vi.fn(),
    removeBadge: vi.fn(),
    removeSignature: vi.fn(),
    getAvailableItemLists: vi.fn(),
    getLineItems: vi.fn(),
    createLineItem: vi.fn(),
    updateLineItem: vi.fn(),
    deleteLineItem: vi.fn(),
    reorderLineItems: vi.fn(),
    getPayments: vi.fn(),
    recordPayment: vi.fn(),
    updatePayment: vi.fn(),
    deletePayment: vi.fn(),
    getClients: vi.fn(),
    getMaterials: vi.fn(),
    getTemplates: vi.fn(),
    getTemplate: vi.fn(),
    createTemplate: vi.fn(),
    updateTemplate: vi.fn(),
    deleteTemplate: vi.fn(),
  },
}));

import {
  useInvoices,
  useInvoice,
  useInvoiceStats,
  useCreateInvoice,
  useUpdateInvoice,
  useDeleteInvoice,
  useDuplicateInvoice,
  useInvoiceSettings,
  useLineItems,
  useCreateLineItem,
  useDeleteLineItem,
  usePayments,
  useRecordPayment,
  useDeletePayment,
  useInvoiceClients,
  useInvoiceTemplates,
} from "@/hooks/useInvoices";
import { invoiceService } from "@/services/invoiceService";

const mockGetInvoices = vi.mocked(invoiceService.getInvoices);
const mockGetInvoice = vi.mocked(invoiceService.getInvoice);
const mockGetInvoiceStats = vi.mocked(invoiceService.getInvoiceStats);
const mockCreateInvoice = vi.mocked(invoiceService.createInvoice);
const mockUpdateInvoice = vi.mocked(invoiceService.updateInvoice);
const mockDeleteInvoice = vi.mocked(invoiceService.deleteInvoice);
const mockDuplicateInvoice = vi.mocked(invoiceService.duplicateInvoice);
const mockGetSettings = vi.mocked(invoiceService.getSettings);
const mockGetLineItems = vi.mocked(invoiceService.getLineItems);
const mockCreateLineItem = vi.mocked(invoiceService.createLineItem);
const mockDeleteLineItem = vi.mocked(invoiceService.deleteLineItem);
const mockGetPayments = vi.mocked(invoiceService.getPayments);
const mockRecordPayment = vi.mocked(invoiceService.recordPayment);
const mockDeletePayment = vi.mocked(invoiceService.deletePayment);
const mockGetClients = vi.mocked(invoiceService.getClients);
const mockGetTemplates = vi.mocked(invoiceService.getTemplates);

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

describe("useInvoices", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("list query", () => {
    it("fetches invoices", async () => {
      mockGetInvoices.mockResolvedValue({
        count: 1,
        results: [{ id: 1, invoice_number: "INV-001" }],
      } as Awaited<ReturnType<typeof invoiceService.getInvoices>>);

      const { result } = renderHook(() => useInvoices(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.count).toBe(1);
    });

    it("passes filters to service", async () => {
      mockGetInvoices.mockResolvedValue({
        count: 0,
        results: [],
      } as Awaited<ReturnType<typeof invoiceService.getInvoices>>);

      renderHook(() => useInvoices({ status: "draft" } as Parameters<typeof useInvoices>[0]), {
        wrapper: createWrapper(),
      });

      await waitFor(() =>
        expect(mockGetInvoices).toHaveBeenCalledWith({ status: "draft" })
      );
    });

    it("handles API error", async () => {
      mockGetInvoices.mockRejectedValue(new Error("Server error"));

      const { result } = renderHook(() => useInvoices(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe("useInvoice", () => {
    it("fetches invoice by ID", async () => {
      mockGetInvoice.mockResolvedValue({
        id: 1,
        invoice_number: "INV-001",
      } as Awaited<ReturnType<typeof invoiceService.getInvoice>>);

      const { result } = renderHook(() => useInvoice(1), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.invoice_number).toBe("INV-001");
    });

    it("is disabled when id is 0", () => {
      const { result } = renderHook(() => useInvoice(0), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
      expect(mockGetInvoice).not.toHaveBeenCalled();
    });
  });

  describe("useInvoiceStats", () => {
    it("fetches stats", async () => {
      mockGetInvoiceStats.mockResolvedValue({
        total: 10,
        draft: 3,
        finalized: 5,
        paid: 2,
      } as Awaited<ReturnType<typeof invoiceService.getInvoiceStats>>);

      const { result } = renderHook(() => useInvoiceStats(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  describe("useCreateInvoice", () => {
    it("calls createInvoice with data", async () => {
      mockCreateInvoice.mockResolvedValue({
        id: 1,
        invoice_number: "INV-002",
      } as Awaited<ReturnType<typeof invoiceService.createInvoice>>);

      const { result } = renderHook(() => useCreateInvoice(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          client: 1,
          invoice_number: "INV-002",
        } as Parameters<typeof result.current.mutate>[0]);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockCreateInvoice).toHaveBeenCalled();
    });

    it("handles create error", async () => {
      mockCreateInvoice.mockRejectedValue(new Error("Validation error"));

      const { result } = renderHook(() => useCreateInvoice(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          client: 1,
        } as Parameters<typeof result.current.mutate>[0]);
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe("useUpdateInvoice", () => {
    it("calls updateInvoice with id and data", async () => {
      mockUpdateInvoice.mockResolvedValue({
        id: 1,
      } as Awaited<ReturnType<typeof invoiceService.updateInvoice>>);

      const { result } = renderHook(() => useUpdateInvoice(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: 1,
          data: { notes: "Updated" },
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockUpdateInvoice).toHaveBeenCalledWith(1, { notes: "Updated" });
    });
  });

  describe("useDeleteInvoice", () => {
    it("calls deleteInvoice with ID", async () => {
      mockDeleteInvoice.mockResolvedValue(undefined as Awaited<ReturnType<typeof invoiceService.deleteInvoice>>);

      const { result } = renderHook(() => useDeleteInvoice(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(1);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockDeleteInvoice).toHaveBeenCalledWith(1);
    });

    it("handles delete error", async () => {
      mockDeleteInvoice.mockRejectedValue(new Error("Not found"));

      const { result } = renderHook(() => useDeleteInvoice(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(999);
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe("useDuplicateInvoice", () => {
    it("calls duplicateInvoice with ID", async () => {
      mockDuplicateInvoice.mockResolvedValue({
        id: 2,
        invoice_number: "INV-001-COPY",
      } as Awaited<ReturnType<typeof invoiceService.duplicateInvoice>>);

      const { result } = renderHook(() => useDuplicateInvoice(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(1);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockDuplicateInvoice).toHaveBeenCalledWith(1);
    });
  });

  describe("useInvoiceSettings", () => {
    it("fetches settings", async () => {
      mockGetSettings.mockResolvedValue({
        company_name: "Test Co",
      } as Awaited<ReturnType<typeof invoiceService.getSettings>>);

      const { result } = renderHook(() => useInvoiceSettings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  describe("useLineItems", () => {
    it("fetches line items for invoice", async () => {
      mockGetLineItems.mockResolvedValue([
        { id: 1, description: "Item 1" },
      ] as Awaited<ReturnType<typeof invoiceService.getLineItems>>);

      const { result } = renderHook(() => useLineItems(1), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockGetLineItems).toHaveBeenCalledWith(1);
    });

    it("is disabled when invoiceId is 0", () => {
      const { result } = renderHook(() => useLineItems(0), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
      expect(mockGetLineItems).not.toHaveBeenCalled();
    });
  });

  describe("useCreateLineItem", () => {
    it("calls createLineItem with data", async () => {
      mockCreateLineItem.mockResolvedValue({
        id: 1,
        invoice: 5,
        description: "New Item",
      } as Awaited<ReturnType<typeof invoiceService.createLineItem>>);

      const { result } = renderHook(() => useCreateLineItem(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          description: "New Item",
        } as Parameters<typeof result.current.mutate>[0]);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockCreateLineItem).toHaveBeenCalled();
    });
  });

  describe("useDeleteLineItem", () => {
    it("calls deleteLineItem with id", async () => {
      mockDeleteLineItem.mockResolvedValue(undefined as Awaited<ReturnType<typeof invoiceService.deleteLineItem>>);

      const { result } = renderHook(() => useDeleteLineItem(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ id: 1, invoiceId: 5 });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockDeleteLineItem).toHaveBeenCalledWith(1);
    });
  });

  describe("usePayments", () => {
    it("fetches payments for invoice", async () => {
      mockGetPayments.mockResolvedValue([
        { id: 1, amount: "100.00" },
      ] as Awaited<ReturnType<typeof invoiceService.getPayments>>);

      const { result } = renderHook(() => usePayments(1), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockGetPayments).toHaveBeenCalledWith(1);
    });

    it("is disabled when invoiceId is 0", () => {
      const { result } = renderHook(() => usePayments(0), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
    });
  });

  describe("useRecordPayment", () => {
    it("calls recordPayment with data", async () => {
      mockRecordPayment.mockResolvedValue({
        id: 1,
        invoice: 5,
        amount: "50.00",
      } as Awaited<ReturnType<typeof invoiceService.recordPayment>>);

      const { result } = renderHook(() => useRecordPayment(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          amount: "50.00",
        } as Parameters<typeof result.current.mutate>[0]);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  describe("useDeletePayment", () => {
    it("calls deletePayment with id", async () => {
      mockDeletePayment.mockResolvedValue(undefined as Awaited<ReturnType<typeof invoiceService.deletePayment>>);

      const { result } = renderHook(() => useDeletePayment(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ id: 1, invoiceId: 5 });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockDeletePayment).toHaveBeenCalledWith(1);
    });
  });

  describe("useInvoiceClients", () => {
    it("fetches clients with search", async () => {
      mockGetClients.mockResolvedValue([
        { id: 1, name: "Client A" },
      ] as Awaited<ReturnType<typeof invoiceService.getClients>>);

      const { result } = renderHook(() => useInvoiceClients("Client"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockGetClients).toHaveBeenCalledWith("Client");
    });
  });

  describe("useInvoiceTemplates", () => {
    it("fetches templates", async () => {
      mockGetTemplates.mockResolvedValue([
        { id: 1, name: "Default Template" },
      ] as Awaited<ReturnType<typeof invoiceService.getTemplates>>);

      const { result } = renderHook(() => useInvoiceTemplates(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });
});
