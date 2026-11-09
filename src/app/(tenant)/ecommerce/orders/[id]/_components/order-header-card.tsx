"use client"

import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { useLocale } from "next-intl"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TONE_DOT } from "@/components/redesign/tones"
import { cn } from "@/lib/utils"
import {
  IdText,
  OrderStatusPill,
  PaymentStatusPill,
  formatEcDateTime,
  orderStatusTone,
  rdButton,
} from "../../../_components/ui"
import { OrderDetail } from "../../_types"

type Translate = (key: string, values?: Record<string, string | number>) => string

interface OrderHeaderCardProps {
  order: OrderDetail
  updatingStatus: boolean
  isManager: boolean
  onStatusChange: (status: string) => void
  t: Translate
}

const SELECTABLE_STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"]

/** Statuses offered in the status menu (same rules as before). */
export function selectableStatuses(status: string, paymentStatus: string, isManager: boolean): string[] {
  // Only e-commerce managers may cancel an order that has been paid.
  const canCancel = isManager || paymentStatus !== "paid"
  return SELECTABLE_STATUSES.filter((s) => s !== "cancelled" || canCancel || status === "cancelled")
}

/** Cancelled and refunded orders are final on the backend. */
export function isFinalStatus(status: string): boolean {
  return status === "cancelled" || status === "refunded"
}

/** Summary card on top of the order page: number, date, statuses and the status menu. */
export function OrderHeaderCard({ order, updatingStatus, isManager, onStatusChange, t }: OrderHeaderCardProps) {
  const locale = useLocale()
  const status = String(order.status || "pending")
  const paymentStatus = String(order.payment_status || "pending")
  const isFinal = isFinalStatus(status)

  return (
    <section className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border bg-card px-3 py-3 sm:px-4" data-testid="ec-order-header">
      <Link
        href="/ecommerce/orders"
        className={rdButton.ghostIconSm}
        aria-label={t("detail.backToOrders")}
        title={t("detail.backToOrders")}
      >
        <ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
      </Link>
      <div className="flex min-w-0 flex-col">
        <IdText className="text-[13px] font-semibold">#{order.order_number}</IdText>
        <span className="text-xs text-muted-foreground tabular-nums">
          {t("detail.placedOn", { date: formatEcDateTime(order.created_at, locale) })}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <OrderStatusPill status={status} />
        <PaymentStatusPill status={paymentStatus} />
      </div>
      <div className="ms-auto">
        <Select value={status} onValueChange={onStatusChange} disabled={updatingStatus || isFinal}>
          <SelectTrigger className="h-7 w-[168px] text-xs" aria-label={t("detail.orderStatus")} data-testid="ec-order-status-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {/* A final status is not in the list; keep it selectable as the current value. */}
            {(isFinal && !SELECTABLE_STATUSES.includes(status)
              ? [...selectableStatuses(status, paymentStatus, isManager), status]
              : selectableStatuses(status, paymentStatus, isManager)
            ).map((s) => (
              <SelectItem key={s} value={s} className="text-xs">
                <span className="flex items-center gap-2">
                  <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", TONE_DOT[orderStatusTone(s)])} />
                  {t(`status.${s}`)}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </section>
  )
}
