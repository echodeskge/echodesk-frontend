import { describe, expect, it } from "vitest"
import { formatDate, formatDateWithTime } from "@/app/(tenant)/ecommerce/orders/_lib/utils"

describe("order date helpers", () => {
  it("formats real dates", () => {
    expect(formatDate("2026-10-12T16:09:09Z", "en")).toContain("2026")
    expect(formatDateWithTime("2026-10-12T16:09:09Z", "ka")).toMatch(/\d{2}:\d{2}/)
  })

  it("shows a dash instead of throwing for missing or bad dates", () => {
    // An order object without created_at (as after the old refund handler) crashed the page
    expect(formatDate(undefined, "en")).toBe("—")
    expect(formatDate(null, "ka")).toBe("—")
    expect(formatDateWithTime("not a date", "en")).toBe("—")
  })
})
