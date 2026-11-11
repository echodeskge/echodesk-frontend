"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { toast } from "sonner"
import { CalendarOff, ChevronLeft, Clock, Pencil, Plus, Trash2, UserCheck } from "lucide-react"
import type { BookingStaff, StaffAvailability, StaffException } from "@/api/generated/interfaces"
import { useMyAccess } from "@/hooks/useMyAccess"
import { cn, getApiErrorMessage } from "@/lib/utils"
import {
  createAvailability,
  createException,
  deleteException,
  fetchAllStaff,
  fetchStaffAvailability,
  fetchStaffExceptions,
  updateAvailability,
  updateException,
} from "../../_lib/bookings-api"
import {
  BookingsCard,
  BookingsEmptyState,
  BookingsErrorState,
  BookingsHeaderBridge,
  BookingsLoading,
  BookingsPage,
  TonePill,
  bkgField,
  formatBookingDate,
  formatTimeRange,
  rdButton,
  staffName,
} from "../../_components/ui"
import { ActivePill, DeleteDialog } from "../../_components/catalog"
import { ScheduleDialog, WEEKDAY_KEYS, scheduleToPayload, type ScheduleFormState } from "./_components/schedule-dialog"
import { ExceptionDialog, exceptionToPayload, type ExceptionFormState } from "./_components/exception-dialog"

/** "09:00 – 17:00 (Break: 13:00 – 14:00)" for a working day; the day-off / no-schedule texts otherwise. */
export function scheduleText(row: StaffAvailability | undefined, t: (key: string, values?: Record<string, string>) => string): string {
  if (!row) return t("noScheduleSet")
  if (!row.is_available) return t("dayOff")
  const hours = formatTimeRange(row.start_time, row.end_time)
  if (row.break_start && row.break_end) return `${hours} (${t("breakLabel", { range: formatTimeRange(row.break_start, row.break_end) })})`
  return hours
}

