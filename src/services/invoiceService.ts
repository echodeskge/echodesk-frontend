/**
 * Invoice Service
 * Wrapper around generated API for invoice management
 */

import {
  invoicesInvoicesList,
  invoicesInvoicesRetrieve,
  invoicesInvoicesCreate,
  invoicesInvoicesPartialUpdate,
  invoicesInvoicesDestroy,
  invoicesInvoicesDuplicateCreate,
  invoicesInvoicesFinalizeCreate,
  invoicesInvoicesMarkPaidCreate,
  invoicesInvoicesSendEmailCreate,
  invoicesInvoicesPdfRetrieve,
  invoicesInvoicesExcelRetrieve,
  invoicesInvoicesStatsRetrieve,
  invoicesSettingsList,
  invoicesSettingsCreate,
  invoicesSettingsUploadLogoCreate,
  invoicesSettingsUploadBadgeCreate,
  invoicesSettingsUploadSignatureCreate,
  invoicesSettingsRemoveLogoDestroy,
  invoicesSettingsRemoveBadgeDestroy,
  invoicesSettingsRemoveSignatureDestroy,
  invoicesSettingsAvailableItemlistsRetrieve,
  invoicesLineItemsList,
  invoicesLineItemsCreate,
  invoicesLineItemsRetrieve,
  invoicesLineItemsPartialUpdate,
  invoicesLineItemsDestroy,
  invoicesLineItemsReorderCreate,
  invoicesPaymentsList,
  invoicesPaymentsCreate,
  invoicesPaymentsRetrieve,
  invoicesPaymentsPartialUpdate,
  invoicesPaymentsDestroy,
  invoicesClientsList,
  invoicesMaterialsList,
  invoicesTemplatesList,
  invoicesTemplatesCreate,
  invoicesTemplatesRetrieve,
  invoicesTemplatesPartialUpdate,
  invoicesTemplatesDestroy,
} from "@/api/generated";

import type {
  PaginatedInvoiceListList,
  InvoiceDetail,
  InvoiceCreateUpdate,
  PatchedInvoiceCreateUpdateRequest,
  PaginatedInvoiceLineItemList,
  InvoiceLineItem,
  InvoiceLineItemRequest,
  PatchedInvoiceLineItemRequest,
  PaginatedInvoicePaymentList,
  InvoicePayment,
  InvoicePaymentRequest,
  PatchedInvoicePaymentRequest,
  PaginatedInvoiceSettingsList,
  InvoiceSettings,
  InvoiceSettingsRequest,
  PatchedInvoiceSettingsRequest,
  PaginatedClientList,
  PaginatedListItemMaterialList,
  PaginatedInvoiceTemplateList,
  InvoiceTemplate,
  InvoiceTemplateRequest,
  PatchedInvoiceTemplateRequest,
} from "@/api/generated";

export interface InvoiceFilters {
  status?: 'draft' | 'sent' | 'viewed' | 'partially_paid' | 'paid' | 'overdue';
  client?: number;
  currency?: string;
  date_from?: string;
  date_to?: string;
  overdue?: boolean;
  search?: string;
  ordering?: string;
  page?: number;
}

export interface InvoiceStats {
  current_month: {
    total_invoiced: number;
    total_paid: number;
    count: number;
  };
  outstanding_amount: number;
  overdue_count: number;
}

export interface SendInvoiceData {
  recipient_email: string;
  cc_emails?: string;
  subject: string;
  message: string;
  attach_pdf?: boolean;
}

class InvoiceService {
  // ==================== Invoice Management ====================

  /**
   * Get paginated list of invoices with filters
   */
  async getInvoices(filters?: InvoiceFilters): Promise<PaginatedInvoiceListList> {
    const params = new URLSearchParams();

    if (filters?.status) params.append('status', filters.status);
    if (filters?.client !== undefined) params.append('client', String(filters.client));
    if (filters?.currency) params.append('currency', filters.currency);
    if (filters?.date_from) params.append('date_from', filters.date_from);
    if (filters?.date_to) params.append('date_to', filters.date_to);
    if (filters?.overdue !== undefined) params.append('overdue', String(filters.overdue));
    if (filters?.search) params.append('search', filters.search);
    if (filters?.ordering) params.append('ordering', filters.ordering);
    if (filters?.page) params.append('page', String(filters.page));

    const queryString = params.toString();
    const url = `/api/invoices/invoices/${queryString ? `?${queryString}` : ''}`;

    const { default: axios } = await import('@/api/axios');
    const response = await axios.get<PaginatedInvoiceListList>(url);
    return response.data;
  }

  /**
   * Get invoice detail by ID
   */
  async getInvoice(id: number): Promise<InvoiceDetail> {
    return invoicesInvoicesRetrieve(id);
  }

