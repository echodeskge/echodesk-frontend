"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import type { StaffException } from "@/api/generated/interfaces"
import { BookingsDialog, Field, Segmented, bkgField, formatTime } from "../../../_components/ui"

export type ExceptionKind = "unavailable" | "special_hours"

export interface ExceptionFormState {
  date: string
  kind: ExceptionKind
  startTime: string
  endTime: string
  reason: string
}

export const EMPTY_EXCEPTION: ExceptionFormState = { date: "", kind: "unavailable", startTime: "10:00", endTime: "14:00", reason: "" }

export function exceptionToForm(row: StaffException | null): ExceptionFormState {
  if (!row) return { ...EMPTY_EXCEPTION }
  return {
    date: row.date,
    kind: row.is_available ? "special_hours" : "unavailable",
    startTime: formatTime(row.start_time) || EMPTY_EXCEPTION.startTime,
    endTime: formatTime(row.end_time) || EMPTY_EXCEPTION.endTime,
    reason: row.reason ?? "",
  }
}

export function validateException(f: ExceptionFormState, t: (key: string) => string): Partial<Record<"date" | "endTime", string>> {
  const errors: Partial<Record<"date" | "endTime", string>> = {}
  if (!f.date) errors.date = t("errors.dateRequired")
  if (f.kind === "special_hours" && (!f.startTime || !f.endTime || f.endTime <= f.startTime)) errors.endTime = t("errors.endAfterStart")
  return errors
}

/** A day off (`is_available: false`, no times) or special hours (`is_available: true` + start / end); times are nulled on a switch back to a day off. */
export function exceptionToPayload(staffId: number, f: ExceptionFormState) {
  const special = f.kind === "special_hours"
  return {
    staff: staffId,
    date: f.date,
    is_available: special,
    start_time: special ? f.startTime : null,
    end_time: special ? f.endTime : null,
    reason: f.reason.trim(),
  }
}

/** Add / edit an exception: date, "Unavailable all day" or "Special hours" (+ times), reason. */
export function ExceptionDialog({
  open,
  onOpenChange,
  exception,
  onSubmit,
  submitting,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The exception being edited, or null for a new one. */
  exception: StaffException | null
  onSubmit: (form: ExceptionFormState) => void
  submitting: boolean
}) {
  const t = useTranslations("bookingsAvailability")
  const [form, setForm] = useState<ExceptionFormState>(EMPTY_EXCEPTION)
  const [errors, setErrors] = useState<Partial<Record<"date" | "endTime", string>>>({})

  useEffect(() => {
    if (open) {
      setForm(exceptionToForm(exception))
      setErrors({})
    }
  }, [open, exception])

  const set = <K extends keyof ExceptionFormState>(key: K, value: ExceptionFormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors({})
  }
  const submit = () => {
    const next = validateException(form, t)
    setErrors(next)
    if (Object.keys(next).length === 0) onSubmit(form)
  }

  return (
    <BookingsDialog
      open={open}
      onOpenChange={onOpenChange}
      title={exception ? t("editException") : t("addException")}
      description={t("exceptionHint")}
      onSubmit={submit}
      submitLabel={t("save")}
      cancelLabel={t("cancel")}
      submitting={submitting}
      testId="bkg-exception-dialog"
    >
      <Field label={t("date")} htmlFor="bkg-exception-date">
        <input id="bkg-exception-date" type="date" className={bkgField.input} value={form.date} onChange={(e) => set("date", e.target.value)} data-testid="bkg-exception-date" />
        {errors.date && <span role="alert" className="text-xs text-destructive">{errors.date}</span>}
      </Field>
      <Field label={t("exceptionKind")}>
        <Segmented
          size="md"
          stretch
          value={form.kind}
          onChange={(v) => set("kind", v)}
          options={[
            { value: "unavailable", label: t("unavailableAllDay") },
            { value: "special_hours", label: t("specialHours") },
          ]}
          ariaLabel={t("exceptionKind")}
          testId="bkg-exception-kind"
        />
      </Field>
      {form.kind === "special_hours" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("startTime")} htmlFor="bkg-exception-start">
            <input id="bkg-exception-start" type="time" className={bkgField.input} value={form.startTime} onChange={(e) => set("startTime", e.target.value)} data-testid="bkg-exception-start" />
          </Field>
          <Field label={t("endTime")} htmlFor="bkg-exception-end">
            <input id="bkg-exception-end" type="time" className={bkgField.input} value={form.endTime} onChange={(e) => set("endTime", e.target.value)} data-testid="bkg-exception-end" />
            {errors.endTime && <span role="alert" className="text-xs text-destructive">{errors.endTime}</span>}
          </Field>
        </div>
      )}
      <Field label={t("reason")} htmlFor="bkg-exception-reason" hint={t("reasonHint")}>
        <input id="bkg-exception-reason" className={bkgField.input} value={form.reason} onChange={(e) => set("reason", e.target.value)} placeholder={t("reasonPlaceholder")} data-testid="bkg-exception-reason" />
      </Field>
    </BookingsDialog>
  )
}
