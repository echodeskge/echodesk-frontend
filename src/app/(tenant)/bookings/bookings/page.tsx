"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { CalendarCheck, SearchX } from "lucide-react"
import type { BookingRow } from "@/api/generated/interfaces"
import { fetchBookingRows, fetchBookingStatusCounts, type BookingStatusCounts } from "../_lib/bookings-api"
import { useBusinessTimezone } from "../_lib/use-business-timezone"
import { dateFilterRange, type DateFilter } from "../_lib/date-filter"
import {
  BookingsEmptyState,
  BookingsHeaderBridge,
  BookingsPage,
  BookingsPagination,
  BookingsStatGrid,
  BookingsTable,
  SectionCard,
  rdButton,
  todayInTimezone,
  type BookingsStatItem,
} from "../_components/ui"
import { getBookingColumns } from "./_components/bookings-columns"
import { BookingsToolbar, type StatusFilter } from "./_components/bookings-toolbar"

const DEFAULT_PAGE_SIZE = 20

export default function BookingsListPage() {
  const t = useTranslations("bookingsBookings")
  const tUi = useTranslations("bookingsUi")
  const locale = useLocale()
  const router = useRouter()
  const { timezone, loaded: tzLoaded } = useBusinessTimezone()

  const [rows, setRows] = useState<BookingRow[] | undefined>(undefined)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [counts, setCounts] = useState<BookingStatusCounts | null>(null)
  const [search, setSearch] = useState("")
  const [dateFilter, setDateFilter] = useState<DateFilter>("all")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

  // "Today" in the business timezone; the date filter waits for it.
  const today = useMemo(() => todayInTimezone(timezone), [timezone])
  const range = useMemo(() => dateFilterRange(dateFilter, today), [dateFilter, today])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchBookingRows({
        page,
        pageSize,
        search,
        status: statusFilter === "all" ? undefined : statusFilter,
        dateFrom: range.dateFrom,
        dateTo: range.dateTo,
        lang: locale,
      })
      setRows(res.results ?? [])
      setTotalCount(res.count ?? 0)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, search, statusFilter, range.dateFrom, range.dateTo, locale])

  // A date filter needs the business timezone first; "all" loads right away
  // and does not reload when the timezone arrives.
  const ready = dateFilter === "all" || tzLoaded
  useEffect(() => {
    if (ready) load()
  }, [load, ready])

  useEffect(() => {
    let active = true
    fetchBookingStatusCounts()
      .then((c) => active && setCounts(c))
      .catch(() => active && setCounts(null))
    return () => {
      active = false
    }
  }, [])

  const handleSearch = useCallback((value: string) => {
    setSearch(value)
    setPage(1)
  }, [])
  const handleDate = useCallback((value: DateFilter) => {
    setDateFilter(value)
    setPage(1)
  }, [])
  const handleStatus = useCallback((value: StatusFilter) => {
    setStatusFilter(value)
    setPage(1)
  }, [])
  const handlePageSize = useCallback((size: number) => {
    setPageSize(size)
    setPage(1)
  }, [])
  const clearFilters = useCallback(() => {
    setSearch("")
    setDateFilter("all")
    setStatusFilter("all")
    setPage(1)
  }, [])

  const filtered = search !== "" || dateFilter !== "all" || statusFilter !== "all"
  const columns = useMemo(() => getBookingColumns({ t, tUi, locale }), [t, tUi, locale])

  const stats: BookingsStatItem[] = [
    { key: "total", label: t("totalBookings"), value: counts?.total, testId: "bkg-stat-total" },
    { key: "pending", label: t("pending"), value: counts?.pending, tone: "warning", testId: "bkg-stat-pending" },
    { key: "confirmed", label: t("confirmed"), value: counts?.confirmed, tone: "info", testId: "bkg-stat-confirmed" },
    { key: "completed", label: t("completed"), value: counts?.completed, tone: "success", testId: "bkg-stat-completed" },
  ]

  return (
    <BookingsPage testId="bkg-bookings">
      <BookingsHeaderBridge sub={rows && !error ? t("bookingsFound", { count: totalCount }) : null} />
      <BookingsStatGrid items={stats} loading={counts === null && !error} testId="bkg-bookings-stats" />
      <SectionCard
        title={t("allBookings")}
        hint={rows && !error ? t("bookingsFound", { count: totalCount }) : undefined}
        actions={
          <BookingsToolbar
            search={search}
            dateFilter={dateFilter}
            statusFilter={statusFilter}
            onSearchChange={handleSearch}
            onDateFilterChange={handleDate}
            onStatusFilterChange={handleStatus}
            t={t}
            tUi={tUi}
          />
        }
        testId="bkg-bookings-card"
      >
        <BookingsTable
          variant="flush"
          density="comfortable"
          columns={columns}
          rows={rows}
          rowKey={(b) => b.id}
          loading={loading}
          error={error}
          onRetry={load}
          onRowClick={(b) => router.push(`/bookings/bookings/${b.id}`)}
          ariaLabel={t("allBookings")}
          skeletonRows={8}
          testId="bkg-bookings-table"
          empty={
            filtered ? (
              <BookingsEmptyState
                icon={SearchX}
                title={tUi("noMatches")}
                description={t("noBookingsMatch")}
                action={
                  <button type="button" className={rdButton.outlineSm} onClick={clearFilters}>
                    {tUi("clearFilters")}
                  </button>
                }
              />
            ) : (
              <BookingsEmptyState icon={CalendarCheck} title={t("noBookingsFound")} description={t("noBookingsYet")} />
            )
          }
          footer={
            !error && rows && rows.length > 0 ? (
              <BookingsPagination page={page} pageSize={pageSize} totalCount={totalCount} onPageChange={setPage} onPageSizeChange={handlePageSize} />
            ) : undefined
          }
        />
      </SectionCard>
    </BookingsPage>
  )
}
