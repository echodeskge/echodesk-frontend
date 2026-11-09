/**
 * Homepage builder label helpers (EC-04).
 *
 * The section types, display modes and templates come from the API with
 * English labels. The UI shows its own translated label for every value it
 * knows (`homepageBuilder.sectionTypes.*`, `.displayModes.*`, `.variants.*`)
 * and falls back to the API label for anything new, so a backend addition
 * still renders.
 */
import { localizedText } from "../../_components/ui/format"

export const KNOWN_SECTION_TYPES = [
  "hero_banner",
  "featured_products",
  "category_grid",
  "product_by_attribute",
  "statistics",
  "branches",
  "custom_content",
] as const

export const KNOWN_DISPLAY_MODES = ["slider", "grid", "single", "list"] as const

export const KNOWN_VARIANTS = ["classic", "modern", "minimal", "boutique", "marketplace"] as const

type Choice = { value: string; label: string }

/** Minimal translator shape (next-intl's `t` with `has`). */
export interface LabelTranslator {
  (key: string, values?: Record<string, string | number>): string
  has: (key: string) => boolean
}

function lookup(t: LabelTranslator, group: string, value: string, apiLabel: string | undefined): string {
  const key = `${group}.${value}`
  if (value && t.has(key)) return t(key)
  return apiLabel || value
}

/** Translated section type label ("hero_banner" -> "Hero banner / slider"). */
export function sectionTypeLabel(t: LabelTranslator, value: unknown, choices?: Choice[]): string {
  const v = value == null ? "" : String(value)
  return lookup(t, "sectionTypes", v, choices?.find((c) => c.value === v)?.label)
}

/** Translated display mode label, or null when the section has none. */
export function displayModeLabel(t: LabelTranslator, value: unknown, choices?: Choice[]): string | null {
  if (value == null || value === "") return null
  const v = String(value)
  return lookup(t, "displayModes", v, choices?.find((c) => c.value === v)?.label)
}

/** Template name / description in the UI language, falling back to the API text. */
export function variantText(
  t: LabelTranslator,
  variant: { key: string; name: string; description: string }
): { name: string; description: string } {
  const base = `variants.${variant.key}`
  return {
    name: t.has(`${base}.name`) ? t(`${base}.name`) : variant.name,
    description: t.has(`${base}.description`) ? t(`${base}.description`) : variant.description,
  }
}

/** A multilanguage section title in the UI language, then English, then any value. */
export function sectionTitle(title: unknown, locale: string): string {
  if (title && typeof title === "object") return localizedText(title as Record<string, string>, locale)
  return title == null ? "" : String(title)
}

/** The order of section ids after moving `index` one step up (-1) or down (+1); null when it cannot move. */
export function moveSection(ids: number[], index: number, delta: -1 | 1): number[] | null {
  const target = index + delta
  if (index < 0 || index >= ids.length || target < 0 || target >= ids.length) return null
  const next = [...ids]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}
