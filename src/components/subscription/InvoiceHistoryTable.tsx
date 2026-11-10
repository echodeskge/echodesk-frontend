"use client";

import { Download, FileText, CheckCircle, Clock, XCircle } from "lucide-react";
import { DataTable, type Column } from "@/components/redesign/data-table";
import { TonePill } from "@/components/redesign/pill";
import { rdButton } from "@/components/redesign/buttons";
import { SettingsNote, SettingsSection } from "@/components/redesign/settings";
import { useTranslations } from "next-intl";

interface InvoiceHistoryTableProps {
  invoices?: any[];
  isLoading?: boolean;
}

export function InvoiceHistoryTable({
  invoices,
  isLoading = false,
}: InvoiceHistoryTableProps) {
  const t = useTranslations('subscription.invoiceHistory');
  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case "paid":
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "pending":
        return <Clock className="h-4 w-4 text-amber-600" />;
      case "failed":
      case "cancelled":
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "paid":
      case "completed":
        return <TonePill tone="success">{t('status.paid')}</TonePill>;
      case "pending":
        return <TonePill tone="warning">{t('status.pending')}</TonePill>;
      case "failed":
      case "cancelled":
        return <TonePill tone="danger">{t('status.failed')}</TonePill>;
      default:
        return <TonePill tone="neutral">{status}</TonePill>;
    }
  };

  const handleDownload = (invoice: any) => {
    if (invoice.pdf_url) {
      window.open(invoice.pdf_url, "_blank");
    } else {
      // Fallback: Generate PDF or show not available message
    }
  };

  const columns: Column<any>[] = [
    {
      id: "number",
      header: t('table.invoiceNumber'),
      width: "minmax(0,1.1fr)",
      mobile: "title",
      cell: (invoice) => (
        <span className="flex min-w-0 items-center gap-2 font-medium">
          <span className="shrink-0 [&>svg]:h-3.5 [&>svg]:w-3.5">{getStatusIcon(invoice.status || "paid")}</span>
          <span className="truncate">{invoice.invoice_number}</span>
        </span>
      ),
    },
    {
      id: "date",
      header: t('table.date'),
      width: "110px",
      mobile: "meta",
      cell: (invoice) =>
        invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString() : "N/A",
    },
    {
      id: "package",
      header: t('table.package'),
      width: "minmax(0,1.4fr)",
      mobile: "meta",
      cell: (invoice) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{invoice.package_name || invoice.description}</span>
          {invoice.agent_count > 1 && (
            <span className="text-xs text-muted-foreground">{t('agentsLabel', { count: invoice.agent_count })}</span>
          )}
        </span>
      ),
    },
    {
      id: "amount",
      header: t('table.amount'),
      width: "110px",
      mobile: "end",
      cell: (invoice) => (
        <span className="font-semibold tabular-nums">
          {invoice.amount} {invoice.currency || 'GEL'}
        </span>
      ),
    },
    {
      id: "status",
      header: t('table.status'),
      width: "100px",
      mobile: "meta",
      cell: (invoice) => getStatusBadge(invoice.status || "paid"),
    },
    {
      id: "actions",
      header: <span className="sr-only">{t('table.actions')}</span>,
      width: "120px",
      align: "end",
      mobile: "actions",
      cell: (invoice) => (
        <button
          type="button"
          className={rdButton.outlineSm}
          onClick={() => handleDownload(invoice)}
          disabled={!invoice.pdf_generated}
        >
          <Download className="h-3.5 w-3.5" aria-hidden />
          {t('downloadButton')}
        </button>
      ),
    },
  ];

  return (
    <SettingsSection title={t('title')} hint={t('description')} testId="invoice-history">
      {!isLoading && (!invoices || invoices.length === 0) ? (
        <div className="px-4 py-3.5">
          <SettingsNote tone="neutral" icon={FileText}>{t('noInvoices')}</SettingsNote>
        </div>
      ) : (
        <DataTable<any>
          variant="flush"
          density="comfortable"
          columns={columns}
          rows={isLoading ? undefined : invoices}
          loading={isLoading}
          rowKey={(invoice) => invoice.id}
          ariaLabel={t('title')}
          idPrefix="invoice-history"
          skeletonRows={5}
          renderError={() => null}
        />
      )}
    </SettingsSection>
  );
}
