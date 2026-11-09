import { format } from "date-fns"
import { enUS, ka } from "date-fns/locale"
import { dateOnlyToLocalDate } from "@/app/(tenant)/tickets/_lib/format"

/** The slice of a next-intl translator the dashboard cards use. */
export interface Translator {
  (key: string): string
  has: (key: string) => boolean
}

/**
 * next-intl doesn't throw on a missing key — it renders the raw key path
 * ("ecommerceAnalytics.statusLabels.refunded"). Check first and fall back to
 * a humanised raw value instead.
 */
export function labelOr(t: Translator, key: string, raw: string): string {
  if (t.has(key)) return t(key)
  if (!raw) return "—"
  const text = raw.replace(/_/g, " ")
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/**
 * Short day label for chart axes: "Oct 05" in English, "5 ოქტ" in Georgian.
 * The API sends calendar days ("2026-10-05"); `new Date()` reads those as UTC
 * midnight, which is the previous day west of UTC, so parse them as local days.
 */
export function formatShortDay(date: string, locale: string): string {
  const d = dateOnlyToLocalDate(date) ?? new Date(date)
  if (Number.isNaN(d.getTime())) return "—"
  return locale === "ka"
    ? format(d, "d MMM", { locale: ka })
    : format(d, "MMM dd", { locale: enUS })
}

/** Product names are stored per language ({en, ka, ...}); prefer the UI language. */
export function localizedName(
  name: Record<string, string> | string | null | undefined,
  locale: string,
  fallback: string
): string {
  if (!name) return fallback
  if (typeof name === "string") return name
  return name[locale] || name.en || Object.values(name).find(Boolean) || fallback
}
