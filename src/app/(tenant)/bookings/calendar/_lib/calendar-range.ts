/**
 * Pure helpers of the booking calendar (BKG-02): the visible range per view,
 * the month grid, a staff member's hours on a given day (weekly rows +
 * exceptions), the "now" of the business timezone, lane packing for the
 * time grids and the locale-aware titles. Dates are "YYYY-MM-DD" strings and
 * never go through `new Date("YYYY-MM-DD")`.
 */
import { format } from "date-fns"
import { enUS, ka } from "date-fns/locale"
import { parseDateOnly, shiftDateOnly, toDateOnlyString } from "../../_components/ui/format"
import type { CalendarBooking, CalendarStaff } from "../../_lib/bookings-api"
import { toMinutes, type Availability } from "@/components/bookings/timeline-utils"

export const CALENDAR_VIEWS = ["specialists", "month", "week", "day", "list"] as const
export type CalendarView = (typeof CALENDAR_VIEWS)[number]

export const ZOOM_STEPS = [15, 30, 60] as const
export type Zoom = (typeof ZOOM_STEPS)[number]

/** `?view=` → a known view (Specialists by default). */
export function parseView(value: string | null | undefined): CalendarView {
  return (CALENDAR_VIEWS as readonly string[]).includes(value ?? "") ? (value as CalendarView) : "specialists"
}

/** `?date=` → a valid "YYYY-MM-DD" or `fallback`. */
export function parseDateParam(value: string | null | undefined, fallback: string): string {
  return value && parseDateOnly(value) ? value : fallback
}

/** Monday-based weekday of a date: 0 = Monday … 6 = Sunday (the backend's `day_of_week`). */
export function weekdayIndex(iso: string): number {
  const p = parseDateOnly(iso)
  if (!p) return 0
  return (new Date(p.year, p.month - 1, p.day).getDay() + 6) % 7
}

/** The Monday of the week that holds `iso`. */
export function startOfWeek(iso: string): string {
  return shiftDateOnly(iso, -weekdayIndex(iso))
}

/** Every day from `from` to `to` inclusive. */
export function eachDay(from: string, to: string): string[] {
  const out: string[] = []
  for (let d = from; d <= to && out.length < 400; d = shiftDateOnly(d, 1)) out.push(d)
  return out
}

/**
 * The month grid of the month that holds `iso`: whole weeks (Monday first)
 * from the week of the 1st to the week of the last day — 35 or 42 days.
 */
export function monthGridDates(iso: string): string[] {
  const p = parseDateOnly(iso)
  if (!p) return []
  const first = toDateOnlyString(new Date(p.year, p.month - 1, 1))
  const last = toDateOnlyString(new Date(p.year, p.month, 0))
  return eachDay(startOfWeek(first), shiftDateOnly(startOfWeek(last), 6))
}

/** The range the view shows for `date` (what the calendar request asks for). */
export function visibleRange(view: CalendarView, date: string): { dateFrom: string; dateTo: string } {
  switch (view) {
    case "month": {
      const grid = monthGridDates(date)
      return { dateFrom: grid[0] ?? date, dateTo: grid[grid.length - 1] ?? date }
    }
    case "week":
    case "list": {
      const monday = startOfWeek(date)
      return { dateFrom: monday, dateTo: shiftDateOnly(monday, 6) }
    }
    default:
      return { dateFrom: date, dateTo: date }
  }
}

/** The previous / next period of a view: a day, a week or a month (the day of month is kept when it exists). */
export function shiftPeriod(view: CalendarView, date: string, delta: 1 | -1): string {
  if (view === "week" || view === "list") return shiftDateOnly(date, 7 * delta)
  if (view === "month") {
    const p = parseDateOnly(date)
    if (!p) return date
    const daysInTarget = new Date(p.year, p.month - 1 + delta + 1, 0).getDate()
    return toDateOnlyString(new Date(p.year, p.month - 1 + delta, Math.min(p.day, daysInTarget)))
  }
  return shiftDateOnly(date, delta)
}

/** "YYYY-MM" of a date (the month view greys out the other months' days). */
export function monthKey(iso: string): string {
  return iso.slice(0, 7)
}

/**
 * The hours a staff member works on `iso`: the day's exception first (off,
 * or special hours without a break), then the weekly row for that weekday;
 * null when the day is off.
 */
