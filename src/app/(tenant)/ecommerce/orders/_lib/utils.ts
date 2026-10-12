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
