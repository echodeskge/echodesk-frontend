"use client"

import { useEffect, useState } from "react"
import { useLocale } from "next-intl"
import { Loader2 } from "lucide-react"
import type { AdminSlot, BookingDetail, BookingStaff, MethodEnum } from "@/api/generated/interfaces"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import { BookingsDialog, Field, bkgButton, bkgField, displayName, formatMoney, formatTime, parseMoney, staffName } from "../../../_components/ui"
import { fetchActiveStaff, fetchSlots } from "../../../_lib/bookings-api"
import { remainingAmount } from "./payment-card"

type Translate = (key: string, values?: Record<string, string | number>) => string

/** "Proceed without payment?" for a pending online-card booking that is confirmed / checked in with `force`. */
export function ForceDialog({ open, onOpenChange, onConfirm, submitting, t }: { open: boolean; onOpenChange: (o: boolean) => void; onConfirm: () => void; submitting: boolean; t: Translate }) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid="bkg-force-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>{t("force.title")}</AlertDialogTitle>
          <AlertDialogDescription>{t("force.description")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>{t("force.cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={submitting} data-testid="bkg-force-confirm">
            {t("force.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/** Cancel booking: reason (optional), destructive submit. */
export function CancelDialog({ open, onOpenChange, onSubmit, submitting, t }: { open: boolean; onOpenChange: (o: boolean) => void; onSubmit: (reason: string) => void; submitting: boolean; t: Translate }) {
  const [reason, setReason] = useState("")
  useEffect(() => {
    if (open) setReason("")
  }, [open])
  return (
    <BookingsDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("cancelDialog.title")}
      description={t("cancelDialog.description")}
      onSubmit={() => onSubmit(reason.trim())}
      submitLabel={t("cancelDialog.confirm")}
      submitTone="danger"
      cancelLabel={t("cancelDialog.keep")}
      submitting={submitting}
      testId="bkg-cancel-dialog"
    >
      <Field label={t("cancelDialog.reason")} htmlFor="bkg-cancel-reason">
        <textarea id="bkg-cancel-reason" className={bkgField.textarea} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("cancelDialog.reasonPlaceholder")} rows={3} />
      </Field>
    </BookingsDialog>
  )
}

/** Reschedule: date input, then the free start times for the service (and the booking's staff member) from `slots/`. */
export function RescheduleDialog({
  open,
  onOpenChange,
  booking,
  onSubmit,
  submitting,
  t,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  booking: BookingDetail
  onSubmit: (date: string, startTime: string) => void
  submitting: boolean
  t: Translate
}) {
  const locale = useLocale()
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [slots, setSlots] = useState<AdminSlot[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (open) {
      setDate(booking.date)
      setTime("")
    }
  }, [open, booking.date])

  useEffect(() => {
    if (!open || !date) {
      setSlots(null)
      return
    }
    let active = true
    setLoading(true)
    setError(false)
    fetchSlots({ service: booking.service.id, date, staff: booking.staff?.id ?? undefined, excludeBooking: booking.id })
      .then((res) => {
        if (!active) return
        setSlots(res.slots ?? [])
      })
      .catch(() => active && setError(true))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [open, date, booking.id, booking.service.id, booking.staff?.id])

  const times = Array.from(new Set((slots ?? []).map((s) => formatTime(s.start_time))))

  return (
    <BookingsDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("rescheduleDialog.title")}
      description={t("rescheduleDialog.description", { service: displayName(booking.service, locale) })}
      onSubmit={() => onSubmit(date, time)}
      submitLabel={t("rescheduleDialog.submit")}
      cancelLabel={t("rescheduleDialog.cancel")}
      submitting={submitting}
      submitDisabled={!date || !time}
      testId="bkg-reschedule-dialog"
    >
      <Field label={t("rescheduleDialog.date")} htmlFor="bkg-reschedule-date">
        <input
          id="bkg-reschedule-date"
          type="date"
          className={bkgField.input}
          value={date}
          onChange={(e) => {
            setDate(e.target.value)
            setTime("")
          }}
        />
      </Field>
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium">{t("rescheduleDialog.time")}</span>
        {!date ? (
          <span className="text-xs text-muted-foreground">{t("rescheduleDialog.pickDate")}</span>
        ) : loading ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground" data-testid="bkg-slots-loading">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            {t("rescheduleDialog.loadingSlots")}
          </span>
        ) : error || times.length === 0 ? (
          <span className="text-xs text-muted-foreground" data-testid="bkg-slots-empty">
            {t("rescheduleDialog.noSlots")}
          </span>
        ) : (
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={t("rescheduleDialog.time")} data-testid="bkg-slots">
            {times.map((tm) => (
              <button
                key={tm}
                type="button"
                role="radio"
                aria-checked={time === tm}
                onClick={() => setTime(tm)}
                className={cn(bkgButton.outlineSm, "tabular-nums", time === tm && "border-primary bg-primary text-primary-foreground hover:bg-primary")}
              >
                {tm}
              </button>
            ))}
          </div>
        )}
      </div>
    </BookingsDialog>
  )
}

/** Assign staff: the active staff members (loaded on open) in a select. */
export function AssignStaffDialog({ open, onOpenChange, booking, onSubmit, submitting, t }: { open: boolean; onOpenChange: (o: boolean) => void; booking: BookingDetail; onSubmit: (staffId: number) => void; submitting: boolean; t: Translate }) {
  const [staff, setStaff] = useState<BookingStaff[] | null>(null)
  const [selected, setSelected] = useState("")

  useEffect(() => {
    if (!open) return
    let active = true
    setStaff(null)
    setSelected(booking.staff?.id ? String(booking.staff.id) : "")
    fetchActiveStaff()
      .then((list) => active && setStaff(list))
      .catch(() => active && setStaff([]))
    return () => {
      active = false
    }
  }, [open, booking.staff?.id])

  return (
    <BookingsDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("assignDialog.title")}
      onSubmit={() => selected && onSubmit(Number(selected))}
      submitLabel={t("assignDialog.submit")}
      cancelLabel={t("assignDialog.cancel")}
      submitting={submitting}
      submitDisabled={!selected || !staff}
      testId="bkg-assign-dialog"
    >
      <Field label={t("assignDialog.staff")} htmlFor="bkg-assign-staff">
        {staff === null ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          </span>
        ) : staff.length === 0 ? (
          <span className="text-xs text-muted-foreground">{t("assignDialog.noStaff")}</span>
        ) : (
          <select id="bkg-assign-staff" className={bkgField.select} value={selected} onChange={(e) => setSelected(e.target.value)}>
            <option value="">{t("assignDialog.select")}</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {staffName(s) || s.user?.email}
              </option>
            ))}
          </select>
        )}
      </Field>
    </BookingsDialog>
  )
}