export function availabilityForDate(staff: Pick<CalendarStaff, "availability" | "exceptions">, iso: string): Availability | null {
  const exception = staff.exceptions.find((e) => e.date === iso)
  if (exception) {
    if (!exception.is_available) return null
    if (exception.start_time && exception.end_time) {
      return { start_time: exception.start_time, end_time: exception.end_time, break_start: null, break_end: null }
    }
  }
  const weekday = weekdayIndex(iso)
  const row = staff.availability.find((a) => a.day_of_week === weekday)
  if (!row || !row.is_available) return null
  return { start_time: row.start_time, end_time: row.end_time, break_start: row.break_start, break_end: row.break_end }
}

export interface SpecialistRow {
  /** null = the "Unassigned" row (bookings without a staff member). */
  staffId: number | null
  name: string
  availability: Availability | null
  bookings: CalendarBooking[]
}

/**
 * The rows of the Specialists view for one day: every staff member active
 * for bookings (inactive ones only when they have a booking that day, so
 * nothing is hidden), then an "Unassigned" row when some bookings have no
 * staff member.
 */
export function specialistRows(staff: CalendarStaff[], bookings: CalendarBooking[], date: string, unassignedLabel: string): SpecialistRow[] {
  const dayBookings = bookings.filter((b) => b.date === date).sort((a, b) => a.start_time.localeCompare(b.start_time) || a.id - b.id)
  const byStaff = new Map<number | null, CalendarBooking[]>()
  for (const b of dayBookings) {
    const list = byStaff.get(b.staff_id)
    if (list) list.push(b)
    else byStaff.set(b.staff_id, [b])
  }
  const rows: SpecialistRow[] = []
  for (const s of staff) {
    const own = byStaff.get(s.id) ?? []
    if (!s.is_active_for_bookings && own.length === 0) continue
    rows.push({ staffId: s.id, name: s.full_name, availability: availabilityForDate(s, date), bookings: own })
  }
  const unassigned = byStaff.get(null)
  if (unassigned && unassigned.length > 0) rows.push({ staffId: null, name: unassignedLabel, availability: null, bookings: unassigned })
  return rows
}

/** Bookings grouped by their day, each day's list in start order. */
export function bookingsByDate(bookings: CalendarBooking[]): Map<string, CalendarBooking[]> {
  const map = new Map<string, CalendarBooking[]>()
  for (const b of bookings) {
    const list = map.get(b.date)
    if (list) list.push(b)
    else map.set(b.date, [b])
  }
  for (const list of map.values()) list.sort((a, b) => a.start_time.localeCompare(b.start_time) || a.id - b.id)
  return map
}

/** The day's (minute) hours of a time grid: 08:00–20:00, stretched to the earliest start / latest end. */
export function timeGridRange(bookings: { start_time: string; end_time: string }[], minStart = 8 * 60, minEnd = 20 * 60): { start: number; end: number } {
  let start = minStart
  let end = minEnd
  for (const b of bookings) {
    start = Math.min(start, toMinutes(b.start_time))
    end = Math.max(end, toMinutes(b.end_time))
  }
  return { start: Math.floor(start / 60) * 60, end: Math.min(24 * 60, Math.ceil(end / 60) * 60) }
}

export interface Lane<T> {
  item: T
  /** 0-based column inside the overlap group. */
  lane: number
  /** Columns in the overlap group. */
  lanes: number
}

/**
 * Side-by-side columns for bookings that overlap in time (week / day grids):
 * each booking takes the first free lane; a group of overlapping bookings
 * shares its lane count so widths add up.
 */
export function layoutLanes<T extends { start_time: string; end_time: string }>(items: T[]): Lane<T>[] {
  const sorted = [...items].sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time) || toMinutes(b.end_time) - toMinutes(a.end_time))
  const out: Lane<T>[] = []
  let group: { entries: Lane<T>[]; laneEnds: number[]; end: number } | null = null
  for (const item of sorted) {
    const start = toMinutes(item.start_time)
    const end = Math.max(toMinutes(item.end_time), start + 1)
    if (!group || start >= group.end) {
      if (group) for (const e of group.entries) e.lanes = group.laneEnds.length
      group = { entries: [], laneEnds: [], end: 0 }
    }
    let lane = group.laneEnds.findIndex((laneEnd) => laneEnd <= start)
    if (lane === -1) {
      lane = group.laneEnds.length
      group.laneEnds.push(end)
    } else {
      group.laneEnds[lane] = end
    }
    group.end = Math.max(group.end, end)
    const entry: Lane<T> = { item, lane, lanes: 1 }
    group.entries.push(entry)
    out.push(entry)
  }
  if (group) for (const e of group.entries) e.lanes = group.laneEnds.length
  return out
}

