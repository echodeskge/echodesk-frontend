/**
 * E-commerce status -> tone maps (EC-00). The tone palette is the shared
 * redesign one (`@/components/redesign/tones`): green = done/paid/approved,
 * amber = waiting, blue = in progress, violet = on the way, red =
 * cancelled/failed/expired, neutral = refunded/draft/inactive.
 */
import type { Tone } from "@/components/redesign/tones"

export type { Tone }

export const ORDER_STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"] as const
export const PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded", "partially_refunded"] as const
export const PRODUCT_STATUSES = ["draft", "active", "inactive", "out_of_stock"] as const

/** Order fulfilment status. Unknown values read as pending (as the order screens do). */
export function orderStatusTone(status: string | null | undefined): Tone {
  switch (status) {
    case "confirmed":
    case "processing":
      return "info"
    case "shipped":
      return "violet"
    case "delivered":
      return "success"
    case "cancelled":
      return "danger"
    case "refunded":
      return "neutral"
    default:
      return "warning"
  }
}

/** Order payment status. */
export function paymentStatusTone(status: string | null | undefined): Tone {
  switch (status) {
    case "paid":
      return "success"
    case "failed":
      return "danger"
    case "refunded":
      return "neutral"
    case "partially_refunded":
      return "violet"
    default:
      return "warning"
  }
}

/** Product catalogue status. */
export function productStatusTone(status: string | null | undefined): Tone {
  switch (status) {
    case "active":
      return "success"
    case "out_of_stock":
      return "danger"
    case "inactive":
      return "neutral"
    default:
      return "warning" // draft
  }
}

/** Review moderation: approved (visible on the shop) or waiting for a moderator. */
export function reviewTone(isApproved: boolean | null | undefined): Tone {
  return isApproved ? "success" : "warning"
}

/** Active / inactive switches shown as a pill (languages, shipping methods, sections, attributes). */
export function activeTone(isActive: boolean | null | undefined): Tone {
  return isActive ? "success" : "neutral"
}

export type PromoCodeState = "inactive" | "expired" | "maxedOut" | "active"

/**
 * The promo-codes page's status rule, unchanged: inactive first, then expired
 * (`valid_until` in the past), then maxed out (`times_used >= max_uses`), else
 * active. `now` is injectable for tests.
 */
export function promoCodeState(
  code: { is_active?: boolean | null; valid_until?: string | null; max_uses?: number | null; times_used?: number | null },
  now: Date = new Date()
): PromoCodeState {
  if (!code.is_active) return "inactive"
  if (code.valid_until && new Date(code.valid_until) < now) return "expired"
  if (code.max_uses !== undefined && code.max_uses !== null && (code.times_used ?? 0) >= code.max_uses) return "maxedOut"
  return "active"
}

export function promoStateTone(state: PromoCodeState): Tone {
  switch (state) {
    case "active":
      return "success"
    case "expired":
      return "danger"
    case "maxedOut":
      return "warning"
    default:
      return "neutral"
  }
}
