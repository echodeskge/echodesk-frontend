/** EC-INT catalog fixes found during the integration click-through. */
import { describe, expect, it } from "vitest"
import { createTranslator } from "next-intl"
import en from "@/i18n/messages/en.json"
import ka from "@/i18n/messages/ka.json"

describe("order delivery days", () => {
  it("uses a plural form, so one day no longer reads \"1 days\"", () => {
    const tEn = createTranslator({ locale: "en", messages: en, namespace: "ecommerceOrders.detail" })
    const tKa = createTranslator({ locale: "ka", messages: ka, namespace: "ecommerceOrders.detail" })
    expect(tEn("estimatedDays", { days: 1 })).toBe("1 day")
    expect(tEn("estimatedDays", { days: 3 })).toBe("3 days")
    expect(tKa("estimatedDays", { days: 1 })).toBe("1 დღე")
    expect(tKa("estimatedDays", { days: 3 })).toBe("3 დღე")
  })

  it("has no Latin \"N/A\" in the Georgian payment method fallback", () => {
    expect(ka.ecommerceOrders.detail.paymentMethod.unknown).not.toMatch(/[A-Za-z]/)
  })
})

describe("e-commerce counts in English", () => {
  it("use plural forms instead of \"(s)\" or \"1 orders\"", () => {
    const t = createTranslator({ locale: "en", messages: en })
    expect(t("ecommerceOrders.ordersFound", { count: 1 })).toBe("1 order found")
    expect(t("ecommerceOrders.ordersFound", { count: 25 })).toBe("25 orders found")
    expect(t("ecommerceOrders.bulkActions.selected", { count: 1 })).toBe("1 order selected")
    expect(t("products.bulkActions.selected", { count: 2 })).toBe("2 products selected")
    expect(t("shippingMethods.totalMethods", { count: 1 })).toBe("1 shipping method")
    expect(t("promoCodes.codesFound", { count: 6 })).toBe("6 promo codes found")
    expect(t("reviews.reviewsFound", { count: 1 })).toBe("1 review found")
    const tKa = createTranslator({ locale: "ka", messages: ka })
    expect(tKa("ecommerceOrders.ordersFound", { count: 25 })).toBe("ნაპოვნია 25 შეკვეთა")
  })
})
