/**
 * Small presentation helpers for the email screen (design: "EchoDesk Redesign").
 */

const AVATAR_TONES = [
  "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
  "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300",
] as const;

/** Stable avatar colour classes for a sender (same person, same colour). */
export function avatarTone(seed: string | null | undefined): string {
  const text = (seed || "").trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) | 0;
  }
  return AVATAR_TONES[Math.abs(hash) % AVATAR_TONES.length];
}

/** Two-letter initials from a name or address ("Nino Beridze" → "NB", "info@x.ge" → "IN"). */
export function emailInitials(text: string | null | undefined): string {
  const raw = (text || "").trim();
  if (!raw) return "?";
  const base = raw.includes("@") && !raw.includes(" ") ? raw.split("@")[0] : raw;
  const parts = base.split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return base.slice(0, 2).toUpperCase();
}

/**
 * Short list time: today → "14:05", this year → "12 Mar", older → "12.03.2024".
 */
export function listTime(iso: string | null | undefined, locale: string, now: Date = new Date()): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) {
    return date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", hour12: false });
  }
  if (date.getFullYear() === now.getFullYear()) {
    return `${date.getDate()} ${monthShort(date.getMonth(), locale)}`;
  }
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${date.getFullYear()}`;
}

// Chrome ships no Georgian month names in Intl, so they are written out.
const KA_MONTHS = ["იან", "თებ", "მარ", "აპრ", "მაი", "ივნ", "ივლ", "აგვ", "სექ", "ოქტ", "ნოე", "დეკ"];

function monthShort(month: number, locale: string): string {
  if (locale.startsWith("ka")) return KA_MONTHS[month];
  return new Date(2000, month, 1).toLocaleDateString(locale, { month: "short" });
}

/** Next / previous id in the list order (newer = up, older = down). */
export function neighbourId(order: number[], current: number | null, direction: 1 | -1): number | null {
  if (order.length === 0) return null;
  if (current == null) return direction === 1 ? order[0] : null;
  const index = order.indexOf(current);
  if (index === -1) return order[0];
  const next = index + direction;
  return next >= 0 && next < order.length ? order[next] : null;
}

/** True when a keyboard event comes from a field the user is typing in. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!target || !(target as HTMLElement).tagName) return false;
  const el = target as HTMLElement;
  const tag = el.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || el.isContentEditable === true;
}

/** Message header time: "8 Nov 2026, 18:57" (Georgian month names written out). */
export function fullTime(iso: string | null | undefined, locale: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const time = date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${date.getDate()} ${monthShort(date.getMonth(), locale)} ${date.getFullYear()}, ${time}`;
}
