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
