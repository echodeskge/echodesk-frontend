"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { BookingApiError, CustomerBooking, bookingApi } from "@/lib/booking-api"
import { BookingDetails, BookingStatusBadge } from "./booking-details"
import { useErrorMessage } from "./errors"
import { useSalon } from "./salon-context"

// After returning from the bank, how long to keep checking for the payment.
const PAYMENT_POLL_MS = 4000
const PAYMENT_POLL_LIMIT_MS = 60000

/** Confirmation / status page reached through a booking's private link. */
export function ManageBooking({ token }: { token: string }) {
  const { salon, info } = useSalon()
  const locale = useLocale()
  const t = useTranslations("publicBooking")
  const errorMessage = useErrorMessage()
  const paidParam = useSearchParams().get("paid") // set by the bank's redirect

  const [booking, setBooking] = useState<CustomerBooking | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const [pollExpired, setPollExpired] = useState(false)
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const load = useCallback(() => {
    bookingApi
      .managed(salon, token, locale)
      .then((data) => {
        setBooking(data)
        setLoadFailed(false)
      })
      .catch((error) => {
        // Only a real 404 means "no such booking". A dropped connection or a
        // busy server must not tell someone who just paid that it is gone.
        if (error instanceof BookingApiError && error.status === 404) setNotFound(true)
        else setLoadFailed(true)
      })
  }, [salon, token, locale])

  useEffect(load, [load])

  // Back from the bank but the payment hasn't registered yet: check again
  // for a while, then stop and offer to pay again.
  const cardUnpaid =
    !!booking && booking.payment_method === "card" && booking.payment_status === "pending" && booking.status === "pending"
  const awaitingPayment = cardUnpaid && paidParam === "1" && !pollExpired
  useEffect(() => {
    if (!awaitingPayment) return
    const timer = setInterval(load, PAYMENT_POLL_MS)
    const stop = setTimeout(() => setPollExpired(true), PAYMENT_POLL_LIMIT_MS)
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
      toast.error(errorMessage(error))
      load()
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

  if (!booking) {
    if (!loadFailed) return <Skeleton className="h-64 w-full" />
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-muted-foreground">{t("manage.loadFailed")}</p>
        <Button
          variant="outline"
          onClick={() => {
            setLoadFailed(false)
            load()
          }}
        >
          {t("manage.retry")}
        </Button>
      </div>
    )
  }

  const isCard = booking.payment_method === "card"
  const paid = booking.payment_status === "deposit_paid" || booking.payment_status === "fully_paid"
  const cancelled = booking.status === "cancelled"

  let headline = t("manage.requestReceived")
  let detail = t("manage.requestReceivedDetail")
  let icon = <CheckCircle2 className="h-10 w-10 text-green-600" />
  if (cancelled) {
    headline = t("manage.cancelledTitle")
    if (booking.payment_status === "refunded") detail = t("manage.refunded")
    else if (isCard && !paid) detail = t("manage.cancelledUnpaid")
    else detail = ""
    icon = <XCircle className="h-10 w-10 text-destructive" />
  } else if (booking.status === "confirmed") {
    headline = t("manage.confirmedTitle")
    detail = t("manage.confirmedDetail")
  } else if (booking.status === "in_progress") {
    headline = t("manage.inProgressTitle")
    detail = ""
    icon = <Clock className="h-10 w-10 text-blue-600" />
  } else if (booking.status === "completed") {
    headline = t("manage.completedTitle")
    detail = ""
  } else if (cardUnpaid) {
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

      {cardUnpaid && booking.payment_url && !awaitingPayment && (
        <Button asChild className="w-full" size="lg">
          <a href={booking.payment_url}>{t("manage.payNow")}</a>
        </Button>
      )}

      {!cancelled && !isCard && info.bank_transfer && Number(booking.total_amount) > 0 && (
        <div className="rounded-lg border bg-background p-4 text-sm">
          <p className="mb-2 font-medium">{t("manage.bankTransferTitle")}</p>
          <p>{info.bank_transfer.bank_name}</p>
          <p className="break-all font-mono">{info.bank_transfer.iban}</p>
          <p>{info.bank_transfer.account_holder}</p>
        </div>
      )}

      {!cancelled && booking.status !== "completed" && booking.status !== "in_progress" && (
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

      {!cancelled && <p className="text-center text-xs text-muted-foreground">{t("manage.keepLink")}</p>}

      <Button asChild variant="ghost" className="w-full">
        <Link href={`/${salon}`}>{t("manage.bookAnother")}</Link>
      </Button>
    </div>
  )
}
