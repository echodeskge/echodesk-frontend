/**
 * Pure helpers of the LV-01 pages (landing, my requests, my balance).
 * Moved out of the pages unchanged so they can be unit tested.
 */

/** Statuses the API lets an employee cancel (see CanCancelLeave). */
export const CANCELLABLE_STATUSES = ["awaiting_substitutes", "pending", "manager_approved", "hr_approved"]

export const isCancellable = (status: string) => CANCELLABLE_STATUSES.includes(status)

/** My requests filter: client side over the already loaded list. */
export type RequestFilter = "all" | "active" | "approved" | "closed"

export const REQUEST_FILTERS: RequestFilter[] = ["all", "active", "approved", "closed"]

/** Which filter bucket a status falls in (unknown statuses count as active, like `leaveStatusKey`). */
export function requestBucket(status: string): Exclude<RequestFilter, "all"> {
  if (status === "approved") return "approved"
  if (status === "rejected" || status === "cancelled") return "closed"
  return "active"
}

export function filterRequests<T extends { status: string }>(rows: T[], filter: RequestFilter): T[] {
  return filter === "all" ? rows : rows.filter((r) => requestBucket(r.status) === filter)
}

export function requestFilterCounts(rows: { status: string }[]): Record<RequestFilter, number> {
  const counts: Record<RequestFilter, number> = { all: rows.length, active: 0, approved: 0, closed: 0 }
  for (const r of rows) counts[requestBucket(r.status)] += 1
  return counts
}

export const toNumber = (value: string | number | null | undefined) => {
  const parsed = parseFloat(String(value ?? ""))
  return Number.isFinite(parsed) ? parsed : 0
}

/** Share of the allocation already used, 0-100 (0 when nothing is allocated). */
export function usedPercent(used: string | number, total: string | number): number {
  const usedNum = toNumber(used)
  const totalNum = toNumber(total)
  if (totalNum <= 0) return 0
  return Math.min(100, Math.round((usedNum / totalNum) * 100))
}

export interface BalanceFigures {
  total_allocated: string
  used_days: string
  pending_days: string
  available_days: string
}

/** Sums for the stat tiles. The allocation for the year includes days carried forward. */
export function balanceTotals(balances: BalanceFigures[]) {
  return balances.reduce(
    (acc, balance) => {
      acc.allocated += toNumber(balance.total_allocated)
      acc.used += toNumber(balance.used_days)
      acc.pending += toNumber(balance.pending_days)
      acc.remaining += toNumber(balance.available_days)
      return acc
    },
    { allocated: 0, used: 0, pending: 0, remaining: 0 }
  )
}

/** Approved requests that start in `year` (the API has no year filter). */
export function countStartingInYear(rows: { start_date?: string }[], year: number): number {
  return rows.filter((r) => String(r.start_date || "").startsWith(`${year}-`)).length
}

/** Holidays from `today` (local calendar day) up to 30 days ahead, inclusive. */
export function countHolidaysWithin30Days(rows: { date?: string }[], today: Date): number {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const end = new Date(start)
  end.setDate(end.getDate() + 30)
  return rows.filter((holiday) => {
    if (!holiday.date) return false
    const date = new Date(`${holiday.date}T00:00:00`)
    return date >= start && date <= end
  }).length
}
