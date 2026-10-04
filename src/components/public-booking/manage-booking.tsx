"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { CheckCircle2, Loader2, XCircle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { BookingApiError, CustomerBooking, bookingApi } from "@/lib/booking-api"
import { BookingDetails, BookingStatusBadge } from "./booking-details"
import { useSalon } from "./salon-context"

/** Confirmation / status page reached through a booking's private link. */
export function ManageBooking({ token }: { token: string }) {
  const { salon, info } = useSalon()
  const locale = useLocale()
  const t = useTranslations("publicBooking")
  const paidParam = useSearchParams().get("paid") // set by the bank's redirect

  const [booking, setBooking] = useState<CustomerBooking | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const load = useCallback(() => {
    bookingApi
      .managed(salon, token, locale)
      .then(setBooking)
      .catch(() => setNotFound(true))
  }, [salon, token, locale])

  useEffect(load, [load])

  // Back from the bank but the payment hasn't registered yet: check again shortly.
  const awaitingPayment =
    !!booking && paidParam === "1" && booking.payment_method === "card" && booking.payment_status === "pending"
  useEffect(() => {
    if (!awaitingPayment) return
    const timer = setInterval(load, 4000)
    const stop = setTimeout(() => clearInterval(timer), 60000)
    return () => {
      clearInterval(timer)
      clearTimeout(stop)
    }
  }, [awaitingPayment, load])

  const cancel = async () => {
    setCancelling(true)
    try {
      setBooking(await bookingApi.cancelManaged(salon, token, locale))
      setConfirmingCancel(false)
      toast.success(t("manage.cancelled"))
    } catch (error) {
      toast.error((error instanceof BookingApiError && error.message) || t("wizard.errors.generic"))
    } finally {
      setCancelling(false)
    }
  }

  if (notFound) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-destructive">{t("manage.notFound")}</p>
        <Button asChild variant="outline">
          <Link href={`/${salon}`}>{t("wizard.backToServices")}</Link>
        </Button>
      </div>
    )
  }

  if (!booking) return <Skeleton className="h-64 w-full" />

  const isCard = booking.payment_method === "card"
  const paid = booking.payment_status === "deposit_paid" || booking.payment_status === "fully_paid"
  const unpaidCard = isCard && !paid && booking.status === "pending"
  const cancelled = booking.status === "cancelled"

  let headline = t("manage.requestReceived")
  let detail = t("manage.requestReceivedDetail")
  let icon = <CheckCircle2 className="h-10 w-10 text-green-600" />
  if (cancelled) {
    headline = t("manage.cancelledTitle")
    detail = booking.payment_status === "refunded" ? t("manage.refunded") : ""
    icon = <XCircle className="h-10 w-10 text-destructive" />
  } else if (booking.status === "confirmed") {
    headline = t("manage.confirmedTitle")
    detail = t("manage.confirmedDetail")
  } else if (booking.status === "completed") {
    headline = t("manage.completedTitle")
    detail = ""
  } else if (unpaidCard) {
    headline = awaitingPayment ? t("manage.checkingPayment") : t("manage.paymentNeeded")
    detail = awaitingPayment ? "" : t("manage.paymentNeededDetail")
    icon = awaitingPayment ? (
      <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
    ) : (
      <XCircle className="h-10 w-10 text-amber-600" />
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center gap-2 text-center">
        {icon}
        <h1 className="text-xl font-semibold">{headline}</h1>
        {detail && <p className="max-w-md text-sm text-muted-foreground">{detail}</p>}
        <BookingStatusBadge status={booking.status} />
      </div>

      <div className="rounded-lg border bg-background p-4">
        <BookingDetails booking={booking} />
      </div>

      {unpaidCard && booking.payment_url && !awaitingPayment && (
        <Button asChild className="w-full" size="lg">
          <a href={booking.payment_url}>{t("manage.payNow")}</a>
        </Button>
      )}

      {!cancelled && !isCard && info.bank_transfer && Number(booking.total_amount) > 0 && (
        <div className="rounded-lg border bg-background p-4 text-sm">
          <p className="mb-2 font-medium">{t("manage.bankTransferTitle")}</p>
          <p>{info.bank_transfer.bank_name}</p>
          <p className="font-mono">{info.bank_transfer.iban}</p>
          <p>{info.bank_transfer.account_holder}</p>
        </div>
      )}

      {!cancelled && booking.status !== "completed" && (
        <div className="space-y-2">
          {booking.can_cancel ? (
            confirmingCancel ? (
              <div className="space-y-2 rounded-lg border border-destructive/40 bg-background p-4">
                <p className="text-sm">{t("manage.cancelConfirm")}</p>
                <div className="flex gap-2">
                  <Button variant="destructive" disabled={cancelling} onClick={cancel}>
                    {cancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t("manage.cancelYes")}
                  </Button>
                  <Button variant="outline" disabled={cancelling} onClick={() => setConfirmingCancel(false)}>
                    {t("manage.cancelNo")}
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" className="w-full" onClick={() => setConfirmingCancel(true)}>
                {t("manage.cancelBooking")}
              </Button>
            )
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              {t("manage.cannotCancel", { hours: info.cancellation_hours_before })}
              {info.phone ? ` ${t("manage.callUs", { phone: info.phone })}` : ""}
            </p>
          )}
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground">{t("manage.keepLink")}</p>

      <Button asChild variant="ghost" className="w-full">
        <Link href={`/${salon}`}>{t("manage.bookAnother")}</Link>
      </Button>
    </div>
  )
}
