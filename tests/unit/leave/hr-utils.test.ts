import { describe, it, expect } from "vitest"
import {
  currentPeriod,
  formatMoney,
  formatPercent,
  isPeriod,
  kpiProgressWidth,
  kpiTone,
  leaveStatusKey,
  leaveStatusVariant,
  moveItem,
  parsePercent,
  shiftPeriod,
  substituteStatusVariant,
} from "@/app/(tenant)/leave/_lib/hr-utils"
import { profileLeaveFeatures } from "@/app/(tenant)/leave/_lib/useLeaveFeatures"
import { unwrapList, userLabel } from "@/app/(tenant)/leave/_lib/hr-api"

describe("leave status mapping", () => {
  it("maps known statuses to their i18n key", () => {
    expect(leaveStatusKey("awaiting_substitutes")).toBe("shared.status.awaiting_substitutes")
    expect(leaveStatusKey("approved")).toBe("shared.status.approved")
  })
  it("falls back to pending for unknown statuses", () => {
    expect(leaveStatusKey("weird")).toBe("shared.status.pending")
  })
  it("picks badge variants", () => {
    expect(leaveStatusVariant("approved")).toBe("default")
    expect(leaveStatusVariant("rejected")).toBe("destructive")
    expect(leaveStatusVariant("awaiting_substitutes")).toBe("outline")
    expect(substituteStatusVariant("accepted")).toBe("default")
    expect(substituteStatusVariant("skipped")).toBe("secondary")
  })
})

describe("periods", () => {
  it("formats the current period", () => {
    expect(currentPeriod(new Date(2026, 0, 15))).toBe("2026-01")
    expect(currentPeriod(new Date(2026, 10, 7))).toBe("2026-11")
  })
  it("shifts across year boundaries", () => {
    expect(shiftPeriod("2026-01", -1)).toBe("2025-12")
    expect(shiftPeriod("2026-12", 1)).toBe("2027-01")
    expect(shiftPeriod("2026-05", -17)).toBe("2024-12")
    expect(shiftPeriod("bad", 1)).toBe("bad")
  })
  it("validates", () => {
    expect(isPeriod("2026-11")).toBe(true)
    expect(isPeriod("2026-13")).toBe(false)
    expect(isPeriod("2026-1")).toBe(false)
  })
})

describe("KPI percent formatting", () => {
  it("parses decimal strings", () => {
    expect(parsePercent("80.0")).toBe(80)
    expect(parsePercent(null)).toBeNull()
    expect(parsePercent("abc")).toBeNull()
  })
  it("clamps the progress bar width", () => {
    expect(kpiProgressWidth("80.0")).toBe(80)
    expect(kpiProgressWidth("150")).toBe(100)
    expect(kpiProgressWidth("-5")).toBe(0)
    expect(kpiProgressWidth(null)).toBe(0)
  })
  it("formats percent labels", () => {
    expect(formatPercent("80.0")).toBe("80%")
    expect(formatPercent("112.46")).toBe("112.5%")
    expect(formatPercent(null)).toBe("—")
  })
  it("assigns tones", () => {
    expect(kpiTone("100")).toBe("good")
    expect(kpiTone("75")).toBe("warn")
    expect(kpiTone("10")).toBe("bad")
    expect(kpiTone(null)).toBe("none")
  })
})

describe("misc helpers", () => {
  it("formats money with two decimals", () => {
    expect(formatMoney("1234.5")).toBe("1,234.50")
    expect(formatMoney(null)).toBe("—")
  })
  it("moves list items within bounds", () => {
    expect(moveItem([1, 2, 3], 0, 1)).toEqual([2, 1, 3])
    expect(moveItem([1, 2, 3], 2, -1)).toEqual([1, 3, 2])
    const same = [1, 2, 3]
    expect(moveItem(same, 0, -1)).toBe(same)
  })
  it("unwraps paginated and plain lists", () => {
    expect(unwrapList([1])).toEqual([1])
    expect(unwrapList({ results: [2] })).toEqual([2])
    expect(unwrapList(null)).toEqual([])
  })
  it("labels users by name, then email", () => {
    expect(userLabel({ email: "a@b.c", full_name: "Ann Lee" })).toBe("Ann Lee")
    expect(userLabel({ email: "a@b.c", first_name: "", last_name: "" })).toBe("a@b.c")
  })
  it("reads leave_features from a profile", () => {
    expect(profileLeaveFeatures({ leave_features: { kpi: true } })).toEqual({ kpi: true })
    expect(profileLeaveFeatures({})).toBeNull()
    expect(profileLeaveFeatures(undefined)).toBeNull()
  })
})

describe("Georgian month and weekday labels", () => {
  it("spells Georgian months out (Chrome's Intl has none)", async () => {
    const { formatPeriod } = await import("@/app/(tenant)/leave/_lib/hr-utils")
    expect(formatPeriod("2026-11", "ka")).toBe("ნოემბერი 2026")
    expect(formatPeriod("2026-01", "ka")).toBe("იანვარი 2026")
    expect(formatPeriod("2026-11", "en")).toBe("November 2026")
  })

  it("gives short Georgian weekdays", async () => {
    const { formatWeekdayShort } = await import("@/app/(tenant)/leave/_lib/hr-utils")
    expect(formatWeekdayShort(new Date(2026, 10, 2), "ka")).toBe("ორ") // Monday
    expect(formatWeekdayShort(new Date(2026, 10, 1), "ka")).toBe("კვ") // Sunday
    expect(formatWeekdayShort(new Date(2026, 10, 2), "en")).toBe("M")
  })
})