  /**
   * Create a new invoice
   */
  async createInvoice(data: InvoiceCreateUpdate): Promise<InvoiceDetail> {
    return invoicesInvoicesCreate(data) as Promise<InvoiceDetail>;
  }

  /**
   * Update an existing invoice
   */
  async updateInvoice(
    id: number,
    data: PatchedInvoiceCreateUpdateRequest
  ): Promise<InvoiceDetail> {
    return invoicesInvoicesPartialUpdate(id, data) as Promise<InvoiceDetail>;
  }

  /**
   * Delete an invoice (draft only)
   */
  async deleteInvoice(id: number): Promise<void> {
    return invoicesInvoicesDestroy(id);
  }

  /**
   * Duplicate an invoice
   */
  async duplicateInvoice(id: number): Promise<InvoiceDetail> {
    return invoicesInvoicesDuplicateCreate(id) as Promise<InvoiceDetail>;
  }

  /**
   * Finalize invoice and generate PDF
   */
  async finalizeInvoice(id: number): Promise<InvoiceDetail> {
    return invoicesInvoicesFinalizeCreate(id) as Promise<InvoiceDetail>;
  }

  /**
   * Mark invoice as paid
   */
  async markInvoiceAsPaid(id: number): Promise<InvoiceDetail> {
    return invoicesInvoicesMarkPaidCreate(id) as Promise<InvoiceDetail>;
  }

  /**
   * Send invoice via email
   */
  async sendInvoiceEmail(id: number, data: SendInvoiceData): Promise<{ message: string }> {
    const { default: axios } = await import('@/api/axios');
    const response = await axios.post(`/api/invoices/invoices/${id}/send_email/`, data);
    return response.data;
  }

  /**
   * Download invoice as PDF
   */
  async downloadInvoicePDF(id: number): Promise<Blob> {
    const { default: axios } = await import('@/api/axios');
    const response = await axios.get(`/api/invoices/invoices/${id}/pdf/`, {
      responseType: 'blob'
    });
    return response.data;
  }

  /**
   * Download invoice as Excel
   */
  async downloadInvoiceExcel(id: number): Promise<Blob> {
    const { default: axios } = await import('@/api/axios');
    const response = await axios.get(`/api/invoices/invoices/${id}/excel/`, {
      responseType: 'blob'
    });
    return response.data;
  }

  /**
   * Get invoice statistics
   */
  async getInvoiceStats(): Promise<InvoiceStats> {
    const { default: axios } = await import('@/api/axios');
    const response = await axios.get<InvoiceStats>('/api/invoices/invoices/stats/');
    return response.data;
  }

  // ==================== Invoice Settings ====================

  /**
   * Get invoice settings
   */
  async getSettings(): Promise<InvoiceSettings> {
    const { default: axios } = await import('@/api/axios');
    const response = await axios.get<PaginatedInvoiceSettingsList>('/api/invoices/settings/');
    // Backend returns singleton, so we take the first result
    return response.data.results?.[0] || {} as InvoiceSettings;
  }

  /**
   * Update invoice settings
   */
  async updateSettings(data: PatchedInvoiceSettingsRequest): Promise<InvoiceSettings> {
    const { default: axios } = await import('@/api/axios');
    // Get settings ID first (it's a singleton)
    const settings = await this.getSettings();
    const response = await axios.patch<InvoiceSettings>(`/api/invoices/settings/${settings.id}/`, data);
    return response.data;
  }

