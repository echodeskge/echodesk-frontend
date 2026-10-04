"use client"

import { useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { fromIsoDate, toIsoDate } from "@/lib/booking-api"
import { format } from "date-fns"
import { dateFnsLocale } from "./salon-context"

interface MonthCalendarProps {
  /** Selected day, YYYY-MM-DD */
  value: string | null
  onChange: (isoDate: string) => void
  /** First and last selectable day, YYYY-MM-DD (inclusive) */
  min: string
  max: string
  /** Today on the business's clock, YYYY-MM-DD (marked in the grid) */
  today?: string
}

/** Days of a month laid out Monday-first, padded with nulls. */
export function monthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1)
  const leading = (first.getDay() + 6) % 7 // Monday = 0
  const days = new Date(year, month + 1, 0).getDate()
  const cells: (Date | null)[] = Array.from({ length: leading }, () => null)
  for (let day = 1; day <= days; day++) cells.push(new Date(year, month, day))
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

export function MonthCalendar({ value, onChange, min, max, today }: MonthCalendarProps) {
  const locale = useLocale()
  const t = useTranslations("publicBooking")
  const initial = fromIsoDate(value || min)
  const [cursor, setCursor] = useState({ year: initial.getFullYear(), month: initial.getMonth() })

  const minDate = fromIsoDate(min)
  const maxDate = fromIsoDate(max)

  const cells = useMemo(() => monthGrid(cursor.year, cursor.month), [cursor])
  const weekdays = useMemo(() => {
    // 2024-01-01 was a Monday
    return Array.from({ length: 7 }, (_, i) => format(new Date(2024, 0, 1 + i), "EEEEEE", { locale: dateFnsLocale(locale) }))
  }, [locale])
  const title = format(new Date(cursor.year, cursor.month, 1), "LLLL yyyy", { locale: dateFnsLocale(locale) })

  const canGoBack = new Date(cursor.year, cursor.month, 1) > new Date(minDate.getFullYear(), minDate.getMonth(), 1)
  const canGoForward = new Date(cursor.year, cursor.month, 1) < new Date(maxDate.getFullYear(), maxDate.getMonth(), 1)

  const shift = (delta: number) => {
    const next = new Date(cursor.year, cursor.month + delta, 1)
    setCursor({ year: next.getFullYear(), month: next.getMonth() })
  }

  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="mb-2 flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-10 w-10"
          disabled={!canGoBack}
          onClick={() => shift(-1)}
          aria-label={t("calendar.previousMonth")}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium capitalize">{title}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-10 w-10"
          disabled={!canGoForward}
          onClick={() => shift(1)}
          aria-label={t("calendar.nextMonth")}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {weekdays.map((day) => (
          <div key={day} className="py-1 text-xs text-muted-foreground">
            {day}
          </div>
        ))}
        {cells.map((date, index) => {
          if (!date) return <div key={`empty-${index}`} />
          const iso = toIsoDate(date)
          const disabled = iso < min || iso > max
          const selected = iso === value
          return (
            <button
              key={iso}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              aria-label={format(date, "EEEE, d MMMM yyyy", { locale: dateFnsLocale(locale) })}
              aria-current={iso === today ? "date" : undefined}
              onClick={() => onChange(iso)}
              className={cn(
                "aspect-square min-h-10 rounded-md text-sm transition-colors",
                selected
                  ? "bg-primary font-semibold text-primary-foreground"
                  : disabled
                    ? "text-muted-foreground/40"
                    : "hover:bg-accent",
                iso === today && !selected && "font-semibold underline underline-offset-4"
              )}
            >
              {date.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}
