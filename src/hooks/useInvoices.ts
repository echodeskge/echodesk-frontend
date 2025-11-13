/**
 * Invoice Management Hooks
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invoiceService, InvoiceFilters, SendInvoiceData } from "@/services/invoiceService";
import type {
  InvoiceCreateUpdate,
  PatchedInvoiceCreateUpdateRequest,
  InvoiceLineItemRequest,
  PatchedInvoiceLineItemRequest,
  InvoicePaymentRequest,
  PatchedInvoicePaymentRequest,
  PatchedInvoiceSettingsRequest,
  InvoiceTemplateRequest,
  PatchedInvoiceTemplateRequest,
} from "@/api/generated";

// ==================== Invoice Management ====================

export function useInvoices(filters?: InvoiceFilters) {
  return useQuery({
    queryKey: ["invoices", filters],
    queryFn: () => invoiceService.getInvoices(filters),
  });
}

export function useInvoice(id: number) {
  return useQuery({
    queryKey: ["invoice", id],
    queryFn: () => invoiceService.getInvoice(id),
    enabled: !!id,
  });
}

export function useInvoiceStats() {
  return useQuery({
    queryKey: ["invoice-stats"],
    queryFn: () => invoiceService.getInvoiceStats(),
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: InvoiceCreateUpdate) =>
      invoiceService.createInvoice(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoice-stats"] });
    },
  });
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: PatchedInvoiceCreateUpdateRequest;
    }) => invoiceService.updateInvoice(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoice", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["invoice-stats"] });
    },
  });
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => invoiceService.deleteInvoice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoice-stats"] });
    },
  });
}

export function useDuplicateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => invoiceService.duplicateInvoice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoice-stats"] });
    },
  });
}

export function useFinalizeInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => invoiceService.finalizeInvoice(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoice", id] });
      queryClient.invalidateQueries({ queryKey: ["invoice-stats"] });
    },
  });
}

export function useMarkInvoiceAsPaid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => invoiceService.markInvoiceAsPaid(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoice", id] });
      queryClient.invalidateQueries({ queryKey: ["invoice-stats"] });
      queryClient.invalidateQueries({ queryKey: ["invoice-payments", id] });
    },
  });
}

export function useSendInvoiceEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: SendInvoiceData }) =>
      invoiceService.sendInvoiceEmail(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoice", variables.id] });
    },
  });
}

export function useDownloadInvoicePDF() {
  return useMutation({
    mutationFn: (id: number) => invoiceService.downloadInvoicePDF(id),
  });
}

export function useDownloadInvoiceExcel() {
  return useMutation({
    mutationFn: (id: number) => invoiceService.downloadInvoiceExcel(id),
  });
}

// ==================== Invoice Settings ====================

export function useInvoiceSettings() {
  return useQuery({
    queryKey: ["invoice-settings"],
    queryFn: () => invoiceService.getSettings(),
  });
}

export function useUpdateInvoiceSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: PatchedInvoiceSettingsRequest) =>
      invoiceService.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice-settings"] });
    },
  });
}

export function useUploadLogo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => invoiceService.uploadLogo(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice-settings"] });
    },
  });
}

export function useUploadBadge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => invoiceService.uploadBadge(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice-settings"] });
    },
  });
}

export function useUploadSignature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => invoiceService.uploadSignature(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice-settings"] });
    },
  });
}

export function useRemoveLogo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => invoiceService.removeLogo(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice-settings"] });
    },
  });
}

export function useRemoveBadge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => invoiceService.removeBadge(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice-settings"] });
    },
  });
}

export function useRemoveSignature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => invoiceService.removeSignature(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice-settings"] });
    },
  });
}

export function useAvailableItemLists() {
  return useQuery({
    queryKey: ["available-itemlists"],
    queryFn: () => invoiceService.getAvailableItemLists(),
  });
}

// ==================== Line Items ====================

export function useLineItems(invoiceId: number) {
  return useQuery({
    queryKey: ["invoice-line-items", invoiceId],
    queryFn: () => invoiceService.getLineItems(invoiceId),
    enabled: !!invoiceId,
  });
}

export function useCreateLineItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: InvoiceLineItemRequest) =>
      invoiceService.createLineItem(data),
    onSuccess: (data) => {
      if (data.invoice) {
        queryClient.invalidateQueries({ queryKey: ["invoice-line-items", data.invoice] });
        queryClient.invalidateQueries({ queryKey: ["invoice", data.invoice] });
        queryClient.invalidateQueries({ queryKey: ["invoices"] });
      }
    },
  });
}

export function useUpdateLineItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: PatchedInvoiceLineItemRequest;
    }) => invoiceService.updateLineItem(id, data),
    onSuccess: (data) => {
      if (data.invoice) {
        queryClient.invalidateQueries({ queryKey: ["invoice-line-items", data.invoice] });
        queryClient.invalidateQueries({ queryKey: ["invoice", data.invoice] });
        queryClient.invalidateQueries({ queryKey: ["invoices"] });
      }
    },
  });
}

export function useDeleteLineItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, invoiceId }: { id: number; invoiceId: number }) =>
      invoiceService.deleteLineItem(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["invoice-line-items", variables.invoiceId] });
      queryClient.invalidateQueries({ queryKey: ["invoice", variables.invoiceId] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}

export function useReorderLineItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ items, invoiceId }: { items: Array<{ id: number; position: number }>; invoiceId: number }) =>
      invoiceService.reorderLineItems(items),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["invoice-line-items", variables.invoiceId] });
    },
  });
}

// ==================== Payments ====================

export function usePayments(invoiceId: number) {
  return useQuery({
    queryKey: ["invoice-payments", invoiceId],
    queryFn: () => invoiceService.getPayments(invoiceId),
    enabled: !!invoiceId,
  });
}

export function useRecordPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: InvoicePaymentRequest) =>
      invoiceService.recordPayment(data),
    onSuccess: (data) => {
      if (data.invoice) {
        queryClient.invalidateQueries({ queryKey: ["invoice-payments", data.invoice] });
        queryClient.invalidateQueries({ queryKey: ["invoice", data.invoice] });
        queryClient.invalidateQueries({ queryKey: ["invoices"] });
        queryClient.invalidateQueries({ queryKey: ["invoice-stats"] });
      }
    },
  });
}

export function useUpdatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: PatchedInvoicePaymentRequest;
    }) => invoiceService.updatePayment(id, data),
    onSuccess: (data) => {
      if (data.invoice) {
        queryClient.invalidateQueries({ queryKey: ["invoice-payments", data.invoice] });
        queryClient.invalidateQueries({ queryKey: ["invoice", data.invoice] });
        queryClient.invalidateQueries({ queryKey: ["invoices"] });
        queryClient.invalidateQueries({ queryKey: ["invoice-stats"] });
      }
    },
  });
}

export function useDeletePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, invoiceId }: { id: number; invoiceId: number }) =>
      invoiceService.deletePayment(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["invoice-payments", variables.invoiceId] });
      queryClient.invalidateQueries({ queryKey: ["invoice", variables.invoiceId] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoice-stats"] });
    },
  });
}

// ==================== Helper Hooks ====================

export function useInvoiceClients(search?: string) {
  return useQuery({
    queryKey: ["invoice-clients", search],
    queryFn: () => invoiceService.getClients(search),
  });
}

export function useInvoiceMaterials(search?: string) {
  return useQuery({
    queryKey: ["invoice-materials", search],
    queryFn: () => invoiceService.getMaterials(search),
  });
}

// ==================== Templates ====================

export function useInvoiceTemplates() {
  return useQuery({
    queryKey: ["invoice-templates"],
    queryFn: () => invoiceService.getTemplates(),
  });
}

export function useInvoiceTemplate(id: number) {
  return useQuery({
    queryKey: ["invoice-template", id],
    queryFn: () => invoiceService.getTemplate(id),
    enabled: !!id,
  });
}

export function useCreateInvoiceTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: InvoiceTemplateRequest) =>
      invoiceService.createTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice-templates"] });
    },
  });
}

export function useUpdateInvoiceTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: PatchedInvoiceTemplateRequest;
    }) => invoiceService.updateTemplate(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["invoice-templates"] });
      queryClient.invalidateQueries({ queryKey: ["invoice-template", variables.id] });
    },
  });
}

export function useDeleteInvoiceTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => invoiceService.deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice-templates"] });
    },
  });
}
