"use client";

/**
 * Payment block (FE-12, E1, E8, critic 16, W87).
 *
 * Shown when the ticket is an order or has a payment due date, so
 * `payment_due_date` keeps its payment meaning (E1). Rows: price, status,
 * amount paid, remaining, "Payment due" (red with "Payment overdue" when the
 * server's `is_overdue` says so) and the payments list.
 *
 * "Record payment" (only with `can_manage_payments`) opens a dialog: amount,
 * method, reference, notes. `process_payment` takes the ticket id and the
 * amount (it adds to `amount_paid` and stores a "manual" payment row); when a
 * method other than manual, a reference or notes were given, the new row is
 * then PATCHed with them (`/payments/{id}/`, also manager-only).
 */
import { useState, type FormEvent, type ReactNode } from "react";
import { AlertCircle, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import axios from "@/api/axios";
import type { TicketPayment, TicketPaymentPaymentMethodEnum } from "@/api/generated/interfaces";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { formatShortDate } from "../../../_lib/format";
import { newMutationId, rememberMutation, mutationHeaders } from "../../../_lib/mutation-id";
import { tk } from "../../../_lib/query-keys";
import type { TicketDetail, ViewerPermissions } from "../../../_lib/types";
import { RailSection, userName } from "./rail-shared";

export const PAYMENT_METHODS: TicketPaymentPaymentMethodEnum[] = [
  "cash",
  "card",
  "bank_transfer",
  "paypal",
  "stripe",
  "manual",
  "other",
];

export function showPaymentBlock(ticket: Pick<TicketDetail, "is_order" | "payment_due_date">): boolean {
  return !!ticket.is_order || !!ticket.payment_due_date;
}

function money(amount: string | number | null | undefined, currency: string | null | undefined): string {
  if (amount === null || amount === undefined || amount === "") return "—";
  const n = Number(amount);
  const text = Number.isFinite(n) ? n.toFixed(2) : String(amount);
  return currency ? `${text} ${currency}` : text;
}

function isOverdue(v: TicketDetail["is_overdue"]): boolean {
  return v === true || v === "true" || v === "True";
}

const STATUS_KEY: Record<string, string> = {
  paid: "paid",
  unpaid: "unpaid",
  partially_paid: "partiallyPaid",
  overpaid: "overpaid",
  no_payment_required: "noPaymentRequired",
};

function Line({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[92px_minmax(0,1fr)] items-baseline gap-2 text-xs leading-5" data-slot="payment-line">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 tabular-nums">{children}</span>
    </div>
  );
}

interface ProcessResponse {
  ticket?: TicketDetail;
  remaining_balance?: string;
}

export interface RecordPaymentInput {
  amount: string;
  method: TicketPaymentPaymentMethodEnum;
  reference: string;
  notes: string;
}

/** The newest payment row (highest id) of a ticket response. */
export function newestPayment(payments: TicketPayment[] | null | undefined): TicketPayment | null {
  return (payments ?? []).reduce<TicketPayment | null>((best, p) => (!best || p.id > best.id ? p : best), null);
}

function useRecordPayment(ticketId: number) {
  const qc = useQueryClient();
  const t = useTranslations("ticketsScreen.payment");
  return useMutation({
    mutationFn: async (input: RecordPaymentInput) => {
      const mid = newMutationId();
      rememberMutation(mid);
      const { data } = await axios.post<ProcessResponse>(
        "/api/payments/process_payment/",
        { ticket_id: ticketId, amount: input.amount },
        { headers: mutationHeaders(mid) },
      );
      let ticket = data.ticket;
      let detailsFailed = false;
      const extra = input.method !== "manual" || input.reference.trim() || input.notes.trim();
      const row = newestPayment(ticket?.payments);
      if (extra && row) {
        try {
          const { data: saved } = await axios.patch<TicketPayment>(`/api/payments/${row.id}/`, {
            payment_method: input.method,
            payment_reference: input.reference.trim(),
            notes: input.notes.trim(),
          });
          if (ticket) ticket = { ...ticket, payments: ticket.payments.map((p) => (p.id === saved.id ? { ...p, ...saved } : p)) };
        } catch {
          detailsFailed = true;
        }
      }
      return { ticket, detailsFailed };
    },
    onSuccess: ({ ticket, detailsFailed }) => {
      if (ticket) qc.setQueryData(tk.ticket(ticketId), (prev: TicketDetail | undefined) => (prev ? { ...prev, ...ticket } : ticket));
      else qc.invalidateQueries({ queryKey: tk.ticket(ticketId) });
      qc.invalidateQueries({ queryKey: tk.activity(ticketId) });
      if (detailsFailed) toast.warning(t("detailsError"));
      else toast.success(t("recorded"));
    },
    onError: () => {
      toast.error(t("recordError"));
    },
  });
}

function RecordPaymentDialog({
  open,
  onOpenChange,
  ticket,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: TicketDetail;
}) {
  const t = useTranslations("ticketsScreen.payment");
  const tCommon = useTranslations("common");
  const record = useRecordPayment(ticket.id);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<TicketPaymentPaymentMethodEnum>("cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setAmount("");
    setMethod("cash");
    setReference("");
    setNotes("");
    setError(null);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const n = Number(amount);
    if (!amount.trim() || !Number.isFinite(n) || n <= 0) {
      setError(t("amountInvalid"));
      return;
    }
    setError(null);
    record.mutate(
      { amount: n.toFixed(2), method, reference, notes },
      {
        onSuccess: () => {
          reset();
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (record.isPending) return;
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-md" data-testid="record-payment-dialog">
        <DialogHeader>
          <DialogTitle>{t("recordTitle")}</DialogTitle>
          <DialogDescription>{t("recordBody")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="payment-amount">
              {t("amount")}
              {ticket.currency ? ` (${ticket.currency})` : ""}
            </Label>
            <Input
              id="payment-amount"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "payment-amount-error" : undefined}
              autoFocus
            />
            {error && (
              <p id="payment-amount-error" className="text-xs text-destructive">
                {error}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="payment-method">{t("method.label")}</Label>
            <select
              id="payment-method"
              value={method}
              onChange={(e) => setMethod(e.target.value as TicketPaymentPaymentMethodEnum)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {t(`method.${m}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="payment-reference">{t("reference")}</Label>
            <Input id="payment-reference" value={reference} onChange={(e) => setReference(e.target.value)} maxLength={100} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="payment-notes">{t("notes")}</Label>
            <Textarea id="payment-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="resize-none" />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={record.isPending}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={record.isPending} data-testid="record-payment-save">
              {t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function PaymentBlock({ ticket, perms }: { ticket: TicketDetail; perms: ViewerPermissions }) {
  const t = useTranslations("ticketsScreen.payment");
  const locale = useLocale();
  const [recordOpen, setRecordOpen] = useState(false);

  if (!showPaymentBlock(ticket)) return null;

  const currency = ticket.currency ?? null;
  const statusKey = STATUS_KEY[ticket.payment_status] ?? (ticket.is_paid ? "paid" : "unpaid");
  const paid = statusKey === "paid" || statusKey === "overpaid";
  const overdue = isOverdue(ticket.is_overdue);
  const payments = [...(ticket.payments ?? [])].sort((a, b) => (a.processed_at < b.processed_at ? 1 : -1));

  return (
    <RailSection
      label={t("title")}
      data-testid="payment-block"
      action={
        perms.can_manage_payments ? (
          <button
            type="button"
            data-testid="record-payment"
            onClick={() => setRecordOpen(true)}
            className="inline-flex h-6 shrink-0 items-center gap-1 rounded-md border px-2 text-[11px] font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus aria-hidden="true" size={12} />
            {t("record")}
          </button>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-1">
        <Line label={t("price")}>{money(ticket.price, currency)}</Line>
        <Line label={t("status")}>
          <span
            data-slot="payment-status"
            data-status={statusKey}
            className={cn(
              "inline-flex h-5 items-center rounded-full px-2 text-[11px] font-medium",
              paid ? "bg-green/10 text-green" : "bg-muted text-foreground",
            )}
          >
            {t(statusKey)}
          </span>
        </Line>
        <Line label={t("amountPaid")}>{money(ticket.amount_paid ?? "0", currency)}</Line>
        <Line label={t("remaining")}>{money(ticket.remaining_balance, currency)}</Line>
        {ticket.payment_due_date && (
          <Line label={t("paymentDue")}>
            <span
              data-slot="payment-due"
              data-overdue={overdue ? "true" : "false"}
              className={cn("inline-flex items-center gap-1", overdue && "font-medium text-destructive")}
            >
              {overdue && <AlertCircle aria-hidden="true" size={12} />}
              {formatShortDate(ticket.payment_due_date, locale, { year: "auto" })}
              {overdue && <span>· {t("overdue")}</span>}
            </span>
          </Line>
        )}
      </div>
      <div className="flex flex-col gap-0.5" data-testid="payments-list">
        <span className="text-[11px] text-muted-foreground">{t("payments")}</span>
        {payments.length === 0 ? (
          <span className="text-xs text-muted-foreground">{t("noPayments")}</span>
        ) : (
          payments.map((p) => (
            <span
              key={p.id}
              data-slot="payment-row"
              className="truncate text-xs tabular-nums"
              title={[p.payment_reference, p.notes, p.processed_by ? t("processedBy", { name: userName(p.processed_by) }) : ""]
                .filter(Boolean)
                .join(" · ")}
            >
              {t("paymentLine", {
                amount: money(p.amount, p.currency || currency),
                method: t(`method.${PAYMENT_METHODS.includes(p.payment_method as TicketPaymentPaymentMethodEnum) ? p.payment_method : "other"}`),
                date: formatShortDate(p.processed_at, locale),
              })}
            </span>
          ))
        )}
      </div>
      {perms.can_manage_payments && <RecordPaymentDialog open={recordOpen} onOpenChange={setRecordOpen} ticket={ticket} />}
    </RailSection>
  );
}
