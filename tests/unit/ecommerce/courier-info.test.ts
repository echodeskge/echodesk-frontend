import { describe, expect, it } from "vitest"
import { getCourierInfo } from "@/app/(tenant)/ecommerce/orders/_lib/utils"

describe("getCourierInfo", () => {
  it("returns the courier the customer picked and the tracking link", () => {
    const info = getCourierInfo({
      delivery_method: "courier",
      quickshipper_quote: { provider_name: "Deliverers", price: 7.79 },
      quickshipper: { provider_name: "Deliverers", tracking_url: "https://dashboard.quickshipper.app/track/AH2207358" },
    })
    expect(info).toEqual({
      chosen: "Deliverers",
      booked: null,
      trackingUrl: "https://dashboard.quickshipper.app/track/AH2207358",
      pickup: false,
    })
  })

  it("reports a different booked courier separately", () => {
    const info = getCourierInfo({
      quickshipper_quote: { provider_name: "Go Delivery" },
      quickshipper: { provider_name: "Yandex" },
    })
    expect(info.chosen).toBe("Go Delivery")
    expect(info.booked).toBe("Yandex")
  })

  it("handles pickup, missing metadata and unsafe links", () => {
    expect(getCourierInfo({ delivery_method: "pickup" }).pickup).toBe(true)
    expect(getCourierInfo(null)).toEqual({ chosen: null, booked: null, trackingUrl: null, pickup: false })
    expect(getCourierInfo({ quickshipper: { tracking_url: "javascript:alert(1)" } }).trackingUrl).toBeNull()
  })
})
