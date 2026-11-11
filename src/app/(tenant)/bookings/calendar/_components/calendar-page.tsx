"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { useMyAccess } from "@/hooks/useMyAccess"
import { getApiErrorMessage } from "@/lib/utils"
import { bookingMatches } from "@/components/bookings/timeline-utils"
import { BookingsErrorState, BookingsHeaderBridge, BookingsLoading, BookingsPage, Segmented, type SegmentedOption } from "../../_components/ui"
import { cancelBooking, completeBooking, confirmBooking, fetchCalendarRange, type CalendarBooking } from "../../_lib/bookings-api"
import { needsForce } from "../../_lib/booking-status"
import { useBusinessTimezone } from "../../_lib/use-business-timezone"
import { CancelDialog, ForceDialog } from "../../bookings/[id]/_components/dialogs"
import {
  bookingsByDate,
  eachDay,
  nowInTimezone,
  parseDateParam,
  parseView,
  rangeTitle,
  shiftPeriod,
  specialistRows,
  visibleRange,
  type CalendarView,
  type Zoom,
} from "../_lib/calendar-range"
import { CalendarToolbar } from "./calendar-toolbar"
import { ListView } from "./list-view"
import { MonthView } from "./month-view"
import { NewBookingDialog, type NewBookingPreset } from "./new-booking-dialog"
import { SpecialistsView } from "./specialists-view"
import { StatusLegend } from "./status-legend"
import { TimeGridView } from "./time-grid-view"
import type { PopoverAction } from "./booking-popover"

const REFRESH_MS = 60_000

/**
 * /bookings/calendar: Specialists | Month | Week | Day | List over the range
 * endpoint (`admin/calendar/`), one request per visible range, refreshed
 * every minute. "Today" and the now-line follow the business timezone. State
 * lives in `?view=&date=` (no `date` = today).
 */
