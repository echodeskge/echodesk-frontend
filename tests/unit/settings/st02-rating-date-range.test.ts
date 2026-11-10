/**
 * Rating statistics date range: local calendar days, not UTC days.
 * The dates are built from local components, so the expectations hold in
 * every time zone (CI runs UTC; the bug showed east of UTC, e.g. Tbilisi).
 */
import { describe, expect, it } from "vitest"
import { lastMonthRange, thisMonthRange, toLocalIsoDate } from "@/app/(tenant)/settings/social/rating-statistics/_lib/date-range"

describe("rating statistics date range", () => {
  it("formats the local calendar day", () => {
    expect(toLocalIsoDate(new Date(2026, 10, 1, 0, 0))).toBe("2026-11-01")
    expect(toLocalIsoDate(new Date(2026, 0, 9, 23, 59))).toBe("2026-01-09")
  })

  it("this month starts on the 1st and ends today, also just after local midnight", () => {
    expect(thisMonthRange(new Date(2026, 10, 10, 0, 30))).toEqual({ start: "2026-11-01", end: "2026-11-10" })
  })

  it("last month covers the whole previous month, across a year boundary", () => {
    expect(lastMonthRange(new Date(2026, 10, 10, 12))).toEqual({ start: "2026-10-01", end: "2026-10-31" })
    expect(lastMonthRange(new Date(2027, 0, 3, 1))).toEqual({ start: "2026-12-01", end: "2026-12-31" })
    expect(lastMonthRange(new Date(2028, 2, 15))).toEqual({ start: "2028-02-01", end: "2028-02-29" })
  })
})