/** The wall clock of the business timezone: its day and the minutes since midnight. */
export function nowInTimezone(timeZone: string, now: Date = new Date()): { date: string; minutes: number } {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now)
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00"
    const hour = Number(get("hour")) % 24
    return { date: `${get("year")}-${get("month")}-${get("day")}`, minutes: hour * 60 + Number(get("minute")) }
  } catch {
    return { date: toDateOnlyString(now), minutes: now.getHours() * 60 + now.getMinutes() }
  }
}

function dateFnsLocale(locale: string) {
  return locale.toLowerCase().startsWith("ka") ? ka : enUS
}

function localDate(iso: string): Date {
  const p = parseDateOnly(iso) ?? { year: 1970, month: 1, day: 1 }
  return new Date(p.year, p.month - 1, p.day)
}

/**
 * Short weekday names, Monday first ("MON" … "SUN" / "ორშ" … "კვი"). English
 * is upper-cased like the design; Georgian is left as is (upper-casing it
 * would switch the script to Mtavruli).
 */
export function weekdayShortNames(locale: string): string[] {
  const loc = dateFnsLocale(locale)
  const isKa = loc === ka
  // 2024-01-01 is a Monday
  return Array.from({ length: 7 }, (_, i) => {
    const name = format(new Date(2024, 0, 1 + i), "EEE", { locale: loc })
    return isKa ? name : name.toUpperCase()
  })
}

/** "Tuesday, November 3, 2026" / "სამშაბათი, 3 ნოემბერი, 2026" (list view day headers). */
export function formatLongDate(iso: string, locale: string): string {
  const loc = dateFnsLocale(locale)
  return format(localDate(iso), loc === ka ? "EEEE, d MMMM, yyyy" : "EEEE, MMMM d, yyyy", { locale: loc })
}

/** The title of a view's period: "November 2026", "Nov 1 – 7, 2026", "November 6, 2026". */
export function rangeTitle(view: CalendarView, date: string, locale: string): string {
  const loc = dateFnsLocale(locale)
  const isKa = loc === ka
  if (view === "month") return format(localDate(date), isKa ? "LLLL yyyy" : "LLLL yyyy", { locale: loc })
  if (view === "week" || view === "list") {
    const { dateFrom, dateTo } = visibleRange("week", date)
    const a = localDate(dateFrom)
    const b = localDate(dateTo)
    if (isKa) {
      return a.getMonth() === b.getMonth()
        ? `${format(a, "d", { locale: loc })} – ${format(b, "d MMM, yyyy", { locale: loc })}`
        : `${format(a, "d MMM", { locale: loc })} – ${format(b, "d MMM, yyyy", { locale: loc })}`
    }
    return a.getMonth() === b.getMonth()
      ? `${format(a, "MMM d", { locale: loc })} – ${format(b, "d, yyyy", { locale: loc })}`
      : `${format(a, "MMM d", { locale: loc })} – ${format(b, "MMM d, yyyy", { locale: loc })}`
  }
  return format(localDate(date), isKa ? "d MMMM, yyyy" : "MMMM d, yyyy", { locale: loc })
}

/** "09:30 Whitening – Salome Japaridze" (month / week / day event bars). */
export function eventLabel(b: Pick<CalendarBooking, "start_time" | "service" | "client">): string {
  return `${b.start_time.slice(0, 5)} ${b.service.name_display} – ${b.client.full_name}`
}

/** "{n} ₾" / "{n.nn} ₾" as the design writes money on the calendar. */
export function lari(value: string | number): string {
  const n = Number(value)
  if (!Number.isFinite(n)) return "0 ₾"
  return `${Number.isInteger(n) ? n : n.toFixed(2)} ₾`
}
