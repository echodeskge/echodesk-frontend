"use client"

import { useMemo } from "react"
import { useLocale, useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import type { CalendarBooking } from "../../_lib/bookings-api"
import { eventLabel, monthGridDates, monthKey, weekdayShortNames } from "../_lib/calendar-range"
import { statusSolidClass } from "../_lib/calendar-tones"

const MAX_BARS = 3

export interface MonthViewProps {
  date: string
  today: string
  bookingsByDay: Map<string, CalendarBooking[]>
  onEventClick: (booking: CalendarBooking) => void
  /** "+N more" → the day view of that date. */
  onMore: (date: string) => void
}

/**
 * Seven-column month grid (Monday first, design shot 05): the day number
 * top-right, up to three solid event bars "HH:MM Service – Client" and a
 * "+N more" link. Other months' days are muted; today is tinted.
 */
export function MonthView({ date, today, bookingsByDay, onEventClick, onMore }: MonthViewProps) {
  const t = useTranslations("bookingsCalendar")
  const locale = useLocale()
  const dates = useMemo(() => monthGridDates(date), [date])
  const names = useMemo(() => weekdayShortNames(locale), [locale])
  const month = monthKey(date)
  return (
    <div className="overflow-x-auto rounded-[10px] border bg-card" data-testid="bkg-month-view">
      <div className="min-w-[700px]">
        <div className="grid grid-cols-7 border-b bg-muted/35">
          {names.map((name) => (
            <div key={name} className="px-2 py-1.5 text-center text-[11px] font-medium text-muted-foreground">
              {name}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {dates.map((d, i) => {
            const list = bookingsByDay.get(d) ?? []
            const shown = list.slice(0, MAX_BARS)
            const rest = list.length - shown.length
            const other = monthKey(d) !== month
            const isToday = d === today
            return (
              <div
                key={d}
                className={cn("flex min-h-[96px] flex-col gap-0.5 border-b border-r p-1 [&:nth-child(7n)]:border-r-0", i >= dates.length - 7 && "border-b-0", other && "bg-muted/20", isToday && "bg-primary/5")}
                data-testid="bkg-month-cell"
                data-date={d}
              >
                <div className="flex justify-end">
                  <span className={cn("inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs tabular-nums", other ? "text-muted-foreground/60" : "text-foreground", isToday && "bg-primary font-semibold text-primary-foreground")}>
                    {Number(d.slice(8, 10))}
                  </span>
                </div>
                {shown.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => onEventClick(b)}
                    className={cn("block w-full truncate rounded-[3px] px-1.5 py-px text-left text-[11px] leading-4 hover:opacity-90", statusSolidClass(b.status))}
                    title={eventLabel(b)}
                    data-testid="bkg-month-event"
                    data-booking={b.id}
                  >
                    {eventLabel(b)}
                  </button>
                ))}
                {rest > 0 && (
                  <button type="button" onClick={() => onMore(d)} className="self-start px-1 text-[11px] text-muted-foreground hover:text-foreground hover:underline" data-testid="bkg-month-more">
                    {t("more", { n: rest })}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
