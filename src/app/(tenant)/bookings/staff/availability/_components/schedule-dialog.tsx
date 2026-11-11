"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import type { StaffAvailability } from "@/api/generated/interfaces"
import { Switch } from "@/components/ui/switch"
import { BookingsDialog, Field, bkgField, formatTime } from "../../../_components/ui"

export const WEEKDAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const
export type WeekdayKey = (typeof WEEKDAY_KEYS)[number]

export interface ScheduleFormState {
  isAvailable: boolean
  startTime: string
  endTime: string
  breakStart: string
  breakEnd: string
}

export const DEFAULT_SCHEDULE: ScheduleFormState = { isAvailable: true, startTime: "09:00", endTime: "17:00", breakStart: "", breakEnd: "" }

export function scheduleToForm(row: StaffAvailability | undefined): ScheduleFormState {
  if (!row) return { ...DEFAULT_SCHEDULE }
  return {
    isAvailable: row.is_available ?? true,
    startTime: formatTime(row.start_time) || DEFAULT_SCHEDULE.startTime,
    endTime: formatTime(row.end_time) || DEFAULT_SCHEDULE.endTime,
    breakStart: formatTime(row.break_start),
    breakEnd: formatTime(row.break_end),
  }
}

export type ScheduleErrorKey = "endTime" | "breakStart" | "breakEnd"

/** `end` after `start`; a break needs both ends, in order, inside the working hours. */
export function validateSchedule(f: ScheduleFormState, t: (key: string) => string): Partial<Record<ScheduleErrorKey, string>> {
  const errors: Partial<Record<ScheduleErrorKey, string>> = {}
  if (!f.isAvailable) return errors
  if (!f.startTime || !f.endTime || f.endTime <= f.startTime) errors.endTime = t("errors.endAfterStart")
  const hasBreak = !!(f.breakStart || f.breakEnd)
  if (hasBreak) {
    if (!f.breakStart) errors.breakStart = t("errors.breakBothEnds")
    else if (!f.breakEnd) errors.breakEnd = t("errors.breakBothEnds")
    else if (f.breakEnd <= f.breakStart) errors.breakEnd = t("errors.breakOrder")
    else if (f.breakStart < f.startTime || f.breakEnd > f.endTime) errors.breakEnd = t("errors.breakInside")
  }
  return errors
}

/** The weekly row body: `break_*` are null (not "") when there is no break, so a removed break is cleared on PATCH. */
export function scheduleToPayload(staffId: number, dayOfWeek: number, f: ScheduleFormState) {
  return {
    staff: staffId,
    day_of_week: dayOfWeek as 0 | 1 | 2 | 3 | 4 | 5 | 6,
    is_available: f.isAvailable,
    start_time: f.startTime,
    end_time: f.endTime,
    break_start: f.isAvailable && f.breakStart ? f.breakStart : null,
    break_end: f.isAvailable && f.breakEnd ? f.breakEnd : null,
  }
}

/** Edit one weekday: available toggle, start / end, break start / end. */
export function ScheduleDialog({
  open,
  onOpenChange,
  day,
  row,
  onSubmit,
  submitting,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  day: WeekdayKey
  row: StaffAvailability | undefined
  onSubmit: (form: ScheduleFormState) => void
  submitting: boolean
}) {
  const t = useTranslations("bookingsAvailability")
  const [form, setForm] = useState<ScheduleFormState>(DEFAULT_SCHEDULE)
  const [errors, setErrors] = useState<Partial<Record<ScheduleErrorKey, string>>>({})

  useEffect(() => {
    if (open) {
      setForm(scheduleToForm(row))
      setErrors({})
    }
  }, [open, row])

  const set = (key: keyof ScheduleFormState, value: string | boolean) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors({})
  }
  const submit = () => {
    const next = validateSchedule(form, t)
    setErrors(next)
    if (Object.keys(next).length === 0) onSubmit(form)
  }
  const err = (key: ScheduleErrorKey) => errors[key] && <span role="alert" className="text-xs text-destructive">{errors[key]}</span>

  return (
    <BookingsDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("editScheduleFor", { day: t(day) })}
      description={t("editScheduleHint")}
      onSubmit={submit}
      submitLabel={t("save")}
      cancelLabel={t("cancel")}
      submitting={submitting}
      testId="bkg-schedule-dialog"
    >
      <div className="flex items-center justify-between gap-4 rounded-lg border px-3 py-2.5">
        <label htmlFor="bkg-schedule-available" className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[13px] font-medium">{t("workingDay")}</span>
          <span className="text-xs text-muted-foreground">{form.isAvailable ? t("workingDayOn") : t("workingDayOff")}</span>
        </label>
        <Switch id="bkg-schedule-available" checked={form.isAvailable} onCheckedChange={(c) => set("isAvailable", c)} data-testid="bkg-schedule-available" />
      </div>
      {form.isAvailable && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("startTime")} htmlFor="bkg-schedule-start">
              <input id="bkg-schedule-start" type="time" className={bkgField.input} value={form.startTime} onChange={(e) => set("startTime", e.target.value)} data-testid="bkg-schedule-start" />
            </Field>
            <Field label={t("endTime")} htmlFor="bkg-schedule-end">
              <input id="bkg-schedule-end" type="time" className={bkgField.input} value={form.endTime} onChange={(e) => set("endTime", e.target.value)} data-testid="bkg-schedule-end" />
              {err("endTime")}
            </Field>
          </div>
          <div className="grid gap-3 border-t pt-4 sm:grid-cols-2">
            <Field label={t("breakStart")} htmlFor="bkg-schedule-break-start" hint={t("breakHint")}>
              <input id="bkg-schedule-break-start" type="time" className={bkgField.input} value={form.breakStart} onChange={(e) => set("breakStart", e.target.value)} data-testid="bkg-schedule-break-start" />
              {err("breakStart")}
            </Field>
            <Field label={t("breakEnd")} htmlFor="bkg-schedule-break-end">
              <input id="bkg-schedule-break-end" type="time" className={bkgField.input} value={form.breakEnd} onChange={(e) => set("breakEnd", e.target.value)} data-testid="bkg-schedule-break-end" />
              {err("breakEnd")}
            </Field>
          </div>
        </>
      )}
    </BookingsDialog>
  )
}
