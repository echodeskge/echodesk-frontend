"use client"

import { useEffect, useState } from "react"
import { BOOKING_STATUSES, ToolbarSearch, ToolbarSelect, type BookingStatus } from "../../_components/ui"
import { DATE_FILTERS, type DateFilter } from "../../_lib/date-filter"

type Translate = (key: string, values?: Record<string, string | number>) => string

export type StatusFilter = "all" | BookingStatus

const STATUS_KEY: Record<BookingStatus, string> = {
  pending: "pending",
  confirmed: "confirmed",
  in_progress: "inProgress",
  completed: "completed",
  cancelled: "cancelled",
  no_show: "noShow",
}

/** Search (server `search`, 300ms debounce), date select (All dates / Today / Upcoming / Past) and status select. */
export function BookingsToolbar({
  search,
  dateFilter,
  statusFilter,
  onSearchChange,
  onDateFilterChange,
  onStatusFilterChange,
  t,
  tUi,
}: {
  search: string
  dateFilter: DateFilter
  statusFilter: StatusFilter
  onSearchChange: (value: string) => void
  onDateFilterChange: (value: DateFilter) => void
  onStatusFilterChange: (value: StatusFilter) => void
  t: Translate
  tUi: Translate
}) {
  const [local, setLocal] = useState(search)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (local !== search) onSearchChange(local)
    }, 300)
    return () => clearTimeout(timer)
  }, [local, search, onSearchChange])

  useEffect(() => {
    setLocal(search)
  }, [search])

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2" data-testid="bkg-bookings-toolbar">
      <ToolbarSearch value={local} onChange={setLocal} placeholder={t("searchBookings")} clearLabel={tUi("clearSearch")} testId="bkg-bookings-search" />
      <ToolbarSelect
        value={dateFilter}
        onChange={onDateFilterChange}
        ariaLabel={t("dateFilter")}
        testId="bkg-bookings-date"
        options={DATE_FILTERS.map((v) => ({ value: v, label: v === "all" ? t("allDates") : t(v) }))}
      />
      <ToolbarSelect
        value={statusFilter}
        onChange={onStatusFilterChange}
        ariaLabel={t("statusFilter")}
        testId="bkg-bookings-status"
        options={[{ value: "all" as StatusFilter, label: t("allStatus") }, ...BOOKING_STATUSES.map((s) => ({ value: s as StatusFilter, label: t(STATUS_KEY[s]) }))]}
      />
    </div>
  )
}
