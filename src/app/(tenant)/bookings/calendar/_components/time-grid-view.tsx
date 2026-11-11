"use client"

import { useMemo } from "react"
import { useLocale, useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import { fromMinutes, toMinutes } from "@/components/bookings/timeline-utils"
import type { CalendarBooking } from "../../_lib/bookings-api"
import { eventLabel, layoutLanes, timeGridRange, weekdayIndex, weekdayShortNames } from "../_lib/calendar-range"
import { statusSolidClass } from "../_lib/calendar-tones"

const PX_PER_HOUR = 48
const GUTTER = 48

export interface TimeGridViewProps {
  /** The columns: seven days (week) or one (day). */
  days: string[]
  today: string
  /** Minutes since midnight in the business timezone (now-line on today's column). */
  nowMinutes: number
  bookingsByDay: Map<string, CalendarBooking[]>
  onEventClick: (booking: CalendarBooking) => void
}

/**
 * Hour rows × day columns (design shots 06 / 07): 08:00–20:00, stretched to
 * the earliest / latest booking; solid blocks "HH:MM Service – Client"
 * placed by time, side by side when they overlap; today's number in a dark
 * circle and a red now-line.
 */
export function TimeGridView({ days, today, nowMinutes, bookingsByDay, onEventClick }: TimeGridViewProps) {
  const t = useTranslations("bookingsCalendar")
  const locale = useLocale()
  const names = useMemo(() => weekdayShortNames(locale), [locale])
  const all = useMemo(() => days.flatMap((d) => bookingsByDay.get(d) ?? []), [days, bookingsByDay])
  const range = useMemo(() => timeGridRange(all), [all])
  const hours = useMemo(() => {
    const list: number[] = []
    for (let m = range.start; m < range.end; m += 60) list.push(m)
    return list
  }, [range])
  const height = ((range.end - range.start) / 60) * PX_PER_HOUR
  const week = days.length > 1
  const showNow = days.includes(today) && nowMinutes >= range.start && nowMinutes <= range.end

  return (
    <div className="overflow-x-auto rounded-[10px] border bg-card" data-testid={week ? "bkg-week-view" : "bkg-day-view"}>
      <div style={{ minWidth: week ? GUTTER + 7 * 120 : "100%" }}>
        <div className="flex border-b bg-muted/35">
          <div style={{ width: GUTTER, flex: "none" }} />
          {days.map((d) => {
            const isToday = d === today
            return (
              <div key={d} className="flex flex-1 items-center gap-1.5 border-l px-2 py-1.5 text-[11px] font-medium text-muted-foreground" data-testid="bkg-grid-day" data-date={d}>
                {names[weekdayIndex(d)]}
                <span className={cn("inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs tabular-nums", isToday ? "bg-primary font-semibold text-primary-foreground" : "text-foreground")}>
                  {Number(d.slice(8, 10))}
                </span>
              </div>
            )
          })}
        </div>
        <div className="relative flex" style={{ height }}>
          <div className="relative" style={{ width: GUTTER, flex: "none" }}>
            {hours.map((m) => (
              <div key={m} className="absolute right-1.5 -translate-y-1/2 text-[10px] tabular-nums text-muted-foreground" style={{ top: ((m - range.start) / 60) * PX_PER_HOUR }}>
                {fromMinutes(m)}
              </div>
            ))}
          </div>
          {days.map((d) => {
            const lanes = layoutLanes(bookingsByDay.get(d) ?? [])
            return (
              <div
                key={d}
                className="relative flex-1 border-l"
                style={{ backgroundImage: `repeating-linear-gradient(to bottom, hsl(var(--border)) 0 1px, transparent 1px ${PX_PER_HOUR}px)` }}
                data-testid="bkg-grid-column"
                data-date={d}
              >
                {lanes.map(({ item: b, lane, lanes: count }) => {
                  const start = toMinutes(b.start_time)
                  const end = Math.max(toMinutes(b.end_time), start + 15)
                  const top = ((start - range.start) / 60) * PX_PER_HOUR
                  const blockHeight = Math.max(16, ((end - start) / 60) * PX_PER_HOUR - 2)
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => onEventClick(b)}
                      className={cn("absolute overflow-hidden rounded-[4px] px-1.5 py-0.5 text-left text-[11px] leading-4 shadow-sm hover:opacity-90", statusSolidClass(b.status))}
                      style={{ top, height: blockHeight, left: `calc(${(lane / count) * 100}% + 2px)`, width: `calc(${100 / count}% - 4px)` }}
                      title={eventLabel(b)}
                      aria-label={t("openAria", { label: eventLabel(b) })}
                      data-testid="bkg-grid-event"
                      data-booking={b.id}
                    >
                      <span className="block truncate font-medium">{eventLabel(b)}</span>
                    </button>
                  )
                })}
                {showNow && d === today && (
                  <div className="pointer-events-none absolute inset-x-0 z-10 h-0.5 bg-red-500" style={{ top: ((nowMinutes - range.start) / 60) * PX_PER_HOUR }} aria-label={t("timeline.nowLine")} data-testid="bkg-now-line" />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
