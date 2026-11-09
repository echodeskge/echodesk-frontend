/**
 * EC-04 pure helpers: homepage builder labels / ordering, shipping display
 * rules, e-commerce settings behaviour, and the ec-04 catalog (en + ka).
 * Clock- and timezone-independent.
 */
import { describe, expect, it } from "vitest"
import { packageCatalog } from "./ec-catalog"
import {
  KNOWN_DISPLAY_MODES,
  KNOWN_SECTION_TYPES,
  KNOWN_VARIANTS,
  displayModeLabel,
  moveSection,
  sectionTitle,
  sectionTypeLabel,
  variantText,
  type LabelTranslator,
} from "@/app/(tenant)/ecommerce/homepage-builder/_lib/labels"
import { formatEta } from "@/app/(tenant)/ecommerce/shipping-methods/_lib/shipping"
import {
  deploymentTone,
  legacyPaymentFlags,
  parseClarityInput,
  quickshipperConnectedParts,
  requestErrorText,
  settingsFingerprint,
  toggleProviderList,
} from "@/app/(tenant)/settings/ecommerce/_lib/settings"
import { flatten, messages } from "./ec00-helpers"

function translator(ns: Record<string, unknown>): LabelTranslator {
  const flat = flatten(ns)
  const t = ((key: string) => flat[key] ?? key) as LabelTranslator
  t.has = (key: string) => key in flat
  return t
}

const hbEn = translator(messages.en.homepageBuilder as Record<string, unknown>)
const hbKa = translator(messages.ka.homepageBuilder as Record<string, unknown>)

describe("homepage builder labels", () => {
  const choices = [
    { value: "hero_banner", label: "Hero Banner/Slider" },
    { value: "brand_new_type", label: "Brand New Type" },
  ]

  it("translates every known section type and display mode in both languages", () => {
    for (const v of KNOWN_SECTION_TYPES) {
      expect(sectionTypeLabel(hbEn, v)).not.toBe(v)
      expect(sectionTypeLabel(hbKa, v)).not.toMatch(/[A-Za-z]/)
    }
    for (const v of KNOWN_DISPLAY_MODES) {
      expect(displayModeLabel(hbKa, v)).not.toMatch(/[A-Za-z]/)
    }
    expect(sectionTypeLabel(hbKa, "hero_banner", choices)).toBe("მთავარი ბანერი / სლაიდერი")
  })

  it("falls back to the API label, then the raw value, for unknown types", () => {
    expect(sectionTypeLabel(hbEn, "brand_new_type", choices)).toBe("Brand New Type")
    expect(sectionTypeLabel(hbEn, "other_type", choices)).toBe("other_type")
    expect(displayModeLabel(hbEn, "masonry", [{ value: "masonry", label: "Masonry" }])).toBe("Masonry")
  })

  it("has no display-mode pill for a section without a mode", () => {
    expect(displayModeLabel(hbEn, undefined)).toBeNull()
    expect(displayModeLabel(hbEn, "")).toBeNull()
  })

  it("translates the templates by key and keeps the API text for new ones", () => {
    for (const key of KNOWN_VARIANTS) {
      const ka = variantText(hbKa, { key, name: "X", description: "Y" })
      expect(ka.name).not.toMatch(/[A-Za-z]/)
      expect(ka.description).not.toMatch(/[A-Za-z]/)
    }
    expect(variantText(hbEn, { key: "future", name: "Future", description: "New layout" })).toEqual({
      name: "Future",
      description: "New layout",
    })
  })

  it("shows the section title in the UI language with English fallback", () => {
    const title = { en: "Autumn collection", ka: "შემოდგომის კოლექცია" }
    expect(sectionTitle(title, "ka")).toBe("შემოდგომის კოლექცია")
    expect(sectionTitle(title, "en")).toBe("Autumn collection")
    expect(sectionTitle({ en: "Only English", ka: "" }, "ka")).toBe("Only English")
    expect(sectionTitle("Plain", "ka")).toBe("Plain")
    expect(sectionTitle(null, "en")).toBe("")
  })

  it("moves a section one step and refuses moves past either end", () => {
    expect(moveSection([1, 2, 3], 0, 1)).toEqual([2, 1, 3])
    expect(moveSection([1, 2, 3], 2, -1)).toEqual([1, 3, 2])
    expect(moveSection([1, 2, 3], 0, -1)).toBeNull()
    expect(moveSection([1, 2, 3], 2, 1)).toBeNull()
  })
})

describe("shipping methods", () => {
  it("keeps the page rule: no estimate for 0 / missing days", () => {
    const label = (n: number) => `${n} day(s)`
    expect(formatEta(3, label)).toBe("3 day(s)")
    expect(formatEta(0, label)).toBeNull()
    expect(formatEta(undefined, label)).toBeNull()
  })
})

