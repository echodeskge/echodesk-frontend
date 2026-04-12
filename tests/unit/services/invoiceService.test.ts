/**
 * Tests for InvoiceService.
 * Tests invoice CRUD operations, payment recording, line items, and settings.
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
  InvoiceCreateUpdateRequest,
  InvoiceLineItemRequest,
  InvoicePaymentRequest,
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
const mockAvailableItemlists = vi.mocked(invoicesSettingsAvailableItemlistsRetrieve);

const MOCK_INVOICE_DETAIL: InvoiceDetail = {
  id: 1,
  uuid: "abc-123",
  invoice_number: "INV-001",
  status: "draft" as any,
  client_name: "Test Client",
  issue_date: "2024-01-01",
  due_date: "2024-02-01",
  currency: "GEL",
  subtotal: "100.00",
  tax_total: "18.00",
  discount_total: "0.00",
  total: "118.00",
  paid_amount: "0.00",
  balance: "118.00",
  notes: "",
  terms_and_conditions: "",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  created_by: { id: 1, email: "test@test.com", first_name: "Test", last_name: "User" } as any,
  line_items: [],
  payments: [],
  is_overdue: "false",
  line_items_count: "0",
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

describe("InvoiceService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -- Invoice CRUD --

  describe("getInvoices", () => {
    it("returns paginated invoice list", async () => {
      const response: PaginatedInvoiceListList = {
        count: 1,
        results: [
          {
            id: 1,
            uuid: "abc-123",
            invoice_number: "INV-001",
            status: "draft" as any,
            client_name: "Test Client",
            due_date: "2024-02-01",
            balance: "118.00",
            is_overdue: "false",
            line_items_count: "0",
            created_at: "2024-01-01T00:00:00Z",
          },
        ],
      };

      mockAxiosGet.mockResolvedValue({ data: response });

      const result = await invoiceService.getInvoices();

      expect(result.count).toBe(1);
      expect(result.results).toHaveLength(1);
    });

    it("passes filters as query params", async () => {
      mockAxiosGet.mockResolvedValue({ data: { count: 0, results: [] } });

      await invoiceService.getInvoices({
        status: "paid",
        search: "test",
        page: 2,
      });

      const url = mockAxiosGet.mock.calls[0][0];
      expect(url).toContain("status=paid");
      expect(url).toContain("search=test");
      expect(url).toContain("page=2");
    });

    it("omits empty filter values", async () => {
      mockAxiosGet.mockResolvedValue({ data: { count: 0, results: [] } });

      await invoiceService.getInvoices({});

      const url = mockAxiosGet.mock.calls[0][0];
      expect(url).toBe("/api/invoices/invoices/");
    });
  });

  describe("getInvoice", () => {
    it("returns invoice detail by ID", async () => {
      mockRetrieve.mockResolvedValue(MOCK_INVOICE_DETAIL);

      const result = await invoiceService.getInvoice(1);

      expect(result.id).toBe(1);
      expect(result.invoice_number).toBe("INV-001");
      expect(mockRetrieve).toHaveBeenCalledWith(1);
    });
  });

  describe("createInvoice", () => {
    it("creates invoice with required data", async () => {
      mockCreate.mockResolvedValue(MOCK_INVOICE_DETAIL as any);

      const data: InvoiceCreateUpdateRequest = {
        due_date: "2024-02-01",
      };

      const result = await invoiceService.createInvoice(data);

      expect(result.id).toBe(1);
      expect(mockCreate).toHaveBeenCalledWith(data);
    });
  });

  describe("updateInvoice", () => {
    it("partially updates invoice", async () => {
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
  });

  describe("deleteInvoice", () => {
    it("deletes invoice by ID", async () => {
      mockDestroy.mockResolvedValue(undefined);

      await invoiceService.deleteInvoice(1);

      expect(mockDestroy).toHaveBeenCalledWith(1);
    });
  });

  describe("duplicateInvoice", () => {
    it("duplicates invoice by ID", async () => {
      mockDuplicate.mockResolvedValue(MOCK_INVOICE_DETAIL as any);

      const result = await invoiceService.duplicateInvoice(1);

      expect(result.id).toBe(1);
      expect(mockDuplicate).toHaveBeenCalledWith(1, expect.anything());
    });
  });

  describe("finalizeInvoice", () => {
    it("finalizes invoice and generates PDF", async () => {
      const finalized = { ...MOCK_INVOICE_DETAIL, status: "sent" as any };
      mockFinalize.mockResolvedValue(finalized as any);

      const result = await invoiceService.finalizeInvoice(1);

      expect(mockFinalize).toHaveBeenCalledWith(1, expect.anything());
    });
  });

  describe("markInvoiceAsPaid", () => {
    it("marks invoice as paid", async () => {
      const paid = { ...MOCK_INVOICE_DETAIL, status: "paid" as any };
      mockMarkPaid.mockResolvedValue(paid as any);

      const result = await invoiceService.markInvoiceAsPaid(1);

      expect(mockMarkPaid).toHaveBeenCalledWith(1, expect.anything());
    });
  });

  // -- Invoice Stats --

  describe("getInvoiceStats", () => {
    it("returns invoice statistics", async () => {
      const stats = {
        current_month: { total_invoiced: 1000, total_paid: 500, count: 10 },
        outstanding_amount: 500,
        overdue_count: 2,
      };

      mockAxiosGet.mockResolvedValue({ data: stats });

      const result = await invoiceService.getInvoiceStats();

      expect(result.current_month.total_invoiced).toBe(1000);
      expect(result.overdue_count).toBe(2);
    });
  });

  // -- Line Items --

  describe("createLineItem", () => {
    it("creates a line item", async () => {
      mockLineItemsCreate.mockResolvedValue(MOCK_LINE_ITEM);

      const data: InvoiceLineItemRequest = {
        description: "Consulting",
        quantity: "1",
        unit_price: "100.00",
      };

      const result = await invoiceService.createLineItem(data);

      expect(result.id).toBe(1);
      expect(mockLineItemsCreate).toHaveBeenCalledWith(data);
    });
  });

  describe("updateLineItem", () => {
    it("partially updates a line item", async () => {
      const updated = { ...MOCK_LINE_ITEM, quantity: "2" };
      mockLineItemsUpdate.mockResolvedValue(updated);

      const result = await invoiceService.updateLineItem(1, { quantity: "2" });

      expect(result.quantity).toBe("2");
      expect(mockLineItemsUpdate).toHaveBeenCalledWith(1, { quantity: "2" });
    });
  });

  describe("deleteLineItem", () => {
    it("deletes a line item", async () => {
      mockLineItemsDestroy.mockResolvedValue(undefined);

      await invoiceService.deleteLineItem(1);

      expect(mockLineItemsDestroy).toHaveBeenCalledWith(1);
    });
  });

  // -- Payments --

  describe("recordPayment", () => {
    it("records a payment", async () => {
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
  });

  describe("updatePayment", () => {
    it("partially updates a payment", async () => {
      const updated = { ...MOCK_PAYMENT, amount: "75.00" };
      mockPaymentsUpdate.mockResolvedValue(updated);

      const result = await invoiceService.updatePayment(1, {
        amount: "75.00",
      });

      expect(result.amount).toBe("75.00");
    });
  });

  describe("deletePayment", () => {
    it("deletes a payment", async () => {
      mockPaymentsDestroy.mockResolvedValue(undefined);

      await invoiceService.deletePayment(1);

      expect(mockPaymentsDestroy).toHaveBeenCalledWith(1);
    });
  });

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
    });
  });

  // -- Settings --

  describe("getSettings", () => {
    it("returns invoice settings", async () => {
      const settings: Partial<InvoiceSettings> = {
        id: 1,
        company_name: "Test Company",
        default_currency: "GEL",
        default_tax_rate: "18.00",
      };

      mockAxiosGet.mockResolvedValue({ data: settings });

      const result = await invoiceService.getSettings();

      expect(result.company_name).toBe("Test Company");
    });
  });

  // -- Templates --

  describe("getTemplate", () => {
    it("returns template by ID", async () => {
      const template: InvoiceTemplate = {
        id: 1,
        name: "Default",
        html_template: "<html></html>",
        is_default: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      mockTemplatesRetrieve.mockResolvedValue(template);

      const result = await invoiceService.getTemplate(1);

      expect(result.name).toBe("Default");
    });
  });

  describe("createTemplate", () => {
    it("creates a template", async () => {
      const template: InvoiceTemplate = {
        id: 2,
        name: "Custom",
        html_template: "<html>Custom</html>",
        is_default: false,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      mockTemplatesCreate.mockResolvedValue(template);

      const result = await invoiceService.createTemplate({
        name: "Custom",
        html_template: "<html>Custom</html>",
      });

      expect(result.name).toBe("Custom");
    });
  });

  describe("deleteTemplate", () => {
    it("deletes a template by ID", async () => {
      mockTemplatesDestroy.mockResolvedValue(undefined);

      await invoiceService.deleteTemplate(1);

      expect(mockTemplatesDestroy).toHaveBeenCalledWith(1);
    });
  });

  // -- Helper endpoints --

  describe("getClients", () => {
    it("returns paginated client list", async () => {
      mockAxiosGet.mockResolvedValue({
        data: { count: 1, results: [{ id: 1, name: "Client A" }] },
      });

      const result = await invoiceService.getClients();

      expect(result.count).toBe(1);
    });

    it("passes search parameter", async () => {
      mockAxiosGet.mockResolvedValue({ data: { count: 0, results: [] } });

      await invoiceService.getClients("test");

      const url = mockAxiosGet.mock.calls[0][0];
      expect(url).toContain("search=test");
    });
  });

  describe("getAvailableItemLists", () => {
    it("returns available item lists", async () => {
      mockAvailableItemlists.mockResolvedValue([
        { id: 1, title: "Products", description: "Product list" },
      ] as any);

      const result = await invoiceService.getAvailableItemLists();

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Products");
    });
  });
});
