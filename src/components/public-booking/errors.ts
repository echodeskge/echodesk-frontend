"use client"

import { useTranslations } from "next-intl"
import { BookingApiError } from "@/lib/booking-api"
import { useSalon } from "./salon-context"

/** Codes the booking API attaches to errors (see `_error` in views_client.py). */
const KNOWN_CODES = new Set([
  "slot_unavailable",
  "outside_booking_window",
  "payment_option_unavailable",
  "payment_unavailable",
  "booking_limit",
  "cannot_cancel",
  "cannot_change",
  "cannot_rate",
  "invalid_credentials",
  "invalid_code",
  "account_exists",
  "weak_password",
  "service_unavailable",
  "not_found",
])

/**
 * Turns any failure into a message in the visitor's language.
 *
 * The API's own error text is English and written for developers, so it is
 * never shown: errors are translated by their `code`, by HTTP status
 * (throttled, offline), or fall back to a generic message.
 */
export function useErrorMessage(): (error: unknown) => string {
  const t = useTranslations("publicBooking")
  const { info } = useSalon()

  return (error: unknown) => {
    if (error instanceof BookingApiError) {
      if (error.status === 0) return t("errors.network")
      if (error.status === 429) return t("errors.throttled")
      if (error.code === "cannot_cancel" || error.code === "cannot_change") {
        return t("manage.cannotCancel", { hours: info.cancellation_hours_before })
      }
      if (error.code === "outside_booking_window") {
        return t("errors.outside_booking_window", {
          hours: info.min_hours_before_booking,
          days: info.max_days_advance_booking,
        })
      }
      if (error.code && KNOWN_CODES.has(error.code)) return t(`errors.${error.code}`)
    }
    return t("errors.generic")
  }
}
