import { describe, expect, it } from "vitest"
import {
  bookingActions,
  canCancel,
  canRecordPayment,
  handlerUserId,
  isFinalStatus,
  needsForce,
} from "@/app/(tenant)/bookings/_lib/booking-status"
import { dateFilterRange } from "@/app/(tenant)/bookings/_lib/date-filter"
import { fetchAllPages } from "@/app/(tenant)/bookings/_lib/bookings-api"
import { bookingStatusTone, paymentStatusTone } from "@/app/(tenant)/bookings/_components/ui/tones"
import {
  formatBookingDate,
  formatBookingDateTime,
  formatMoney,
  formatTimeRange,
  shiftDateOnly,
  todayInTimezone,
} from "@/app/(tenant)/bookings/_components/ui/format"
import { displayName, staffName } from "@/app/(tenant)/bookings/_components/ui/name"
import { pageRange } from "@/app/(tenant)/bookings/_components/ui/pagination"
import { dashboardTiles } from "@/app/(tenant)/bookings/_lib/dashboard-tiles"
import { flatten, messages } from "./bkg00-helpers"

describe("BKG-00 booking status rules (mirror views_admin.py)", () => {
  it("offers the actions the backend accepts per status", () => {
    expect(bookingActions("pending")).toEqual({ confirm: true, checkIn: true, complete: false, noShow: true, reschedule: true, assignStaff: true, cancel: true })
    expect(bookingActions("confirmed")).toEqual({ confirm: false, checkIn: true, complete: true, noShow: true, reschedule: true, assignStaff: true, cancel: true })
    expect(bookingActions("in_progress")).toEqual({ confirm: false, checkIn: false, complete: true, noShow: false, reschedule: false, assignStaff: false, cancel: true })
    for (const s of ["completed", "cancelled", "no_show"]) {
      expect(isFinalStatus(s)).toBe(true)
      expect(canCancel(s)).toBe(false)
      expect(Object.values(bookingActions(s)).some(Boolean)).toBe(false)
    }
    expect(canCancel(undefined)).toBe(false)
  })

  it("record payment only while something is owed on an open booking", () => {
    expect(canRecordPayment({ status: "confirmed", total_amount: "100.00", paid_amount: "20.00" })).toBe(true)
    expect(canRecordPayment({ status: "confirmed", total_amount: "100.00", paid_amount: "100.00" })).toBe(false)
    expect(canRecordPayment({ status: "cancelled", total_amount: "100.00", paid_amount: "0" })).toBe(false)
    expect(canRecordPayment({ status: "completed", total_amount: "0.00", paid_amount: "0.00" })).toBe(false)
  })

  it("detects the unpaid online-card refusal that needs force=true", () => {
    expect(needsForce({ response: { status: 400, data: { error: "Cannot confirm booking without payment. Use force=true to override." } } })).toBe(true)
    expect(needsForce({ response: { status: 400, data: { error: "Cannot confirm booking with status: completed" } } })).toBe(false)
    expect(needsForce({ response: { status: 403, data: { error: "force=true" } } })).toBe(false)
    expect(needsForce(new Error("network"))).toBe(false)
  })

  it("finds the handler's user id on both staff shapes", () => {
    expect(handlerUserId({ staff: { user: { id: 9 } } })).toBe(9)
    expect(handlerUserId({ staff: { user_id: 12 } })).toBe(12)
    expect(handlerUserId({ staff: null })).toBeNull()
  })
})

describe("BKG-00 tones", () => {
  it("maps every booking and payment status to the design tones", () => {
    expect(["pending", "confirmed", "in_progress", "completed", "cancelled", "no_show"].map(bookingStatusTone)).toEqual(["warning", "info", "violet", "success", "danger", "neutral"])
    expect(["pending", "deposit_paid", "fully_paid", "failed", "refunded"].map(paymentStatusTone)).toEqual(["warning", "info", "success", "danger", "neutral"])
  })
})

