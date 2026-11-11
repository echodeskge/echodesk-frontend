/**
 * Display names for the localized booking objects (BKG-00 foundation).
 * The `{en, ka}` name is resolved in the UI locale first: `name_display` is
 * the backend's pick for the request's `?lang`, which the catalog lists and
 * nested objects (a booking's service) fetch without, so it is English there.
 * `name_display` is used when the object has no name for the locale (slim
 * rows carry only `name_display`), then the other language. Replaces the
 * `name.en` reads of the old screens.
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
  const name = obj.name
  if (typeof name === "string") return name || obj.name_display || fallback
  const own = name && (locale === "ka" ? name.ka : name.en)
  if (own) return own
  if (obj.name_display) return obj.name_display
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