export function CalendarPage() {
  const t = useTranslations("bookingsCalendar")
  const tUi = useTranslations("bookingsUi")
  const tDetail = useTranslations("bookingsDetail")
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const { isBookingAdmin } = useMyAccess()
  const { timezone } = useBusinessTimezone()

  // The business clock, ticking once a minute (now-line, "today")
  const [clock, setClock] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), REFRESH_MS)
    return () => clearInterval(timer)
  }, [])
  const now = useMemo(() => nowInTimezone(timezone, clock), [timezone, clock])
  const today = now.date

  const [view, setView] = useState<CalendarView>(() => parseView(params?.get("view")))
  // null = follow today (the date is not written to the URL)
  const [pickedDate, setPickedDate] = useState<string | null>(() => {
    const raw = params?.get("date")
    return raw ? parseDateParam(raw, today) : null
  })
  const date = pickedDate ?? today
  const [zoom, setZoom] = useState<Zoom>(30)
  const [search, setSearch] = useState("")

  // Mirror view + date into the URL (replace, no scroll), so the page can be reloaded and linked
  const firstUrlSync = useRef(true)
  useEffect(() => {
    if (firstUrlSync.current) {
      firstUrlSync.current = false
      return
    }
    const next = new URLSearchParams(params?.toString() ?? "")
    if (view === "specialists") next.delete("view")
    else next.set("view", view)
    if (pickedDate) next.set("date", pickedDate)
    else next.delete("date")
    const qs = next.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, pickedDate])

  const range = useMemo(() => visibleRange(view, date), [view, date])
  const query = useQuery({
    queryKey: ["bookings", "calendar", range.dateFrom, range.dateTo, locale],
    queryFn: () => fetchCalendarRange({ dateFrom: range.dateFrom, dateTo: range.dateTo, lang: locale }),
    placeholderData: keepPreviousData,
    refetchInterval: REFRESH_MS,
    staleTime: 30_000,
    retry: 1,
  })
  const data = query.data
  const refresh = useCallback(() => {
    query.refetch()
  }, [query])

  const filtered = useMemo(() => (data?.bookings ?? []).filter((b) => bookingMatches(b, search)), [data, search])
  const byDay = useMemo(() => bookingsByDate(filtered), [filtered])
  const days = useMemo(() => eachDay(range.dateFrom, range.dateTo), [range])
  const rows = useMemo(() => (data ? specialistRows(data.staff, data.bookings, date, tUi("unassigned")) : []), [data, date, tUi])

  // Dialogs and actions
  const [dialogOpen, setDialogOpen] = useState(false)
  const [preset, setPreset] = useState<NewBookingPreset>({ date })
  const [cancelTarget, setCancelTarget] = useState<CalendarBooking | null>(null)
  const [forceTarget, setForceTarget] = useState<CalendarBooking | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  const openNew = useCallback(
    (staffId?: number, time?: string) => {
      setPreset({ staffId: staffId ?? rows.find((r) => r.staffId !== null)?.staffId ?? undefined, date, time })
      setDialogOpen(true)
    },
    [rows, date]
  )

  const run = useCallback(
    async (booking: CalendarBooking, action: PopoverAction, call: () => Promise<unknown>) => {
      setBusyId(booking.id)
      try {
        await call()
        toast.success(t(`timeline.${action}Done`))
        refresh()
      } catch (e) {
        if (action === "confirm" && needsForce(e)) setForceTarget(booking)
        else toast.error(getApiErrorMessage(e, t("timeline.actionFailed")))
      } finally {
        setBusyId(null)
      }
    },
    [refresh, t]
  )

  const onAction = useCallback(
    (action: PopoverAction, booking: CalendarBooking) => {
      if (action === "confirm") run(booking, "confirm", () => confirmBooking(booking.id))
      else if (action === "complete") run(booking, "complete", () => completeBooking(booking.id))
      else setCancelTarget(booking)
    },
    [run]
  )

  const openBooking = useCallback((b: CalendarBooking) => router.push(`/bookings/bookings/${b.id}`), [router])

  const viewOptions: SegmentedOption<CalendarView>[] = [
    { value: "specialists", label: t("staffDay") },
    { value: "month", label: t("month") },
    { value: "week", label: t("week") },
    { value: "day", label: t("day") },
    { value: "list", label: t("list") },
  ]
  const title = view === "specialists" ? t("staffDay") : rangeTitle(view, date, locale)
  const nowMinutes = date === today ? now.minutes : null

  return (
    <BookingsPage testId="bkg-calendar">
      <BookingsHeaderBridge sub={data ? t("bookingsInRange", { n: data.bookings.length }) : null} />

      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h1 className="text-[15px] font-semibold leading-5" data-testid="bkg-calendar-title">
            {title}
          </h1>
          <StatusLegend />
        </div>
        <Segmented value={view} onChange={setView} options={viewOptions} ariaLabel={t("viewsAria")} testId="bkg-calendar-views" />
      </div>

      <CalendarToolbar
        view={view}
        date={date}
        isToday={date === today}
        onDateChange={(d) => setPickedDate(d === today ? null : d)}
        onPrev={() => setPickedDate(shiftPeriod(view, date, -1))}
        onNext={() => setPickedDate(shiftPeriod(view, date, 1))}
        onToday={() => setPickedDate(null)}
        search={search}
        onSearchChange={setSearch}
        zoom={zoom}
        onZoomChange={setZoom}
        canCreate={isBookingAdmin}
        onNew={() => openNew()}
      />

      {!data && query.isPending ? (
        <BookingsLoading />
      ) : !data ? (
        <BookingsErrorState error={query.error} onRetry={refresh} />
      ) : view === "specialists" ? (
        <>
          <SpecialistsView
            date={date}
            rows={rows}
            zoom={zoom}
            query={search}
            nowMinutes={nowMinutes}
            isAdmin={isBookingAdmin}
            busyId={busyId}
            onSlotClick={(staffId, time) => openNew(staffId, time)}
            onAction={onAction}
          />
          <p className="text-xs text-muted-foreground" data-testid="bkg-calendar-hint">
            {isBookingAdmin ? t("timeline.hint") : t("timeline.readOnlyHint")}
          </p>
        </>
      ) : view === "month" ? (
        <MonthView
          date={date}
          today={today}
          bookingsByDay={byDay}
          onEventClick={openBooking}
          onMore={(d) => {
            setPickedDate(d === today ? null : d)
            setView("day")
          }}
        />
      ) : view === "list" ? (
        <ListView days={days} bookingsByDay={byDay} onEventClick={openBooking} />
      ) : (
        <TimeGridView days={view === "week" ? days : [date]} today={today} nowMinutes={now.minutes} bookingsByDay={byDay} onEventClick={openBooking} />
      )}

      {isBookingAdmin && <NewBookingDialog open={dialogOpen} onOpenChange={setDialogOpen} preset={preset} onCreated={refresh} />}

      <CancelDialog
        open={cancelTarget !== null}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        onSubmit={(reason) => {
          const target = cancelTarget
          setCancelTarget(null)
          if (target) run(target, "cancel", () => cancelBooking(target.id, reason))
        }}
        submitting={cancelTarget !== null && busyId === cancelTarget.id}
        t={tDetail}
      />
      <ForceDialog
        open={forceTarget !== null}
        onOpenChange={(open) => !open && setForceTarget(null)}
        onConfirm={() => {
          const target = forceTarget
          setForceTarget(null)
          if (target) run(target, "confirm", () => confirmBooking(target.id, true))
        }}
        submitting={forceTarget !== null && busyId === forceTarget.id}
        t={tDetail}
      />
    </BookingsPage>
  )
}