export default function StaffAvailabilityPage() {
  const t = useTranslations("bookingsAvailability")
  const locale = useLocale()
  const { isBookingAdmin } = useMyAccess()

  const [staff, setStaff] = useState<BookingStaff[] | undefined>(undefined)
  const [staffError, setStaffError] = useState<unknown>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const [availability, setAvailability] = useState<StaffAvailability[] | undefined>(undefined)
  const [exceptions, setExceptions] = useState<StaffException[] | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<unknown>(null)

  const [editDay, setEditDay] = useState<number | null>(null)
  const [scheduleBusy, setScheduleBusy] = useState(false)
  const [exceptionOpen, setExceptionOpen] = useState(false)
  const [editingException, setEditingException] = useState<StaffException | null>(null)
  const [exceptionBusy, setExceptionBusy] = useState(false)
  const [deletingException, setDeletingException] = useState<StaffException | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const loadStaff = useCallback(async () => {
    setStaffError(null)
    try {
      const list = await fetchAllStaff()
      setStaff(list)
      setSelectedId((cur) => (cur !== null && list.some((s) => s.id === cur) ? cur : (list[0]?.id ?? null)))
    } catch (e) {
      setStaffError(e)
    }
  }, [])

  useEffect(() => {
    loadStaff()
  }, [loadStaff])

  const loadSchedule = useCallback(async () => {
    if (selectedId === null) return
    setLoading(true)
    setError(null)
    try {
      const [rows, exc] = await Promise.all([fetchStaffAvailability(selectedId), fetchStaffExceptions(selectedId)])
      setAvailability(rows)
      setExceptions(exc)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [selectedId])

  useEffect(() => {
    setAvailability(undefined)
    setExceptions(undefined)
    loadSchedule()
  }, [loadSchedule])

  const rowForDay = useCallback((day: number) => availability?.find((a) => Number(a.day_of_week) === day), [availability])

  const saveSchedule = async (form: ScheduleFormState) => {
    if (selectedId === null || editDay === null) return
    const existing = rowForDay(editDay)
    const payload = scheduleToPayload(selectedId, editDay, form)
    setScheduleBusy(true)
    try {
      // `break_*: null` clears a removed break; the generated type only knows strings.
      const body = payload as unknown as Parameters<typeof createAvailability>[0]
      if (existing) await updateAvailability(existing.id, body)
      else await createAvailability(body)
      toast.success(t("scheduleSaved"))
      setEditDay(null)
      await loadSchedule()
    } catch (e) {
      // Non-admins get a 403 here: the message is shown, nothing is swallowed.
      toast.error(getApiErrorMessage(e, t("saveFailed")))
    } finally {
      setScheduleBusy(false)
    }
  }

  const saveException = async (form: ExceptionFormState) => {
    if (selectedId === null) return
    const body = exceptionToPayload(selectedId, form) as unknown as Parameters<typeof createException>[0]
    setExceptionBusy(true)
    try {
      if (editingException) await updateException(editingException.id, body)
      else await createException(body)
      toast.success(editingException ? t("exceptionUpdated") : t("exceptionAdded"))
      setExceptionOpen(false)
      await loadSchedule()
    } catch (e) {
      toast.error(getApiErrorMessage(e, t("saveFailed")))
    } finally {
      setExceptionBusy(false)
    }
  }

  const confirmDeleteException = async () => {
    if (!deletingException) return
    setDeleteBusy(true)
    try {
      await deleteException(deletingException.id)
      toast.success(t("exceptionDeleted"))
      setDeletingException(null)
      await loadSchedule()
    } catch (e) {
      toast.error(getApiErrorMessage(e, t("deleteFailed")))
    } finally {
      setDeleteBusy(false)
    }
  }

  const openException = (exception: StaffException | null) => {
    setEditingException(exception)
    setExceptionOpen(true)
  }

  const selectedStaff = useMemo(() => staff?.find((s) => s.id === selectedId) ?? null, [staff, selectedId])
  const sortedExceptions = useMemo(() => [...(exceptions ?? [])].sort((a, b) => a.date.localeCompare(b.date)), [exceptions])

  const scheduleBody = error ? (
    <BookingsErrorState error={error} onRetry={loadSchedule} testId="bkg-availability-error" />
  ) : loading || availability === undefined ? (
    <BookingsLoading className="py-10" />
  ) : (
    <ul className="flex flex-col" data-testid="bkg-weekly-schedule">
      {WEEKDAY_KEYS.map((key, day) => {
        const row = rowForDay(day)
        const working = !!row?.is_available
        const content = (
          <>
            <span className="w-24 shrink-0 text-[13px] font-medium">{t(key)}</span>
            <span className={cn("min-w-0 flex-1 truncate text-[13px] tabular-nums", !working && "text-muted-foreground")} data-testid="bkg-day-hours">
              {scheduleText(row, t)}
            </span>
            <ActivePill active={working} label={working ? t("working") : t("dayOff")} testId="bkg-day-status" />
          </>
        )
        return (
          <li key={key} className="border-b last:border-b-0" data-testid="bkg-day-row" data-day={day}>
            {isBookingAdmin ? (
              <button
                type="button"
                onClick={() => setEditDay(day)}
                className="flex min-h-11 w-full items-center gap-3 px-4 py-2 text-start hover:bg-muted/40 focus-visible:outline-none focus-visible:bg-muted/40"
                aria-label={t("editScheduleFor", { day: t(key) })}
                data-testid="bkg-day-edit"
              >
                {content}
              </button>
            ) : (
              <div className="flex min-h-11 items-center gap-3 px-4 py-2">{content}</div>
            )}
          </li>
        )
      })}
    </ul>
  )

  const exceptionsBody = error ? null : loading || exceptions === undefined ? (
    <BookingsLoading className="py-10" />
  ) : sortedExceptions.length === 0 ? (
    <BookingsEmptyState icon={CalendarOff} title={t("noExceptions")} description={t("noExceptionsHint")} className="py-8" testId="bkg-exceptions-empty" />
  ) : (
    <ul className="flex flex-col" data-testid="bkg-exceptions">
      {sortedExceptions.map((exc) => (
        <li key={exc.id} className="flex min-h-11 items-center gap-3 border-b px-4 py-2 last:border-b-0" data-testid="bkg-exception-row">
          <span className="w-28 shrink-0 text-[13px] font-medium tabular-nums" data-testid="bkg-exception-row-date">
            {formatBookingDate(exc.date, locale)}
          </span>
          {exc.is_available ? (
            <TonePill tone="info" testId="bkg-exception-kind">
              {t("specialHours")}
            </TonePill>
          ) : (
            <TonePill tone="danger" testId="bkg-exception-kind">
              {t("unavailable")}
            </TonePill>
          )}
          <span className="min-w-0 flex-1 truncate text-[13px] text-muted-foreground">
            {exc.is_available && <span className="me-2 tabular-nums text-foreground">{formatTimeRange(exc.start_time, exc.end_time)}</span>}
            {exc.reason || (exc.is_available ? "" : t("noReason"))}
          </span>
          {isBookingAdmin && (
            <span className="flex shrink-0 items-center gap-0.5">
              <button type="button" className={rdButton.ghostIconSm} onClick={() => openException(exc)} aria-label={t("editExceptionAria", { date: formatBookingDate(exc.date, locale) })} title={t("editException")} data-testid="bkg-exception-edit">
                <Pencil className="h-3.5 w-3.5" aria-hidden />
              </button>
              <button type="button" className={cn(rdButton.ghostIconSm, "hover:text-destructive")} onClick={() => setDeletingException(exc)} aria-label={t("deleteExceptionAria", { date: formatBookingDate(exc.date, locale) })} title={t("delete")} data-testid="bkg-exception-delete">
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </button>
            </span>
          )}
        </li>
      ))}
    </ul>
  )

  return (
    <BookingsPage width="wide" testId="bkg-availability">
      <BookingsHeaderBridge breadcrumb={t("title")} sub={selectedStaff ? staffName(selectedStaff) : null} />
      <Link href="/bookings/staff" className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground" data-testid="bkg-back">
        <ChevronLeft className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden />
        {t("backToStaff")}
        <span aria-hidden className="mx-1">
          /
        </span>
        <span className="text-foreground">{t("title")}</span>
      </Link>

      {staffError ? (
        <BookingsErrorState error={staffError} onRetry={loadStaff} testId="bkg-availability-staff-error" />
      ) : staff === undefined ? (
        <BookingsLoading />
      ) : staff.length === 0 ? (
        <BookingsEmptyState
          icon={UserCheck}
          title={t("noStaff")}
          description={t("noStaffHint")}
          action={
            <Link href="/bookings/staff" className={rdButton.outlineSm}>
              {t("backToStaff")}
            </Link>
          }
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="bkg-availability-staff" className="sr-only">
              {t("selectStaffMember")}
            </label>
            <select
              id="bkg-availability-staff"
              className={cn(bkgField.select, "w-full sm:w-72")}
              value={selectedId ?? ""}
              onChange={(e) => setSelectedId(Number(e.target.value))}
              data-testid="bkg-availability-staff"
            >
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {staffName(s) || s.user?.email}
                  {s.is_active_for_bookings === false ? ` (${t("inactive")})` : ""}
                </option>
              ))}
            </select>
            {!isBookingAdmin && <span className="text-xs text-muted-foreground">{t("readOnlyHint")}</span>}
          </div>

          <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
            <BookingsCard title={t("weeklySchedule")} icon={<Clock />} flush testId="bkg-card-schedule">
              {scheduleBody}
            </BookingsCard>
            <BookingsCard
              title={t("exceptions")}
              icon={<CalendarOff />}
              flush
              testId="bkg-card-exceptions"
              actions={
                isBookingAdmin ? (
                  <button type="button" className={rdButton.primarySm} onClick={() => openException(null)} disabled={loading} data-testid="bkg-exception-add">
                    <Plus className="h-3.5 w-3.5" aria-hidden />
                    {t("addException")}
                  </button>
                ) : undefined
              }
            >
              {exceptionsBody}
            </BookingsCard>
          </div>
        </>
      )}

      {isBookingAdmin && selectedId !== null && (
        <>
          <ScheduleDialog
            open={editDay !== null}
            onOpenChange={(o) => !o && setEditDay(null)}
            day={WEEKDAY_KEYS[editDay ?? 0]}
            row={editDay !== null ? rowForDay(editDay) : undefined}
            onSubmit={saveSchedule}
            submitting={scheduleBusy}
          />
          <ExceptionDialog open={exceptionOpen} onOpenChange={setExceptionOpen} exception={editingException} onSubmit={saveException} submitting={exceptionBusy} />
          <DeleteDialog
            open={!!deletingException}
            onOpenChange={(o) => !o && setDeletingException(null)}
            title={t("deleteDialog.title")}
            description={t("deleteDialog.description", { date: deletingException ? formatBookingDate(deletingException.date, locale) : "" })}
            cancelLabel={t("cancel")}
            confirmLabel={t("delete")}
            onConfirm={confirmDeleteException}
            busy={deleteBusy}
            testId="bkg-exception-delete-dialog"
          />
        </>
      )}
    </BookingsPage>
  )
}
