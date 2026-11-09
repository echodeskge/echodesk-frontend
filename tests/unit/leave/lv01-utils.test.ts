import { describe, it, expect } from "vitest"
import {
  CANCELLABLE_STATUSES,
  balanceTotals,
  countHolidaysWithin30Days,
  countStartingInYear,
  filterRequests,
  isCancellable,
  requestBucket,
  requestFilterCounts,
  usedPercent,
} from "@/app/(tenant)/leave/_lib/lv01-utils"
import { generalErrorText, orderedSubstitutes } from "@/app/(tenant)/leave/my-requests/_components/new-request-dialog"
import type { SubstituteAssignment } from "@/app/(tenant)/leave/_lib/hr-api"

describe("my requests filter buckets", () => {
  it("puts every status in one bucket", () => {
    expect(requestBucket("awaiting_substitutes")).toBe("active")
    expect(requestBucket("pending")).toBe("active")
    expect(requestBucket("manager_approved")).toBe("active")
    expect(requestBucket("hr_approved")).toBe("active")
    expect(requestBucket("approved")).toBe("approved")
    expect(requestBucket("rejected")).toBe("closed")
    expect(requestBucket("cancelled")).toBe("closed")
    // Unknown statuses read as still open (as leaveStatusKey reads them as pending).
    expect(requestBucket("something_new")).toBe("active")
  })

  it("active is exactly the cancellable set", () => {
    for (const s of CANCELLABLE_STATUSES) expect(requestBucket(s)).toBe("active")
    expect(isCancellable("approved")).toBe(false)
    expect(isCancellable("rejected")).toBe(false)
    expect(isCancellable("pending")).toBe(true)
  })

  it("filters client side and counts each bucket", () => {
    const rows = ["pending", "approved", "rejected", "cancelled", "hr_approved", "approved"].map((status, id) => ({ id, status }))
    expect(filterRequests(rows, "all")).toHaveLength(6)
    expect(filterRequests(rows, "active").map((r) => r.id)).toEqual([0, 4])
    expect(filterRequests(rows, "approved").map((r) => r.id)).toEqual([1, 5])
    expect(filterRequests(rows, "closed").map((r) => r.id)).toEqual([2, 3])
    expect(requestFilterCounts(rows)).toEqual({ all: 6, active: 2, approved: 2, closed: 2 })
    expect(requestFilterCounts([])).toEqual({ all: 0, active: 0, approved: 0, closed: 0 })
  })
})

describe("balance math", () => {
  it("usedPercent rounds, caps at 100 and is 0 without an allocation", () => {
    expect(usedPercent("2.0", "10.0")).toBe(20)
    expect(usedPercent("1", "3")).toBe(33)
    expect(usedPercent("12", "10")).toBe(100)
    expect(usedPercent("0", "0")).toBe(0)
    expect(usedPercent("x", "10")).toBe(0)
  })

  it("balanceTotals sums decimal strings and ignores junk", () => {
    expect(
      balanceTotals([
        { total_allocated: "26.0", used_days: "0.0", pending_days: "5.0", available_days: "21.0" },
        { total_allocated: "10.0", used_days: "2.5", pending_days: "", available_days: "7.5" },
      ])
    ).toEqual({ allocated: 36, used: 2.5, pending: 5, remaining: 28.5 })
    expect(balanceTotals([])).toEqual({ allocated: 0, used: 0, pending: 0, remaining: 0 })
  })
})

describe("landing counters", () => {
  it("counts approved requests that start in the year", () => {
    const rows = [{ start_date: "2026-06-01" }, { start_date: "2025-12-30" }, { start_date: "2026-01-01" }, {}]
    expect(countStartingInYear(rows, 2026)).toBe(2)
    expect(countStartingInYear(rows, 2025)).toBe(1)
  })

  it("counts holidays from today up to 30 days ahead on local calendar days", () => {
    // Built from local parts, so the result does not depend on TZ.
    const today = new Date(2026, 10, 9, 23, 30)
    const rows = [
      { date: "2026-11-09" }, // today
      { date: "2026-11-08" }, // yesterday
      { date: "2026-12-09" }, // +30 days
      { date: "2026-12-10" }, // +31 days
      { date: undefined },
    ]
    expect(countHolidaysWithin30Days(rows, today)).toBe(2)
  })
})

describe("new request dialog helpers", () => {
  it("general error line joins non-field errors and detail only", () => {
    expect(generalErrorText({ non_field_errors: "Overlap", detail: "Nope", end_date: "Bad end" })).toBe("Overlap Nope")
    expect(generalErrorText({ end_date: "Bad end" })).toBe("")
  })

  it("orders saved substitutes by sort_order without mutating the input", () => {
    const list = [
      { id: 1, sort_order: 2, substitute_name: "B" },
      { id: 2, sort_order: 0, substitute_name: "A" },
    ] as unknown as SubstituteAssignment[]
    expect(orderedSubstitutes(list).map((s) => s.id)).toEqual([2, 1])
    expect(list.map((s) => s.id)).toEqual([1, 2])
  })
})
