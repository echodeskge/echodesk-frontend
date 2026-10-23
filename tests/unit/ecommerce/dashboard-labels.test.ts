import { describe, expect, it } from "vitest"
import en from "@/i18n/messages/en.json"
import ka from "@/i18n/messages/ka.json"
import {
  formatShortDay,
  labelOr,
  localizedName,
  type Translator,
} from "@/app/(tenant)/ecommerce/dashboard/_lib/labels"

function translator(messages: Record<string, unknown>): Translator {
  const lookup = (key: string) =>
    key.split(".").reduce<unknown>(
      (node, part) => (node && typeof node === "object" ? (node as Record<string, unknown>)[part] : undefined),
      messages
    )
  const t = ((key: string) => {
    const v = lookup(key)
    return typeof v === "string" ? v : `ecommerceAnalytics.${key}`
  }) as Translator
  t.has = (key) => typeof lookup(key) === "string"
  return t
}

const BACKEND_ORDER_STATUSES = [
  "pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded",
]

describe("ecommerce dashboard labels", () => {
  it("has a Georgian and English label for every backend order status", () => {
    // A missing key rendered "ecommerceAnalytics.statusLabels.refunded" on the chart
    for (const messages of [en.ecommerceAnalytics, ka.ecommerceAnalytics]) {
      const t = translator(messages)
      for (const status of BACKEND_ORDER_STATUSES) {
        expect(t.has(`statusLabels.${status}`)).toBe(true)
      }
    }
    // The recent-orders badge reads from ecommerceOrders.status instead
    for (const messages of [en.ecommerceOrders, ka.ecommerceOrders]) {
      const t = translator(messages)
      for (const status of BACKEND_ORDER_STATUSES) {
        expect(t.has(`status.${status}`)).toBe(true)
      }
    }
    expect(labelOr(translator(ka.ecommerceAnalytics), "statusLabels.refunded", "refunded")).toBe("დაბრუნებული")
  })

  it("falls back to a humanised value instead of the raw key path", () => {
    const t = translator(ka.ecommerceAnalytics)
    expect(labelOr(t, "statusLabels.on_hold", "on_hold")).toBe("On hold")
    expect(labelOr(t, "paymentMethods.bank_transfer", "bank_transfer")).toBe("Bank transfer")
    expect(labelOr(t, "paymentMethods.unknown", "")).toBe("სხვა")
  })

  it("formats chart days in the UI language", () => {
    expect(formatShortDay("2026-10-05", "en")).toBe("Oct 05")
    expect(formatShortDay("2026-10-05", "ka")).not.toMatch(/Oct/)
    expect(formatShortDay("bad", "ka")).toBe("—")
  })

  it("picks the product name in the UI language", () => {
    const name = { en: "Clip-in extensions", ka: "თმის ქლიპსები" }
    expect(localizedName(name, "ka", "?")).toBe("თმის ქლიპსები")
    expect(localizedName(name, "en", "?")).toBe("Clip-in extensions")
    expect(localizedName({ en: "Only English" }, "ka", "?")).toBe("Only English")
    expect(localizedName(null, "ka", "უცნობი")).toBe("უცნობი")
  })
})
