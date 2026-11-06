import { format } from "date-fns"
import { enUS, ka } from "date-fns/locale"

const dateLocale = (locale?: string) => (locale === "ka" ? ka : enUS)

export function formatCurrency(amount: string) {
  return `₾${parseFloat(amount).toFixed(2)}`
}

/** A missing or unparseable date shows as "—" instead of throwing (which takes the whole page down). */
function safeFormat(dateString: string | null | undefined, pattern: string, locale?: string) {
  if (!dateString) return "—"
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return "—"
  return format(date, pattern, { locale: dateLocale(locale) })
}

export function formatDate(dateString: string | null | undefined, locale?: string) {
  return safeFormat(dateString, "PP", locale)
}

export function formatDateWithTime(dateString: string | null | undefined, locale?: string) {
  // 24-hour clock for Georgian; AM/PM markers aren't used there.
  return safeFormat(dateString, locale === "ka" ? "PP HH:mm" : "PP hh:mm a", locale)
}

export interface CourierInfo {
  /** Courier the customer picked at checkout (e.g. "Deliverers"). */
  chosen: string | null
  /** Courier Quickshipper actually booked, when it differs from the choice. */
  booked: string | null
  trackingUrl: string | null
  pickup: boolean
}

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null)

/** Courier details stored on payment_metadata by checkout and the Quickshipper booking task. */
export function getCourierInfo(paymentMetadata: unknown): CourierInfo {
  const meta = (paymentMetadata && typeof paymentMetadata === "object" ? paymentMetadata : {}) as Record<string, unknown>
  const quote = (meta.quickshipper_quote ?? {}) as Record<string, unknown>
  const booking = (meta.quickshipper ?? {}) as Record<string, unknown>
  const chosen = str(quote?.provider_name)
  const bookedName = str(booking?.provider_name)
  const trackingUrl = str(booking?.tracking_url)
  return {
    chosen: chosen ?? bookedName,
    booked: bookedName && bookedName !== chosen ? bookedName : null,
    trackingUrl: trackingUrl && /^https:\/\//.test(trackingUrl) ? trackingUrl : null,
    pickup: meta.delivery_method === "pickup",
  }
}
