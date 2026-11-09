/**
 * The keys each e-commerce redesign package (EC-00..04) added to or corrected in the
 * catalogs, read back from the merged en/ka catalogs. The packages kept them in
 * src/i18n/pending/ec-*.json; the integration merged them into en.json / ka.json and
 * fixtures/ec-catalog-keys.json keeps each package's key list so its catalog checks
 * keep covering exactly the same strings.
 */
import en from "@/i18n/messages/en.json"
import ka from "@/i18n/messages/ka.json"
import keys from "./fixtures/ec-catalog-keys.json"

type Pkg = keyof typeof keys

function lookup(cat: unknown, key: string): string {
  const v = key.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), cat)
  if (typeof v !== "string") throw new Error(`catalog key missing: ${key}`)
  return v
}

/** `{ en, ka }` as flat `key -> string` maps, like a flattened pending file. */
export function packageCatalog(pkg: Pkg): { en: Record<string, string>; ka: Record<string, string> } {
  const pick = (cat: unknown, list: string[]) => Object.fromEntries(list.map((k) => [k, lookup(cat, k)]))
  return { en: pick(en, keys[pkg].en), ka: pick(ka, keys[pkg].ka) }
}
