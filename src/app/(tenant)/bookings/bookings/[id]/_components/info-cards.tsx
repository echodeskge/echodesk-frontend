"use client"

import Link from "next/link"
import { useLocale } from "next-intl"
import { Calendar, Star, User, XCircle } from "lucide-react"
import type { BookingCancelResponse, BookingDetail } from "@/api/generated/interfaces"
import { cn } from "@/lib/utils"
import {
  BookingStatusPill,
  BookingsCard,
  InfoGrid,
  displayName,
  formatBookingDate,
  formatBookingDateTime,
  formatMoney,
  formatTimeRange,
  humanize,
  staffName,
} from "../../../_components/ui"

type Translate = ((key: string, values?: Record<string, string | number>) => string) & { has: (key: string) => boolean }

/** Booking information: Date & time, Service, Staff, Status. */
export function BookingInfoCard({ booking, t }: { booking: BookingDetail; t: Translate }) {
  const locale = useLocale()
  const staff = staffName(booking.staff)
  return (
    <BookingsCard title={t("cards.bookingInfo")} icon={<Calendar />} testId="bkg-card-info">
      <InfoGrid
        items={[
          {
            key: "when",
            label: t("fields.dateTime"),
            value: (
              <span className="tabular-nums">
                {formatBookingDate(booking.date, locale)}, {formatTimeRange(booking.start_time, booking.end_time)}
              </span>
            ),
            testId: "bkg-info-when",
          },
          {
            key: "service",
            label: t("fields.service"),
            value: (
              <span>
                {displayName(booking.service, locale)}
                {booking.service?.duration_minutes ? (
                  <span className="text-muted-foreground"> · {t("fields.duration", { minutes: booking.service.duration_minutes })}</span>
                ) : null}
              </span>
            ),
          },
          {
            key: "staff",
            label: t("fields.staff"),
            value: staff ? staff : <span className="text-muted-foreground">{t("fields.unassigned")}</span>,
            testId: "bkg-info-staff",
          },
          { key: "status", label: t("fields.status"), value: <BookingStatusPill status={booking.status} /> },
        ]}
      />
    </BookingsCard>
  )
}

/** Client information: name (link to the clients directory), email, phone. */
export function ClientInfoCard({ booking, t }: { booking: BookingDetail; t: Translate }) {
  const c = booking.client
  return (
    <BookingsCard title={t("cards.clientInfo")} icon={<User />} testId="bkg-card-client">
      <InfoGrid
        items={[
          {
            key: "client",
            label: t("fields.client"),
            value: c?.id ? (
              <Link href={`/bookings/clients?client=${c.id}`} className="font-medium underline-offset-2 hover:underline" title={t("fields.viewClient")} data-testid="bkg-client-link">
                {c.full_name}
              </Link>
            ) : (
              <span className="font-medium">{c?.full_name || "—"}</span>
            ),
          },
          { key: "email", label: t("fields.email"), value: c?.email || booking.contact_email || "—" },
          { key: "phone", label: t("fields.phone"), value: <span className="font-mono text-xs tabular-nums">{c?.phone_number || "—"}</span> },
        ]}
      />
    </BookingsCard>
  )
}

/** Rating card (when the client rated the visit): stars, "4/5" and the review. */
export function RatingCard({ booking, t }: { booking: BookingDetail; t: Translate }) {
  const rating = booking.rating ?? 0
  if (!rating) return null
  return (
    <BookingsCard title={t("cards.rating")} icon={<Star />} testId="bkg-card-rating">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5" aria-label={t("rating.outOf", { rating })}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Star key={n} className={cn("h-4 w-4", n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")} aria-hidden />
          ))}
          <span className="ms-1 text-[13px] font-medium tabular-nums">{t("rating.outOf", { rating })}</span>
        </div>
        <p className="text-[13px] text-muted-foreground [overflow-wrap:anywhere]">{booking.review || t("rating.noReview")}</p>
      </div>
    </BookingsCard>
  )
}

/** Cancellation card (cancelled bookings): when, by whom (translated), reason, and the refund outcome right after cancelling. */
export function CancellationCard({
  booking,
  cancelResult,
  t,
}: {
  booking: BookingDetail
  /** The cancel response of this session (refund + cash to hand back); the detail payload has no refund fields. */
  cancelResult?: BookingCancelResponse | null
  t: Translate
}) {
  const locale = useLocale()
  if (booking.status !== "cancelled") return null
  const by = booking.cancelled_by ? (t.has(`cancellation.by.${booking.cancelled_by}`) ? t(`cancellation.by.${booking.cancelled_by}`) : humanize(booking.cancelled_by)) : "—"
  const refundStatus = cancelResult?.refund?.status
  const refundLabel = refundStatus ? (t.has(`cancellation.refundStatus.${refundStatus}`) ? t(`cancellation.refundStatus.${refundStatus}`) : humanize(refundStatus)) : null
  const refundAmount = Number(cancelResult?.refund?.amount ?? 0)
  const manualDue = Number(cancelResult?.manual_refund_due ?? 0)
  return (
    <BookingsCard title={t("cards.cancellation")} icon={<XCircle />} className="border-destructive/30" testId="bkg-card-cancellation">
      <InfoGrid
        items={[
          { key: "at", label: t("cancellation.cancelledAt"), value: <span className="tabular-nums">{formatBookingDateTime(booking.cancelled_at, locale)}</span> },
          { key: "by", label: t("cancellation.cancelledBy"), value: by, testId: "bkg-cancelled-by" },
          {
            key: "reason",
            label: t("cancellation.reason"),
            value: booking.cancellation_reason || <span className="text-muted-foreground">{t("cancellation.noReason")}</span>,
          },
          {
            key: "refund",
            label: t("cancellation.refund"),
            value: refundLabel ? `${refundLabel}${refundAmount > 0 ? ` · ${formatMoney(refundAmount)}` : ""}` : null,
            hidden: !refundLabel,
            testId: "bkg-refund",
          },
        ]}
      />
      {manualDue > 0 && (
        <p className="mt-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400" data-testid="bkg-manual-refund">
          {t("cancellation.manualRefundDue", { amount: formatMoney(manualDue) })}
        </p>
      )}
    </BookingsCard>
  )
}
