/**
 * Tests for InvoiceService (src/services/invoiceService.ts).
 * Covers all invoice CRUD operations, line item management, payment recording,
 * PDF/Excel download, settings management, templates, and helper endpoints.
 *
 * Mock return types are validated against generated API signatures.
 * Run `npm run generate` to refresh them from the backend schema.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

import type {
  InvoiceDetail,
  InvoiceLineItem,
  InvoicePayment,
  InvoiceSettings,
  InvoiceTemplate,
  PaginatedInvoiceListList,
  PaginatedInvoiceLineItemList,
  PaginatedInvoicePaymentList,
  PaginatedClientList,
  PaginatedListItemMaterialList,
  PaginatedInvoiceTemplateList,
  InvoiceCreateUpdateRequest,
  InvoiceLineItemRequest,
  InvoicePaymentRequest,
  InvoiceTemplateRequest,
} from "@/api/generated/interfaces";

// Mock generated API functions
vi.mock("@/api/generated", () => ({
  invoicesInvoicesList: vi.fn(),
  invoicesInvoicesRetrieve: vi.fn(),
  invoicesInvoicesCreate: vi.fn(),
  invoicesInvoicesPartialUpdate: vi.fn(),
  invoicesInvoicesDestroy: vi.fn(),
  invoicesInvoicesDuplicateCreate: vi.fn(),
  invoicesInvoicesFinalizeCreate: vi.fn(),
  invoicesInvoicesMarkPaidCreate: vi.fn(),
  invoicesInvoicesSendEmailCreate: vi.fn(),
  invoicesInvoicesPdfRetrieve: vi.fn(),
  invoicesInvoicesExcelRetrieve: vi.fn(),
  invoicesInvoicesStatsRetrieve: vi.fn(),
  invoicesSettingsList: vi.fn(),
  invoicesSettingsCreate: vi.fn(),
  invoicesSettingsUploadLogoCreate: vi.fn(),
  invoicesSettingsUploadBadgeCreate: vi.fn(),
  invoicesSettingsUploadSignatureCreate: vi.fn(),
  invoicesSettingsAvailableItemlistsRetrieve: vi.fn(),
  invoicesLineItemsList: vi.fn(),
  invoicesLineItemsCreate: vi.fn(),
  invoicesLineItemsRetrieve: vi.fn(),
  invoicesLineItemsPartialUpdate: vi.fn(),
  invoicesLineItemsDestroy: vi.fn(),
  invoicesLineItemsReorderCreate: vi.fn(),
  invoicesPaymentsList: vi.fn(),
  invoicesPaymentsCreate: vi.fn(),
  invoicesPaymentsRetrieve: vi.fn(),
  invoicesPaymentsPartialUpdate: vi.fn(),
  invoicesPaymentsDestroy: vi.fn(),
  invoicesClientsList: vi.fn(),
  invoicesMaterialsList: vi.fn(),
  invoicesTemplatesList: vi.fn(),
  invoicesTemplatesCreate: vi.fn(),
  invoicesTemplatesRetrieve: vi.fn(),
  invoicesTemplatesPartialUpdate: vi.fn(),
  invoicesTemplatesDestroy: vi.fn(),
}));

// Mock axios
const mockAxiosGet = vi.fn();
const mockAxiosPost = vi.fn();
const mockAxiosPatch = vi.fn();
const mockAxiosDelete = vi.fn();

vi.mock("@/api/axios", () => ({
  default: {
    get: (...args: any[]) => mockAxiosGet(...args),
    post: (...args: any[]) => mockAxiosPost(...args),
    patch: (...args: any[]) => mockAxiosPatch(...args),
    delete: (...args: any[]) => mockAxiosDelete(...args),
  },
}));

import { invoiceService } from "@/services/invoiceService";
import {
  invoicesInvoicesRetrieve,
  invoicesInvoicesCreate,
  invoicesInvoicesPartialUpdate,
  invoicesInvoicesDestroy,
  invoicesInvoicesDuplicateCreate,
  invoicesInvoicesFinalizeCreate,
  invoicesInvoicesMarkPaidCreate,
  invoicesLineItemsCreate,
  invoicesLineItemsPartialUpdate,
  invoicesLineItemsDestroy,
  invoicesPaymentsCreate,
  invoicesPaymentsPartialUpdate,
  invoicesPaymentsDestroy,
  invoicesTemplatesRetrieve,
  invoicesTemplatesCreate,
  invoicesTemplatesPartialUpdate,
  invoicesTemplatesDestroy,
  invoicesSettingsAvailableItemlistsRetrieve,
} from "@/api/generated";

const mockRetrieve = vi.mocked(invoicesInvoicesRetrieve);
const mockCreate = vi.mocked(invoicesInvoicesCreate);
const mockPartialUpdate = vi.mocked(invoicesInvoicesPartialUpdate);
const mockDestroy = vi.mocked(invoicesInvoicesDestroy);
const mockDuplicate = vi.mocked(invoicesInvoicesDuplicateCreate);
const mockFinalize = vi.mocked(invoicesInvoicesFinalizeCreate);
const mockMarkPaid = vi.mocked(invoicesInvoicesMarkPaidCreate);
const mockLineItemsCreate = vi.mocked(invoicesLineItemsCreate);
const mockLineItemsUpdate = vi.mocked(invoicesLineItemsPartialUpdate);
const mockLineItemsDestroy = vi.mocked(invoicesLineItemsDestroy);
const mockPaymentsCreate = vi.mocked(invoicesPaymentsCreate);
const mockPaymentsUpdate = vi.mocked(invoicesPaymentsPartialUpdate);
const mockPaymentsDestroy = vi.mocked(invoicesPaymentsDestroy);
const mockTemplatesRetrieve = vi.mocked(invoicesTemplatesRetrieve);
const mockTemplatesCreate = vi.mocked(invoicesTemplatesCreate);
const mockTemplatesUpdate = vi.mocked(invoicesTemplatesPartialUpdate);
const mockTemplatesDestroy = vi.mocked(invoicesTemplatesDestroy);
const mockAvailableItemlists = vi.mocked(
  invoicesSettingsAvailableItemlistsRetrieve
);

// ==================== Test Fixtures ====================

const MOCK_INVOICE_DETAIL: InvoiceDetail = {
  id: 1,
  uuid: "abc-123",
  invoice_number: "INV-001",
  status: "draft" as any,
  client_name: "Test Client",
  client_details: "",
  issue_date: "2024-01-01",
  due_date: "2024-02-01",
  currency: "GEL",
  subtotal: "100.00",
  tax_amount: "18.00",
  discount_amount: "0.00",
  total: "118.00",
  paid_amount: "0.00",
  balance: "118.00",
  notes: "",
  terms_and_conditions: "",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  created_by_name: "Test User",
  template_name: "Default",
  pdf_url: "",
  pdf_generated_at: "",
  line_items: [],
  payments: [],
  is_overdue: "false",
};

const MOCK_LINE_ITEM: InvoiceLineItem = {
  id: 1,
  line_subtotal: "100.00",
  discount_amount: "0.00",
  taxable_amount: "100.00",
  tax_amount: "18.00",
  line_total: "118.00",
  product_name: "Service A",
  list_item_label: "",
  description: "Consulting service",
  quantity: "1",
  unit_price: "100.00",
  tax_rate: "18.00",
  discount_percent: "0.00",
  position: 0,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const MOCK_PAYMENT: InvoicePayment = {
  id: 1,
  recorded_by_name: "Test User",
  payment_date: "2024-01-15",
  amount: "50.00",
  payment_method: "bank_transfer" as any,
  reference_number: "PAY-001",
  notes: "",
  created_at: "2024-01-15T00:00:00Z",
  updated_at: "2024-01-15T00:00:00Z",
  invoice: 1,
  recorded_by: 1,
};

const MOCK_SETTINGS: InvoiceSettings = {
  id: 1,
  client_itemlist_details: "",
  company_name: "Test Company",
  tax_id: "123456789",
  registration_number: "REG-001",
  address: "123 Test St",
  phone: "+995555000000",
  email: "invoices@test.com",
  website: "https://test.com",
  invoice_prefix: "INV-",
  starting_number: 1,
  default_currency: "GEL",
  default_tax_rate: "18.00",
  default_due_days: 30,
};

const MOCK_TEMPLATE: InvoiceTemplate = {
  id: 1,
  name: "Default",
  created_by_name: "Test User",
  html_content: "<html><body>Invoice</body></html>",
  css_styles: "body { font-family: sans-serif; }",
  is_default: true,
  is_active: true,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  created_by: 1,
};

describe("InvoiceService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==================== Invoice CRUD ====================

  describe("getInvoices", () => {
    it("returns paginated invoice list with no filters", async () => {
      const response: PaginatedInvoiceListList = {
        count: 2,
        results: [
          {
            id: 1,
            uuid: "abc-123",
            invoice_number: "INV-001",
            status: "draft" as any,
            client_name: "Client A",
            due_date: "2024-02-01",
            balance: "118.00",
            is_overdue: "false",
            created_at: "2024-01-01T00:00:00Z",
          },
          {
            id: 2,
            uuid: "def-456",
            invoice_number: "INV-002",
            status: "sent" as any,
            client_name: "Client B",
            due_date: "2024-03-01",
            balance: "250.00",
            is_overdue: "false",
            created_at: "2024-01-15T00:00:00Z",
          },
        ],
      };

      mockAxiosGet.mockResolvedValue({ data: response });

      const result = await invoiceService.getInvoices();

      expect(result.count).toBe(2);
      expect(result.results).toHaveLength(2);
      expect(mockAxiosGet).toHaveBeenCalledWith("/api/invoices/invoices/");
    });

    it("passes status filter as query param", async () => {
      mockAxiosGet.mockResolvedValue({ data: { count: 0, results: [] } });

      await invoiceService.getInvoices({ status: "paid" });

      const url = mockAxiosGet.mock.calls[0][0];
      expect(url).toContain("status=paid");
    });

    it("passes client filter as query param", async () => {
      mockAxiosGet.mockResolvedValue({ data: { count: 0, results: [] } });

      await invoiceService.getInvoices({ client: 42 });

      const url = mockAxiosGet.mock.calls[0][0];
      expect(url).toContain("client=42");
    });

    it("passes currency filter", async () => {
      mockAxiosGet.mockResolvedValue({ data: { count: 0, results: [] } });

      await invoiceService.getInvoices({ currency: "USD" });

      const url = mockAxiosGet.mock.calls[0][0];
      expect(url).toContain("currency=USD");
    });

    it("passes date range filters", async () => {
      mockAxiosGet.mockResolvedValue({ data: { count: 0, results: [] } });

      await invoiceService.getInvoices({
        date_from: "2024-01-01",
        date_to: "2024-12-31",
      });

      const url = mockAxiosGet.mock.calls[0][0];
      expect(url).toContain("date_from=2024-01-01");
      expect(url).toContain("date_to=2024-12-31");
    });

    it("passes overdue filter", async () => {
      mockAxiosGet.mockResolvedValue({ data: { count: 0, results: [] } });

      await invoiceService.getInvoices({ overdue: true });

      const url = mockAxiosGet.mock.calls[0][0];
      expect(url).toContain("overdue=true");
    });

    it("passes search filter", async () => {
      mockAxiosGet.mockResolvedValue({ data: { count: 0, results: [] } });

      await invoiceService.getInvoices({ search: "consulting" });

      const url = mockAxiosGet.mock.calls[0][0];
      expect(url).toContain("search=consulting");
    });

    it("passes ordering filter", async () => {
      mockAxiosGet.mockResolvedValue({ data: { count: 0, results: [] } });

      await invoiceService.getInvoices({ ordering: "-total" });

      const url = mockAxiosGet.mock.calls[0][0];
      expect(url).toContain("ordering=-total");
    });

    it("passes page filter", async () => {
      mockAxiosGet.mockResolvedValue({ data: { count: 0, results: [] } });

      await invoiceService.getInvoices({ page: 3 });

      const url = mockAxiosGet.mock.calls[0][0];
      expect(url).toContain("page=3");
    });

    it("passes multiple combined filters", async () => {
      mockAxiosGet.mockResolvedValue({ data: { count: 0, results: [] } });

      await invoiceService.getInvoices({
        status: "paid",
        search: "test",
        page: 2,
        ordering: "-created_at",
      });

      const url = mockAxiosGet.mock.calls[0][0];
      expect(url).toContain("status=paid");
      expect(url).toContain("search=test");
      expect(url).toContain("page=2");
      expect(url).toContain("ordering=-created_at");
    });

    it("omits empty filter values", async () => {
      mockAxiosGet.mockResolvedValue({ data: { count: 0, results: [] } });

      await invoiceService.getInvoices({});

      const url = mockAxiosGet.mock.calls[0][0];
      expect(url).toBe("/api/invoices/invoices/");
    });

    it("propagates API error", async () => {
      mockAxiosGet.mockRejectedValue(new Error("Network error"));

      await expect(invoiceService.getInvoices()).rejects.toThrow(
        "Network error"
      );
    });
  });

  describe("getInvoice", () => {
    it("returns invoice detail by ID via generated function", async () => {
      mockRetrieve.mockResolvedValue(MOCK_INVOICE_DETAIL);

      const result = await invoiceService.getInvoice(1);

      expect(result.id).toBe(1);
      expect(result.invoice_number).toBe("INV-001");
      expect(mockRetrieve).toHaveBeenCalledWith(1);
    });

    it("propagates error from generated function", async () => {
      mockRetrieve.mockRejectedValue(new Error("Not found"));

      await expect(invoiceService.getInvoice(999)).rejects.toThrow(
        "Not found"
      );
    });
  });

  describe("createInvoice", () => {
    it("creates invoice with required data", async () => {
      mockCreate.mockResolvedValue(MOCK_INVOICE_DETAIL as any);

      const data: InvoiceCreateUpdateRequest = {
        client: 1,
        due_date: "2024-02-01",
      };

      const result = await invoiceService.createInvoice(data);

      expect(result.id).toBe(1);
      expect(mockCreate).toHaveBeenCalledWith(data);
    });

    it("creates invoice with all optional fields", async () => {
      mockCreate.mockResolvedValue(MOCK_INVOICE_DETAIL as any);

      const data: InvoiceCreateUpdateRequest = {
        client: 1,
        due_date: "2024-02-01",
        issue_date: "2024-01-01",
        currency: "USD",
        notes: "Test notes",
        terms_and_conditions: "Payment due in 30 days",
        template: 1,
      };

      const result = await invoiceService.createInvoice(data);

      expect(result.id).toBe(1);
      expect(mockCreate).toHaveBeenCalledWith(data);
    });
  });

  describe("updateInvoice", () => {
    it("partially updates invoice fields", async () => {
      const updated = { ...MOCK_INVOICE_DETAIL, notes: "Updated notes" };
      mockPartialUpdate.mockResolvedValue(updated as any);

      const result = await invoiceService.updateInvoice(1, {
        notes: "Updated notes",
      });

      expect(result.notes).toBe("Updated notes");
      expect(mockPartialUpdate).toHaveBeenCalledWith(1, {
        notes: "Updated notes",
      });
    });

    it("updates multiple fields at once", async () => {
      const updated = {
        ...MOCK_INVOICE_DETAIL,
        currency: "USD",
        due_date: "2024-03-01",
      };
      mockPartialUpdate.mockResolvedValue(updated as any);

      const result = await invoiceService.updateInvoice(1, {
        currency: "USD",
        due_date: "2024-03-01",
      });

      expect(result.currency).toBe("USD");
      expect(mockPartialUpdate).toHaveBeenCalledWith(1, {
        currency: "USD",
        due_date: "2024-03-01",
      });
    });
  });

  describe("deleteInvoice", () => {
    it("deletes invoice by ID", async () => {
      mockDestroy.mockResolvedValue(undefined);

      await invoiceService.deleteInvoice(1);

      expect(mockDestroy).toHaveBeenCalledWith(1);
    });

    it("propagates error for non-existent invoice", async () => {
      mockDestroy.mockRejectedValue(new Error("Not found"));

      await expect(invoiceService.deleteInvoice(999)).rejects.toThrow(
        "Not found"
      );
    });
  });

  describe("duplicateInvoice", () => {
    it("duplicates invoice by ID", async () => {
      const duplicated = { ...MOCK_INVOICE_DETAIL, id: 2, invoice_number: "INV-002" };
      mockDuplicate.mockResolvedValue(duplicated as any);

      const result = await invoiceService.duplicateInvoice(1);

      expect(result.id).toBe(2);
      expect(mockDuplicate).toHaveBeenCalledWith(1, expect.anything());
    });
  });

  describe("finalizeInvoice", () => {
    it("finalizes invoice (transitions from draft)", async () => {
      const finalized = { ...MOCK_INVOICE_DETAIL, status: "sent" as any };
      mockFinalize.mockResolvedValue(finalized as any);

      const result = await invoiceService.finalizeInvoice(1);

      expect(mockFinalize).toHaveBeenCalledWith(1, expect.anything());
    });

    it("propagates error when finalize fails", async () => {
      mockFinalize.mockRejectedValue(
        new Error("Invoice has no line items")
      );

      await expect(invoiceService.finalizeInvoice(1)).rejects.toThrow(
        "Invoice has no line items"
      );
    });
  });

  describe("markInvoiceAsPaid", () => {
    it("marks invoice as paid", async () => {
      const paid = { ...MOCK_INVOICE_DETAIL, status: "paid" as any };
      mockMarkPaid.mockResolvedValue(paid as any);

      await invoiceService.markInvoiceAsPaid(1);

      expect(mockMarkPaid).toHaveBeenCalledWith(1, expect.anything());
    });
  });

  // ==================== Email & Download ====================

  describe("sendInvoiceEmail", () => {
    it("sends invoice email with required fields", async () => {
      mockAxiosPost.mockResolvedValue({
        data: { message: "Email sent successfully" },
      });

      const result = await invoiceService.sendInvoiceEmail(1, {
        recipient_email: "client@example.com",
        subject: "Your Invoice INV-001",
        message: "Please find your invoice attached.",
      });

      expect(result.message).toBe("Email sent successfully");
      expect(mockAxiosPost).toHaveBeenCalledWith(
        "/api/invoices/invoices/1/send_email/",
        {
          recipient_email: "client@example.com",
          subject: "Your Invoice INV-001",
          message: "Please find your invoice attached.",
        }
      );
    });

    it("sends with CC and PDF attachment", async () => {
      mockAxiosPost.mockResolvedValue({
        data: { message: "Email sent" },
      });

      await invoiceService.sendInvoiceEmail(1, {
        recipient_email: "client@example.com",
        cc_emails: "manager@example.com",
        subject: "Invoice",
        message: "Your invoice",
        attach_pdf: true,
      });

      expect(mockAxiosPost).toHaveBeenCalledWith(
        "/api/invoices/invoices/1/send_email/",
        expect.objectContaining({
          cc_emails: "manager@example.com",
          attach_pdf: true,
        })
      );
    });
  });

  describe("downloadInvoicePDF", () => {
    it("downloads PDF as blob", async () => {
      const blob = new Blob(["pdf-content"], { type: "application/pdf" });
      mockAxiosGet.mockResolvedValue({ data: blob });

      const result = await invoiceService.downloadInvoicePDF(1);

      expect(result).toBeInstanceOf(Blob);
      expect(mockAxiosGet).toHaveBeenCalledWith(
        "/api/invoices/invoices/1/pdf/",
        { responseType: "blob" }
      );
    });

    it("propagates error on PDF download failure", async () => {
      mockAxiosGet.mockRejectedValue(new Error("PDF not generated"));

      await expect(invoiceService.downloadInvoicePDF(1)).rejects.toThrow(
        "PDF not generated"
      );
    });
  });

  describe("downloadInvoiceExcel", () => {
    it("downloads Excel as blob", async () => {
      const blob = new Blob(["excel-content"], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      mockAxiosGet.mockResolvedValue({ data: blob });

      const result = await invoiceService.downloadInvoiceExcel(1);

      expect(result).toBeInstanceOf(Blob);
      expect(mockAxiosGet).toHaveBeenCalledWith(
        "/api/invoices/invoices/1/excel/",
        { responseType: "blob" }
      );
    });
  });

  // ==================== Invoice Stats ====================

  describe("getInvoiceStats", () => {
    it("returns invoice statistics", async () => {
      const stats = {
        current_month: { total_invoiced: 10000, total_paid: 7500, count: 20 },
        outstanding_amount: 2500,
        overdue_count: 4,
      };

      mockAxiosGet.mockResolvedValue({ data: stats });

      const result = await invoiceService.getInvoiceStats();

      expect(result.current_month.total_invoiced).toBe(10000);
      expect(result.current_month.total_paid).toBe(7500);
      expect(result.current_month.count).toBe(20);
      expect(result.outstanding_amount).toBe(2500);
      expect(result.overdue_count).toBe(4);
    });

    it("calls correct endpoint", async () => {
      mockAxiosGet.mockResolvedValue({
        data: {
          current_month: { total_invoiced: 0, total_paid: 0, count: 0 },
          outstanding_amount: 0,
          overdue_count: 0,
        },
      });

      await invoiceService.getInvoiceStats();

      expect(mockAxiosGet).toHaveBeenCalledWith(
        "/api/invoices/invoices/stats/"
      );
    });
  });

  // ==================== Invoice Settings ====================

  describe("getSettings", () => {
    it("returns invoice settings as singleton", async () => {
      mockAxiosGet.mockResolvedValue({ data: MOCK_SETTINGS });

      const result = await invoiceService.getSettings();

      expect(result.company_name).toBe("Test Company");
      expect(result.default_currency).toBe("GEL");
      expect(result.default_tax_rate).toBe("18.00");
      expect(mockAxiosGet).toHaveBeenCalledWith("/api/invoices/settings/");
    });
  });

  describe("updateSettings", () => {
    it("fetches current settings then patches", async () => {
      // First call: getSettings
      mockAxiosGet.mockResolvedValue({ data: MOCK_SETTINGS });
      // Second call: patch
      mockAxiosPatch.mockResolvedValue({
        data: { ...MOCK_SETTINGS, company_name: "New Company" },
      });

      const result = await invoiceService.updateSettings({
        company_name: "New Company",
      });

      expect(result.company_name).toBe("New Company");
      expect(mockAxiosPatch).toHaveBeenCalledWith(
        `/api/invoices/settings/${MOCK_SETTINGS.id}/`,
        { company_name: "New Company" }
      );
    });

    it("updates multiple settings fields", async () => {
      mockAxiosGet.mockResolvedValue({ data: MOCK_SETTINGS });
      mockAxiosPatch.mockResolvedValue({
        data: {
          ...MOCK_SETTINGS,
          default_currency: "USD",
          default_due_days: 60,
        },
      });

      const result = await invoiceService.updateSettings({
        default_currency: "USD",
        default_due_days: 60,
      });

      expect(result.default_currency).toBe("USD");
      expect(result.default_due_days).toBe(60);
    });
  });

  describe("uploadLogo", () => {
    it("uploads logo as multipart form data", async () => {
      mockAxiosPost.mockResolvedValue({
        data: { ...MOCK_SETTINGS, logo: "/media/logos/logo.png" },
      });

      const file = new File(["image-data"], "logo.png", {
        type: "image/png",
      });
      const result = await invoiceService.uploadLogo(file);

      expect(result.logo).toBe("/media/logos/logo.png");
      expect(mockAxiosPost).toHaveBeenCalledWith(
        "/api/invoices/settings/upload-logo/",
        expect.any(FormData),
        { headers: { "Content-Type": "multipart/form-data" } }
      );
    });
  });

  describe("uploadBadge", () => {
    it("uploads badge as multipart form data", async () => {
      mockAxiosPost.mockResolvedValue({
        data: { ...MOCK_SETTINGS, badge: "/media/badges/badge.png" },
      });

      const file = new File(["image-data"], "badge.png", {
        type: "image/png",
      });
      const result = await invoiceService.uploadBadge(file);

      expect(result.badge).toBe("/media/badges/badge.png");
      expect(mockAxiosPost).toHaveBeenCalledWith(
        "/api/invoices/settings/upload-badge/",
        expect.any(FormData),
        { headers: { "Content-Type": "multipart/form-data" } }
      );
    });
  });

  describe("uploadSignature", () => {
    it("uploads signature as multipart form data", async () => {
      mockAxiosPost.mockResolvedValue({
        data: { ...MOCK_SETTINGS, signature: "/media/signatures/sig.png" },
      });

      const file = new File(["image-data"], "sig.png", {
        type: "image/png",
      });
      const result = await invoiceService.uploadSignature(file);

      expect(result.signature).toBe("/media/signatures/sig.png");
      expect(mockAxiosPost).toHaveBeenCalledWith(
        "/api/invoices/settings/upload-signature/",
        expect.any(FormData),
        { headers: { "Content-Type": "multipart/form-data" } }
      );
    });
  });

  describe("removeLogo", () => {
    it("calls remove-logo endpoint", async () => {
      mockAxiosDelete.mockResolvedValue({
        data: { ...MOCK_SETTINGS, logo: null },
      });

      const result = await invoiceService.removeLogo();

      expect(mockAxiosDelete).toHaveBeenCalledWith(
        "/api/invoices/settings/remove-logo/"
      );
    });
  });

  describe("removeBadge", () => {
    it("calls remove-badge endpoint", async () => {
      mockAxiosDelete.mockResolvedValue({
        data: { ...MOCK_SETTINGS, badge: null },
      });

      await invoiceService.removeBadge();

      expect(mockAxiosDelete).toHaveBeenCalledWith(
        "/api/invoices/settings/remove-badge/"
      );
    });
  });

  describe("removeSignature", () => {
    it("calls remove-signature endpoint", async () => {
      mockAxiosDelete.mockResolvedValue({
        data: { ...MOCK_SETTINGS, signature: null },
      });

      await invoiceService.removeSignature();

      expect(mockAxiosDelete).toHaveBeenCalledWith(
        "/api/invoices/settings/remove-signature/"
      );
    });
  });

  // ==================== Line Items ====================

  describe("getLineItems", () => {
    it("returns line items for an invoice", async () => {
      const response: PaginatedInvoiceLineItemList = {
        count: 2,
        results: [
          MOCK_LINE_ITEM,
          { ...MOCK_LINE_ITEM, id: 2, description: "Design work" },
        ],
      };

      mockAxiosGet.mockResolvedValue({ data: response });

      const result = await invoiceService.getLineItems(5);

      expect(result.count).toBe(2);
      expect(result.results).toHaveLength(2);
      expect(mockAxiosGet).toHaveBeenCalledWith(
        "/api/invoices/line-items/?invoice_id=5"
      );
    });
  });

  describe("createLineItem", () => {
    it("creates a line item via generated function", async () => {
      mockLineItemsCreate.mockResolvedValue(MOCK_LINE_ITEM);

      const data: InvoiceLineItemRequest = {
        description: "Consulting",
        quantity: "1",
        unit_price: "100.00",
      };

      const result = await invoiceService.createLineItem(data);

      expect(result.id).toBe(1);
      expect(result.description).toBe("Consulting service");
      expect(mockLineItemsCreate).toHaveBeenCalledWith(data);
    });

    it("creates line item with tax and discount", async () => {
      const itemWithExtras = {
        ...MOCK_LINE_ITEM,
        tax_rate: "20.00",
        discount_percent: "10.00",
      };
      mockLineItemsCreate.mockResolvedValue(itemWithExtras);

      const data: InvoiceLineItemRequest = {
        description: "Premium service",
        quantity: "2",
        unit_price: "200.00",
        tax_rate: "20.00",
        discount_percent: "10.00",
      };

      const result = await invoiceService.createLineItem(data);

      expect(result.tax_rate).toBe("20.00");
      expect(result.discount_percent).toBe("10.00");
    });
  });

  describe("updateLineItem", () => {
    it("partially updates a line item", async () => {
      const updated = { ...MOCK_LINE_ITEM, quantity: "5" };
      mockLineItemsUpdate.mockResolvedValue(updated);

      const result = await invoiceService.updateLineItem(1, {
        quantity: "5",
      });

      expect(result.quantity).toBe("5");
      expect(mockLineItemsUpdate).toHaveBeenCalledWith(1, { quantity: "5" });
    });
  });

  describe("deleteLineItem", () => {
    it("deletes a line item by ID", async () => {
      mockLineItemsDestroy.mockResolvedValue(undefined);

      await invoiceService.deleteLineItem(1);

      expect(mockLineItemsDestroy).toHaveBeenCalledWith(1);
    });
  });

  describe("reorderLineItems", () => {
    it("sends reorder request with new positions", async () => {
      mockAxiosPost.mockResolvedValue({ data: {} });

      const items = [
        { id: 1, position: 2 },
        { id: 2, position: 0 },
        { id: 3, position: 1 },
      ];

      await invoiceService.reorderLineItems(items);

      expect(mockAxiosPost).toHaveBeenCalledWith(
        "/api/invoices/line-items/reorder/",
        { items }
      );
    });
  });

  // ==================== Payments ====================

  describe("getPayments", () => {
    it("returns payments for an invoice", async () => {
      const response: PaginatedInvoicePaymentList = {
        count: 1,
        results: [MOCK_PAYMENT],
      };

      mockAxiosGet.mockResolvedValue({ data: response });

      const result = await invoiceService.getPayments(1);

      expect(result.count).toBe(1);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].amount).toBe("50.00");
      expect(mockAxiosGet).toHaveBeenCalledWith(
        "/api/invoices/payments/?invoice_id=1"
      );
    });
  });

  describe("recordPayment", () => {
    it("records a payment with minimal data", async () => {
      mockPaymentsCreate.mockResolvedValue(MOCK_PAYMENT);

      const data: InvoicePaymentRequest = {
        amount: "50.00",
        invoice: 1,
      };

      const result = await invoiceService.recordPayment(data);

      expect(result.id).toBe(1);
      expect(result.amount).toBe("50.00");
      expect(mockPaymentsCreate).toHaveBeenCalledWith(data);
    });

    it("records a payment with full details", async () => {
      const fullPayment = {
        ...MOCK_PAYMENT,
        payment_method: "credit_card" as any,
        reference_number: "CC-456",
        notes: "Visa ending 4242",
      };
      mockPaymentsCreate.mockResolvedValue(fullPayment);

      const data: InvoicePaymentRequest = {
        amount: "50.00",
        invoice: 1,
        payment_method: "credit_card" as any,
        reference_number: "CC-456",
        notes: "Visa ending 4242",
      };

      const result = await invoiceService.recordPayment(data);

      expect(result.reference_number).toBe("CC-456");
    });
  });

  describe("updatePayment", () => {
    it("partially updates a payment", async () => {
      const updated = { ...MOCK_PAYMENT, amount: "75.00" };
      mockPaymentsUpdate.mockResolvedValue(updated);

      const result = await invoiceService.updatePayment(1, {
        amount: "75.00",
      });

      expect(result.amount).toBe("75.00");
      expect(mockPaymentsUpdate).toHaveBeenCalledWith(1, {
        amount: "75.00",
      });
    });
  });

  describe("deletePayment", () => {
    it("deletes a payment by ID", async () => {
      mockPaymentsDestroy.mockResolvedValue(undefined);

      await invoiceService.deletePayment(1);

      expect(mockPaymentsDestroy).toHaveBeenCalledWith(1);
    });
  });

  // ==================== Helper Endpoints ====================

  describe("getClients", () => {
    it("returns paginated client list with default page_size", async () => {
      mockAxiosGet.mockResolvedValue({
        data: { count: 2, results: [{ id: 1 }, { id: 2 }] },
      });

      const result = await invoiceService.getClients();

      expect(result.count).toBe(2);
      const url = mockAxiosGet.mock.calls[0][0];
      expect(url).toContain("page_size=100");
    });

    it("passes search parameter", async () => {
      mockAxiosGet.mockResolvedValue({ data: { count: 0, results: [] } });

      await invoiceService.getClients("Acme");

      const url = mockAxiosGet.mock.calls[0][0];
      expect(url).toContain("search=Acme");
    });

    it("omits search when not provided", async () => {
      mockAxiosGet.mockResolvedValue({ data: { count: 0, results: [] } });

      await invoiceService.getClients();

      const url = mockAxiosGet.mock.calls[0][0];
      expect(url).not.toContain("search=");
    });
  });

  describe("getMaterials", () => {
    it("returns materials list", async () => {
      mockAxiosGet.mockResolvedValue({
        data: { count: 1, results: [{ id: 1, name: "Wood" }] },
      });

      const result = await invoiceService.getMaterials();

      expect(result.count).toBe(1);
      expect(mockAxiosGet).toHaveBeenCalledWith("/api/invoices/materials/");
    });

    it("passes search parameter", async () => {
      mockAxiosGet.mockResolvedValue({ data: { count: 0, results: [] } });

      await invoiceService.getMaterials("Steel");

      const url = mockAxiosGet.mock.calls[0][0];
      expect(url).toContain("search=Steel");
    });
  });

  describe("getAvailableItemLists", () => {
    it("returns available item lists", async () => {
      mockAvailableItemlists.mockResolvedValue([
        { id: 1, title: "Products", description: "Product list" },
        { id: 2, title: "Services", description: "Service catalog" },
      ] as any);

      const result = await invoiceService.getAvailableItemLists();

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe("Products");
      expect(result[1].title).toBe("Services");
    });

    it("returns empty array when no item lists", async () => {
      mockAvailableItemlists.mockResolvedValue([] as any);

      const result = await invoiceService.getAvailableItemLists();

      expect(result).toHaveLength(0);
    });
  });

  // ==================== Templates ====================

  describe("getTemplates", () => {
    it("returns paginated template list", async () => {
      mockAxiosGet.mockResolvedValue({
        data: {
          count: 2,
          results: [MOCK_TEMPLATE, { ...MOCK_TEMPLATE, id: 2, name: "Modern" }],
        },
      });

      const result = await invoiceService.getTemplates();

      expect(result.count).toBe(2);
      expect(result.results).toHaveLength(2);
      expect(mockAxiosGet).toHaveBeenCalledWith("/api/invoices/templates/");
    });
  });

  describe("getTemplate", () => {
    it("returns template by ID via generated function", async () => {
      mockTemplatesRetrieve.mockResolvedValue(MOCK_TEMPLATE);

      const result = await invoiceService.getTemplate(1);

      expect(result.name).toBe("Default");
      expect(result.html_content).toBe("<html><body>Invoice</body></html>");
      expect(mockTemplatesRetrieve).toHaveBeenCalledWith(1);
    });
  });

  describe("createTemplate", () => {
    it("creates a new template", async () => {
      const newTemplate = { ...MOCK_TEMPLATE, id: 3, name: "Custom" };
      mockTemplatesCreate.mockResolvedValue(newTemplate);

      const data: InvoiceTemplateRequest = {
        name: "Custom",
        html_content: "<html>Custom</html>",
      };

      const result = await invoiceService.createTemplate(data);

      expect(result.name).toBe("Custom");
      expect(mockTemplatesCreate).toHaveBeenCalledWith(data);
    });
  });

  describe("updateTemplate", () => {
    it("partially updates a template", async () => {
      const updated = { ...MOCK_TEMPLATE, name: "Updated Template" };
      mockTemplatesUpdate.mockResolvedValue(updated);

      const result = await invoiceService.updateTemplate(1, {
        name: "Updated Template",
      });

      expect(result.name).toBe("Updated Template");
      expect(mockTemplatesUpdate).toHaveBeenCalledWith(1, {
        name: "Updated Template",
      });
    });
  });

  describe("deleteTemplate", () => {
    it("deletes a template by ID", async () => {
      mockTemplatesDestroy.mockResolvedValue(undefined);

      await invoiceService.deleteTemplate(1);

      expect(mockTemplatesDestroy).toHaveBeenCalledWith(1);
    });

    it("propagates error on delete failure", async () => {
      mockTemplatesDestroy.mockRejectedValue(
        new Error("Cannot delete default template")
      );

      await expect(invoiceService.deleteTemplate(1)).rejects.toThrow(
        "Cannot delete default template"
      );
    });
  });
});
