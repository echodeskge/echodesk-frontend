/**
 * Tests for useInvoices hooks (src/hooks/useInvoices.ts).
 * Covers all query and mutation hooks: invoices, line items, payments,
 * settings, templates, clients, materials, and file upload/removal hooks.
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
  useFinalizeInvoice,
  useMarkInvoiceAsPaid,
  useSendInvoiceEmail,
  useDownloadInvoicePDF,
  useDownloadInvoiceExcel,
  useInvoiceSettings,
  useUpdateInvoiceSettings,
  useUploadLogo,
  useUploadBadge,
  useUploadSignature,
  useRemoveLogo,
  useRemoveBadge,
  useRemoveSignature,
  useAvailableItemLists,
  useLineItems,
  useCreateLineItem,
  useUpdateLineItem,
  useDeleteLineItem,
  useReorderLineItems,
  usePayments,
  useRecordPayment,
  useUpdatePayment,
  useDeletePayment,
  useInvoiceClients,
  useInvoiceMaterials,
  useInvoiceTemplates,
  useInvoiceTemplate,
  useCreateInvoiceTemplate,
  useUpdateInvoiceTemplate,
  useDeleteInvoiceTemplate,
} from "@/hooks/useInvoices";
import { invoiceService } from "@/services/invoiceService";

const mockGetInvoices = vi.mocked(invoiceService.getInvoices);
const mockGetInvoice = vi.mocked(invoiceService.getInvoice);
const mockGetInvoiceStats = vi.mocked(invoiceService.getInvoiceStats);
const mockCreateInvoice = vi.mocked(invoiceService.createInvoice);
const mockUpdateInvoice = vi.mocked(invoiceService.updateInvoice);
const mockDeleteInvoice = vi.mocked(invoiceService.deleteInvoice);
const mockDuplicateInvoice = vi.mocked(invoiceService.duplicateInvoice);
const mockFinalizeInvoice = vi.mocked(invoiceService.finalizeInvoice);
const mockMarkInvoiceAsPaid = vi.mocked(invoiceService.markInvoiceAsPaid);
const mockSendInvoiceEmail = vi.mocked(invoiceService.sendInvoiceEmail);
const mockDownloadPDF = vi.mocked(invoiceService.downloadInvoicePDF);
const mockDownloadExcel = vi.mocked(invoiceService.downloadInvoiceExcel);
const mockGetSettings = vi.mocked(invoiceService.getSettings);
const mockUpdateSettings = vi.mocked(invoiceService.updateSettings);
const mockUploadLogo = vi.mocked(invoiceService.uploadLogo);
const mockUploadBadge = vi.mocked(invoiceService.uploadBadge);
const mockUploadSignature = vi.mocked(invoiceService.uploadSignature);
const mockRemoveLogo = vi.mocked(invoiceService.removeLogo);
const mockRemoveBadge = vi.mocked(invoiceService.removeBadge);
const mockRemoveSignature = vi.mocked(invoiceService.removeSignature);
const mockGetAvailableItemLists = vi.mocked(invoiceService.getAvailableItemLists);
const mockGetLineItems = vi.mocked(invoiceService.getLineItems);
const mockCreateLineItem = vi.mocked(invoiceService.createLineItem);
const mockUpdateLineItem = vi.mocked(invoiceService.updateLineItem);
const mockDeleteLineItem = vi.mocked(invoiceService.deleteLineItem);
const mockReorderLineItems = vi.mocked(invoiceService.reorderLineItems);
const mockGetPayments = vi.mocked(invoiceService.getPayments);
const mockRecordPayment = vi.mocked(invoiceService.recordPayment);
const mockUpdatePayment = vi.mocked(invoiceService.updatePayment);
const mockDeletePayment = vi.mocked(invoiceService.deletePayment);
const mockGetClients = vi.mocked(invoiceService.getClients);
const mockGetMaterials = vi.mocked(invoiceService.getMaterials);
const mockGetTemplates = vi.mocked(invoiceService.getTemplates);
const mockGetTemplate = vi.mocked(invoiceService.getTemplate);
const mockCreateTemplate = vi.mocked(invoiceService.createTemplate);
const mockUpdateTemplate = vi.mocked(invoiceService.updateTemplate);
const mockDeleteTemplate = vi.mocked(invoiceService.deleteTemplate);

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

describe("useInvoices hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===================== Invoice Queries =====================

  describe("useInvoices", () => {
    it("fetches invoices without filters", async () => {
      mockGetInvoices.mockResolvedValue({
        count: 2,
        results: [
          { id: 1, invoice_number: "INV-001" },
          { id: 2, invoice_number: "INV-002" },
        ],
      } as Awaited<ReturnType<typeof invoiceService.getInvoices>>);

      const { result } = renderHook(() => useInvoices(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.count).toBe(2);
      expect(result.current.data?.results).toHaveLength(2);
    });

    it("passes status filter to service", async () => {
      mockGetInvoices.mockResolvedValue({
        count: 0,
        results: [],
      } as Awaited<ReturnType<typeof invoiceService.getInvoices>>);

      renderHook(() => useInvoices({ status: "draft" }), {
        wrapper: createWrapper(),
      });

      await waitFor(() =>
        expect(mockGetInvoices).toHaveBeenCalledWith({ status: "draft" })
      );
    });

    it("passes date range filters", async () => {
      mockGetInvoices.mockResolvedValue({
        count: 0,
        results: [],
      } as Awaited<ReturnType<typeof invoiceService.getInvoices>>);

      renderHook(
        () =>
          useInvoices({
            date_from: "2024-01-01",
            date_to: "2024-12-31",
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() =>
        expect(mockGetInvoices).toHaveBeenCalledWith({
          date_from: "2024-01-01",
          date_to: "2024-12-31",
        })
      );
    });

    it("passes client filter", async () => {
      mockGetInvoices.mockResolvedValue({
        count: 0,
        results: [],
      } as Awaited<ReturnType<typeof invoiceService.getInvoices>>);

      renderHook(() => useInvoices({ client: 42 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() =>
        expect(mockGetInvoices).toHaveBeenCalledWith({ client: 42 })
      );
    });

    it("passes pagination filter", async () => {
      mockGetInvoices.mockResolvedValue({
        count: 50,
        results: [],
      } as Awaited<ReturnType<typeof invoiceService.getInvoices>>);

      renderHook(() => useInvoices({ page: 3 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() =>
        expect(mockGetInvoices).toHaveBeenCalledWith({ page: 3 })
      );
    });

    it("passes combined filters", async () => {
      mockGetInvoices.mockResolvedValue({
        count: 0,
        results: [],
      } as Awaited<ReturnType<typeof invoiceService.getInvoices>>);

      const filters = {
        status: "paid" as const,
        client: 5,
        search: "consulting",
        ordering: "-created_at",
        page: 2,
      };

      renderHook(() => useInvoices(filters), {
        wrapper: createWrapper(),
      });

      await waitFor(() =>
        expect(mockGetInvoices).toHaveBeenCalledWith(filters)
      );
    });

    it("handles API error gracefully", async () => {
      mockGetInvoices.mockRejectedValue(new Error("Server error"));

      const { result } = renderHook(() => useInvoices(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBeInstanceOf(Error);
    });
  });

  describe("useInvoice", () => {
    it("fetches a single invoice by ID", async () => {
      mockGetInvoice.mockResolvedValue({
        id: 1,
        invoice_number: "INV-001",
        status: "draft",
        total: "118.00",
      } as Awaited<ReturnType<typeof invoiceService.getInvoice>>);

      const { result } = renderHook(() => useInvoice(1), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.invoice_number).toBe("INV-001");
      expect(mockGetInvoice).toHaveBeenCalledWith(1);
    });

    it("is disabled when id is 0", () => {
      const { result } = renderHook(() => useInvoice(0), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
      expect(mockGetInvoice).not.toHaveBeenCalled();
    });

    it("handles retrieval error", async () => {
      mockGetInvoice.mockRejectedValue(new Error("Not found"));

      const { result } = renderHook(() => useInvoice(999), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe("useInvoiceStats", () => {
    it("fetches invoice statistics", async () => {
      mockGetInvoiceStats.mockResolvedValue({
        current_month: { total_invoiced: 5000, total_paid: 3000, count: 15 },
        outstanding_amount: 2000,
        overdue_count: 3,
      } as Awaited<ReturnType<typeof invoiceService.getInvoiceStats>>);

      const { result } = renderHook(() => useInvoiceStats(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toBeDefined();
    });

    it("handles stats error", async () => {
      mockGetInvoiceStats.mockRejectedValue(new Error("Stats unavailable"));

      const { result } = renderHook(() => useInvoiceStats(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // ===================== Invoice Mutations =====================

  describe("useCreateInvoice", () => {
    it("creates an invoice and returns data", async () => {
      mockCreateInvoice.mockResolvedValue({
        id: 10,
        invoice_number: "INV-010",
      } as Awaited<ReturnType<typeof invoiceService.createInvoice>>);

      const { result } = renderHook(() => useCreateInvoice(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          client: 1,
          due_date: "2024-06-01",
          invoice_number: "INV-010",
        } as Parameters<typeof result.current.mutate>[0]);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockCreateInvoice).toHaveBeenCalled();
      expect(result.current.data?.id).toBe(10);
    });

    it("handles validation error on create", async () => {
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
    it("updates invoice with id and data", async () => {
      mockUpdateInvoice.mockResolvedValue({
        id: 1,
        notes: "Updated notes",
      } as Awaited<ReturnType<typeof invoiceService.updateInvoice>>);

      const { result } = renderHook(() => useUpdateInvoice(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ id: 1, data: { notes: "Updated notes" } });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockUpdateInvoice).toHaveBeenCalledWith(1, {
        notes: "Updated notes",
      });
    });

    it("handles update error", async () => {
      mockUpdateInvoice.mockRejectedValue(new Error("Update failed"));

      const { result } = renderHook(() => useUpdateInvoice(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ id: 1, data: { notes: "Bad" } });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe("useDeleteInvoice", () => {
    it("deletes an invoice by ID", async () => {
      mockDeleteInvoice.mockResolvedValue(
        undefined as Awaited<ReturnType<typeof invoiceService.deleteInvoice>>
      );

      const { result } = renderHook(() => useDeleteInvoice(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(1);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockDeleteInvoice).toHaveBeenCalledWith(1);
    });

    it("handles delete error for non-draft invoice", async () => {
      mockDeleteInvoice.mockRejectedValue(
        new Error("Cannot delete finalized invoice")
      );

      const { result } = renderHook(() => useDeleteInvoice(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(5);
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe("useDuplicateInvoice", () => {
    it("duplicates an invoice by ID", async () => {
      mockDuplicateInvoice.mockResolvedValue({
        id: 11,
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
      expect(result.current.data?.id).toBe(11);
    });
  });

  describe("useFinalizeInvoice", () => {
    it("finalizes an invoice", async () => {
      mockFinalizeInvoice.mockResolvedValue({
        id: 1,
        status: "sent",
      } as Awaited<ReturnType<typeof invoiceService.finalizeInvoice>>);

      const { result } = renderHook(() => useFinalizeInvoice(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(1);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFinalizeInvoice).toHaveBeenCalledWith(1);
    });

    it("handles finalize error", async () => {
      mockFinalizeInvoice.mockRejectedValue(
        new Error("Cannot finalize without line items")
      );

      const { result } = renderHook(() => useFinalizeInvoice(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(1);
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe("useMarkInvoiceAsPaid", () => {
    it("marks an invoice as paid", async () => {
      mockMarkInvoiceAsPaid.mockResolvedValue({
        id: 1,
        status: "paid",
      } as Awaited<ReturnType<typeof invoiceService.markInvoiceAsPaid>>);

      const { result } = renderHook(() => useMarkInvoiceAsPaid(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(1);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockMarkInvoiceAsPaid).toHaveBeenCalledWith(1);
    });
  });

  describe("useSendInvoiceEmail", () => {
    it("sends invoice email with data", async () => {
      mockSendInvoiceEmail.mockResolvedValue({ message: "Email sent" });

      const { result } = renderHook(() => useSendInvoiceEmail(), {
        wrapper: createWrapper(),
      });

      const emailData = {
        recipient_email: "client@example.com",
        subject: "Invoice INV-001",
        message: "Please find your invoice attached",
        attach_pdf: true,
      };

      await act(async () => {
        result.current.mutate({ id: 1, data: emailData });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockSendInvoiceEmail).toHaveBeenCalledWith(1, emailData);
    });

    it("sends invoice email with CC recipients", async () => {
      mockSendInvoiceEmail.mockResolvedValue({ message: "Email sent" });

      const { result } = renderHook(() => useSendInvoiceEmail(), {
        wrapper: createWrapper(),
      });

      const emailData = {
        recipient_email: "client@example.com",
        cc_emails: "manager@example.com,finance@example.com",
        subject: "Invoice",
        message: "Your invoice",
      };

      await act(async () => {
        result.current.mutate({ id: 2, data: emailData });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockSendInvoiceEmail).toHaveBeenCalledWith(2, emailData);
    });

    it("handles send email error", async () => {
      mockSendInvoiceEmail.mockRejectedValue(new Error("SMTP error"));

      const { result } = renderHook(() => useSendInvoiceEmail(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: 1,
          data: {
            recipient_email: "bad@example.com",
            subject: "Test",
            message: "Test",
          },
        });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe("useDownloadInvoicePDF", () => {
    it("downloads invoice as PDF blob", async () => {
      const blob = new Blob(["pdf-content"], { type: "application/pdf" });
      mockDownloadPDF.mockResolvedValue(blob);

      const { result } = renderHook(() => useDownloadInvoicePDF(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(1);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockDownloadPDF).toHaveBeenCalledWith(1);
      expect(result.current.data).toBeInstanceOf(Blob);
    });
  });

  describe("useDownloadInvoiceExcel", () => {
    it("downloads invoice as Excel blob", async () => {
      const blob = new Blob(["excel-content"], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      mockDownloadExcel.mockResolvedValue(blob);

      const { result } = renderHook(() => useDownloadInvoiceExcel(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(1);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockDownloadExcel).toHaveBeenCalledWith(1);
    });
  });

  // ===================== Invoice Settings =====================

  describe("useInvoiceSettings", () => {
    it("fetches invoice settings", async () => {
      mockGetSettings.mockResolvedValue({
        id: 1,
        company_name: "Test Company",
        default_currency: "GEL",
      } as Awaited<ReturnType<typeof invoiceService.getSettings>>);

      const { result } = renderHook(() => useInvoiceSettings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockGetSettings).toHaveBeenCalled();
    });

    it("handles settings error", async () => {
      mockGetSettings.mockRejectedValue(new Error("Settings not found"));

      const { result } = renderHook(() => useInvoiceSettings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe("useUpdateInvoiceSettings", () => {
    it("updates invoice settings", async () => {
      mockUpdateSettings.mockResolvedValue({
        id: 1,
        company_name: "Updated Company",
      } as Awaited<ReturnType<typeof invoiceService.updateSettings>>);

      const { result } = renderHook(() => useUpdateInvoiceSettings(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ company_name: "Updated Company" });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockUpdateSettings).toHaveBeenCalledWith({
        company_name: "Updated Company",
      });
    });

    it("handles settings update error", async () => {
      mockUpdateSettings.mockRejectedValue(new Error("Update failed"));

      const { result } = renderHook(() => useUpdateInvoiceSettings(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ company_name: "" });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe("useUploadLogo", () => {
    it("uploads a logo file", async () => {
      mockUploadLogo.mockResolvedValue({
        id: 1,
        logo: "/media/logos/logo.png",
      } as Awaited<ReturnType<typeof invoiceService.uploadLogo>>);

      const { result } = renderHook(() => useUploadLogo(), {
        wrapper: createWrapper(),
      });

      const file = new File(["image"], "logo.png", { type: "image/png" });

      await act(async () => {
        result.current.mutate(file);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockUploadLogo).toHaveBeenCalledWith(file);
    });
  });

  describe("useUploadBadge", () => {
    it("uploads a badge file", async () => {
      mockUploadBadge.mockResolvedValue({
        id: 1,
        badge: "/media/badges/badge.png",
      } as Awaited<ReturnType<typeof invoiceService.uploadBadge>>);

      const { result } = renderHook(() => useUploadBadge(), {
        wrapper: createWrapper(),
      });

      const file = new File(["image"], "badge.png", { type: "image/png" });

      await act(async () => {
        result.current.mutate(file);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockUploadBadge).toHaveBeenCalledWith(file);
    });
  });

  describe("useUploadSignature", () => {
    it("uploads a signature file", async () => {
      mockUploadSignature.mockResolvedValue({
        id: 1,
        signature: "/media/signatures/sig.png",
      } as Awaited<ReturnType<typeof invoiceService.uploadSignature>>);

      const { result } = renderHook(() => useUploadSignature(), {
        wrapper: createWrapper(),
      });

      const file = new File(["image"], "sig.png", { type: "image/png" });

      await act(async () => {
        result.current.mutate(file);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockUploadSignature).toHaveBeenCalledWith(file);
    });
  });

  describe("useRemoveLogo", () => {
    it("removes company logo", async () => {
      mockRemoveLogo.mockResolvedValue({
        id: 1,
        logo: undefined,
      } as Awaited<ReturnType<typeof invoiceService.removeLogo>>);

      const { result } = renderHook(() => useRemoveLogo(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate();
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockRemoveLogo).toHaveBeenCalled();
    });
  });

  describe("useRemoveBadge", () => {
    it("removes badge", async () => {
      mockRemoveBadge.mockResolvedValue({
        id: 1,
        badge: undefined,
      } as Awaited<ReturnType<typeof invoiceService.removeBadge>>);

      const { result } = renderHook(() => useRemoveBadge(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate();
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockRemoveBadge).toHaveBeenCalled();
    });
  });

  describe("useRemoveSignature", () => {
    it("removes signature", async () => {
      mockRemoveSignature.mockResolvedValue({
        id: 1,
        signature: undefined,
      } as Awaited<ReturnType<typeof invoiceService.removeSignature>>);

      const { result } = renderHook(() => useRemoveSignature(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate();
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockRemoveSignature).toHaveBeenCalled();
    });
  });

  describe("useAvailableItemLists", () => {
    it("fetches available item lists", async () => {
      mockGetAvailableItemLists.mockResolvedValue([
        { id: 1, title: "Products", description: "Product catalog" },
        { id: 2, title: "Services", description: "Service list" },
      ]);

      const { result } = renderHook(() => useAvailableItemLists(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toHaveLength(2);
    });
  });

  // ===================== Line Items =====================

  describe("useLineItems", () => {
    it("fetches line items for an invoice", async () => {
      mockGetLineItems.mockResolvedValue({
        count: 2,
        results: [
          { id: 1, description: "Item 1" },
          { id: 2, description: "Item 2" },
        ],
      } as Awaited<ReturnType<typeof invoiceService.getLineItems>>);

      const { result } = renderHook(() => useLineItems(5), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockGetLineItems).toHaveBeenCalledWith(5);
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
    it("creates a line item", async () => {
      mockCreateLineItem.mockResolvedValue({
        id: 3,
        invoice: 5,
        description: "New Service",
      } as Awaited<ReturnType<typeof invoiceService.createLineItem>>);

      const { result } = renderHook(() => useCreateLineItem(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          description: "New Service",
          quantity: "2",
          unit_price: "50.00",
        } as Parameters<typeof result.current.mutate>[0]);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockCreateLineItem).toHaveBeenCalled();
    });

    it("handles create line item error", async () => {
      mockCreateLineItem.mockRejectedValue(
        new Error("Missing required fields")
      );

      const { result } = renderHook(() => useCreateLineItem(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          description: "",
          quantity: "0",
          unit_price: "0",
        } as Parameters<typeof result.current.mutate>[0]);
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe("useUpdateLineItem", () => {
    it("updates a line item by ID", async () => {
      mockUpdateLineItem.mockResolvedValue({
        id: 1,
        invoice: 5,
        quantity: "3",
      } as Awaited<ReturnType<typeof invoiceService.updateLineItem>>);

      const { result } = renderHook(() => useUpdateLineItem(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ id: 1, data: { quantity: "3" } });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockUpdateLineItem).toHaveBeenCalledWith(1, { quantity: "3" });
    });
  });

  describe("useDeleteLineItem", () => {
    it("deletes a line item and passes invoiceId for invalidation", async () => {
      mockDeleteLineItem.mockResolvedValue(
        undefined as Awaited<ReturnType<typeof invoiceService.deleteLineItem>>
      );

      const { result } = renderHook(() => useDeleteLineItem(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ id: 3, invoiceId: 5 });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockDeleteLineItem).toHaveBeenCalledWith(3);
    });
  });

  describe("useReorderLineItems", () => {
    it("reorders line items", async () => {
      mockReorderLineItems.mockResolvedValue(undefined);

      const { result } = renderHook(() => useReorderLineItems(), {
        wrapper: createWrapper(),
      });

      const items = [
        { id: 1, position: 2 },
        { id: 2, position: 0 },
        { id: 3, position: 1 },
      ];

      await act(async () => {
        result.current.mutate({ items, invoiceId: 5 });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockReorderLineItems).toHaveBeenCalledWith(items);
    });
  });

  // ===================== Payments =====================

  describe("usePayments", () => {
    it("fetches payments for an invoice", async () => {
      mockGetPayments.mockResolvedValue({
        count: 1,
        results: [{ id: 1, amount: "100.00", invoice: 5 }],
      } as Awaited<ReturnType<typeof invoiceService.getPayments>>);

      const { result } = renderHook(() => usePayments(5), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockGetPayments).toHaveBeenCalledWith(5);
    });

    it("is disabled when invoiceId is 0", () => {
      const { result } = renderHook(() => usePayments(0), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
      expect(mockGetPayments).not.toHaveBeenCalled();
    });
  });

  describe("useRecordPayment", () => {
    it("records a payment with required data", async () => {
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
          invoice: 5,
        } as Parameters<typeof result.current.mutate>[0]);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockRecordPayment).toHaveBeenCalledWith({
        amount: "50.00",
        invoice: 5,
      });
    });

    it("records a payment with full details", async () => {
      mockRecordPayment.mockResolvedValue({
        id: 2,
        invoice: 5,
        amount: "200.00",
        payment_method: "bank_transfer",
        reference_number: "REF-123",
      } as Awaited<ReturnType<typeof invoiceService.recordPayment>>);

      const { result } = renderHook(() => useRecordPayment(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          amount: "200.00",
          invoice: 5,
          payment_method: "bank_transfer",
          reference_number: "REF-123",
          notes: "Full payment",
        } as Parameters<typeof result.current.mutate>[0]);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  describe("useUpdatePayment", () => {
    it("updates a payment", async () => {
      mockUpdatePayment.mockResolvedValue({
        id: 1,
        invoice: 5,
        amount: "75.00",
      } as Awaited<ReturnType<typeof invoiceService.updatePayment>>);

      const { result } = renderHook(() => useUpdatePayment(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ id: 1, data: { amount: "75.00" } });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockUpdatePayment).toHaveBeenCalledWith(1, { amount: "75.00" });
    });
  });

  describe("useDeletePayment", () => {
    it("deletes a payment", async () => {
      mockDeletePayment.mockResolvedValue(
        undefined as Awaited<ReturnType<typeof invoiceService.deletePayment>>
      );

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

  // ===================== Helper Hooks =====================

  describe("useInvoiceClients", () => {
    it("fetches clients with search term", async () => {
      mockGetClients.mockResolvedValue({
        count: 1,
        results: [{ id: 1, name: "Client A" }],
      } as Awaited<ReturnType<typeof invoiceService.getClients>>);

      const { result } = renderHook(() => useInvoiceClients("Client"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockGetClients).toHaveBeenCalledWith("Client");
    });

    it("fetches clients without search term", async () => {
      mockGetClients.mockResolvedValue({
        count: 3,
        results: [],
      } as Awaited<ReturnType<typeof invoiceService.getClients>>);

      const { result } = renderHook(() => useInvoiceClients(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockGetClients).toHaveBeenCalledWith(undefined);
    });
  });

  describe("useInvoiceMaterials", () => {
    it("fetches materials with search", async () => {
      mockGetMaterials.mockResolvedValue({
        count: 1,
        results: [{ id: 1, name: "Wood" }],
      } as Awaited<ReturnType<typeof invoiceService.getMaterials>>);

      const { result } = renderHook(() => useInvoiceMaterials("Wood"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockGetMaterials).toHaveBeenCalledWith("Wood");
    });

    it("fetches all materials without search", async () => {
      mockGetMaterials.mockResolvedValue({
        count: 5,
        results: [],
      } as Awaited<ReturnType<typeof invoiceService.getMaterials>>);

      const { result } = renderHook(() => useInvoiceMaterials(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockGetMaterials).toHaveBeenCalledWith(undefined);
    });
  });

  // ===================== Templates =====================

  describe("useInvoiceTemplates", () => {
    it("fetches all templates", async () => {
      mockGetTemplates.mockResolvedValue({
        count: 2,
        results: [
          { id: 1, name: "Default" },
          { id: 2, name: "Modern" },
        ],
      } as Awaited<ReturnType<typeof invoiceService.getTemplates>>);

      const { result } = renderHook(() => useInvoiceTemplates(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockGetTemplates).toHaveBeenCalled();
    });
  });

  describe("useInvoiceTemplate", () => {
    it("fetches a single template by ID", async () => {
      mockGetTemplate.mockResolvedValue({
        id: 1,
        name: "Default",
        html_content: "<html></html>",
      } as Awaited<ReturnType<typeof invoiceService.getTemplate>>);

      const { result } = renderHook(() => useInvoiceTemplate(1), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockGetTemplate).toHaveBeenCalledWith(1);
    });

    it("is disabled when id is 0", () => {
      const { result } = renderHook(() => useInvoiceTemplate(0), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe("idle");
      expect(mockGetTemplate).not.toHaveBeenCalled();
    });
  });

  describe("useCreateInvoiceTemplate", () => {
    it("creates a template", async () => {
      mockCreateTemplate.mockResolvedValue({
        id: 3,
        name: "Custom",
      } as Awaited<ReturnType<typeof invoiceService.createTemplate>>);

      const { result } = renderHook(() => useCreateInvoiceTemplate(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          name: "Custom",
          html_content: "<html>Custom</html>",
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockCreateTemplate).toHaveBeenCalledWith({
        name: "Custom",
        html_content: "<html>Custom</html>",
      });
    });
  });

  describe("useUpdateInvoiceTemplate", () => {
    it("updates a template by ID", async () => {
      mockUpdateTemplate.mockResolvedValue({
        id: 1,
        name: "Updated Template",
      } as Awaited<ReturnType<typeof invoiceService.updateTemplate>>);

      const { result } = renderHook(() => useUpdateInvoiceTemplate(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: 1,
          data: { name: "Updated Template" },
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockUpdateTemplate).toHaveBeenCalledWith(1, {
        name: "Updated Template",
      });
    });
  });

  describe("useDeleteInvoiceTemplate", () => {
    it("deletes a template by ID", async () => {
      mockDeleteTemplate.mockResolvedValue(
        undefined as Awaited<ReturnType<typeof invoiceService.deleteTemplate>>
      );

      const { result } = renderHook(() => useDeleteInvoiceTemplate(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate(1);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockDeleteTemplate).toHaveBeenCalledWith(1);
    });
  });
});
