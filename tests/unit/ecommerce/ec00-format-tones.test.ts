import { describe, expect, it } from "vitest"
import {
  formatMoney,
  formatPercent,
  formatCount,
  parseMoney,
  formatEcDate,
  formatEcDateTime,
  localizedText,
  isoToDateTimeLocal,
} from "@/app/(tenant)/ecommerce/_components/ui/format"
import {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  PRODUCT_STATUSES,
  orderStatusTone,
  paymentStatusTone,
  productStatusTone,
  reviewTone,
  activeTone,
  promoCodeState,
  promoStateTone,
} from "@/app/(tenant)/ecommerce/_components/ui/tones"
import { pageRange } from "@/app/(tenant)/ecommerce/_components/ui/pagination"
import { toggleAll, toggleId } from "@/app/(tenant)/ecommerce/_components/ui/selection"
import { TONE_CLASS } from "@/components/redesign/tones"
import { messages, flatten } from "./ec00-helpers"

describe("formatMoney", () => {
  it("formats decimal strings and numbers as ₾ with two decimals and comma thousands", () => {
    expect(formatMoney("356.4")).toBe("₾356.40")
    expect(formatMoney(4038)).toBe("₾4,038.00")
    expect(formatMoney("1234567.891")).toBe("₾1,234,567.89")
    expect(formatMoney(0)).toBe("₾0.00")
    expect(formatMoney("1.005")).toBe("₾1.01")
  })
  it("shows a dash (or the given text) for missing or invalid values", () => {
    expect(formatMoney(null)).toBe("—")
    expect(formatMoney(undefined)).toBe("—")
    expect(formatMoney("")).toBe("—")
    expect(formatMoney("abc")).toBe("—")
    expect(formatMoney(Number.NaN)).toBe("—")
    expect(formatMoney(null, { empty: "-" })).toBe("-")
  })
  it("supports negative amounts, discounts, compact and sign-less output", () => {
    expect(formatMoney(-12.5)).toBe("-₾12.50")
    expect(formatMoney("10", { negative: true })).toBe("-₾10.00")
    expect(formatMoney(0, { negative: true })).toBe("₾0.00")
    expect(formatMoney(4038, { compact: true })).toBe("₾4.0K")
    expect(formatMoney(999.5, { compact: true })).toBe("₾999.50")
    expect(formatMoney(2_400_000, { compact: true })).toBe("₾2.40M")
    expect(formatMoney(999_999, { compact: true })).toBe("₾1.00M")
    expect(formatMoney("12.5", { noSign: true })).toBe("12.50")
  })
  it("parses money", () => {
    expect(parseMoney(" 12.50 ")).toBe(12.5)
    expect(parseMoney("x")).toBeNull()
    expect(parseMoney(Infinity)).toBeNull()
  })
})

describe("percent and count", () => {
  it("formats", () => {
    expect(formatPercent(74.94)).toBe("74.9%")
    expect(formatPercent(25)).toBe("25%")
    expect(formatPercent(null)).toBe("—")
    expect(formatCount(1204)).toBe("1,204")
    expect(formatCount("7")).toBe("7")
    expect(formatCount(undefined)).toBe("—")
  })
})

describe("dates", () => {
  // Built from local parts so the result does not depend on the machine's zone.
  const local = new Date(2026, 10, 2, 14, 5)
  const now = new Date(2026, 10, 9, 12, 0)
  it("formats a timestamp in the browser's zone with Georgian month names", () => {
    expect(formatEcDate(local, "en", { now })).toBe("Nov 2")
    expect(formatEcDate(local, "ka", { now })).toBe("2 ნოე")
    expect(formatEcDate(local, "en", { now: new Date(2027, 0, 5) })).toBe("Nov 2, 2026")
    expect(formatEcDateTime(local, "en", { now })).toBe("Nov 2, 14:05")
    expect(formatEcDateTime(local, "ka", { now })).toBe("2 ნოე, 14:05")
    expect(formatEcDate(null, "en")).toBe("—")
    expect(formatEcDate("not a date", "en")).toBe("—")
  })
  it("turns an API timestamp into a datetime-local value in the browser's zone (round trip is stable)", () => {
    const iso = local.toISOString()
    expect(isoToDateTimeLocal(iso)).toBe("2026-11-02T14:05")
    // What the promo form sends back must be the same instant.
    expect(new Date(isoToDateTimeLocal(iso)).toISOString()).toBe(iso)
    expect(isoToDateTimeLocal("")).toBe("")
    expect(isoToDateTimeLocal(null)).toBe("")
    expect(isoToDateTimeLocal("nope")).toBe("")
  })
})

describe("localizedText", () => {
  it("prefers the UI language, then English, then any value", () => {
    expect(localizedText({ en: "Wallet", ka: "საფულე" }, "ka")).toBe("საფულე")
    expect(localizedText({ en: "Wallet", ka: "" }, "ka")).toBe("Wallet")
    expect(localizedText({ ru: "Кошелёк" }, "ka")).toBe("Кошелёк")
    expect(localizedText("Plain", "ka")).toBe("Plain")
    expect(localizedText(null, "en", "—")).toBe("—")
    expect(localizedText({}, "en", "fallback")).toBe("fallback")
  })
})

