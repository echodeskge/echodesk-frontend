import { format } from "date-fns";
import { enUS, ka } from "date-fns/locale";

/**
 * Small formatting helpers shared by the Calls page, the softphone and the
 * floating dock. Pure functions so they are easy to unit test.
 */

/** 125 -> "02:05". Negative / NaN become "00:00". */
export function formatMmSs(totalSeconds: number): string {
  const s = Number.isFinite(totalSeconds) && totalSeconds > 0 ? Math.floor(totalSeconds) : 0;
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

/**
 * Up to two initials. Georgian (Mkhedruli) has no case, so it is kept as is
 * (toUpperCase would turn it into Mtavruli capitals). Phone-number-only
 * names fall back to "#".
 */
export function callInitials(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0 || /^[+\d\s()*#-]+$/.test(parts.join(" "))) return "#";
  return parts
    .slice(0, 2)
    .map((p) => Array.from(p)[0] ?? "")
    .map((ch) => (/[Ⴀ-ჿᲐ-Ჿ]/.test(ch) ? ch : ch.toUpperCase()))
    .join("");
}

/** Characters a dialled number may contain (digits, +, *, #, spaces). */
export const DIAL_CHARS = /[^\d+*# ]/g;

/** Strips anything that is not a dial character. */
export function sanitizeDial(value: string): string {
  return value.replace(DIAL_CHARS, "");
}

/** Digits only, for matching phone numbers regardless of formatting. */
export function digitsOnly(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

/** Missed = nobody picked up (missed or no answer). */
export function isMissedStatus(status: string): boolean {
  return status === "missed" || status === "no_answer";
}

/** "calls.logs.*" key of a status label. */
const STATUS_KEYS: Record<string, string> = {
  answered: "answered",
  missed: "missed",
  no_answer: "noAnswer",
  ended: "ended",
  failed: "failed",
  busy: "busy",
  cancelled: "cancelled",
  initiated: "initiated",
  ringing: "ringing",
  transferred: "transferred",
};
export function statusLabelKey(status: string): string | null {
  return STATUS_KEYS[status] ?? null;
}

/** Locale for date-fns (Chrome has no Georgian Intl date data). */
function dateLocale(locale: string) {
  return locale === "ka" ? ka : enUS;
}

/** Day group label for an older day, e.g. "Sat, 7 Nov" / "შაბ, 7 ნოე". */
export function formatCallDay(date: Date, locale: string): string {
  return format(date, "EEE, d MMM", { locale: dateLocale(locale) });
}

/** "7 Nov 14:30" for the expanded row meta line. */
export function formatCallDateTime(date: Date, locale: string): string {
  return format(date, "d MMM HH:mm", { locale: dateLocale(locale) });
}
