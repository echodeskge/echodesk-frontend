/**
 * Date, relative-time and duration formatting for the tickets screens.
 *
 * Chrome ships no `ka` Intl locale data, so nothing here relies on Intl for
 * month names or units: both locales are written out. The tables below match
 * `ticketsScreen.months.short.*` and `ticketsScreen.relative.*` in the message
 * catalogs (the i18n parity test checks that they stay equal).
 *
 * Date-only strings ("YYYY-MM-DD", e.g. `due_date`) are parsed as local
 * calendar parts and never go through `new Date('YYYY-MM-DD')`, which would
 * read them as UTC midnight and show the previous day west of Greenwich.
 */

export type TicketsLocale = "en" | "ka";

export function normalizeLocale(locale: string | null | undefined): TicketsLocale {
  return typeof locale === "string" && locale.toLowerCase().startsWith("ka") ? "ka" : "en";
}

export const MONTHS_SHORT: Record<TicketsLocale, readonly string[]> = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  ka: ["იან", "თებ", "მარ", "აპრ", "მაი", "ივნ", "ივლ", "აგვ", "სექ", "ოქტ", "ნოე", "დეკ"],
};

/** Relative-time templates; `{count}` is replaced with the number. */
export const RELATIVE_LABELS: Record<
  TicketsLocale,
  { justNow: string; minutes: string; hours: string; yesterday: string; days: string }
> = {
  en: { justNow: "just now", minutes: "{count}m", hours: "{count}h", yesterday: "yesterday", days: "{count}d" },
  ka: { justNow: "ახლახან", minutes: "{count} წთ", hours: "{count} სთ", yesterday: "გუშინ", days: "{count} დღე" },
};

/** Duration unit suffixes (hours, minutes, seconds). */
export const DURATION_UNITS: Record<TicketsLocale, { h: string; m: string; s: string }> = {
  en: { h: "h", m: "m", s: "s" },
  ka: { h: " სთ", m: " წთ", s: " წმ" },
};

export interface DateParts {
  year: number;
  /** 1-12 */
  month: number;
  day: number;
}

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Parse "YYYY-MM-DD" into calendar parts without any timezone conversion.
 * Returns null for anything that isn't a valid date-only string.
 */
export function parseDateOnly(value: string | null | undefined): DateParts | null {
  if (typeof value !== "string") return null;
  const m = DATE_ONLY.exec(value.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1) return null;
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day > daysInMonth) return null;
  return { year, month, day };
}

/** A local-midnight Date for a date-only string (null when invalid). */
export function dateOnlyToLocalDate(value: string | null | undefined): Date | null {
  const p = parseDateOnly(value);
  return p ? new Date(p.year, p.month - 1, p.day) : null;
}

/** "YYYY-MM-DD" for a local Date (the inverse of `dateOnlyToLocalDate`). */
export function toDateOnlyString(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

type DateInput = string | number | Date | null | undefined;

/** Calendar parts of any input; date-only strings stay on their calendar day. */
function toParts(value: DateInput): (DateParts & { date: Date }) | null {
  if (value == null || value === "") return null;
  if (typeof value === "string") {
    const p = parseDateOnly(value);
    if (p) return { ...p, date: new Date(p.year, p.month - 1, p.day) };
  }
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(), date: d };
}

export interface ShortDateOptions {
  /** `auto` (default) adds the year only when it differs from `now`'s year. */
  year?: "auto" | "always" | "never";
  now?: Date;
}

/** "Nov 5" (en) / "5 ნოე" (ka); with a year: "Nov 5, 2025" / "5 ნოე 2025". */
export function formatShortDate(value: DateInput, locale: string, opts: ShortDateOptions = {}): string {
  const p = toParts(value);
  if (!p) return "";
  const loc = normalizeLocale(locale);
  const now = opts.now ?? new Date();
  const mode = opts.year ?? "auto";
  const withYear = mode === "always" || (mode === "auto" && p.year !== now.getFullYear());
  const month = MONTHS_SHORT[loc][p.month - 1];
  if (loc === "ka") return withYear ? `${p.day} ${month} ${p.year}` : `${p.day} ${month}`;
  return withYear ? `${month} ${p.day}, ${p.year}` : `${month} ${p.day}`;
}

/** "Nov 5, 14:05" / "5 ნოე, 14:05" (24-hour clock in both locales). */
export function formatDateTime(value: DateInput, locale: string, opts: ShortDateOptions = {}): string {
  const p = toParts(value);
  if (!p) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${formatShortDate(p.date, locale, opts)}, ${pad(p.date.getHours())}:${pad(p.date.getMinutes())}`;
}

function fill(template: string, count: number): string {
  return template.replace("{count}", String(count));
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/**
 * Compact relative time: "just now" (< 1 min), "5m" (< 1 h), "3h" (same
 * calendar day), "yesterday" (previous calendar day), then the short date.
 * Future timestamps (clock skew) read as "just now".
 */
export function formatRelative(value: DateInput, locale: string, now: Date = new Date()): string {
  const p = toParts(value);
  if (!p) return "";
  const loc = normalizeLocale(locale);
  const labels = RELATIVE_LABELS[loc];
  const diffSec = Math.floor((now.getTime() - p.date.getTime()) / 1000);
  if (diffSec < 60) return labels.justNow;
  const minutes = Math.floor(diffSec / 60);
  if (minutes < 60) return fill(labels.minutes, minutes);
  const hours = Math.floor(minutes / 60);
  const dayDiff = Math.round((startOfDay(now) - startOfDay(p.date)) / 86_400_000);
  if (hours < 24 && dayDiff === 0) return fill(labels.hours, hours);
  if (dayDiff === 1) return labels.yesterday;
  return formatShortDate(p.date, loc, { now });
}

/**
 * Human duration: "30s", "1m 30s", "1h 2m" (en) / "30 წმ", "1 წთ 30 წმ",
 * "1 სთ 2 წთ" (ka). Hours drop the seconds. Matches the format the old
 * TimeTracking component used, so existing "time in status" text is unchanged.
 */
export function formatDuration(seconds: number | null | undefined, locale: string = "en"): string {
  const u = DURATION_UNITS[normalizeLocale(locale)];
  const s = Math.max(0, Math.floor(Number.isFinite(seconds as number) ? (seconds as number) : 0));
  if (s < 60) return `${s}${u.s}`;
  if (s < 3600) {
    const m = Math.floor(s / 60);
    const rest = s % 60;
    return rest > 0 ? `${m}${u.m} ${rest}${u.s}` : `${m}${u.m}`;
  }
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return m > 0 ? `${h}${u.h} ${m}${u.m}` : `${h}${u.h}`;
}

/** Stopwatch text "HH:MM:SS" (hours keep growing past 99). Zero reads "00:00:00". */
export function formatTimer(seconds: number | null | undefined): string {
  const s = Math.max(0, Math.floor(Number.isFinite(seconds as number) ? (seconds as number) : 0));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}
