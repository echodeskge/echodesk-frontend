/**
 * Date and day-count formatting for the leave screens (LV-00).
 *
 * Built on the tickets formatter: Chrome has no Georgian Intl month names, so
 * month labels come from `MONTHS_SHORT`, and "YYYY-MM-DD" strings are read as
 * calendar days (never `new Date("YYYY-MM-DD")`, which is UTC midnight and
 * shows the previous day west of Greenwich).
 */
import {
  MONTHS_SHORT,
  formatShortDate,
  normalizeLocale,
  parseDateOnly,
  type ShortDateOptions,
} from "@/app/(tenant)/tickets/_lib/format"

export { formatShortDate, parseDateOnly }

/** "Nov 16" / "16 ნოე"; the year is added when it is not `now`'s year (or always / never). */
export function formatLeaveDate(
  value: string | null | undefined,
  locale: string,
  opts: ShortDateOptions = {}
): string {
  if (!value) return "—"
  return formatShortDate(value, locale, opts) || value
}

/**
 * A leave period in one short label:
 * - one day: "Nov 16" / "16 ნოე"
 * - same month: "Nov 16–20" / "16–20 ნოე"
 * - same year: "Nov 30 – Dec 2" / "30 ნოე – 2 დეკ"
 * - across years: "Dec 28, 2026 – Jan 3, 2027" / "28 დეკ 2026 – 3 იან 2027"
 * The year is appended when the period is not in `now`'s year (`year: "always"` forces it).
 */
export function formatLeaveRange(
  start: string | null | undefined,
  end: string | null | undefined,
  locale: string,
  opts: ShortDateOptions = {}
): string {
  const a = parseDateOnly(start ?? null)
  const b = parseDateOnly(end ?? null)
  if (!a) return [start, end].filter(Boolean).join(" – ") || "—"
  if (!b || (a.year === b.year && a.month === b.month && a.day === b.day)) {
    return formatLeaveDate(start, locale, opts)
  }
  const loc = normalizeLocale(locale)
  const now = opts.now ?? new Date()
  const mode = opts.year ?? "auto"
  if (a.year !== b.year) {
    return `${formatShortDate(start, locale, { year: "always" })} – ${formatShortDate(end, locale, { year: "always" })}`
  }
  const withYear = mode === "always" || (mode === "auto" && a.year !== now.getFullYear())
  const ma = MONTHS_SHORT[loc][a.month - 1]
  const mb = MONTHS_SHORT[loc][b.month - 1]
  if (a.month === b.month) {
    if (loc === "ka") return `${a.day}–${b.day} ${ma}${withYear ? ` ${a.year}` : ""}`
    return `${ma} ${a.day}–${b.day}${withYear ? `, ${a.year}` : ""}`
  }
  if (loc === "ka") return `${a.day} ${ma} – ${b.day} ${mb}${withYear ? ` ${a.year}` : ""}`
  return `${ma} ${a.day} – ${mb} ${b.day}${withYear ? `, ${a.year}` : ""}`
}

/** Parse the API's decimal-string day count ("5.0", "0.5"); null when missing or not numeric. */
export function parseDays(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null
  const n = typeof value === "number" ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

/** "5" for "5.0", "0.5", "12.5", "—" when missing (at most one decimal). */
export function formatDays(value: string | number | null | undefined): string {
  const n = parseDays(value)
  if (n === null) return "—"
  const rounded = Math.round(n * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}