describe("e-commerce settings helpers", () => {
  it("derives the legacy card / cash flags from the active providers", () => {
    expect(legacyPaymentFlags(["cash"])).toEqual({ enable_card_payment: false, enable_cash_on_delivery: true })
    expect(legacyPaymentFlags(["paddle"])).toEqual({ enable_card_payment: true, enable_cash_on_delivery: false })
    expect(legacyPaymentFlags([])).toEqual({ enable_card_payment: false, enable_cash_on_delivery: false })
  })

  it("toggles a provider on and off keeping the others' order", () => {
    expect(toggleProviderList(["bog", "cash"], "tbc")).toEqual(["bog", "cash", "tbc"])
    expect(toggleProviderList(["bog", "cash", "tbc"], "cash")).toEqual(["bog", "tbc"])
  })

  it("extracts the Clarity project id from a pasted snippet or keeps a bare id", () => {
    expect(parseClarityInput("  p1q2r3s4t5  ")).toBe("p1q2r3s4t5")
    expect(parseClarityInput('<script src="https://www.clarity.ms/tag/abcd123456"></script>')).toBe("abcd123456")
    expect(
      parseClarityInput(
        '<script type="text/javascript">(function(c,l,a,r,i,t,y){})(window, document, "clarity", "script", "k9x8y7z6w5");</script>'
      )
    ).toBe("k9x8y7z6w5")
  })

  it("maps the deployment status to a pill tone", () => {
    expect(deploymentTone("deployed")).toBe("success")
    expect(deploymentTone("deploying")).toBe("info")
    expect(deploymentTone("failed")).toBe("danger")
    expect(deploymentTone("pending")).toBe("neutral")
    expect(deploymentTone("anything")).toBe("neutral")
  })

  it("fingerprints the form independent of key order", () => {
    expect(settingsFingerprint({ a: 1, b: "x" })).toBe(settingsFingerprint({ b: "x", a: 1 }))
    expect(settingsFingerprint({ a: 1 })).not.toBe(settingsFingerprint({ a: 2 }))
    expect(settingsFingerprint({ a: 1 }, ["secret"])).not.toBe(settingsFingerprint({ a: 1 }))
  })

  it("builds the Quickshipper success message like before", () => {
    const parts = {
      connected: (n: string) => `Connected as ${n}`,
      account: "Quickshipper account",
      balance: (b: string) => `balance: ${b}`,
      noCouriers: "no couriers configured yet",
    }
    expect(quickshipperConnectedParts({ shop_name: "Demo", balance: "12 GEL", has_providers: true }, parts)).toBe(
      "Connected as Demo · balance: 12 GEL"
    )
    expect(quickshipperConnectedParts({}, parts)).toBe("Connected as Quickshipper account · ⚠ no couriers configured yet")
  })

  it("reads the API error, then the JS message, then the fallback", () => {
    expect(requestErrorText({ response: { data: { error: "Vercel said no" } }, message: "x" }, "Unknown")).toBe("Vercel said no")
    expect(requestErrorText(new Error("Network Error"), "Unknown")).toBe("Network Error")
    expect(requestErrorText(null, "Unknown")).toBe("Unknown")
  })
})

describe("ec-04 catalog", () => {
  const pending = packageCatalog("ec-04")
  const en = flatten(pending.en)
  const ka = flatten(pending.ka)
  const args = (s: string) => [...s.matchAll(/\{(\w+)/g)].map((m) => m[1]).sort()
  const tags = (s: string) => [...s.matchAll(/<(\w+)>/g)].map((m) => m[1]).sort()

  it("has the same keys, ICU arguments and rich-text tags in en and ka", () => {
    expect(Object.keys(ka).sort()).toEqual(Object.keys(en).sort())
    for (const key of Object.keys(en)) {
      expect(args(ka[key]), key).toEqual(args(en[key]))
      expect(tags(ka[key]), key).toEqual(tags(en[key]))
    }
  })

  it("has no Latin interface text in Georgian (product names, codes and third-party menu paths excepted)", () => {
    // Longest names first so "Google Maps Platform" wins over "Google".
    const names = [
      "Quickshipper", "Google Ads", "Google Analytics 4", "Google Maps Platform", "Google Maps", "Google", "GA4",
      "Microsoft Clarity", "Clarity", "Places", "OpenStreetMap", "OSM", "gtag.js", "Vercel", "DNS", "Purchase", "Billing",
      "Admin", "Tracking", "Google Tag", "Analytics", "Data Streams", "Settings", "Setup", "Application restrictions",
      "HTTP referrers", "API restrictions", "Maps JavaScript API", "Places API", "Geocoding API", "APIs & Services",
      "Library", "Create Credentials", "Credentials", "API key", "API", "ID", "AIzaSy", "p1q2r3s4t5", "abcDEFghi123456789",
    ].sort((x, y) => y.length - x.length)
    const escape = (n: string) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const allowed = new RegExp(
      [String.raw`<\/?\w+>`, String.raw`\{[^}]*\}`, String.raw`https?:\/\/[^\s,<]+`, String.raw`AW-[\w/]*`, "G-", String.raw`[\w.]+\.(com|ge)`, ...names.map(escape)].join("|"),
      "g"
    )
    for (const [key, value] of Object.entries(ka)) {
      expect(value.replace(allowed, ""), key).not.toMatch(/[A-Za-z]/)
    }
  })
})