const METHODS: MethodEnum[] = ["cash", "card", "transfer", "other"]

/** Record a payment taken at the venue: amount (defaults to what is owed), method, note. */
export function RecordPaymentDialog({ open, onOpenChange, booking, onSubmit, submitting, t }: { open: boolean; onOpenChange: (o: boolean) => void; booking: BookingDetail; onSubmit: (p: { amount: string; method: MethodEnum; note: string }) => void; submitting: boolean; t: Translate }) {
  const remaining = remainingAmount(booking)
  const [amount, setAmount] = useState("")
  const [method, setMethod] = useState<MethodEnum>("cash")
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setAmount(remaining > 0 ? remaining.toFixed(2) : "")
      setMethod("cash")
      setNote("")
      setError(null)
    }
  }, [open, remaining])

  const submit = () => {
    const n = parseMoney(amount)
    if (n === null || n <= 0 || n > remaining + 0.005) {
      setError(t("paymentDialog.amountInvalid", { remaining: formatMoney(remaining) }))
      return
    }
    onSubmit({ amount: n.toFixed(2), method, note: note.trim() })
  }

  return (
    <BookingsDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("paymentDialog.title")}
      description={t("paymentDialog.description", { remaining: formatMoney(remaining) })}
      onSubmit={submit}
      submitLabel={t("paymentDialog.submit")}
      cancelLabel={t("paymentDialog.cancel")}
      submitting={submitting}
      testId="bkg-payment-dialog"
    >
      <Field label={t("paymentDialog.amount")} htmlFor="bkg-payment-amount">
        <input id="bkg-payment-amount" type="number" min="0.01" step="0.01" inputMode="decimal" className={bkgField.input} value={amount} onChange={(e) => setAmount(e.target.value)} />
        {error && <span className="text-xs text-destructive">{error}</span>}
      </Field>
      <Field label={t("paymentDialog.method")} htmlFor="bkg-payment-method">
        <select id="bkg-payment-method" className={bkgField.select} value={method} onChange={(e) => setMethod(e.target.value as MethodEnum)}>
          {METHODS.map((m) => (
            <option key={m} value={m}>
              {t(`payment.methods.${m}`)}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("paymentDialog.note")} htmlFor="bkg-payment-note">
        <input id="bkg-payment-note" className={bkgField.input} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("paymentDialog.notePlaceholder")} />
      </Field>
    </BookingsDialog>
  )
}
