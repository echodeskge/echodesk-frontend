"use client"

import { useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { BookingSlot, bookingApi, toIsoDate } from "@/lib/booking-api"
import { MonthCalendar } from "./month-calendar"
import { useSalon } from "./salon-context"

interface SlotPickerProps {
  serviceId: number
  /** Limit slots to one staff member; null/undefined = anyone free */
  staffId?: number | null
  date: string | null
  time: string | null
  onChange: (date: string | null, time: string | null) => void
}

/** Pick a day, then one of the free start times on that day. */
export function SlotPicker({ serviceId, staffId, date, time, onChange }: SlotPickerProps) {
  const { salon, info } = useSalon()
  const t = useTranslations("publicBooking")
  const [slots, setSlots] = useState<BookingSlot[] | null>(null)
  const [failed, setFailed] = useState(false)

  const { min, max } = useMemo(() => {
    const today = new Date()
    const last = new Date(today.getFullYear(), today.getMonth(), today.getDate() + info.max_days_advance_booking)
    return { min: toIsoDate(today), max: toIsoDate(last) }
  }, [info.max_days_advance_booking])

  useEffect(() => {
    if (!date) {
      setSlots(null)
      return
    }
    const controller = new AbortController()
    setSlots(null)
    setFailed(false)
    bookingApi
      .slots(salon, serviceId, date, staffId, controller.signal)
      .then(setSlots)
      .catch((error) => {
        if (error?.name !== "AbortError") setFailed(true)
      })
    return () => controller.abort()
  }, [salon, serviceId, staffId, date])

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <MonthCalendar value={date} min={min} max={max} onChange={(next) => onChange(next, null)} />
      <div className="min-w-0">
        {!date ? (
          <p className="text-sm text-muted-foreground">{t("slots.pickDate")}</p>
        ) : failed ? (
          <p className="text-sm text-destructive">{t("slots.loadFailed")}</p>
        ) : slots === null ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("slots.loading")}
          </div>
        ) : slots.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("slots.none")}</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {slots.map((slot) => (
              <button
                key={slot.start_time}
                type="button"
                aria-pressed={time === slot.start_time}
                onClick={() => onChange(date, slot.start_time)}
                className={cn(
                  "rounded-md border px-2 py-2 text-sm transition-colors",
                  time === slot.start_time
                    ? "border-primary bg-primary font-semibold text-primary-foreground"
                    : "bg-background hover:border-primary/60"
                )}
              >
                {slot.start_time}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
