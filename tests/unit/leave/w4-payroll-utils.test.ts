import { describe, it, expect } from "vitest"
import {
  dayCount,
  findRunForPeriod,
  formatOtherCurrencies,
  groupDaysByMonth,
  isValidAmount,
  normalizeCurrency,
  payrollMoneyColumns,
  sameDays,
  toggleDay,
  totalsRows,
} from "@/app/(tenant)/leave/_lib/payroll-utils"
import type { PayrollRun } from "@/app/(tenant)/leave/_lib/hr-api"

const run = (id: number, period: string, is_locked: boolean): PayrollRun => ({
  id, period, is_locked, mode: "gross", locked_by: null, locked_by_name: null, locked_at: null,
  unlocked_by: null, unlocked_at: null, unlock_reason: "",
})

describe("payrollMoneyColumns", () => {
  it("adds net columns only in net mode", () => {
    expect(payrollMoneyColumns("gross")).toEqual(["base_pay", "substitution_pay", "gross"])
    expect(payrollMoneyColumns("net")).toEqual(["base_pay", "substitution_pay", "gross", "pension", "income_tax", "net"])
  })
})

describe("findRunForPeriod", () => {
  it("prefers the locked run, else the newest", () => {
    expect(findRunForPeriod([run(1, "2026-10", false), run(2, "2026-11", true)], "2026-11")?.id).toBe(2)
    expect(findRunForPeriod([run(1, "2026-11", false), run(3, "2026-11", false)], "2026-11")?.id).toBe(3)
    expect(findRunForPeriod([run(1, "2026-10", true)], "2026-11")).toBeNull()
  })
})

describe("totals and currencies", () => {
  it("sorts totals by currency", () => {
    const rows = totalsRows({ USD: { base_pay: "1", substitution_pay: "0", gross: "1" }, GEL: { base_pay: "2", substitution_pay: "0", gross: "2" } })
    expect(rows.map((r) => r.currency)).toEqual(["GEL", "USD"])
    expect(totalsRows(null)).toEqual([])
  })
  it("formats other-currency pay", () => {
    expect(formatOtherCurrencies({ USD: "5.00", EUR: "1.50" })).toBe("EUR 1.50, USD 5.00")
    expect(formatOtherCurrencies({}, (v) => v)).toBe("")
  })
})

describe("worked days", () => {
  it("toggles and sorts days", () => {
    expect(toggleDay(["2026-11-03"], "2026-11-02")).toEqual(["2026-11-02", "2026-11-03"])
    expect(toggleDay(["2026-11-02", "2026-11-03"], "2026-11-02")).toEqual(["2026-11-03"])
  })
  it("groups days by month and dedupes", () => {
    expect(groupDaysByMonth(["2026-12-01", "2026-11-30", "2026-11-30"])).toEqual([
      { period: "2026-11", days: ["2026-11-30"] },
      { period: "2026-12", days: ["2026-12-01"] },
    ])
  })
  it("compares day sets ignoring order", () => {
    expect(sameDays(["a", "b"], ["b", "a"])).toBe(true)
    expect(sameDays(["a"], ["a", "b"])).toBe(false)
  })
  it("counts days from a list or a number", () => {
    expect(dayCount(["2026-11-02", "2026-11-03"])).toBe(2)
    expect(dayCount(4)).toBe(4)
    expect(dayCount(null)).toBe(0)
  })
})

describe("input validation", () => {
  it("normalises currency codes", () => {
    expect(normalizeCurrency(" gel ")).toBe("GEL")
    expect(normalizeCurrency("GE")).toBeNull()
    expect(normalizeCurrency("G3L")).toBeNull()
  })
  it("validates amounts", () => {
    expect(isValidAmount("1500")).toBe(true)
    expect(isValidAmount("12.50")).toBe(true)
    expect(isValidAmount("0")).toBe(false)
    expect(isValidAmount("1.234")).toBe(false)
    expect(isValidAmount("-5")).toBe(false)
  })
})
