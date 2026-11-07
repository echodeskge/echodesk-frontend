/** Pure helpers for the payroll screens (unit-tested in tests/unit/leave/w4-payroll-utils.test.ts). */
import type { PayrollMode, PayrollRun, PayrollTotals } from "./hr-api"

/** Money columns of the report, in display order, for a payroll mode. */
export type PayrollMoneyKey = "base_pay" | "substitution_pay" | "gross" | "pension" | "income_tax" | "net"

export function payrollMoneyColumns(mode: PayrollMode | string): PayrollMoneyKey[] {
  const base: PayrollMoneyKey[] = ["base_pay", "substitution_pay", "gross"]
  return mode === "net" ? [...base, "pension", "income_tax", "net"] : base
}

/** The latest run for a period (runs list is unordered; prefer a locked one). */
export function findRunForPeriod(runs: PayrollRun[], period: string): PayrollRun | null {
  const matches = runs.filter((r) => r.period === period)
  if (matches.length === 0) return null
  return matches.find((r) => r.is_locked) ?? matches.sort((a, b) => b.id - a.id)[0]
}

/** Totals object -> sorted [{currency, ...totals}] rows. */
export function totalsRows(
  totals: Record<string, PayrollTotals> | null | undefined
): (PayrollTotals & { currency: string })[] {
  if (!totals) return []
  return Object.keys(totals)
    .sort()
    .map((currency) => ({ currency, ...totals[currency] }))
}

/** "USD 12.00, EUR 5.00" for the other-currency substitution pay map. */
export function formatOtherCurrencies(
  map: Record<string, string> | null | undefined,
  format: (value: string) => string = (v) => v
): string {
  if (!map) return ""
  return Object.keys(map)
    .sort()
    .map((c) => `${c} ${format(map[c])}`)
    .join(", ")
}

/** Toggle `day` in a list of ISO dates, returning a new sorted list. */
export function toggleDay(days: string[], day: string): string[] {
  const set = new Set(days)
  if (set.has(day)) set.delete(day)
  else set.add(day)
  return [...set].sort()
}

/** Group ISO dates by YYYY-MM (keys sorted, dates sorted). */
export function groupDaysByMonth(days: string[]): { period: string; days: string[] }[] {
  const map = new Map<string, string[]>()
  for (const d of [...new Set(days)].sort()) {
    const key = d.slice(0, 7)
    const list = map.get(key) ?? []
    list.push(d)
    map.set(key, list)
  }
  return [...map.keys()].sort().map((period) => ({ period, days: map.get(period)! }))
}

/** True when two date lists hold the same days (order-insensitive). */
export function sameDays(a: string[], b: string[]): boolean {
  const sa = new Set(a)
  const sb = new Set(b)
  if (sa.size !== sb.size) return false
  for (const d of sa) if (!sb.has(d)) return false
  return true
}

/**
 * The self-view API returns `days` as a list of worked dates (the contract
 * said a number); accept either and return the day count.
 */
export function dayCount(days: number | string[] | null | undefined): number {
  if (Array.isArray(days)) return days.length
  return typeof days === "number" && Number.isFinite(days) ? days : 0
}

/** Validate a 3-letter currency code (upper-cased). */
export function normalizeCurrency(value: string): string | null {
  const v = value.trim().toUpperCase()
  return /^[A-Z]{3}$/.test(v) ? v : null
}

/** A positive decimal amount with at most 2 decimals, as the API expects. */
export function isValidAmount(value: string): boolean {
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim())) return false
  return Number(value) > 0
}
