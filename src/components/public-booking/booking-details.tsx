"use client"

import { useLocale, useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { CustomerBooking, formatMoney, shortTime } from "@/lib/booking-api"
import { formatLongDate } from "./salon-context"

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-800 border-amber-200",
  confirmed: "bg-green-50 text-green-800 border-green-200",
  in_progress: "bg-blue-50 text-blue-800 border-blue-200",
  completed: "bg-gray-100 text-gray-800 border-gray-200",
  cancelled: "bg-red-50 text-red-800 border-red-200",
}

export function BookingStatusBadge({ status }: { status: string }) {
  const t = useTranslations("publicBooking")
  return (
    <Badge variant="outline" className={STATUS_STYLES[status] || ""}>
      {t(`status.${status}`)}
    </Badge>
  )
}

/** What, when, with whom and how much — shared by the confirmation page and the account list. */
export function BookingDetails({ booking }: { booking: CustomerBooking }) {
  const t = useTranslations("publicBooking")
  const locale = useLocale()
  const paid = Number(booking.paid_amount) || 0
  const remaining = Number(booking.remaining_amount) || 0

  const rows: [string, string][] = [
    [t("summary.service"), booking.service.name_display],
    [
      t("summary.when"),
      `${formatLongDate(booking.date, locale)}, ${shortTime(booking.start_time)}–${shortTime(booking.end_time)}`,
    ],
  ]
  if (booking.staff) rows.push([t("summary.staff"), booking.staff.user.full_name || booking.staff.user.first_name])
  rows.push([t("summary.price"), Number(booking.total_amount) ? formatMoney(booking.total_amount) : t("services.free")])
  if (paid > 0) {
    rows.push([t("summary.paid"), formatMoney(paid)])
    if (remaining > 0) rows.push([t("summary.payAtVenue"), formatMoney(remaining)])
  }
  rows.push([t("summary.number"), booking.booking_number])

  return (
    <dl className="space-y-1.5 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-4">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="text-right font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  )
}
