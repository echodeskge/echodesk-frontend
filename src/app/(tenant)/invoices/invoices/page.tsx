"use client";

/**
 * Invoice List Page
 * Shows all invoices with stats, filters, and actions
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useInvoices, useInvoiceStats } from "@/hooks/useInvoices";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { FileText, Plus, Download, Send, Eye, Copy, Trash2 } from "lucide-react";
import type { InvoiceFilters } from "@/services/invoiceService";

export default function InvoicesPage() {
  const t = useTranslations("invoices");
  const [filters, setFilters] = useState<InvoiceFilters>({});

  const { data: invoicesData, isLoading } = useInvoices(filters);
  const { data: stats } = useInvoiceStats();

  const invoices = invoicesData?.results || [];

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "paid":
        return "default";
      case "partially_paid":
        return "secondary";
      case "sent":
      case "viewed":
        return "outline";
      case "overdue":
        return "destructive";
      default:
        return "secondary";
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
        <Button>
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
              setFilters({ ...filters, status: value === "all" ? undefined : value as any })
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
                  <TableCell>{new Date(invoice.issue_date).toLocaleDateString()}</TableCell>
                  <TableCell>{new Date(invoice.due_date).toLocaleDateString()}</TableCell>
                  <TableCell>{invoice.total} {invoice.currency}</TableCell>
                  <TableCell>{invoice.balance} {invoice.currency}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(invoice.status)}>
                      {t(`status.${invoice.status}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Send className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
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
    </div>
  );
}
