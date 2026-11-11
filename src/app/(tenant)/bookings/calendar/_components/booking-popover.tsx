"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { BookingStatusPill, bkgButton, formatTimeRange } from "../../_components/ui"
import { canCancel, canComplete, canConfirm } from "../../_lib/booking-status"
import type { CalendarBooking } from "../../_lib/bookings-api"
import { lari } from "../_lib/calendar-range"

export type PopoverAction = "confirm" | "complete" | "cancel"

/**
 * What a booking block opens (design calendar popover): name, phone in
 * mono, status pill, Service / Time / Price / Notes rows and the actions:
 * Confirm (primary) or Mark done, Cancel booking (admins), and Open.
 */
export function BookingPopoverBody({
  booking,
  isAdmin,
  busy,
  onAction,
}: {
  booking: CalendarBooking
  isAdmin: boolean
  busy: boolean
  onAction: (action: PopoverAction, booking: CalendarBooking) => void
}) {
  const t = useTranslations("bookingsCalendar")
  const notes = booking.client_notes || booking.staff_notes
  const rows: { key: string; label: string; value: string; mono?: boolean }[] = [
    { key: "service", label: t("timeline.service"), value: booking.service.name_display },
    { key: "time", label: t("timeline.time"), value: formatTimeRange(booking.start_time, booking.end_time), mono: true },
    { key: "price", label: t("timeline.price"), value: lari(booking.total_amount) },
  ]
  if (notes) rows.push({ key: "notes", label: t("timeline.notes"), value: notes })
  const primary = canConfirm(booking.status) ? "confirm" : canComplete(booking.status) ? "complete" : null
  return (
    <div className="flex flex-col gap-3 text-[13px]" data-testid="bkg-booking-popover">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">{booking.client.full_name}</p>
          {booking.client.phone_number && (
            <a href={`tel:${booking.client.phone_number}`} className="font-mono text-xs tabular-nums text-muted-foreground hover:underline">
              {booking.client.phone_number}
            </a>
          )}
        </div>
        <BookingStatusPill status={booking.status} />
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        {rows.map((r) => (
          <div key={r.key} className="contents">
            <dt className="text-xs text-muted-foreground">{r.label}</dt>
            <dd className={cn("min-w-0 [overflow-wrap:anywhere]", r.mono && "tabular-nums")}>{r.value}</dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-wrap items-center gap-2">
        {isAdmin && primary && (
          <button type="button" className={bkgButton.primarySm} disabled={busy} onClick={() => onAction(primary, booking)} data-testid={`bkg-popover-${primary}`}>
            {busy && <Loader2 className="h-3 w-3 animate-spin" aria-hidden />}
            {primary === "confirm" ? t("timeline.confirm") : t("timeline.complete")}
          </button>
        )}
        {isAdmin && canCancel(booking.status) && (
          <button type="button" className={bkgButton.dangerSm} disabled={busy} onClick={() => onAction("cancel", booking)} data-testid="bkg-popover-cancel">
            {t("timeline.cancel")}
          </button>
        )}
        <Link href={`/bookings/bookings/${booking.id}`} className={cn(bkgButton.outlineSm, "ms-auto")} data-testid="bkg-popover-open">
          {t("timeline.open")}
        </Link>
      </div>
    </div>
  )
}