describe("BKG-00 formatting", () => {
  it("reads booking days as calendar days (no UTC shift) and shows the year", () => {
    expect(formatBookingDate("2026-11-10", "en")).toBe("Nov 10, 2026")
    expect(formatBookingDate("2026-11-10", "ka")).toBe("10 ნოე 2026")
    expect(formatBookingDate("", "en")).toBe("—")
    expect(formatTimeRange("09:00:00", "10:30:00")).toBe("09:00 – 10:30")
    expect(formatTimeRange(null, null)).toBe("—")
    expect(formatBookingDateTime("2026-11-06T09:02:00Z", "en", { now: new Date("2026-11-06T12:00:00Z") })).toBe("Nov 6, 2026, 09:02")
  })

  it("formats money with the lari sign", () => {
    expect(formatMoney("350.00")).toBe("₾350.00")
    expect(formatMoney(1234.5)).toBe("₾1,234.50")
    expect(formatMoney(null)).toBe("—")
    expect(formatMoney("abc")).toBe("—")
  })

  it("shifts dates and finds today in a timezone", () => {
    expect(shiftDateOnly("2026-03-01", -1)).toBe("2026-02-28")
    expect(shiftDateOnly("2026-12-31", 1)).toBe("2027-01-01")
    // 23:30 UTC on Nov 10 is already Nov 11 in Tbilisi (UTC+4)
    expect(todayInTimezone("Asia/Tbilisi", new Date("2026-11-10T23:30:00Z"))).toBe("2026-11-11")
    expect(todayInTimezone("not/a-zone", new Date("2026-11-10T12:00:00Z"))).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it("date filter -> date_from / date_to around the business day", () => {
    expect(dateFilterRange("all", "2026-11-10")).toEqual({})
    expect(dateFilterRange("today", "2026-11-10")).toEqual({ dateFrom: "2026-11-10", dateTo: "2026-11-10" })
    expect(dateFilterRange("upcoming", "2026-11-10")).toEqual({ dateFrom: "2026-11-10" })
    expect(dateFilterRange("past", "2026-11-10")).toEqual({ dateTo: "2026-11-09" })
  })

  it("names: the locale's own name first, then name_display, then the other language", () => {
    // Catalog lists and nested objects are fetched without ?lang, so name_display is English there.
    expect(displayName({ name_display: "Whitening", name: { en: "X", ka: "Y" } }, "ka")).toBe("Y")
    expect(displayName({ name_display: "Whitening", name: { en: "X", ka: "Y" } }, "en")).toBe("X")
    expect(displayName({ name_display: "გათეთრება", name: { en: "Whitening" } }, "ka")).toBe("გათეთრება")
    expect(displayName({ name_display: "Whitening" }, "ka")).toBe("Whitening")
    expect(displayName({ name: { en: "Whitening", ka: "გათეთრება" } }, "ka")).toBe("გათეთრება")
    expect(displayName({ name: { en: "Whitening" } }, "ka")).toBe("Whitening")
    expect(displayName({ name: "Plain" }, "en")).toBe("Plain")
    expect(displayName(null, "en")).toBe("—")
    expect(staffName({ full_name: "Nino Beridze" })).toBe("Nino Beridze")
    expect(staffName({ user: { first_name: "Nino", last_name: "Beridze" } })).toBe("Nino Beridze")
    expect(staffName(null)).toBe("")
  })

  it("page ranges clamp to the total", () => {
    expect(pageRange(2, 20, 45)).toEqual({ from: 21, to: 40 })
    expect(pageRange(3, 20, 45)).toEqual({ from: 41, to: 45 })
    expect(pageRange(1, 20, 0)).toEqual({ from: 0, to: 0 })
  })
})

describe("BKG-00 fetchAllPages", () => {
  it("follows `next` until every row is loaded and asks for 100 per page", async () => {
    const calls: [number, number][] = []
    const rows = await fetchAllPages(async (page, pageSize) => {
      calls.push([page, pageSize])
      return page === 1 ? { count: 150, next: "p2", results: Array(100).fill(1) } : { count: 150, next: null, results: Array(50).fill(2) }
    })
    expect(rows).toHaveLength(150)
    expect(calls).toEqual([
      [1, 100],
      [2, 100],
    ])
  })

  it("accepts an unpaginated array", async () => {
    expect(await fetchAllPages(async () => [1, 2, 3])).toEqual([1, 2, 3])
  })
})

describe("BKG-01 dashboard tiles", () => {
  it("map the {today, week, month, overall} payload", () => {
    expect(
      dashboardTiles({
        today: { total_bookings: 6, confirmed: 2, pending: 4, completed: 1, status_breakdown: [], bookings: [] },
        week: { total_bookings: 20, revenue: 970, popular_services: [] },
        month: { total_bookings: 40, completed: 17, revenue: 2100 },
        overall: { total_clients: 11, total_revenue: 5000, active_staff: 3, pending: 9 },
      })
    ).toEqual({ todayBookings: 6, pendingApproval: 9, completedThisMonth: 17, totalRevenue: "₾5,000.00", activeStaff: 3, totalClients: 11 })
  })

  it("fall back to today's figures on an older payload", () => {
    expect(
      dashboardTiles({
        today: { total_bookings: 6, confirmed: 2, pending: 4, completed: 1, status_breakdown: [], bookings: [] },
        week: { total_bookings: 20, revenue: 970, popular_services: [] },
        overall: { total_clients: 11, total_revenue: 5000, active_staff: 3 },
      })
    ).toMatchObject({ pendingApproval: 4, completedThisMonth: 1, totalRevenue: "₾5,000.00" })
  })
})

describe("BKG-01 i18n pending file", () => {
  it("has identical en/ka key sets and no Latin UI text in ka", () => {
    const namespaces = ["bookingsUi", "bookingsDetail", "bookingsClients"]
    for (const ns of namespaces) {
      const enKeys = Object.keys(flatten(messages.en[ns])).sort()
      const kaKeys = Object.keys(flatten(messages.ka[ns])).sort()
      expect(kaKeys, ns).toEqual(enKeys)
      for (const [k, v] of Object.entries(flatten(messages.ka[ns]))) {
        // Placeholders ({count}, ICU plural keywords) and the rating "4/5" are allowed; words must be Georgian.
        const stripped = v.replace(/\{[^}]*\}/g, "").replace(/\b(one|other|plural)\b/g, "")
        expect(/[A-Za-z]{3,}/.test(stripped), `${ns}.${k}: ${v}`).toBe(false)
      }
    }
  })
})
