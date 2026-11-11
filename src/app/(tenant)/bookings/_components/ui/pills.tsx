"use client"

import { useTranslations } from "next-intl"
import { AlertCircle, CheckCircle2, Clock, UserX, XCircle, type LucideIcon } from "lucide-react"
import { TonePill } from "@/components/redesign/pill"
import { bookingStatusTone, paymentStatusTone } from "./tones"

export { TonePill }

const STATUS_ICON: Record<string, LucideIcon> = {
  pending: Clock,
  confirmed: CheckCircle2,
  in_progress: AlertCircle,
  completed: CheckCircle2,
  cancelled: XCircle,
  no_show: UserX,
}

/** "no_show" -> "No show" for a status the catalog does not know. */
export function humanize(raw: string | null | undefined): string {
  if (!raw) return "—"
  const text = raw.replace(/_/g, " ")
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** Booking status pill with its icon (design: Pending amber, Confirmed blue, In progress violet, Completed green, Cancelled red, No show grey). */
export function BookingStatusPill({ status, className }: { status: string | null | undefined; className?: string }) {
  const t = useTranslations("bookingsUi")
  const s = status || "pending"
  const Icon = STATUS_ICON[s] ?? Clock
  return (
    <TonePill tone={bookingStatusTone(s)} className={className} testId="bkg-status-pill">
      <span className="inline-flex items-center gap-1">
        <Icon className="h-3 w-3 shrink-0" aria-hidden />
        {t.has(`status.${s}`) ? t(`status.${s}`) : humanize(s)}
      </span>
    </TonePill>
  )
}

/** Payment status pill (backend `pending` = Unpaid amber, Deposit paid blue, Fully paid green, Failed red, Refunded grey). */
export function PaymentStatusPill({ status, className }: { status: string | null | undefined; className?: string }) {
  const t = useTranslations("bookingsUi")
  const s = status || "pending"
  return (
    <TonePill tone={paymentStatusTone(s)} className={className} testId="bkg-payment-pill">
      {t.has(`paymentStatus.${s}`) ? t(`paymentStatus.${s}`) : humanize(s)}
    </TonePill>
  )
}
