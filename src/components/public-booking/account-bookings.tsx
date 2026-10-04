"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { Loader2, Star } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { BookingApiError, CustomerBooking, bookingApi, todayInTimezone } from "@/lib/booking-api"
import { BookingDetails, BookingStatusBadge } from "./booking-details"
import { useErrorMessage } from "./errors"
import { useBookingSession, useSalon } from "./salon-context"
import { SlotPicker } from "./slot-picker"

type OpenPanel = { id: number; kind: "cancel" | "reschedule" | "rate" } | null

export function AccountBookings() {
  const { salon, info } = useSalon()
  const errorMessage = useErrorMessage()
  const { session, ready } = useBookingSession()
  const locale = useLocale()
  const router = useRouter()
  const t = useTranslations("publicBooking")

  const [bookings, setBookings] = useState<CustomerBooking[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [panel, setPanel] = useState<OpenPanel>(null)
  const [busy, setBusy] = useState(false)
  const [newDate, setNewDate] = useState<string | null>(null)
  const [newTime, setNewTime] = useState<string | null>(null)
  const [rating, setRating] = useState(0)
  const [review, setReview] = useState("")

  const load = useCallback(() => {
    bookingApi
      .myBookings(salon, locale)
      .then(setBookings)
      .catch((error) => {
        if (error instanceof BookingApiError && error.status === 401) return // session cleared → redirect below
        setFailed(true)
      })
  }, [salon, locale])

  useEffect(() => {
    if (!ready) return
    if (!session) {
      router.replace(`/${salon}/login?next=${encodeURIComponent(`/${salon}/account`)}`)
      return
    }
    load()
  }, [ready, session, salon, router, load])

  const open = (id: number, kind: NonNullable<OpenPanel>["kind"]) => {
    setPanel({ id, kind })
    setNewDate(null)
    setNewTime(null)
    setRating(0)
    setReview("")
  }

  const run = async (action: () => Promise<CustomerBooking>, successMessage: string) => {
    setBusy(true)
    try {
      const updated = await action()
      setBookings((prev) => (prev || []).map((b) => (b.id === updated.id ? updated : b)))
      setPanel(null)
      toast.success(successMessage)
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  if (!ready || !session) return <Skeleton className="h-40 w-full" />

  const today = todayInTimezone(info.timezone)
  const isUpcoming = (b: CustomerBooking) => b.date >= today && !["cancelled", "completed"].includes(b.status)
  const upcoming = (bookings || []).filter(isUpcoming).sort((a, b) => (a.date + a.start_time).localeCompare(b.date + b.start_time))
  const past = (bookings || []).filter((b) => !isUpcoming(b))

  const card = (booking: CustomerBooking) => {
    const active = panel?.id === booking.id ? panel.kind : null
    const canChange = isUpcoming(booking) && booking.can_cancel
    return (
      <li key={booking.id} className="space-y-3 rounded-lg border bg-background p-4">
        <div className="flex items-center justify-between gap-2">
          <BookingStatusBadge status={booking.status} />
          {booking.rating ? (
            <span className="flex items-center gap-0.5 text-sm">
              {booking.rating}
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            </span>
          ) : null}
        </div>
        <BookingDetails booking={booking} />

        {canChange && !active && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => open(booking.id, "reschedule")}>
              {t("account.reschedule")}
            </Button>
            <Button variant="outline" size="sm" onClick={() => open(booking.id, "cancel")}>
              {t("manage.cancelBooking")}
            </Button>
          </div>
        )}
        {isUpcoming(booking) && !booking.can_cancel && (
          <p className="text-xs text-muted-foreground">
            {t("manage.cannotCancel", { hours: info.cancellation_hours_before })}
          </p>
        )}
        {isUpcoming(booking) &&
          booking.payment_method === "card" &&
          booking.payment_status === "pending" &&
          booking.payment_url && (
            <Button asChild size="sm">
              <a href={booking.payment_url}>{t("manage.payNow")}</a>
            </Button>
          )}
        {booking.status === "completed" && !booking.rating && !active && (
          <Button variant="outline" size="sm" onClick={() => open(booking.id, "rate")}>
            {t("account.rate")}
          </Button>
        )}

        {active === "cancel" && (
          <div className="space-y-2 rounded-md border border-destructive/40 p-3">
            <p className="text-sm">{t("manage.cancelConfirm")}</p>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                disabled={busy}
                onClick={() => run(() => bookingApi.cancel(salon, booking.id, locale), t("manage.cancelled"))}
              >
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("manage.cancelYes")}
              </Button>
              <Button variant="outline" size="sm" disabled={busy} onClick={() => setPanel(null)}>
                {t("manage.cancelNo")}
              </Button>
            </div>
          </div>
        )}

        {active === "reschedule" && (
          <div className="space-y-3 rounded-md border p-3">
            <SlotPicker
              serviceId={booking.service.id}
              staffId={booking.staff?.id}
              date={newDate}
              time={newTime}
              onChange={(d, tm) => {
                setNewDate(d)
                setNewTime(tm)
              }}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={busy || !newDate || !newTime}
                onClick={() =>
                  run(() => bookingApi.reschedule(salon, booking.id, newDate!, newTime!, locale), t("account.rescheduled"))
                }
              >
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("account.confirmNewTime")}
              </Button>
              <Button variant="outline" size="sm" disabled={busy} onClick={() => setPanel(null)}>
                {t("account.close")}
              </Button>
            </div>
          </div>
        )}

        {active === "rate" && (
          <div className="space-y-3 rounded-md border p-3">
            <div className="flex gap-1" role="radiogroup" aria-label={t("account.rate")}>
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={rating === value}
                  aria-label={t("account.stars", { count: value })}
                  className="p-1"
                  onClick={() => setRating(value)}
                >
                  <Star className={cn("h-7 w-7", value <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")} />
                </button>
              ))}
            </div>
            <Textarea rows={2} value={review} maxLength={1000} placeholder={t("account.reviewPlaceholder")} onChange={(e) => setReview(e.target.value)} />
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={busy || rating === 0}
                onClick={() => run(() => bookingApi.rate(salon, booking.id, rating, review.trim(), locale), t("account.rated"))}
              >
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("account.sendRating")}
              </Button>
              <Button variant="outline" size="sm" disabled={busy} onClick={() => setPanel(null)}>
                {t("account.close")}
              </Button>
            </div>
          </div>
        )}
      </li>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold">{t("header.myBookings")}</h1>
          <p className="truncate text-sm text-muted-foreground">{session.client.full_name || session.client.email}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            bookingApi.logout(salon)
            router.push(`/${salon}`)
          }}
        >
          {t("account.signOut")}
        </Button>
      </div>

      {failed ? (
        <p className="text-sm text-destructive">{t("account.loadFailed")}</p>
      ) : bookings === null ? (
        <Skeleton className="h-40 w-full" />
      ) : bookings.length === 0 ? (
        <div className="space-y-3 rounded-lg border bg-background p-6 text-center">
          <p className="text-sm text-muted-foreground">{t("account.empty")}</p>
          <Button asChild>
            <Link href={`/${salon}`}>{t("manage.bookAnother")}</Link>
          </Button>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-medium text-muted-foreground">{t("account.upcoming")}</h2>
              <ul className="space-y-3">{upcoming.map(card)}</ul>
            </section>
          )}
          {past.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-medium text-muted-foreground">{t("account.past")}</h2>
              <ul className="space-y-3">{past.map(card)}</ul>
            </section>
          )}
          <Button asChild variant="outline" className="w-full">
            <Link href={`/${salon}`}>{t("manage.bookAnother")}</Link>
          </Button>
        </>
      )}
    </div>
  )
}
