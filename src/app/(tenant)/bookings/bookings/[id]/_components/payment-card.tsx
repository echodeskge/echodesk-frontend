"use client"

import { useState } from "react"
import { useLocale } from "next-intl"
import { CreditCard, Loader2, Pencil, RefreshCw } from "lucide-react"
import type { BookingDetail } from "@/api/generated/interfaces"
import { cn } from "@/lib/utils"
import {
  BookingsCard,
  PaymentStatusPill,
  SummaryRows,
  bkgButton,
  bkgField,
  formatBookingDateTime,
  formatMoney,
  humanize,
  parseMoney,
} from "../../../_components/ui"
import { canRecordPayment } from "../../../_lib/booking-status"

type Translate = ((key: string, values?: Record<string, string | number>) => string) & { has: (key: string) => boolean }

/** Remaining amount from the detail payload (`remaining_amount`), else total − paid. */
export function remainingAmount(b: Pick<BookingDetail, "remaining_amount" | "total_amount" | "paid_amount">): number {
  const r = parseMoney(b.remaining_amount as unknown as string | number)
  if (r !== null) return r
  return (parseMoney(b.total_amount) ?? 0) - (parseMoney(b.paid_amount) ?? 0)
}

/**
 * Payment information: Total (editable by admins), Deposit, Paid (green),
 * Remaining + payment pill; "Record payment" (admins) with the recorded
 * payments underneath; "Check payment status" for online (BOG) orders.
 */
export function PaymentCard({
  booking,
  isAdmin,
  checking,
  savingPrice,
  onRecordPayment,
  onCheckStatus,
  onSavePrice,
  t,
}: {
  booking: BookingDetail
  isAdmin: boolean
  checking: boolean
  savingPrice: boolean
  onRecordPayment: () => void
  onCheckStatus: () => void
  onSavePrice: (price: string) => Promise<boolean>
  t: Translate
}) {
  const locale = useLocale()
  const [editingPrice, setEditingPrice] = useState(false)
  const [price, setPrice] = useState("")
  const [priceError, setPriceError] = useState<string | null>(null)
  const remaining = remainingAmount(booking)
  const payments = booking.manual_payments ?? []
  const canEditPrice = isAdmin && booking.status !== "cancelled"

  const startPrice = () => {
    setPrice(String(parseMoney(booking.total_amount) ?? 0))
    setPriceError(null)
    setEditingPrice(true)
  }
  const savePrice = async () => {
    const n = parseMoney(price)
    if (n === null || n < 0) {
      setPriceError(t("payment.priceInvalid"))
      return
    }
    const ok = await onSavePrice(n.toFixed(2))
    if (ok) setEditingPrice(false)
  }

  const methodLabel = (m: string) => (t.has(`payment.methods.${m}`) ? t(`payment.methods.${m}`) : humanize(m))

  return (
    <BookingsCard title={t("cards.paymentInfo")} icon={<CreditCard />} testId="bkg-card-payment">
      <div className="flex flex-col gap-3">
        {editingPrice ? (
          <form
            className="flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              savePrice()
            }}
            data-testid="bkg-price-form"
          >
            <label htmlFor="bkg-price" className="text-xs text-muted-foreground">
              {t("payment.price")}
            </label>
            <input id="bkg-price" type="number" min={0} step="0.01" inputMode="decimal" className={bkgField.input} value={price} onChange={(e) => setPrice(e.target.value)} />
            {priceError && <span className="text-xs text-destructive">{priceError}</span>}
            <div className="flex justify-end gap-2">
              <button type="button" className={bkgButton.outlineSm} onClick={() => setEditingPrice(false)} disabled={savingPrice}>
                {t("notes.cancel")}
              </button>
              <button type="submit" className={bkgButton.primarySm} disabled={savingPrice} data-testid="bkg-price-save">
                {savingPrice && <Loader2 className="h-3 w-3 animate-spin" aria-hidden />}
                {t("notes.save")}
              </button>
            </div>
          </form>
        ) : (
          <SummaryRows
            rows={[
              {
                key: "total",
                label: t("payment.total"),
                strong: true,
                testId: "bkg-pay-total",
                value: (
                  <span className="inline-flex items-center gap-1.5">
                    {formatMoney(booking.total_amount)}
                    {canEditPrice && (
                      <button type="button" className={cn(bkgButton.ghostIconSm, "h-6 w-6")} onClick={startPrice} aria-label={t("payment.editPrice")} title={t("payment.editPrice")} data-testid="bkg-price-edit">
                        <Pencil className="h-3 w-3" aria-hidden />
                      </button>
                    )}
                  </span>
                ),
              },
              { key: "deposit", label: t("payment.deposit"), value: formatMoney(booking.deposit_amount ?? 0) },
              { key: "paid", label: t("payment.paid"), value: <span className="text-green-700 dark:text-green-400">{formatMoney(booking.paid_amount ?? 0)}</span>, testId: "bkg-pay-paid" },
              { key: "remaining", label: t("payment.remaining"), value: formatMoney(remaining), className: "border-t pt-2", testId: "bkg-pay-remaining" },
              {
                key: "method",
                label: t("payment.method"),
                value: methodLabel(String(booking.payment_method)),
                hidden: !booking.payment_method,
              },
              {
                key: "bog",
                label: t("payment.bogOrderId"),
                value: <span className="font-mono text-xs" title={booking.bog_order_id}>{booking.bog_order_id}</span>,
                hidden: !booking.bog_order_id,
              },
            ]}
          />
        )}
        <div>
          <PaymentStatusPill status={booking.payment_status} />
        </div>
        {(isAdmin && canRecordPayment(booking)) || booking.bog_order_id ? (
          <div className="flex flex-col gap-2 border-t pt-3">
            {isAdmin && canRecordPayment(booking) && (
              <button type="button" className={cn(bkgButton.primary, "w-full")} onClick={onRecordPayment} data-testid="bkg-record-payment">
                <CreditCard className="h-3.5 w-3.5" aria-hidden />
                {t("payment.recordPayment")}
              </button>
            )}
            {booking.bog_order_id && (
              <button type="button" className={cn(bkgButton.outline, "w-full")} onClick={onCheckStatus} disabled={checking} data-testid="bkg-check-payment">
                {checking ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <RefreshCw className="h-3.5 w-3.5" aria-hidden />}
                {t("payment.checkPaymentStatus")}
              </button>
            )}
          </div>
        ) : null}
        {payments.length > 0 && (
          <div className="flex flex-col gap-1.5 border-t pt-3" data-testid="bkg-manual-payments">
            <span className="text-xs text-muted-foreground">{t("payment.manualPayments")}</span>
            <ul className="flex flex-col gap-1.5">
              {payments.map((p, i) => (
                <li key={`${p.recorded_at}-${i}`} className="flex items-baseline justify-between gap-3 text-[13px]">
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate">
                      {methodLabel(String(p.method))}
                      {p.note ? <span className="text-muted-foreground"> · {p.note}</span> : null}
                    </span>
                    <span className="truncate text-[11px] text-muted-foreground tabular-nums">
                      {formatBookingDateTime(p.recorded_at, locale)}
                      {p.recorded_by_name ? ` · ${t("payment.recordedBy", { name: p.recorded_by_name })}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 tabular-nums">{formatMoney(p.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </BookingsCard>
  )
}
