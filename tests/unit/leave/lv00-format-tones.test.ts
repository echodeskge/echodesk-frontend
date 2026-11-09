import { describe, it, expect } from "vitest"
import {
  formatDays,
  formatLeaveDate,
  formatLeaveRange,
  parseDays,
} from "@/app/(tenant)/leave/_components/ui/format"
import {
  kpiStatusTone,
  requestStatusTone,
  substituteStatusTone,
  TONE_CLASS,
  TONE_DOT,
} from "@/app/(tenant)/leave/_components/ui/tones"
import { safeLeaveColor } from "@/app/(tenant)/leave/_components/ui/pills"
import { gridTemplate } from "@/app/(tenant)/leave/_components/ui/data-table"
import { LEAVE_STATUSES } from "@/app/(tenant)/leave/_lib/hr-utils"

// A fixed "now" (local calendar date) keeps the year logic clock-independent.
const now = new Date(2026, 10, 9, 12, 0)

describe("formatLeaveRange", () => {
  it("one day", () => {
    expect(formatLeaveRange("2026-11-16", "2026-11-16", "en", { now })).toBe("Nov 16")
    expect(formatLeaveRange("2026-11-16", "2026-11-16", "ka", { now })).toBe("16 ნოე")
    expect(formatLeaveRange("2026-11-16", null, "en", { now })).toBe("Nov 16")
  })
  it("same month", () => {
    expect(formatLeaveRange("2026-11-16", "2026-11-20", "en", { now })).toBe("Nov 16–20")
    expect(formatLeaveRange("2026-11-16", "2026-11-20", "ka", { now })).toBe("16–20 ნოე")
  })
  it("same year, different months", () => {
    expect(formatLeaveRange("2026-11-30", "2026-12-02", "en", { now })).toBe("Nov 30 – Dec 2")
    expect(formatLeaveRange("2026-11-30", "2026-12-02", "ka", { now })).toBe("30 ნოე – 2 დეკ")
  })
  it("adds the year outside the current year", () => {
    expect(formatLeaveRange("2025-03-02", "2025-03-04", "en", { now })).toBe("Mar 2–4, 2025")
    expect(formatLeaveRange("2025-03-02", "2025-03-04", "ka", { now })).toBe("2–4 მარ 2025")
    expect(formatLeaveRange("2026-11-16", "2026-11-20", "en", { now, year: "always" })).toBe("Nov 16–20, 2026")
  })
  it("across years shows both years", () => {
    expect(formatLeaveRange("2026-12-28", "2027-01-03", "en", { now })).toBe("Dec 28, 2026 – Jan 3, 2027")
    expect(formatLeaveRange("2026-12-28", "2027-01-03", "ka", { now })).toBe("28 დეკ 2026 – 3 იან 2027")
  })
  it("falls back for invalid input", () => {
    expect(formatLeaveRange(null, null, "en", { now })).toBe("—")
    expect(formatLeaveRange("soon", "later", "en", { now })).toBe("soon – later")
  })
  it("does not shift date-only strings by timezone", () => {
    // new Date("2026-11-01") would be Oct 31 west of UTC; the formatter reads calendar parts.
    expect(formatLeaveDate("2026-11-01", "en", { now })).toBe("Nov 1")
    expect(formatLeaveDate("2026-11-01", "en", { now, year: "always" })).toBe("Nov 1, 2026")
    expect(formatLeaveDate(null, "en")).toBe("—")
  })
})

describe("formatDays", () => {
  it("trims trailing zeros, keeps one decimal", () => {
    expect(formatDays("5.0")).toBe("5")
    expect(formatDays("0.5")).toBe("0.5")
    expect(formatDays(12.25)).toBe("12.3")
    expect(formatDays("-2.0")).toBe("-2")
  })
  it("dash for missing or non-numeric", () => {
    expect(formatDays(null)).toBe("—")
    expect(formatDays("")).toBe("—")
    expect(formatDays("abc")).toBe("—")
    expect(parseDays("abc")).toBeNull()
    expect(parseDays("3.5")).toBe(3.5)
  })
})

describe("tones", () => {
  it("maps every request status to a tone", () => {
    const expected: Record<string, string> = {
      awaiting_substitutes: "violet",
      pending: "warning",
      manager_approved: "info",
      hr_approved: "info",
      approved: "success",
      rejected: "danger",
      cancelled: "neutral",
    }
    for (const s of LEAVE_STATUSES) expect(requestStatusTone(s)).toBe(expected[s])
    expect(requestStatusTone("something_new")).toBe("warning")
    expect(requestStatusTone(undefined)).toBe("warning")
  })
  it("maps substitute and KPI statuses", () => {
    expect(substituteStatusTone("accepted")).toBe("success")
    expect(substituteStatusTone("rejected")).toBe("danger")
    expect(substituteStatusTone("skipped")).toBe("neutral")
    expect(substituteStatusTone("pending")).toBe("warning")
    expect(kpiStatusTone("draft")).toBe("neutral")
    expect(kpiStatusTone("pending")).toBe("warning")
    expect(kpiStatusTone("approved")).toBe("success")
    expect(kpiStatusTone("returned")).toBe("danger")
  })
  it("has classes for every tone, incl. dark variants for coloured text", () => {
    for (const tone of Object.keys(TONE_CLASS) as (keyof typeof TONE_CLASS)[]) {
      expect(TONE_CLASS[tone]).toMatch(/border-/)
      expect(TONE_DOT[tone]).toMatch(/^bg-/)
      if (tone !== "neutral") expect(TONE_CLASS[tone]).toMatch(/dark:text-/)
    }
  })
})

describe("safeLeaveColor / gridTemplate", () => {
  it("accepts hex colours only", () => {
    expect(safeLeaveColor("#3b82f6")).toBe("#3b82f6")
    expect(safeLeaveColor(" #ABC ")).toBe("#ABC")
    expect(safeLeaveColor("red")).toBeNull()
    expect(safeLeaveColor("url(x)")).toBeNull()
    expect(safeLeaveColor(undefined)).toBeNull()
  })
  it("joins column widths", () => {
    expect(gridTemplate([{ width: "minmax(0,1fr)" }, { width: "90px" }] as never)).toBe("minmax(0,1fr) 90px")
  })
})
