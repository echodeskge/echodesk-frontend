"use client"

import { useTranslations } from "next-intl"
import { TonePill } from "@/components/redesign/pill"
import {
  activeTone,
  orderStatusTone,
  paymentStatusTone,
  productStatusTone,
  promoStateTone,
  reviewTone,
  type PromoCodeState,
} from "./tones"

export { TonePill }

/** "partially_refunded" -> "Partially refunded" for a status without a catalog entry. */
export function humanize(raw: string | null | undefined): string {
  if (!raw) return "—"
  const text = raw.replace(/_/g, " ")
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** Order status pill (`ecommerceOrders.status.*`). */
export function OrderStatusPill({ status, className }: { status: string | null | undefined; className?: string }) {
  const t = useTranslations("ecommerceOrders")
  const s = status || "pending"
  return (
    <TonePill tone={orderStatusTone(s)} dot className={className} testId="ec-order-status">
      {t.has(`status.${s}`) ? t(`status.${s}`) : humanize(s)}
    </TonePill>
  )
}

/** Payment status pill (`ecommerceOrders.paymentStatus.*`). */
export function PaymentStatusPill({ status, className }: { status: string | null | undefined; className?: string }) {
  const t = useTranslations("ecommerceOrders")
  const s = status || "pending"
  return (
    <TonePill tone={paymentStatusTone(s)} className={className} testId="ec-payment-status">
      {t.has(`paymentStatus.${s}`) ? t(`paymentStatus.${s}`) : humanize(s)}
    </TonePill>
  )
}

const PRODUCT_STATUS_KEY: Record<string, string> = {
  active: "active",
  draft: "draft",
  inactive: "inactive",
  out_of_stock: "outOfStock",
}

/** Product status pill (`products.active|draft|inactive|outOfStock`). */
export function ProductStatusPill({ status, className }: { status: string | null | undefined; className?: string }) {
  const t = useTranslations("products")
  const s = status || "draft"
  const key = PRODUCT_STATUS_KEY[s]
  return (
    <TonePill tone={productStatusTone(s)} dot className={className} testId="ec-product-status">
      {key && t.has(key) ? t(key) : humanize(s)}
    </TonePill>
  )
}

/** Review moderation pill (`reviews.approved` / `reviews.pending`). */
export function ReviewStatusPill({ approved, className }: { approved: boolean | null | undefined; className?: string }) {
  const t = useTranslations("reviews")
  return (
    <TonePill tone={reviewTone(approved)} dot className={className} testId="ec-review-status">
      {t(approved ? "approved" : "pending")}
    </TonePill>
  )
}

/** Promo code state pill (`promoCodes.active|inactive|expired|maxedOut`), state from `promoCodeState`. */
export function PromoStatePill({ state, className }: { state: PromoCodeState; className?: string }) {
  const t = useTranslations("promoCodes")
  return (
    <TonePill tone={promoStateTone(state)} dot className={className} testId="ec-promo-state">
      {t(state)}
    </TonePill>
  )
}

/** Active / inactive pill (`ecommerceUi.active|inactive`). */
export function ActivePill({ active, className }: { active: boolean | null | undefined; className?: string }) {
  const t = useTranslations("ecommerceUi")
  return (
    <TonePill tone={activeTone(active)} dot className={className} testId="ec-active">
      {t(active ? "active" : "inactive")}
    </TonePill>
  )
}
