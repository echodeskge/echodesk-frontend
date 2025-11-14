"use client";

/**
 * Invoice List Page
 * Shows all invoices with stats, filters, and actions
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  useInvoices,
  useInvoiceStats,
  useDeleteInvoice,
  useDuplicateInvoice,
  useDownloadInvoicePDF,
} from "@/hooks/useInvoices";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FileText, Plus, Download, Send, Eye, Copy, Trash2 } from "lucide-react";
import { InvoiceStatusBadge } from "@/components/invoices/InvoiceStatusBadge";
import { CreateInvoiceSheet } from "@/components/invoices/CreateInvoiceSheet";
import { SendInvoiceDialog } from "@/components/invoices/SendInvoiceDialog";
import { useToast } from "@/hooks/use-toast";
import type { InvoiceFilters } from "@/services/invoiceService";

export default function InvoicesPage() {
  const t = useTranslations("invoices");
  const router = useRouter();
  const { toast } = useToast();

  const [filters, setFilters] = useState<InvoiceFilters>({});
  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  const { data: invoicesData, isLoading } = useInvoices(filters);
  const { data: stats } = useInvoiceStats();
  const deleteMutation = useDeleteInvoice();
  const duplicateMutation = useDuplicateInvoice();
  const downloadPDFMutation = useDownloadInvoicePDF();

  const invoices = invoicesData?.results || [];

  const handleView = (invoice: any) => {
    router.push(`/invoices/invoices/${invoice.id}`);
  };

  const handleSend = (invoice: any) => {
    setSelectedInvoice(invoice);
    setSendDialogOpen(true);
  };

  const handleDownloadPDF = async (invoice: any) => {
    try {
      const blob = await downloadPDFMutation.mutateAsync(invoice.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `invoice-${invoice.invoice_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: t("success.downloaded"),
        description: t("success.downloadedDesc"),
      });
    } catch (error: any) {
      toast({
        title: t("errors.downloadFailed"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDuplicate = async (invoice: any) => {
    try {
      await duplicateMutation.mutateAsync(invoice.id);
      toast({
        title: t("success.duplicated"),
        description: t("success.duplicatedDesc"),
      });
    } catch (error: any) {
      toast({
        title: t("errors.duplicateFailed"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = (invoice: any) => {
    setSelectedInvoice(invoice);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedInvoice) return;

    try {
      await deleteMutation.mutateAsync(selectedInvoice.id);
      toast({
        title: t("success.deleted"),
        description: t("success.deletedDesc"),
      });
      setDeleteDialogOpen(false);
      setSelectedInvoice(null);
    } catch (error: any) {
      toast({
        title: t("errors.deleteFailed"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button onClick={() => setCreateSheetOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t("createInvoice")}
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">{t("stats.totalInvoiced")}</div>
            <div className="text-2xl font-bold">
              {stats.current_month.total_invoiced.toFixed(2)} ₾
            </div>
            <div className="text-xs text-muted-foreground">{t("stats.thisMonth")}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">{t("stats.totalPaid")}</div>
            <div className="text-2xl font-bold">
              {stats.current_month.total_paid.toFixed(2)} ₾
            </div>
            <div className="text-xs text-muted-foreground">{t("stats.thisMonth")}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">{t("stats.outstanding")}</div>
            <div className="text-2xl font-bold">
              {stats.outstanding_amount.toFixed(2)} ₾
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">{t("stats.overdue")}</div>
            <div className="text-2xl font-bold">{stats.overdue_count}</div>
            <div className="text-xs text-destructive">{t("status.overdue")}</div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4">
          <Input
            placeholder={t("filters.searchPlaceholder")}
            value={filters.search || ""}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="max-w-sm"
          />
          <Select
            value={filters.status || "all"}
            onValueChange={(value) =>
              setFilters({ ...filters, status: value === "all" ? undefined : (value as any) })
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("status.all")}</SelectItem>
              <SelectItem value="draft">{t("status.draft")}</SelectItem>
              <SelectItem value="sent">{t("status.sent")}</SelectItem>
              <SelectItem value="viewed">{t("status.viewed")}</SelectItem>
              <SelectItem value="partially_paid">{t("status.partially_paid")}</SelectItem>
              <SelectItem value="paid">{t("status.paid")}</SelectItem>
              <SelectItem value="overdue">{t("status.overdue")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Invoices Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("table.invoiceNumber")}</TableHead>
              <TableHead>{t("table.client")}</TableHead>
              <TableHead>{t("table.issueDate")}</TableHead>
              <TableHead>{t("table.dueDate")}</TableHead>
              <TableHead>{t("table.total")}</TableHead>
              <TableHead>{t("table.balance")}</TableHead>
              <TableHead>{t("table.status")}</TableHead>
              <TableHead className="text-right">{t("table.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center">
                  {t("loadingInvoices")}
                </TableCell>
              </TableRow>
            ) : invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  {t("noInvoices")}
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      {invoice.invoice_number}
                    </div>
                  </TableCell>
                  <TableCell>{invoice.client_name}</TableCell>
                  <TableCell>{invoice.issue_date ? new Date(invoice.issue_date).toLocaleDateString() : '-'}</TableCell>
                  <TableCell>{invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '-'}</TableCell>
                  <TableCell>
                    {invoice.total} {invoice.currency}
                  </TableCell>
                  <TableCell>
                    {invoice.balance} {invoice.currency}
                  </TableCell>
                  <TableCell>
                    <InvoiceStatusBadge
                      status={invoice.status as any}
                      isOverdue={!!invoice.is_overdue}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleView(invoice)}
                        title={t("actions.view")}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleSend(invoice)}
                        title={t("actions.send")}
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownloadPDF(invoice)}
                        title={t("actions.download")}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDuplicate(invoice)}
                        title={t("actions.duplicate")}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(invoice)}
                        disabled={(invoice.status as any) !== "draft"}
                        title={t("actions.delete")}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Create Invoice Sheet */}
      <CreateInvoiceSheet open={createSheetOpen} onOpenChange={setCreateSheetOpen} />

      {/* Send Invoice Dialog */}
      {selectedInvoice && (
        <SendInvoiceDialog
          open={sendDialogOpen}
          onOpenChange={setSendDialogOpen}
          invoiceId={selectedInvoice.id}
          clientEmail={selectedInvoice.client_email}
          invoiceNumber={selectedInvoice.invoice_number}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("actions.deleteInvoice")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("actions.deleteConfirmation", {
                number: selectedInvoice?.invoice_number,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive">
              {t("actions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
