/** Pure helpers shared by the HR leave screens (unit-tested in tests/unit/leave). */

export type BadgeVariant = "default" | "secondary" | "destructive" | "outline"

/** Every leave request status the API can return, in workflow order. */
export const LEAVE_STATUSES = [
  "awaiting_substitutes",
  "pending",
  "manager_approved",
  "hr_approved",
  "approved",
  "rejected",
  "cancelled",
] as const

/** i18n key (under the `leave` namespace) for a request status; unknown -> pending. */
export function leaveStatusKey(status: string): string {
  return (LEAVE_STATUSES as readonly string[]).includes(status)
    ? `shared.status.${status}`
    : "shared.status.pending"
}

export function leaveStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case "approved":
      return "default"
    case "manager_approved":
    case "hr_approved":
      return "secondary"
    case "rejected":
      return "destructive"
    default:
      return "outline"
  }
}

export function substituteStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case "accepted":
      return "default"
    case "rejected":
      return "destructive"
    case "skipped":
      return "secondary"
    default:
      return "outline"
  }
}

export function kpiStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case "approved":
      return "default"
    case "pending":
      return "secondary"
    case "returned":
      return "destructive"
    default:
      return "outline"
  }
}

// ---------------------------------------------------------------------------
// Periods (YYYY-MM)
// ---------------------------------------------------------------------------

const PERIOD_RE = /^(\d{4})-(0[1-9]|1[0-2])$/

export function isPeriod(value: string): boolean {
  return PERIOD_RE.test(value)
}

export function currentPeriod(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

/** Move a YYYY-MM period by `months` (negative = back). */
export function shiftPeriod(period: string, months: number): string {
  const m = PERIOD_RE.exec(period)
  if (!m) return period
  const index = Number(m[1]) * 12 + (Number(m[2]) - 1) + months
  const year = Math.floor(index / 12)
  const month = (index % 12) + 1
  return `${year}-${String(month).padStart(2, "0")}`
}

// Chrome's ICU data has no Georgian month or weekday names (Intl falls back to
// "2026 M11" / English), so Georgian labels are spelled out here.
const KA_MONTHS = [
  "იანვარი", "თებერვალი", "მარტი", "აპრილი", "მაისი", "ივნისი",
  "ივლისი", "აგვისტო", "სექტემბერი", "ოქტომბერი", "ნოემბერი", "დეკემბერი",
]
const KA_WEEKDAYS_SHORT = ["კვ", "ორ", "სმ", "ოთ", "ხთ", "პრ", "შბ"]

/** Short weekday label ("ორ", "M") for a date. */
export function formatWeekdayShort(date: Date, locale: string): string {
  if (locale === "ka") return KA_WEEKDAYS_SHORT[date.getDay()]
  return new Intl.DateTimeFormat("en-US", { weekday: "narrow" }).format(date)
}

/** Localised "November 2026" label for a period. */
export function formatPeriod(period: string, locale: string): string {
  const m = PERIOD_RE.exec(period)
  if (!m) return period
  if (locale === "ka") return `${KA_MONTHS[Number(m[2]) - 1]} ${m[1]}`
  const date = new Date(Number(m[1]), Number(m[2]) - 1, 1)
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
}

// ---------------------------------------------------------------------------
// KPI
// ---------------------------------------------------------------------------

/** Parse the API's decimal-string percent; null when missing or not numeric. */
export function parsePercent(percent: string | number | null | undefined): number | null {
  if (percent === null || percent === undefined || percent === "") return null
  const n = typeof percent === "number" ? percent : Number(percent)
  return Number.isFinite(n) ? n : null
}

/** Width (0-100) for a progress bar; values over 100% fill the bar. */
export function kpiProgressWidth(percent: string | number | null | undefined): number {
  const n = parsePercent(percent)
  if (n === null) return 0
  return Math.max(0, Math.min(100, n))
}

/** "80%" / "112.5%" / "—". */
export function formatPercent(percent: string | number | null | undefined): string {
  const n = parsePercent(percent)
  if (n === null) return "—"
  const rounded = Math.round(n * 10) / 10
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}%`
}

export type KpiTone = "good" | "warn" | "bad" | "none"

/** Colour band for a KPI percent: >=100 good, >=70 warn, else bad. */
export function kpiTone(percent: string | number | null | undefined): KpiTone {
  const n = parsePercent(percent)
  if (n === null) return "none"
  if (n >= 100) return "good"
  if (n >= 70) return "warn"
  return "bad"
}

// ---------------------------------------------------------------------------
// Money
// ---------------------------------------------------------------------------

/** Format a decimal-string money amount with two decimals (no currency symbol). */
export function formatMoney(value: string | number | null | undefined, locale = "en"): string {
  if (value === null || value === undefined || value === "") return "—"
  const n = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(n)) return String(value)
  return n.toLocaleString(locale === "ka" ? "ka-GE" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

// ---------------------------------------------------------------------------
// Lists
// ---------------------------------------------------------------------------

/** Return a copy of `items` with the item at `index` moved by `delta` (bounded). */
export function moveItem<T>(items: T[], index: number, delta: number): T[] {
  const target = index + delta
  if (index < 0 || index >= items.length || target < 0 || target >= items.length) return items
  const next = [...items]
  const [item] = next.splice(index, 1)
  next.splice(target, 0, item)
  return next
}
