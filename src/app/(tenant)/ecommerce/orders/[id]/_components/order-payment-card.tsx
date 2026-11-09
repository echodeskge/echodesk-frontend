"use client"

import { CreditCard, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import { IdText, InfoCard, InfoRows, PaymentStatusPill, rdButton } from "../../../_components/ui"
import { PAYMENT_PROVIDER_LABELS } from "../../_data/constants"
import { OrderDetail } from "../../_types"

type Translate = ((key: string, values?: Record<string, string | number>) => string) & { has?: (key: string) => boolean }

interface OrderPaymentCardProps {
  order: OrderDetail
  refunding: boolean
  isManager: boolean
  onMarkPaid: () => void
  onRefund: () => void
  t: Translate
}

/** Mirrors the backend: manager-only, and mark-paid is refused for refunded payments and for cancelled/refunded orders. */
export function paymentActions(order: Pick<OrderDetail, "status" | "payment_status">, isManager: boolean) {
  const paymentStatus = String(order.payment_status || "pending")
  const orderClosed = String(order.status) === "refunded" || String(order.status) === "cancelled"
  return {
    canMarkPaid: isManager && !orderClosed && !["paid", "refunded", "partially_refunded"].includes(paymentStatus),
    canRefund: isManager && !orderClosed,
  }
}

export function OrderPaymentCard({ order, refunding, isManager, onMarkPaid, onRefund, t }: OrderPaymentCardProps) {
  const paymentStatus = String(order.payment_status || "pending")
  const { canMarkPaid, canRefund } = paymentActions(order, isManager)
  const methodKey = `detail.paymentMethod.${order.payment_method || "unknown"}`
  // "unknown" reads "N/A" in the catalogs; a dash works in both languages.
  const method = !order.payment_method ? "—" : t.has && !t.has(methodKey) ? order.payment_method : t(methodKey)

  return (
    <InfoCard title={t("detail.payment")} icon={<CreditCard />} testId="ec-order-payment">
      <div className="flex flex-col gap-2">
        <InfoRows
          rows={[
            { key: "method", label: t("detail.method"), value: method },
            {
              key: "provider",
              label: t("detail.provider"),
              value: order.payment_provider ? PAYMENT_PROVIDER_LABELS[order.payment_provider] || order.payment_provider : null,
              hidden: !order.payment_provider,
            },
            { key: "status", label: t("table.status"), value: <PaymentStatusPill status={paymentStatus} /> },
            {
              key: "bog",
              label: t("detail.bogOrderId"),
              value: <IdText title={order.bog_order_id ?? undefined}>{order.bog_order_id?.slice(0, 8)}…</IdText>,
              hidden: !order.bog_order_id,
            },
          ]}
        />
        {(canMarkPaid || canRefund) && (
          <div className="flex flex-col gap-2 border-t pt-3">
            {canMarkPaid && (
              <button type="button" className={cn(rdButton.primary, "w-full")} onClick={onMarkPaid} data-testid="ec-order-mark-paid">
                <CreditCard className="h-3.5 w-3.5" aria-hidden />
                {t("detail.markAsPaid")}
              </button>
            )}
            {canRefund && (
              <button
                type="button"
                className={cn(rdButton.outline, "w-full border-destructive/40 text-destructive hover:bg-destructive/10")}
                disabled={refunding}
                onClick={onRefund}
                data-testid="ec-order-refund"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                {refunding ? t("refund.processing") : t("refund.button")}
              </button>
            )}
          </div>
        )}
      </div>
    </InfoCard>
  )
}
