import { describe, expect, it } from "vitest"
import { filterHolidaysByYear, holidayYears, settingsFingerprint, yearOf } from "@/app/(tenant)/leave/_lib/lv04-utils"

describe("LV-04 utils", () => {
  it("reads the year from a date string without Date parsing", () => {
    expect(yearOf("2026-01-01")).toBe(2026)
    expect(yearOf("2027-12-31T00:00:00Z")).toBe(2027)
    expect(yearOf("")).toBeNull()
    expect(yearOf(null)).toBeNull()
    expect(yearOf("01/02/2026")).toBeNull()
  })

  it("lists distinct holiday years ascending", () => {
    expect(holidayYears([{ date: "2027-01-07" }, { date: "2026-01-01" }, { date: "2027-01-01" }, { date: "bad" }])).toEqual([2026, 2027])
    expect(holidayYears([])).toEqual([])
  })

  it("filters by year, 'all' keeps everything in order", () => {
    const list = [{ date: "2026-12-31", id: 1 }, { date: "2027-01-01", id: 2 }, { date: "2026-01-01", id: 3 }]
    expect(filterHolidaysByYear(list, "all")).toBe(list)
    expect(filterHolidaysByYear(list, "2026").map((h) => h.id)).toEqual([1, 3])
    expect(filterHolidaysByYear(list, "2030")).toEqual([])
  })

  it("fingerprints settings independent of key and array order", () => {
    const a = settingsFingerprint({ weekend_days: [5, 6], x: 1 }, { payroll_managers: [3, 1], on: true })
    const b = settingsFingerprint({ x: 1, weekend_days: [6, 5] }, { on: true, payroll_managers: [1, 3] })
    expect(a).toBe(b)
    expect(settingsFingerprint({ weekend_days: [5] }, {})).not.toBe(settingsFingerprint({ weekend_days: [5, 6] }, {}))
    expect(settingsFingerprint({ on: true }, {})).not.toBe(settingsFingerprint({ on: false }, {}))
  })
})
