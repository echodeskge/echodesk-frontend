"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { addDays, fromIsoDate, toIsoDate } from "@/lib/booking-api"
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

/**
 * Where an arrow / Home / End / Page key moves keyboard focus from `iso`,
 * kept inside [min, max]. Returns null for keys the calendar doesn't handle.
 */
export function nextFocusDate(key: string, iso: string, min: string, max: string): string | null {
  const date = fromIsoDate(iso)
  const weekday = (date.getDay() + 6) % 7 // Monday = 0
  let target: string
  switch (key) {
    case "ArrowLeft":
      target = addDays(iso, -1)
      break
    case "ArrowRight":
      target = addDays(iso, 1)
      break
    case "ArrowUp":
      target = addDays(iso, -7)
      break
    case "ArrowDown":
      target = addDays(iso, 7)
      break
    case "Home":
      target = addDays(iso, -weekday)
      break
    case "End":
      target = addDays(iso, 6 - weekday)
      break
    case "PageUp":
    case "PageDown": {
      const delta = key === "PageUp" ? -1 : 1
      // Same day next/previous month, clamped to that month's length
      const lastDay = new Date(date.getFullYear(), date.getMonth() + delta + 1, 0).getDate()
      target = toIsoDate(new Date(date.getFullYear(), date.getMonth() + delta, Math.min(date.getDate(), lastDay)))
      break
    }
    default:
      return null
  }
  if (target < min) return min
  if (target > max) return max
  return target
}

export function MonthCalendar({ value, onChange, min, max, today }: MonthCalendarProps) {
  const locale = useLocale()
  const t = useTranslations("publicBooking")
  const initial = fromIsoDate(value || min)
  const [cursor, setCursor] = useState({ year: initial.getFullYear(), month: initial.getMonth() })
  // The one day that is in the tab order (roving tabindex); arrow keys move it.
  const [focusIso, setFocusIso] = useState<string>(value || min)
  // Set when a key press should move DOM focus once the target day is rendered.
  const pendingFocus = useRef(false)
  const dayRefs = useRef(new Map<string, HTMLButtonElement>())

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

  // The tabbable day must be a selectable day of the month on screen.
  const monthStart = toIsoDate(new Date(cursor.year, cursor.month, 1))
  const monthEnd = toIsoDate(new Date(cursor.year, cursor.month + 1, 0))
  const firstSelectable = monthStart < min ? min : monthStart
  const tabbableIso = focusIso >= monthStart && focusIso <= monthEnd && focusIso >= min && focusIso <= max ? focusIso : firstSelectable

  useEffect(() => {
    if (!pendingFocus.current) return
    pendingFocus.current = false
    dayRefs.current.get(focusIso)?.focus()
  }, [focusIso, cursor])

  const shift = (delta: number) => {
    const next = new Date(cursor.year, cursor.month + delta, 1)
    setCursor({ year: next.getFullYear(), month: next.getMonth() })
  }

  const onGridKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const target = nextFocusDate(event.key, tabbableIso, min, max)
    if (!target) return
    event.preventDefault()
    const date = fromIsoDate(target)
    pendingFocus.current = true
    setFocusIso(target)
    if (date.getFullYear() !== cursor.year || date.getMonth() !== cursor.month) {
      setCursor({ year: date.getFullYear(), month: date.getMonth() })
    }
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
        <span className="text-sm font-medium capitalize" aria-live="polite">
          {title}
        </span>
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
      {/* Arrow keys move between days, Page Up/Down between months, Home/End
          to the start/end of the week; Enter or Space picks the day. */}
      <div className="grid grid-cols-7 gap-1 text-center" role="group" aria-label={title} onKeyDown={onGridKeyDown}>
        {weekdays.map((day) => (
          <div key={day} className="py-1 text-xs text-muted-foreground" aria-hidden="true">
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
              ref={(element) => {
                if (element) dayRefs.current.set(iso, element)
                else dayRefs.current.delete(iso)
              }}
              type="button"
              disabled={disabled}
              tabIndex={iso === tabbableIso ? 0 : -1}
              aria-pressed={selected}
              aria-label={format(date, "EEEE, d MMMM yyyy", { locale: dateFnsLocale(locale) })}
              aria-current={iso === today ? "date" : undefined}
              onClick={() => {
                setFocusIso(iso)
                onChange(iso)
              }}
              onFocus={() => setFocusIso(iso)}
              className={cn(
                "aspect-square min-h-10 rounded-md text-sm transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
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
