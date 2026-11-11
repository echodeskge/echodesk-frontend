/**
 * The bookings list's date filter (All dates / Today / Upcoming / Past) as
 * server `date_from` / `date_to` parameters, computed from "today" in the
 * business timezone (never the browser clock).
 */
import { shiftDateOnly } from "../_components/ui/format"

export const DATE_FILTERS = ["all", "today", "upcoming", "past"] as const
export type DateFilter = (typeof DATE_FILTERS)[number]

export function isDateFilter(value: string | null | undefined): value is DateFilter {
  return DATE_FILTERS.includes(value as DateFilter)
}

export function dateFilterRange(filter: DateFilter, today: string): { dateFrom?: string; dateTo?: string } {
  switch (filter) {
    case "today":
      return { dateFrom: today, dateTo: today }
    case "upcoming":
      return { dateFrom: today }
    case "past":
      return { dateTo: shiftDateOnly(today, -1) }
    default:
      return {}
  }
}
