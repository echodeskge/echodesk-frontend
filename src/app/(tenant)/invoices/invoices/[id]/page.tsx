"use client";

/**
 * Invoice Detail Page
 * Shows invoice details with Overview, Payments, and Activity tabs
 */

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  useInvoice,
  usePayments,
  useFinalizeInvoice,
  useMarkInvoiceAsPaid,
  useDeleteInvoice,
  useDuplicateInvoice,
  useDownloadInvoicePDF,
} from "@/hooks/useInvoices";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  ArrowLeft,
  FileText,
  Send,
  Download,
  Copy,
  Trash2,
  CheckCircle,
  DollarSign,
} from "lucide-react";
import { InvoiceStatusBadge } from "@/components/invoices/InvoiceStatusBadge";
import { SendInvoiceDialog } from "@/components/invoices/SendInvoiceDialog";
import { RecordPaymentDialog } from "@/components/invoices/RecordPaymentDialog";
import { useToast } from "@/hooks/use-toast";

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations("invoices");
  const { toast } = useToast();

  const invoiceId = parseInt(params.id as string);

  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [finalizeDialogOpen, setFinalizeDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: invoice, isLoading } = useInvoice(invoiceId);
  const { data: paymentsData } = usePayments(invoiceId);
  const finalizeMutation = useFinalizeInvoice();
  const markPaidMutation = useMarkInvoiceAsPaid();
  const deleteMutation = useDeleteInvoice();
  const duplicateMutation = useDuplicateInvoice();
  const downloadPDFMutation = useDownloadInvoicePDF();

  const payments = paymentsData?.results || [];

  const handleFinalize = async () => {
    try {
      await finalizeMutation.mutateAsync(invoiceId);
      toast({
        title: t("success.finalized"),
        description: t("success.finalizedDesc"),
      });
      setFinalizeDialogOpen(false);
    } catch (error: any) {
      toast({
        title: t("errors.finalizeFailed"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleMarkPaid = async () => {
    try {
      await markPaidMutation.mutateAsync(invoiceId);
      toast({
        title: t("success.markedPaid"),
        description: t("success.markedPaidDesc"),
      });
    } catch (error: any) {
      toast({
        title: t("errors.markPaidFailed"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const blob = await downloadPDFMutation.mutateAsync(invoiceId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `invoice-${invoice?.invoice_number}.pdf`;
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

  const handleDuplicate = async () => {
    try {
      const newInvoice = await duplicateMutation.mutateAsync(invoiceId);
      toast({
        title: t("success.duplicated"),
        description: t("success.duplicatedDesc"),
      });
      router.push(`/invoices/invoices/${(newInvoice as any).id}`);
    } catch (error: any) {
      toast({
        title: t("errors.duplicateFailed"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(invoiceId);
      toast({
        title: t("success.deleted"),
        description: t("success.deletedDesc"),
      });
      router.push("/invoices/invoices");
    } catch (error: any) {
      toast({
        title: t("errors.deleteFailed"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <p>{t("loadingInvoice")}</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-6">
        <p>{t("invoiceNotFound")}</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{invoice.invoice_number}</h1>
              <InvoiceStatusBadge status={invoice.status} isOverdue={invoice.is_overdue} />
            </div>
            <p className="text-muted-foreground">{invoice.client_name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {invoice.status === "draft" && (
            <Button onClick={() => setFinalizeDialogOpen(true)}>
              <CheckCircle className="w-4 h-4 mr-2" />
              {t("actions.finalize")}
            </Button>
          )}
          <Button variant="outline" onClick={() => setSendDialogOpen(true)}>
            <Send className="w-4 h-4 mr-2" />
            {t("actions.send")}
          </Button>
          <Button variant="outline" onClick={handleDownloadPDF}>
            <Download className="w-4 h-4 mr-2" />
            {t("actions.download")}
          </Button>
          <Button variant="outline" onClick={handleDuplicate}>
            <Copy className="w-4 h-4 mr-2" />
            {t("actions.duplicate")}
          </Button>
          {invoice.status === "draft" && (
            <Button variant="outline" onClick={() => setDeleteDialogOpen(true)}>
              <Trash2 className="w-4 h-4 mr-2" />
              {t("actions.delete")}
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">{t("tabs.overview")}</TabsTrigger>
          <TabsTrigger value="payments">{t("tabs.payments")}</TabsTrigger>
          <TabsTrigger value="activity">{t("tabs.activity")}</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Invoice Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-4">
              <h3 className="font-semibold mb-3">{t("details.invoiceDetails")}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("table.issueDate")}:</span>
                  <span>{new Date(invoice.issue_date).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("table.dueDate")}:</span>
                  <span>{new Date(invoice.due_date).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("form.currency")}:</span>
                  <span>{invoice.currency}</span>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold mb-3">{t("details.clientDetails")}</h3>
              <div className="space-y-1 text-sm">
                <p className="font-medium">{invoice.client_name}</p>
                {invoice.client_email && <p className="text-muted-foreground">{invoice.client_email}</p>}
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold mb-3">{t("details.financials")}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("table.total")}:</span>
                  <span className="font-medium">
                    {invoice.total} {invoice.currency}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("details.paid")}:</span>
                  <span>
                    {(parseFloat(invoice.total) - parseFloat(invoice.balance)).toFixed(2)} {invoice.currency}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("table.balance")}:</span>
                  <span className="font-bold text-lg">
                    {invoice.balance} {invoice.currency}
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* Line Items */}
          <Card>
            <div className="p-4 border-b">
              <h3 className="font-semibold">{t("details.lineItems")}</h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("table.description")}</TableHead>
                  <TableHead className="text-right">{t("table.quantity")}</TableHead>
                  <TableHead className="text-right">{t("table.unitPrice")}</TableHead>
                  <TableHead className="text-right">{t("table.tax")}</TableHead>
                  <TableHead className="text-right">{t("table.discount")}</TableHead>
                  <TableHead className="text-right">{t("table.lineTotal")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.line_items?.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-right">
                      {item.quantity} {item.unit}
                    </TableCell>
                    <TableCell className="text-right">{item.unit_price}</TableCell>
                    <TableCell className="text-right">{item.tax_rate}%</TableCell>
                    <TableCell className="text-right">{item.discount_percent}%</TableCell>
                    <TableCell className="text-right font-medium">{item.line_total}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="p-4 border-t space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("form.subtotal")}:</span>
                <span>{invoice.subtotal} {invoice.currency}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("form.tax")}:</span>
                <span>{invoice.tax_amount} {invoice.currency}</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>{t("form.total")}:</span>
                <span>
                  {invoice.total} {invoice.currency}
                </span>
              </div>
            </div>
          </Card>

          {/* Notes & Terms */}
          {(invoice.notes || invoice.terms_conditions) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {invoice.notes && (
                <Card className="p-4">
                  <h3 className="font-semibold mb-2">{t("form.notes")}</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{invoice.notes}</p>
                </Card>
              )}
              {invoice.terms_conditions && (
                <Card className="p-4">
                  <h3 className="font-semibold mb-2">{t("form.termsConditions")}</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {invoice.terms_conditions}
                  </p>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">{t("details.paymentHistory")}</h3>
            <div className="flex gap-2">
              <Button onClick={() => setPaymentDialogOpen(true)}>
                <DollarSign className="w-4 h-4 mr-2" />
                {t("actions.recordPayment")}
              </Button>
              <Button variant="outline" onClick={handleMarkPaid}>
                <CheckCircle className="w-4 h-4 mr-2" />
                {t("actions.markPaid")}
              </Button>
            </div>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("table.date")}</TableHead>
                  <TableHead>{t("table.amount")}</TableHead>
                  <TableHead>{t("table.method")}</TableHead>
                  <TableHead>{t("table.reference")}</TableHead>
                  <TableHead>{t("table.notes")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      {t("details.noPayments")}
                    </TableCell>
                  </TableRow>
                ) : (
                  payments.map((payment: any) => (
                    <TableRow key={payment.id}>
                      <TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
                      <TableCell className="font-medium">
                        {payment.amount} {invoice.currency}
                      </TableCell>
                      <TableCell>{t(`paymentMethods.${payment.payment_method}`)}</TableCell>
                      <TableCell>{payment.reference_number || "-"}</TableCell>
                      <TableCell className="max-w-xs truncate">{payment.notes || "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <Card className="p-8 text-center text-muted-foreground">
            <p>{t("details.activityComingSoon")}</p>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Send Invoice Dialog */}
      <SendInvoiceDialog
        open={sendDialogOpen}
        onOpenChange={setSendDialogOpen}
        invoiceId={invoiceId}
        clientEmail={invoice.client_email}
        invoiceNumber={invoice.invoice_number}
      />

      {/* Record Payment Dialog */}
      <RecordPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        invoiceId={invoiceId}
        balance={parseFloat(invoice.balance)}
        currency={invoice.currency}
      />

      {/* Finalize Confirmation */}
      <AlertDialog open={finalizeDialogOpen} onOpenChange={setFinalizeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("actions.finalizeInvoice")}</AlertDialogTitle>
            <AlertDialogDescription>{t("actions.finalizeConfirmation")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleFinalize}>{t("actions.finalize")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("actions.deleteInvoice")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("actions.deleteConfirmation", { number: invoice.invoice_number })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">
              {t("actions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
