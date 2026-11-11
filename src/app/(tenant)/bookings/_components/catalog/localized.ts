/**
 * The `{en, ka}` text objects of the booking catalog (service and category
 * names / descriptions). The API stores them as language-keyed JSON; the old
 * screens sent a plain string back, which overwrote the other language.
 */
export interface Bilingual {
  en: string
  ka: string
}

export const EMPTY_BILINGUAL: Bilingual = { en: "", ka: "" }

/** A stored value (object, legacy string or missing) as `{en, ka}` for the form. */
export function asBilingual(value: unknown): Bilingual {
  if (value && typeof value === "object") {
    const v = value as { en?: unknown; ka?: unknown }
    return { en: typeof v.en === "string" ? v.en : "", ka: typeof v.ka === "string" ? v.ka : "" }
  }
  if (typeof value === "string") return { en: value, ka: "" }
  return { ...EMPTY_BILINGUAL }
}

/** Trimmed `{en, ka}` for the request body; a blank language falls back to the other one so a name never ends up empty. */
export function toPayload(value: Bilingual, fallbackToOther = true): Bilingual {
  const en = value.en.trim()
  const ka = value.ka.trim()
  if (!fallbackToOther) return { en, ka }
  return { en: en || ka, ka: ka || en }
}

/** Case-insensitive match of a search against every language of a text and its display value. */
export function matchesSearch(search: string, ...texts: (string | Bilingual | null | undefined)[]): boolean {
  const q = search.trim().toLowerCase()
  if (!q) return true
  return texts.some((t) => {
    if (!t) return false
    if (typeof t === "string") return t.toLowerCase().includes(q)
    return t.en.toLowerCase().includes(q) || t.ka.toLowerCase().includes(q)
  })
}
