import { describe, expect, it } from "vitest"
import {
  availabilityForDate,
  bookingsByDate,
  eventLabel,
  formatLongDate,
  layoutLanes,
  monthGridDates,
  nowInTimezone,
  parseDateParam,
  parseView,
  rangeTitle,
  shiftPeriod,
  specialistRows,
  startOfWeek,
  timeGridRange,
  visibleRange,
  weekdayIndex,
  weekdayShortNames,
} from "@/app/(tenant)/bookings/calendar/_lib/calendar-range"
import { STAFF, makeCalendarBooking } from "./bkg02-api-mock"

describe("BKG-02 calendar range helpers", () => {
  it("parses the URL state with safe fallbacks", () => {
    expect(parseView("month")).toBe("month")
    expect(parseView("nope")).toBe("specialists")
    expect(parseView(null)).toBe("specialists")
    expect(parseDateParam("2026-11-10", "2026-01-01")).toBe("2026-11-10")
    expect(parseDateParam("2026-13-40", "2026-01-01")).toBe("2026-01-01")
    expect(parseDateParam(null, "2026-01-01")).toBe("2026-01-01")
  })

  it("weeks start on Monday (backend day_of_week 0)", () => {
    expect(weekdayIndex("2026-11-09")).toBe(0) // Monday
    expect(weekdayIndex("2026-11-15")).toBe(6) // Sunday
    expect(startOfWeek("2026-11-12")).toBe("2026-11-09")
    expect(startOfWeek("2026-11-09")).toBe("2026-11-09")
    expect(startOfWeek("2026-11-15")).toBe("2026-11-09")
  })

  it("visible range per view: a day, Monday–Sunday, or whole weeks around the month", () => {
    expect(visibleRange("specialists", "2026-11-10")).toEqual({ dateFrom: "2026-11-10", dateTo: "2026-11-10" })
    expect(visibleRange("day", "2026-11-10")).toEqual({ dateFrom: "2026-11-10", dateTo: "2026-11-10" })
    expect(visibleRange("week", "2026-11-10")).toEqual({ dateFrom: "2026-11-09", dateTo: "2026-11-15" })
    expect(visibleRange("list", "2026-11-10")).toEqual({ dateFrom: "2026-11-09", dateTo: "2026-11-15" })
    expect(visibleRange("month", "2026-11-10")).toEqual({ dateFrom: "2026-10-26", dateTo: "2026-12-06" })
    const grid = monthGridDates("2026-11-10")
    expect(grid).toHaveLength(42)
    expect(grid[0]).toBe("2026-10-26")
    expect(grid[41]).toBe("2026-12-06")
    // February 2027 starts on a Monday and has 4 full weeks
    expect(monthGridDates("2027-02-14")).toHaveLength(28)
    // never more than the endpoint's 62 days
    for (const d of ["2026-01-15", "2026-02-10", "2026-03-31", "2026-05-01"]) {
      const r = visibleRange("month", d)
      expect(monthGridDates(d).length).toBeLessThanOrEqual(42)
      expect(r.dateFrom <= d && d <= r.dateTo).toBe(true)
    }
  })

  it("shifts by a day, a week or a month (clamping the day of month)", () => {
    expect(shiftPeriod("day", "2026-11-30", 1)).toBe("2026-12-01")
    expect(shiftPeriod("specialists", "2026-11-01", -1)).toBe("2026-10-31")
    expect(shiftPeriod("week", "2026-11-10", 1)).toBe("2026-11-17")
    expect(shiftPeriod("list", "2026-11-10", -1)).toBe("2026-11-03")
    expect(shiftPeriod("month", "2026-11-10", 1)).toBe("2026-12-10")
    expect(shiftPeriod("month", "2026-01-31", 1)).toBe("2026-02-28")
    expect(shiftPeriod("month", "2026-01-15", -1)).toBe("2025-12-15")
  })

  it("resolves a specialist's hours for a date: weekly row, day off, exception", () => {
    const nino = STAFF[0]
    expect(availabilityForDate(nino, "2026-11-10")).toEqual({ start_time: "10:00:00", end_time: "19:00:00", break_start: "14:00:00", break_end: "14:30:00" })
    expect(availabilityForDate(nino, "2026-11-15")).toBeNull() // Sunday row is_available=false
    const withExceptions = {
      ...nino,
      exceptions: [
        { id: 1, date: "2026-11-11", start_time: null, end_time: null, is_available: false, reason: "Holiday" },
        { id: 2, date: "2026-11-12", start_time: "12:00:00", end_time: "15:00:00", is_available: true, reason: "Short day" },
      ],
    }
    expect(availabilityForDate(withExceptions, "2026-11-11")).toBeNull()
    expect(availabilityForDate(withExceptions, "2026-11-12")).toEqual({ start_time: "12:00:00", end_time: "15:00:00", break_start: null, break_end: null })
  })

  it("builds the Specialists rows: active staff, inactive only with bookings, an Unassigned row", () => {
    const inactive = { ...STAFF[1], id: 9, full_name: "Old Staff", is_active_for_bookings: false }
    const bookings = [
      makeCalendarBooking(1, { staff_id: 3, start_time: "12:00:00", end_time: "13:00:00" }),
      makeCalendarBooking(2, { staff_id: 3, start_time: "10:00:00", end_time: "11:00:00" }),
      makeCalendarBooking(3, { staff_id: null }),
      makeCalendarBooking(4, { date: "2026-11-11" }),
    ]
    const rows = specialistRows([...STAFF, inactive], bookings, "2026-11-10", "Unassigned")
    expect(rows.map((r) => r.name)).toEqual(["Nino Beridze", "Lasha Meladze", "Unassigned"])
    expect(rows[0].bookings.map((b) => b.id)).toEqual([2, 1])
    expect(rows[1].bookings).toEqual([])
    expect(rows[2].staffId).toBeNull()
    expect(rows[2].bookings.map((b) => b.id)).toEqual([3])
    const withOld = specialistRows([...STAFF, inactive], [makeCalendarBooking(5, { staff_id: 9 })], "2026-11-10", "Unassigned")
    expect(withOld.map((r) => r.name)).toEqual(["Nino Beridze", "Lasha Meladze", "Old Staff"])
  })

  it("groups bookings by day in start order and stretches the time grid", () => {
    const map = bookingsByDate([
      makeCalendarBooking(1, { start_time: "15:00:00", end_time: "16:00:00" }),
      makeCalendarBooking(2, { start_time: "09:00:00", end_time: "09:30:00" }),
      makeCalendarBooking(3, { date: "2026-11-11", start_time: "07:30:00", end_time: "08:15:00" }),
    ])
    expect([...map.keys()]).toEqual(["2026-11-10", "2026-11-11"])
    expect(map.get("2026-11-10")?.map((b) => b.id)).toEqual([2, 1])
    expect(timeGridRange([])).toEqual({ start: 480, end: 1200 })
    expect(timeGridRange([{ start_time: "07:30:00", end_time: "21:10:00" }])).toEqual({ start: 420, end: 1320 })
  })

  it("packs overlapping bookings into side-by-side lanes", () => {
    const lanes = layoutLanes([
      { id: 1, start_time: "10:00", end_time: "11:00" },
      { id: 2, start_time: "10:30", end_time: "11:30" },
      { id: 3, start_time: "11:00", end_time: "12:00" },
      { id: 4, start_time: "14:00", end_time: "15:00" },
    ])
    const by = Object.fromEntries(lanes.map((l) => [l.item.id, [l.lane, l.lanes]]))
    expect(by[1]).toEqual([0, 2])
    expect(by[2]).toEqual([1, 2])
    expect(by[3]).toEqual([0, 2])
    expect(by[4]).toEqual([0, 1])
  })

  it("reads the business clock in the business timezone", () => {
    const at = new Date("2026-11-10T22:30:00Z")
    expect(nowInTimezone("Asia/Tbilisi", at)).toEqual({ date: "2026-11-11", minutes: 2 * 60 + 30 })
    expect(nowInTimezone("UTC", at)).toEqual({ date: "2026-11-10", minutes: 22 * 60 + 30 })
    expect(nowInTimezone("America/New_York", at)).toEqual({ date: "2026-11-10", minutes: 17 * 60 + 30 })
  })

  it("titles and names follow the locale", () => {
    expect(rangeTitle("month", "2026-11-10", "en")).toBe("November 2026")
    expect(rangeTitle("week", "2026-11-10", "en")).toBe("Nov 9 – 15, 2026")
    expect(rangeTitle("list", "2026-11-01", "en")).toBe("Oct 26 – Nov 1, 2026")
    expect(rangeTitle("day", "2026-11-06", "en")).toBe("November 6, 2026")
    expect(rangeTitle("month", "2026-11-10", "ka")).toBe("ნოემბერი 2026")
    expect(rangeTitle("day", "2026-11-06", "ka")).toBe("6 ნოემბერი, 2026")
    expect(weekdayShortNames("en")).toEqual(["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"])
    expect(weekdayShortNames("ka")).toEqual(["ორშ", "სამ", "ოთხ", "ხუთ", "პარ", "შაბ", "კვი"])
    expect(formatLongDate("2026-11-03", "en")).toBe("Tuesday, November 3, 2026")
    expect(formatLongDate("2026-11-03", "ka")).toBe("სამშაბათი, 3 ნოემბერი, 2026")
    expect(eventLabel(makeCalendarBooking(1))).toBe("10:00 Whitening – Client 1")
  })
})
