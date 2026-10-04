"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { ArrowLeft, Clock, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  BookingApiError,
  BookingService,
  PaymentOption,
  amountDueNow,
  bookingApi,
  formatMoney,
  paymentOptionsFor,
} from "@/lib/booking-api"
import { formatLongDate, useBookingSession, useSalon } from "./salon-context"
import { SlotPicker } from "./slot-picker"

const EMPTY_GUEST = { first_name: "", last_name: "", phone_number: "", email: "" }

export function BookingWizard({ serviceId }: { serviceId: string }) {
  const { salon, info } = useSalon()
  const { session, ready } = useBookingSession()
  const locale = useLocale()
  const router = useRouter()
  const t = useTranslations("publicBooking")

  const [service, setService] = useState<BookingService | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)

  const [staffId, setStaffId] = useState<number | null>(null) // null = anyone
  const [date, setDate] = useState<string | null>(null)
  const [time, setTime] = useState<string | null>(null)
  const [guest, setGuest] = useState(EMPTY_GUEST)
  const [notes, setNotes] = useState("")
  const [payment, setPayment] = useState<PaymentOption | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    bookingApi
      .service(salon, serviceId, locale)
      .then((data) => !cancelled && setService(data))
      .catch(() => !cancelled && setLoadFailed(true))
    return () => {
      cancelled = true
    }
  }, [salon, serviceId, locale])

  const paymentOptions = useMemo(() => (service ? paymentOptionsFor(info, service) : []), [info, service])
  const chosenPayment = payment && paymentOptions.includes(payment) ? payment : paymentOptions[0]

  if (loadFailed) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-destructive">{t("wizard.serviceNotFound")}</p>
        <Button asChild variant="outline">
          <Link href={`/${salon}`}>{t("wizard.backToServices")}</Link>
        </Button>
      </div>
    )
  }

  if (!service) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  const validate = (): boolean => {
    const next: Record<string, string> = {}
    if (!date || !time) next.slot = t("wizard.errors.pickTime")
    if (!session) {
      if (!guest.first_name.trim()) next.first_name = t("wizard.errors.required")
      if (guest.phone_number.replace(/\D/g, "").length < 6) next.phone_number = t("wizard.errors.phone")
      if (guest.email.trim() && !/^\S+@\S+\.\S+$/.test(guest.email.trim())) next.email = t("wizard.errors.email")
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const submit = async () => {
    if (!validate() || !date || !time) return
    setSubmitting(true)
    try {
      const input = {
        service_id: service.id,
        staff_id: staffId,
        date,
        start_time: time,
        client_notes: notes.trim(),
        payment_type: chosenPayment,
      }
      const booking = session
        ? await bookingApi.book(salon, input, locale)
        : await bookingApi.guestBook(
            salon,
            {
              ...input,
              first_name: guest.first_name.trim(),
              last_name: guest.last_name.trim(),
              phone_number: guest.phone_number.trim(),
              email: guest.email.trim() || undefined,
            },
            locale
          )

      if (booking.payment_url && booking.payment_method === "card") {
        window.location.href = booking.payment_url // on to the bank's payment page
        return
      }
      router.push(`/${salon}/booking/${booking.manage_token}`)
    } catch (error) {
      setSubmitting(false)
      if (error instanceof BookingApiError) {
        if (error.status === 401) {
          toast.error(t("wizard.errors.sessionExpired"))
          return
        }
        setErrors(error.fields)
        // Most failures here mean the slot was taken meanwhile: drop it so the
        // list reloads and the customer picks again.
        if (!Object.keys(error.fields).some((f) => f in EMPTY_GUEST || f === "payment_type")) setTime(null)
        toast.error(error.message || t("wizard.errors.generic"))
      } else {
        toast.error(t("wizard.errors.generic"))
      }
    }
  }

  const dueNow = chosenPayment ? amountDueNow(chosenPayment, service) : 0

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/${salon}`} className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          {t("wizard.backToServices")}
        </Link>
        <h1 className="text-xl font-semibold">{service.name_display}</h1>
        <p className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {t("services.minutes", { count: service.duration_minutes })}
          </span>
          <span className="font-medium text-foreground">
            {Number(service.base_price) ? formatMoney(service.base_price) : t("services.free")}
          </span>
        </p>
      </div>

      {/* 1. Staff */}
      {service.staff_members.length > 1 && (
        <section className="space-y-2">
          <h2 className="font-medium">{t("wizard.staffTitle")}</h2>
          <div className="flex flex-wrap gap-2">
            {[{ id: null as number | null, label: t("wizard.anyStaff") }]
              .concat(service.staff_members.map((s) => ({ id: s.id, label: s.user.full_name || s.user.first_name })))
              .map((option) => (
                <button
                  key={option.id ?? "any"}
                  type="button"
                  aria-pressed={staffId === option.id}
                  onClick={() => {
                    setStaffId(option.id)
                    setTime(null)
                  }}
                  className={cn(
                    "rounded-full border px-4 py-1.5 text-sm transition-colors",
                    staffId === option.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-background hover:border-primary/60"
                  )}
                >
                  {option.label}
                </button>
              ))}
          </div>
        </section>
      )}

      {/* 2. Date and time */}
      <section className="space-y-2">
        <h2 className="font-medium">{t("wizard.timeTitle")}</h2>
        <SlotPicker
          serviceId={service.id}
          staffId={staffId}
          date={date}
          time={time}
          onChange={(nextDate, nextTime) => {
            setDate(nextDate)
            setTime(nextTime)
            setErrors((prev) => ({ ...prev, slot: "" }))
          }}
        />
        {errors.slot && <p className="text-sm text-destructive">{errors.slot}</p>}
      </section>

      {/* 3. Who is booking */}
      <section className="space-y-3">
        <h2 className="font-medium">{t("wizard.detailsTitle")}</h2>
        {!ready ? (
          <Skeleton className="h-24 w-full" />
        ) : session ? (
          <p className="rounded-lg border bg-background p-3 text-sm">
            {t("wizard.bookingAs", { name: session.client.full_name || session.client.email || "" })}
          </p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                id="first_name"
                label={`${t("wizard.firstName")} *`}
                value={guest.first_name}
                error={errors.first_name}
                autoComplete="given-name"
                onChange={(v) => setGuest({ ...guest, first_name: v })}
              />
              <Field
                id="last_name"
                label={t("wizard.lastName")}
                value={guest.last_name}
                error={errors.last_name}
                autoComplete="family-name"
                onChange={(v) => setGuest({ ...guest, last_name: v })}
              />
              <Field
                id="phone_number"
                label={`${t("wizard.phone")} *`}
                type="tel"
                value={guest.phone_number}
                error={errors.phone_number}
                autoComplete="tel"
                onChange={(v) => setGuest({ ...guest, phone_number: v })}
              />
              <Field
                id="email"
                label={t("wizard.email")}
                type="email"
                value={guest.email}
                error={errors.email}
                hint={t("wizard.emailHint")}
                autoComplete="email"
                onChange={(v) => setGuest({ ...guest, email: v })}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {t("wizard.haveAccount")}{" "}
              <Link href={`/${salon}/login?next=${encodeURIComponent(`/${salon}/book/${service.id}`)}`} className="font-medium text-primary hover:underline">
                {t("header.signIn")}
              </Link>
            </p>
          </>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="notes">{t("wizard.notes")}</Label>
          <Textarea id="notes" rows={2} value={notes} maxLength={500} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </section>

      {/* 4. Payment */}
      {paymentOptions.length > 1 && (
        <section className="space-y-2">
          <h2 className="font-medium">{t("wizard.paymentTitle")}</h2>
          <div className="space-y-2">
            {paymentOptions.map((option) => (
              <label
                key={option}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-3 rounded-lg border bg-background p-3 text-sm",
                  chosenPayment === option && "border-primary"
                )}
              >
                <span className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="payment"
                    className="accent-primary"
                    checked={chosenPayment === option}
                    onChange={() => setPayment(option)}
                  />
                  {t(`wizard.payment.${option}`)}
                </span>
                <span className="text-muted-foreground">
                  {option === "cash"
                    ? t("wizard.payment.payLater")
                    : t("wizard.payment.payNow", { amount: formatMoney(amountDueNow(option, service)) })}
                </span>
              </label>
            ))}
          </div>
          {errors.payment_type && <p className="text-sm text-destructive">{errors.payment_type}</p>}
        </section>
      )}

      {/* Summary + submit */}
      <section className="space-y-3 rounded-lg border bg-background p-4">
        <dl className="space-y-1 text-sm">
          <Row label={t("summary.service")} value={service.name_display} />
          <Row
            label={t("summary.when")}
            value={date && time ? `${formatLongDate(date, locale)}, ${time}` : t("summary.notChosen")}
          />
          <Row label={t("summary.price")} value={Number(service.base_price) ? formatMoney(service.base_price) : t("services.free")} />
          {dueNow > 0 && <Row label={t("summary.dueNow")} value={formatMoney(dueNow)} />}
        </dl>
        <Button className="w-full" size="lg" disabled={submitting} onClick={submit}>
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {dueNow > 0 ? t("wizard.submitAndPay") : t("wizard.submit")}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          {t("wizard.cancellationNote", { hours: info.cancellation_hours_before })}
        </p>
      </section>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  )
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  hint,
  type = "text",
  autoComplete,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  hint?: string
  type?: string
  autoComplete?: string
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        aria-invalid={!!error}
        className={error ? "border-destructive" : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}
