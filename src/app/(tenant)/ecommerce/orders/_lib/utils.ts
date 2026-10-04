import { format } from "date-fns"
import { enUS, ka } from "date-fns/locale"

const dateLocale = (locale?: string) => (locale === "ka" ? ka : enUS)

export function formatCurrency(amount: string) {
  return `₾${parseFloat(amount).toFixed(2)}`
}

export function formatDate(dateString: string, locale?: string) {
  return format(new Date(dateString), "PP", { locale: dateLocale(locale) })
}

export function formatDateWithTime(dateString: string, locale?: string) {
  // 24-hour clock for Georgian; AM/PM markers aren't used there.
  const pattern = locale === "ka" ? "PP HH:mm" : "PP hh:mm a"
  return format(new Date(dateString), pattern, { locale: dateLocale(locale) })
}
