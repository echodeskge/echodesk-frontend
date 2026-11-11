/**
 * Display names for the localized booking objects (BKG-00 foundation).
 * `name_display` comes from the API in the request's `?lang`; when it is
 * missing (older payloads, nested objects) the `{en, ka}` name is resolved in
 * the UI locale. Replaces the `name.en` reads of the old screens.
 */
import { localizedName } from "@/lib/utils"

type Localized = { en?: string; ka?: string } | string | null | undefined

/** Service / category name in the UI locale. */
export function displayName(
  obj: { name_display?: string | null; name?: Localized } | null | undefined,
  locale: string,
  fallback = "—"
): string {
  if (!obj) return fallback
  if (obj.name_display) return obj.name_display
  const name = obj.name
  if (typeof name === "string") return name || fallback
  return localizedName(name ?? null, locale) || fallback
}

/** Staff member's name from either the slim row (`full_name`) or the full staff object (`user`). */
export function staffName(
  staff:
    | { full_name?: string | null; user?: { full_name?: string | null; first_name?: string | null; last_name?: string | null } | null }
    | null
    | undefined
): string {
  if (!staff) return ""
  if (staff.full_name) return staff.full_name
  const u = staff.user
  if (!u) return ""
  return u.full_name || [u.first_name, u.last_name].filter(Boolean).join(" ")
}
