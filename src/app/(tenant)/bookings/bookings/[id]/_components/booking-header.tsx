"use client"

import Link from "next/link"
import { useLocale } from "next-intl"
import { CalendarClock, CheckCircle2, ChevronLeft, LogIn, UserPlus, UserX, XCircle } from "lucide-react"
import type { BookingDetail } from "@/api/generated/interfaces"
import { BookingStatusPill, bkgButton, displayName } from "../../../_components/ui"
import { bookingActions } from "../../../_lib/booking-status"

type Translate = (key: string, values?: Record<string, string | number>) => string

export type BookingAction = "confirm" | "checkIn" | "complete" | "noShow" | "reschedule" | "assignStaff" | "cancel"

/**
 * Design detail header: "‹ Bookings / #BK-1054" back line, the number with
 * the status pill and the service under it, actions on the right by status
 * (Confirm primary, Check in, Complete, No-show, Reschedule, Assign staff,
 * Cancel destructive).
 */
export function BookingHeader({
  booking,
  busy,
  onAction,
  t,
}: {
  booking: BookingDetail
  /** An action is running: every button is disabled meanwhile. */
  busy: boolean
  onAction: (action: BookingAction) => void
  t: Translate
}) {
  const locale = useLocale()
  const a = bookingActions(booking.status)
  const disabled = busy
  const btn = (action: BookingAction, cls: string, Icon: typeof CheckCircle2, label: string) => (
    <button type="button" className={cls} disabled={disabled} onClick={() => onAction(action)} data-testid={`bkg-action-${action}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {label}
    </button>
  )

  return (
    <div className="flex min-w-0 flex-col gap-3" data-testid="bkg-booking-header">
      <Link href="/bookings/bookings" className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground" data-testid="bkg-back">
        <ChevronLeft className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden />
        {t("backToBookings")}
        <span aria-hidden className="mx-1">
          /
        </span>
        <span className="font-mono text-foreground">#{booking.booking_number}</span>
      </Link>
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h1 className="font-mono text-xl font-semibold tracking-[-.02em]">#{booking.booking_number}</h1>
            <BookingStatusPill status={booking.status} />
          </div>
          <span className="text-[13px] text-muted-foreground">{displayName(booking.service, locale)}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2" data-testid="bkg-booking-actions">
          {a.confirm && btn("confirm", bkgButton.primary, CheckCircle2, t("actions.confirm"))}
          {a.checkIn && btn("checkIn", bkgButton.outline, LogIn, t("actions.checkIn"))}
          {a.complete && btn("complete", a.confirm ? bkgButton.outline : bkgButton.primary, CheckCircle2, t("actions.complete"))}
          {a.reschedule && btn("reschedule", bkgButton.outline, CalendarClock, t("actions.reschedule"))}
          {a.assignStaff && btn("assignStaff", bkgButton.outline, UserPlus, t("actions.assignStaff"))}
          {a.noShow && btn("noShow", bkgButton.dangerOutline, UserX, t("actions.noShow"))}
          {a.cancel && btn("cancel", bkgButton.danger, XCircle, t("actions.cancel"))}
        </div>
      </div>
    </div>
  )
}
