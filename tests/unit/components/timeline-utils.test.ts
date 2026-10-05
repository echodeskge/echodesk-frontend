import { describe, expect, it } from "vitest"
import {
  bookingMatches,
  fromMinutes,
  isWorkingAt,
  minuteAtOffset,
  nonWorkingBlocks,
  timelineRange,
  toMinutes,
} from "@/components/bookings/timeline-utils"

const day = { start_time: "10:00:00", end_time: "19:00:00", break_start: "13:00:00", break_end: "14:00:00" }

describe("timeline-utils", () => {
  it("converts times both ways", () => {
    expect(toMinutes("09:30:00")).toBe(570)
    expect(toMinutes("09:30")).toBe(570)
    expect(fromMinutes(570)).toBe("09:30")
    expect(fromMinutes(0)).toBe("00:00")
  })

  it("range covers working hours and bookings, rounded to hours, at least 09–18", () => {
    expect(timelineRange([])).toEqual({ start: 540, end: 1080 })
    expect(timelineRange([{ availability: { start_time: "08:30", end_time: "20:15" }, bookings: [] }])).toEqual({ start: 480, end: 1260 })
    expect(
      timelineRange([{ availability: null, bookings: [{ start_time: "07:45:00", end_time: "08:30:00" }] }])
    ).toEqual({ start: 420, end: 1080 })
    expect(timelineRange([{ availability: { start_time: "22:00", end_time: "23:30" }, bookings: [] }]).end).toBe(1440)
  })

  it("greys out everything on a day off", () => {
    expect(nonWorkingBlocks(null, 540, 1080)).toEqual([{ start: 540, end: 1080, kind: "off" }])
  })

  it("greys out before, after and the break", () => {
    expect(nonWorkingBlocks(day, 540, 1200)).toEqual([
      { start: 540, end: 600, kind: "off" },
      { start: 1140, end: 1200, kind: "off" },
      { start: 780, end: 840, kind: "break" },
    ])
    // Working hours wider than the visible range: nothing to grey out
    expect(nonWorkingBlocks({ start_time: "08:00", end_time: "20:00" }, 540, 1080)).toEqual([])
  })

  it("knows when a minute is workable", () => {
    expect(isWorkingAt(day, 600)).toBe(true)
    expect(isWorkingAt(day, 599)).toBe(false)
    expect(isWorkingAt(day, 800)).toBe(false) // break
    expect(isWorkingAt(day, 1140)).toBe(false) // end is exclusive
    expect(isWorkingAt(null, 600)).toBe(false)
  })

  it("snaps clicks to the zoom step", () => {
    // 1.6 px per minute, range from 09:00, 30-minute steps
    expect(minuteAtOffset(0, 1.6, 540, 30)).toBe(540)
    expect(minuteAtOffset(47, 1.6, 540, 30)).toBe(540) // 29 min in → still 09:00
    expect(minuteAtOffset(49, 1.6, 540, 30)).toBe(570)
    expect(minuteAtOffset(100, 1.6, 540, 15)).toBe(600) // 62.5 min → 10:00
  })

  it("matches search on name, phone digits or number", () => {
    const booking = { booking_number: "BK20261005ABC", client: { full_name: "Ana Gelashvili", phone_number: "+995 599 12 34 56" } }
    expect(bookingMatches(booking, "")).toBe(true)
    expect(bookingMatches(booking, "gela")).toBe(true)
    expect(bookingMatches(booking, "599123")).toBe(true)
    expect(bookingMatches(booking, "599 12 34")).toBe(true)
    expect(bookingMatches(booking, "bk2026")).toBe(true)
    expect(bookingMatches(booking, "nino")).toBe(false)
    expect(bookingMatches(booking, "555")).toBe(false)
  })
})