describe("tones", () => {
  it("maps every backend status to a palette tone", () => {
    for (const s of ORDER_STATUSES) expect(TONE_CLASS[orderStatusTone(s)]).toBeTruthy()
    for (const s of PAYMENT_STATUSES) expect(TONE_CLASS[paymentStatusTone(s)]).toBeTruthy()
    for (const s of PRODUCT_STATUSES) expect(TONE_CLASS[productStatusTone(s)]).toBeTruthy()
    expect(orderStatusTone("delivered")).toBe("success")
    expect(orderStatusTone("cancelled")).toBe("danger")
    expect(orderStatusTone("refunded")).toBe("neutral")
    expect(orderStatusTone("shipped")).toBe("violet")
    expect(orderStatusTone("weird")).toBe("warning")
    expect(paymentStatusTone("paid")).toBe("success")
    expect(paymentStatusTone("failed")).toBe("danger")
    expect(productStatusTone("active")).toBe("success")
    expect(productStatusTone("out_of_stock")).toBe("danger")
    expect(productStatusTone("draft")).toBe("warning")
    expect(reviewTone(true)).toBe("success")
    expect(reviewTone(false)).toBe("warning")
    expect(activeTone(false)).toBe("neutral")
  })
  it("keeps the promo-code status rule (inactive > expired > maxed out > active)", () => {
    const now = new Date(Date.UTC(2026, 10, 9, 12))
    const future = "2026-12-01T00:00:00Z"
    const past = "2026-11-01T00:00:00Z"
    expect(promoCodeState({ is_active: false, valid_until: past, max_uses: 1, times_used: 5 }, now)).toBe("inactive")
    expect(promoCodeState({ is_active: true, valid_until: past, max_uses: 1, times_used: 5 }, now)).toBe("expired")
    expect(promoCodeState({ is_active: true, valid_until: future, max_uses: 20, times_used: 20 }, now)).toBe("maxedOut")
    expect(promoCodeState({ is_active: true, valid_until: future, max_uses: null, times_used: 99 }, now)).toBe("active")
    expect(promoStateTone("expired")).toBe("danger")
    expect(promoStateTone("active")).toBe("success")
  })
})

describe("paging and selection helpers", () => {
  it("computes the visible range", () => {
    expect(pageRange(1, 20, 135)).toEqual({ from: 1, to: 20 })
    expect(pageRange(7, 20, 135)).toEqual({ from: 121, to: 135 })
    expect(pageRange(1, 20, 0)).toEqual({ from: 0, to: 0 })
  })
  it("toggles ids", () => {
    expect([...toggleId(new Set([1]), 2)]).toEqual([1, 2])
    expect([...toggleId(new Set([1, 2]), 1)]).toEqual([2])
    expect([...toggleAll(new Set([1]), [1, 2])]).toEqual([1, 2])
    expect([...toggleAll(new Set([1, 2]), [1, 2])]).toEqual([])
    expect([...toggleAll(new Set(), [])]).toEqual([])
  })
})

describe("ec-00 catalog", () => {
  it("has every ecommerceUi key in English and real Georgian", () => {
    const enUi = flatten((messages.en as Record<string, unknown>).ecommerceUi)
    const kaUi = flatten((messages.ka as Record<string, unknown>).ecommerceUi)
    expect(Object.keys(enUi).length).toBeGreaterThan(10)
    expect(Object.keys(kaUi).sort()).toEqual(Object.keys(enUi).sort())
    for (const [k, v] of Object.entries(kaUi)) {
      // No Latin interface text in Georgian (ICU placeholders aside).
      expect(v.replace(/\{[a-zA-Z]+\}/g, ""), k).not.toMatch(/[A-Za-z]/)
    }
  })
  it("has a label for every status pill", () => {
    const en = messages.en as Record<string, Record<string, Record<string, string>>>
    const ka = messages.ka as Record<string, Record<string, Record<string, string>>>
    for (const s of ORDER_STATUSES) {
      expect(en.ecommerceOrders.status[s]).toBeTruthy()
      expect(ka.ecommerceOrders.status[s]).toBeTruthy()
    }
    for (const s of PAYMENT_STATUSES) {
      expect(en.ecommerceOrders.paymentStatus[s]).toBeTruthy()
      expect(ka.ecommerceOrders.paymentStatus[s]).toBeTruthy()
    }
    for (const k of ["active", "draft", "inactive", "outOfStock"]) {
      expect((en.products as unknown as Record<string, string>)[k]).toBeTruthy()
      expect((ka.products as unknown as Record<string, string>)[k]).toBeTruthy()
    }
    for (const k of ["active", "inactive", "expired", "maxedOut"]) {
      expect((ka.promoCodes as unknown as Record<string, string>)[k]).toBeTruthy()
    }
  })
})
