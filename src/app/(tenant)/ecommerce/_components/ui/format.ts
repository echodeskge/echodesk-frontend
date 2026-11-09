/**
 * Money, date and text helpers for the e-commerce screens (EC-00).
 *
 * Money: every amount in the section reads `₾1,234.50` (the lari sign first,
 * as the shipped screens do, comma thousands, two decimals) and is rendered
 * with tabular figures (`MoneyCell`). Amounts arrive as decimal strings
 * ("356.40") or numbers; anything unparseable shows "—".
 *
 * Dates: API timestamps are ISO with a zone ("2026-11-02T10:15:00Z"), shown
 * in the browser's zone through the tickets formatter (Georgian month names
 * written out: Chrome has no `ka` Intl data).
 */
import {
  formatDateTime,
  formatShortDate,
  normalizeLocale,
  type ShortDateOptions,
} from "@/app/(tenant)/tickets/_lib/format"

export { normalizeLocale }

export const CURRENCY_SIGN = "₾"

/** A decimal string / number as a finite number, or null. */
export function parseMoney(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  const trimmed = value.trim()
  if (trimmed === "") return null
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : null
}

function group(intPart: string): string {
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
}

export interface MoneyOptions {
  /**
   * `compact`: 1,250 -> ₾1.3K, 2,400,000 -> ₾2.40M (dashboard tiles, chart axes);
   * amounts under 1,000 keep two decimals.
   */
  compact?: boolean
  /** Prefix a "-" for discounts (`₾-10.00` is never shown: "-₾10.00"). */
  negative?: boolean
  /** Hide the currency sign (columns whose header already says ₾). */
  noSign?: boolean
  /** Text for a missing value (default "—"). */
  empty?: string
}

/** "₾1,234.50" (see the module doc). Rounds half away from zero to cents. */
export function formatMoney(value: string | number | null | undefined, opts: MoneyOptions = {}): string {
  const n = parseMoney(value)
  if (n === null) return opts.empty ?? "—"
  const sign = opts.noSign ? "" : CURRENCY_SIGN
  const neg = n < 0 || (opts.negative && n !== 0)
  const abs = Math.abs(n)
  let body: string
  if (opts.compact && abs >= 999_950) body = `${(abs / 1_000_000).toFixed(2)}M`
  else if (opts.compact && abs >= 1_000) body = `${(abs / 1_000).toFixed(1)}K`
  else {
    const cents = Math.round((abs + Number.EPSILON) * 100)
    const [i, d] = (cents / 100).toFixed(2).split(".")
    body = `${group(i)}.${d}`
  }
  return `${neg ? "-" : ""}${sign}${body}`
}

/** Percent with at most one decimal: 74.94 -> "74.9%", 25 -> "25%". */
export function formatPercent(value: number | string | null | undefined): string {
  const n = parseMoney(value as string | number | null | undefined)
  if (n === null) return "—"
  const r = Math.round(n * 10) / 10
  return `${Number.isInteger(r) ? r : r.toFixed(1)}%`
}

/** Integer counts with comma thousands ("1,204"), tabular in the UI. */
export function formatCount(value: number | string | null | undefined): string {
  const n = parseMoney(value as string | number | null | undefined)
  if (n === null) return "—"
  return group(String(Math.round(n)))
}

/** "Nov 2" / "2 ნოე" (+ year when not this year) for an ISO timestamp or date. */
export function formatEcDate(value: string | Date | null | undefined, locale: string, opts: ShortDateOptions = {}): string {
  if (!value) return "—"
  return formatShortDate(value, locale, opts) || "—"
}

/** "Nov 2, 14:05" / "2 ნოე, 14:05" (24h) for an ISO timestamp. */
export function formatEcDateTime(value: string | Date | null | undefined, locale: string, opts: ShortDateOptions = {}): string {
  if (!value) return "—"
  return formatDateTime(value, locale, opts) || "—"
}

/**
 * Multilanguage JSON fields ({en, ka, ...}) in the UI language, then English,
 * then the first filled value, then `fallback`. Plain strings pass through.
 */
export function localizedText(
  value: Record<string, string | null | undefined> | string | null | undefined,
  locale: string,
  fallback = ""
): string {
  if (!value) return fallback
  if (typeof value === "string") return value || fallback
  const lang = normalizeLocale(locale)
  return value[lang] || value[locale] || value.en || Object.values(value).find((v): v is string => !!v) || fallback
}

const pad = (n: number) => String(n).padStart(2, "0")

/**
 * An API timestamp ("2026-11-02T10:15:00Z") as the value of an
 * `<input type="datetime-local">` in the browser's zone ("2026-11-02T14:15" in
 * Tbilisi). Slicing the ISO string instead shows UTC wall time, and saving it
 * back through `new Date(local).toISOString()` moves the time by the zone
 * offset on every save. Returns "" for a missing or invalid value.
 */
export function isoToDateTimeLocal(value: string | null | undefined): string {
  if (!value) return ""
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
