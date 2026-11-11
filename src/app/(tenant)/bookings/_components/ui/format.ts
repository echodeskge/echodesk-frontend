/**
 * Date, time and money formatting for the bookings screens (BKG-00
 * foundation, delivered with BKG-01).
 *
 * Booking dates arrive as "YYYY-MM-DD" wall-clock strings in the business
 * timezone and are read as calendar days (never `new Date("YYYY-MM-DD")`,
 * which is UTC midnight and shows the previous day west of Greenwich).
 * Times are "HH:MM[:SS]" strings and are shown as "HH:MM". Timestamps
 * (`created_at`, ...) are ISO with a zone and are shown in the browser's zone
 * through the tickets formatter (Georgian month names written out: Chrome has
 * no `ka` Intl data).
 */
import {
  formatDateTime,
  formatShortDate,
  parseDateOnly,
  toDateOnlyString,
  type ShortDateOptions,
} from "@/app/(tenant)/tickets/_lib/format"

export { formatShortDate, parseDateOnly, toDateOnlyString }

export const CURRENCY_SIGN = "₾"

/** "Nov 10, 2026" / "10 ნოე 2026" for a booking day (the year is always shown). */
export function formatBookingDate(value: string | null | undefined, locale: string, opts: ShortDateOptions = {}): string {
  if (!value) return "—"
  return formatShortDate(value, locale, { year: "always", ...opts }) || value
}

/** "Nov 6, 2026, 09:02" / "6 ნოე 2026, 09:02" for an ISO timestamp. */
export function formatBookingDateTime(value: string | null | undefined, locale: string, opts: ShortDateOptions = {}): string {
  if (!value) return "—"
  return formatDateTime(value, locale, { year: "always", ...opts }) || "—"
}

/** "09:00" for "09:00:00" (the API's time strings); "" when missing. */
export function formatTime(value: string | null | undefined): string {
  if (!value) return ""
  return value.slice(0, 5)
}

/** "09:00 – 10:00". */
export function formatTimeRange(start: string | null | undefined, end: string | null | undefined): string {
  const a = formatTime(start)
  const b = formatTime(end)
  if (!a && !b) return "—"
  return b ? `${a} – ${b}` : a
}

/** A decimal string / number as a finite number, or null. */
export function parseMoney(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  const trimmed = value.trim()
  if (trimmed === "") return null
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : null
}

/** "₾350.00" (comma thousands, two decimals); "—" for a missing value. */
export function formatMoney(value: string | number | null | undefined, opts: { empty?: string } = {}): string {
  const n = parseMoney(value)
  if (n === null) return opts.empty ?? "—"
  const neg = n < 0
  const cents = Math.round((Math.abs(n) + Number.EPSILON) * 100)
  const [i, d] = (cents / 100).toFixed(2).split(".")
  return `${neg ? "-" : ""}${CURRENCY_SIGN}${i.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${d}`
}

/** "YYYY-MM-DD" moved by `days` calendar days (no timezone involved). */
export function shiftDateOnly(value: string, days: number): string {
  const p = parseDateOnly(value)
  if (!p) return value
  const d = new Date(p.year, p.month - 1, p.day + days)
  return toDateOnlyString(d)
}

/** Today's "YYYY-MM-DD" in the business timezone (falls back to the browser's day). */
export function todayInTimezone(timeZone: string, now: Date = new Date()): string {
  try {
    // en-CA formats as YYYY-MM-DD
    return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now)
  } catch {
    return toDateOnlyString(now)
  }
}
