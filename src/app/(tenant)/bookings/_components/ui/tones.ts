/**
 * Status tones of the bookings redesign (BKG-00 foundation, delivered with
 * BKG-01). Every pill in the section uses one of the six shared tones so the
 * same meaning has the same colour on every bookings page:
 * amber = waiting (pending / unpaid), blue = confirmed / deposit paid,
 * violet = in progress, green = completed / fully paid, red = cancelled /
 * failed, neutral = no-show / refunded.
 */
import type { Tone } from "@/components/redesign/tones"

export { TONE_CLASS, TONE_DOT } from "@/components/redesign/tones"
export type BookingsTone = Tone

/** Backend `Booking.status` values, in the order the filters show them. */
export const BOOKING_STATUSES = ["pending", "confirmed", "in_progress", "completed", "cancelled", "no_show"] as const
export type BookingStatus = (typeof BOOKING_STATUSES)[number]

/** Backend `Booking.payment_status` values (`pending` reads "Unpaid" in the UI). */
export const PAYMENT_STATUSES = ["pending", "deposit_paid", "fully_paid", "failed", "refunded"] as const
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

export function bookingStatusTone(status: string | null | undefined): Tone {
  switch (status) {
    case "confirmed":
      return "info"
    case "in_progress":
      return "violet"
    case "completed":
      return "success"
    case "cancelled":
      return "danger"
    case "no_show":
      return "neutral"
    default:
      return "warning"
  }
}

export function paymentStatusTone(status: string | null | undefined): Tone {
  switch (status) {
    case "deposit_paid":
      return "info"
    case "fully_paid":
      return "success"
    case "failed":
      return "danger"
    case "refunded":
      return "neutral"
    default:
      return "warning"
  }
}
