"use client"

import { useLocale, useTranslations } from "next-intl"
import { CalendarX } from "lucide-react"
import { cn } from "@/lib/utils"
import { BookingsEmptyState, formatTimeRange } from "../../_components/ui"
import type { CalendarBooking } from "../../_lib/bookings-api"
import { formatLongDate } from "../_lib/calendar-range"
import { statusDotClass } from "../_lib/calendar-tones"

export interface ListViewProps {
  /** The visible days in order (a day without bookings is skipped). */
  days: string[]
  bookingsByDay: Map<string, CalendarBooking[]>
  onEventClick: (booking: CalendarBooking) => void
}

/** Day-grouped rows "HH:MM – HH:MM · dot · Service – Client" (design shot 08). */
export function ListView({ days, bookingsByDay, onEventClick }: ListViewProps) {
  const t = useTranslations("bookingsCalendar")
  const locale = useLocale()
  const groups = days.map((d) => ({ date: d, list: bookingsByDay.get(d) ?? [] })).filter((g) => g.list.length > 0)
  if (groups.length === 0) {
    return (
      <div className="rounded-[10px] border bg-card" data-testid="bkg-list-view">
        <BookingsEmptyState icon={CalendarX} title={t("noBookingsInRange")} description={t("noBookingsHint")} />
      </div>
    )
  }
  return (
    <div className="overflow-hidden rounded-[10px] border bg-card" data-testid="bkg-list-view">
      {groups.map((g) => (
        <section key={g.date} data-testid="bkg-list-day" data-date={g.date}>
          <h3 className="border-b bg-muted/35 px-3 py-1.5 text-xs font-semibold">{formatLongDate(g.date, locale)}</h3>
          <ul>
            {g.list.map((b) => (
              <li key={b.id} className="border-b last:border-b-0">
                <button
                  type="button"
                  onClick={() => onEventClick(b)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left text-[13px] hover:bg-muted/40"
                  data-testid="bkg-list-event"
                  data-booking={b.id}
                >
                  <span className="w-[108px] shrink-0 font-mono text-xs tabular-nums text-muted-foreground">{formatTimeRange(b.start_time, b.end_time)}</span>
                  <span aria-hidden className={cn("h-2 w-2 shrink-0 rounded-full", statusDotClass(b.status))} />
                  <span className="min-w-0 truncate">
                    {b.service.name_display} – {b.client.full_name}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
