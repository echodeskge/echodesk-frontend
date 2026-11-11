"use client"

import Link from "next/link"
import type { BookingRow } from "@/api/generated/interfaces"
import {
  BookingStatusPill,
  PaymentStatusPill,
  displayName,
  formatBookingDate,
  formatMoney,
  formatTimeRange,
  rdButton,
  type BookingsColumn,
} from "../../_components/ui"

type Translate = (key: string, values?: Record<string, string | number>) => string

/**
 * Bookings list columns (design): Booking # (mono) | Client | Service | Date &
 * time (two lines) | Staff ("Unassigned" muted) | Amount | Payment pill |
 * Status pill | View. Below 768px: number + status on line 1, client · service
 * · date · amount on line 2, View on line 3.
 */
export function getBookingColumns({ t, tUi, locale }: { t: Translate; tUi: Translate; locale: string }): BookingsColumn<BookingRow>[] {
  return [
    {
      id: "number",
      header: t("bookingNumber"),
      width: "120px",
      mobile: "title",
      numeric: true,
      cell: (b) => <span className="truncate font-medium text-foreground">{b.booking_number}</span>,
    },
    {
      id: "client",
      header: t("client"),
      width: "minmax(0,1.3fr)",
      mobile: "meta",
      cell: (b) => <span className="truncate font-medium">{b.client?.full_name || "—"}</span>,
    },
    {
      id: "service",
      header: t("service"),
      width: "minmax(0,1.2fr)",
      mobile: "meta",
      cell: (b) => <span className="truncate">{displayName(b.service, locale)}</span>,
    },
    {
      id: "datetime",
      header: t("dateTime"),
      width: "150px",
      mobile: "meta",
      cell: (b) => (
        <span className="flex min-w-0 flex-col leading-4">
          <span className="truncate">{formatBookingDate(b.date, locale)}</span>
          <span className="truncate text-[11px] text-muted-foreground tabular-nums @3xl:text-xs">{formatTimeRange(b.start_time, b.end_time)}</span>
        </span>
      ),
    },
    {
      id: "staff",
      header: t("staff"),
      width: "minmax(0,1fr)",
      mobile: "hidden",
      cell: (b) => (b.staff ? <span className="truncate">{b.staff.full_name}</span> : <span className="truncate text-muted-foreground">{tUi("unassigned")}</span>),
    },
    {
      id: "amount",
      header: t("amount"),
      width: "90px",
      mobile: "meta",
      numeric: true,
      cell: (b) => <span className="whitespace-nowrap">{formatMoney(b.total_amount)}</span>,
    },
    {
      id: "payment",
      header: t("payment"),
      // The Georgian "fully paid" pill is 113px of text at 11px.
      width: "140px",
      mobile: "hidden",
      cell: (b) => <PaymentStatusPill status={b.payment_status} />,
    },
    {
      id: "status",
      header: t("status"),
      // Icon + the Georgian "confirmed" (118px of text at 11px) did not fit in 120px.
      width: "150px",
      mobile: "end",
      cell: (b) => <BookingStatusPill status={b.status} />,
    },
    {
      id: "actions",
      header: t("actions"),
      width: "64px",
      align: "end",
      mobile: "actions",
      cell: (b) => (
        <Link
          href={`/bookings/bookings/${b.id}`}
          className={rdButton.outlineSm}
          aria-label={t("openBooking", { number: b.booking_number })}
          data-testid="bkg-row-view"
        >
          {t("view")}
        </Link>
      ),
    },
  ]
}
