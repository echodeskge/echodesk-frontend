import { Facebook, Instagram, Mail, MessageCircle, Music2, Send, type LucideIcon } from "lucide-react";

/** Channels a client can be linked through (and the list's channel chips). */
export const CLIENT_PLATFORMS = ["facebook", "instagram", "whatsapp", "telegram", "widget", "email", "tiktok"] as const;
export type ClientPlatform = (typeof CLIENT_PLATFORMS)[number];

export const CLIENT_PLATFORM_ICON: Record<ClientPlatform, LucideIcon> = {
  facebook: Facebook,
  instagram: Instagram,
  whatsapp: MessageCircle,
  telegram: Send,
  widget: MessageCircle,
  email: Mail,
  tiktok: Music2,
};

/** Brand colour of a channel chip / badge. */
export const CLIENT_PLATFORM_BG: Record<ClientPlatform, string> = {
  facebook: "bg-blue-600",
  instagram: "bg-gradient-to-br from-purple-600 to-pink-600",
  whatsapp: "bg-green-600",
  telegram: "bg-sky-500",
  widget: "bg-indigo-600",
  email: "bg-red-600",
  tiktok: "bg-neutral-900",
};

/** Brand names stay untranslated; "widget" gets its label from i18n. */
export const CLIENT_PLATFORM_BRAND: Record<ClientPlatform, string | null> = {
  facebook: "Facebook",
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  widget: null,
  email: "Email",
  tiktok: "TikTok",
};

export function isClientPlatform(value: unknown): value is ClientPlatform {
  return typeof value === "string" && (CLIENT_PLATFORMS as readonly string[]).includes(value);
}

export function clientInitials(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (
    parts
      .slice(0, 2)
      .map((p) => Array.from(p)[0] ?? "")
      // Georgian (Mkhedruli) has no case: toUpperCase would turn it into Mtavruli capitals.
      .map((ch) => (/[Ⴀ-ჿᲐ-Ჿ]/.test(ch) ? ch : ch.toUpperCase()))
      .join("")
  );
}

export function clientTags(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.filter((t): t is string => typeof t === "string" && t.trim() !== "") : [];
}

export function clientPlatforms(raw: unknown): ClientPlatform[] {
  return Array.isArray(raw) ? Array.from(new Set(raw.filter(isClientPlatform))) : [];
}

export interface ClientRowLike {
  platforms?: unknown;
  is_booking_enabled?: boolean | null;
  is_verified?: boolean | null;
}

/** Stats strip numbers for the rows on the current page (the total comes from the API count). */
export function clientPageStats(rows: ClientRowLike[]) {
  let linked = 0;
  let booking = 0;
  let verified = 0;
  const perPlatform: Partial<Record<ClientPlatform, number>> = {};
  for (const row of rows) {
    const platforms = clientPlatforms(row.platforms);
    if (platforms.length) linked += 1;
    for (const p of platforms) perPlatform[p] = (perPlatform[p] ?? 0) + 1;
    if (row.is_booking_enabled) {
      booking += 1;
      if (row.is_verified) verified += 1;
    }
  }
  return { linked, booking, verified, whatsapp: perPlatform.whatsapp ?? 0, facebook: perPlatform.facebook ?? 0 };
}

export type ClientTab = "all" | "booking" | "social";

/** "1–50 of 312" numbers for the list footer. */
export function pageRange(page: number, pageSize: number, total: number) {
  if (total <= 0) return { from: 0, to: 0 };
  const from = (page - 1) * pageSize + 1;
  return { from: Math.min(from, total), to: Math.min(page * pageSize, total) };
}

/** Georgian-safe short date (Chrome has no ka month names): dd.mm.yyyy. */
export function shortDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${d.getFullYear()}`;
}