  /**
   * Upload company logo
   */
  async uploadLogo(file: File): Promise<InvoiceSettings> {
    const formData = new FormData();
    formData.append('logo', file);
    const { default: axios } = await import('@/api/axios');
    const response = await axios.post<InvoiceSettings>('/api/invoices/settings/upload-logo/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }

  /**
   * Upload document badge/seal
   */
  async uploadBadge(file: File): Promise<InvoiceSettings> {
    const formData = new FormData();
    formData.append('badge', file);
    const { default: axios } = await import('@/api/axios');
    const response = await axios.post<InvoiceSettings>('/api/invoices/settings/upload-badge/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }

  /**
   * Upload signature
   */
  async uploadSignature(file: File): Promise<InvoiceSettings> {
    const formData = new FormData();
    formData.append('signature', file);
    const { default: axios } = await import('@/api/axios');
    const response = await axios.post<InvoiceSettings>('/api/invoices/settings/upload-signature/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }

  /**
   * Remove company logo
   */
  async removeLogo(): Promise<InvoiceSettings> {
    const { default: axios } = await import('@/api/axios');
    const response = await axios.delete<InvoiceSettings>('/api/invoices/settings/remove-logo/');
    return response.data;
  }

  /**
   * Remove document badge
   */
  async removeBadge(): Promise<InvoiceSettings> {
    const { default: axios } = await import('@/api/axios');
    const response = await axios.delete<InvoiceSettings>('/api/invoices/settings/remove-badge/');
    return response.data;
  }

  /**
   * Remove signature
   */
  async removeSignature(): Promise<InvoiceSettings> {
    const { default: axios } = await import('@/api/axios');
    const response = await axios.delete<InvoiceSettings>('/api/invoices/settings/remove-signature/');
    return response.data;
  }

  // ==================== Line Items ====================

  /**
   * Get line items for an invoice
   */
  async getLineItems(invoiceId: number): Promise<PaginatedInvoiceLineItemList> {
    const { default: axios } = await import('@/api/axios');
    const response = await axios.get<PaginatedInvoiceLineItemList>(
      `/api/invoices/line-items/?invoice_id=${invoiceId}`
    );
    return response.data;
  }

  /**
   * Create a line item
   */
  async createLineItem(data: InvoiceLineItemRequest): Promise<InvoiceLineItem> {
    return invoicesLineItemsCreate(data);
  }

  /**
   * Update a line item
   */
  async updateLineItem(
    id: number,
    data: PatchedInvoiceLineItemRequest
  ): Promise<InvoiceLineItem> {
    return invoicesLineItemsPartialUpdate(id, data);
  }

  /**
   * Delete a line item
   */
  async deleteLineItem(id: number): Promise<void> {
    return invoicesLineItemsDestroy(id);
  }

  /**
   * Reorder line items
   */
  async reorderLineItems(items: Array<{ id: number; position: number }>): Promise<void> {
    const { default: axios } = await import('@/api/axios');
    await axios.post('/api/invoices/line-items/reorder/', { items });
  }

  // ==================== Payments ====================

  /**
   * Get payments for an invoice
   */
  async getPayments(invoiceId: number): Promise<PaginatedInvoicePaymentList> {
    const { default: axios } = await import('@/api/axios');
    const response = await axios.get<PaginatedInvoicePaymentList>(
      `/api/invoices/payments/?invoice_id=${invoiceId}`
    );
    return response.data;
  }

  /**
   * Record a payment
   */
  async recordPayment(data: InvoicePaymentRequest): Promise<InvoicePayment> {
    return invoicesPaymentsCreate(data);
  }

  /**
   * Update a payment
   */
  async updatePayment(
    id: number,
    data: PatchedInvoicePaymentRequest
  ): Promise<InvoicePayment> {
    return invoicesPaymentsPartialUpdate(id, data);
  }

  /**
   * Delete a payment
   */
  async deletePayment(id: number): Promise<void> {
    return invoicesPaymentsDestroy(id);
  }

  // ==================== Helper Endpoints ====================

  /**
   * Get clients for invoice selection
   */
  async getClients(search?: string): Promise<PaginatedClientList> {
    const params = search ? `?search=${encodeURIComponent(search)}` : '';
    const { default: axios } = await import('@/api/axios');
    const response = await axios.get<PaginatedClientList>(`/api/invoices/clients/${params}`);
    return response.data;
  }

  /**
   * Get materials from ItemList for invoice selection
   */
  async getMaterials(search?: string): Promise<PaginatedListItemMaterialList> {
    const params = search ? `?search=${encodeURIComponent(search)}` : '';
    const { default: axios } = await import('@/api/axios');
    const response = await axios.get<PaginatedListItemMaterialList>(`/api/invoices/materials/${params}`);
    return response.data;
  }

  // ==================== Templates ====================

  /**
   * Get invoice templates
   */
  async getTemplates(): Promise<PaginatedInvoiceTemplateList> {
    const { default: axios } = await import('@/api/axios');
    const response = await axios.get<PaginatedInvoiceTemplateList>('/api/invoices/templates/');
    return response.data;
  }

  /**
   * Get template by ID
   */
  async getTemplate(id: number): Promise<InvoiceTemplate> {
    return invoicesTemplatesRetrieve(id);
  }

  /**
   * Create a new template
   */
  async createTemplate(data: InvoiceTemplateRequest): Promise<InvoiceTemplate> {
    return invoicesTemplatesCreate(data);
  }

  /**
   * Update a template
   */
  async updateTemplate(
    id: number,
    data: PatchedInvoiceTemplateRequest
  ): Promise<InvoiceTemplate> {
    return invoicesTemplatesPartialUpdate(id, data);
  }

  /**
   * Delete a template
   */
  async deleteTemplate(id: number): Promise<void> {
    return invoicesTemplatesDestroy(id);
  }

  /**
   * Get available item lists for client selection
   */
  async getAvailableItemLists(): Promise<Array<{ id: number; title: string; description: string }>> {
    const result = await invoicesSettingsAvailableItemlistsRetrieve();
    // Backend returns ItemListMinimal array but type is InvoiceSettings
    return result as any;
  }
}

export const invoiceService = new InvoiceService();
