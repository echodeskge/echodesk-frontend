/** Pure helpers for the staff day timeline (kept out of the component for tests). */

export interface Availability {
  start_time: string
  end_time: string
  break_start?: string | null
  break_end?: string | null
}

export interface TimelineBooking {
  start_time: string
  end_time: string
}

/** "09:30" or "09:30:00" → minutes since midnight. */
export function toMinutes(value: string): number {
  const [h, m] = value.split(":").map(Number)
  return h * 60 + (m || 0)
}

/** 570 → "09:30" */
export function fromMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

/**
 * The hours the timeline shows: from the earliest working start / booking to
 * the latest end, rounded out to whole hours, never narrower than 09:00–18:00.
 */
export function timelineRange(
  rows: { availability: Availability | null; bookings: TimelineBooking[] }[]
): { start: number; end: number } {
  let start = 9 * 60
  let end = 18 * 60
  for (const row of rows) {
    if (row.availability) {
      start = Math.min(start, toMinutes(row.availability.start_time))
      end = Math.max(end, toMinutes(row.availability.end_time))
    }
    for (const booking of row.bookings) {
      start = Math.min(start, toMinutes(booking.start_time))
      end = Math.max(end, toMinutes(booking.end_time))
    }
  }
  start = Math.floor(start / 60) * 60
  end = Math.min(24 * 60, Math.ceil(end / 60) * 60)
  return { start, end }
}

/** Blocks of the day (within [rangeStart, rangeEnd]) when the staff member is not working. */
export function nonWorkingBlocks(
  availability: Availability | null,
  rangeStart: number,
  rangeEnd: number
): { start: number; end: number; kind: "off" | "break" }[] {
  if (!availability) return [{ start: rangeStart, end: rangeEnd, kind: "off" }]
  const blocks: { start: number; end: number; kind: "off" | "break" }[] = []
  const workStart = toMinutes(availability.start_time)
  const workEnd = toMinutes(availability.end_time)
  if (workStart > rangeStart) blocks.push({ start: rangeStart, end: Math.min(workStart, rangeEnd), kind: "off" })
  if (workEnd < rangeEnd) blocks.push({ start: Math.max(workEnd, rangeStart), end: rangeEnd, kind: "off" })
  if (availability.break_start && availability.break_end) {
    blocks.push({ start: toMinutes(availability.break_start), end: toMinutes(availability.break_end), kind: "break" })
  }
  return blocks.filter((b) => b.end > b.start)
}

/** Is `minute` inside the working hours (and not in the break)? */
export function isWorkingAt(availability: Availability | null, minute: number): boolean {
  if (!availability) return false
  if (minute < toMinutes(availability.start_time) || minute >= toMinutes(availability.end_time)) return false
  if (availability.break_start && availability.break_end) {
    if (minute >= toMinutes(availability.break_start) && minute < toMinutes(availability.break_end)) return false
  }
  return true
}

/** Snap a pixel offset in the timeline to the start of a `step`-minute slot. */
export function minuteAtOffset(offsetPx: number, pxPerMinute: number, rangeStart: number, step: number): number {
  const raw = rangeStart + offsetPx / pxPerMinute
  return rangeStart + Math.floor((raw - rangeStart) / step) * step
}

/** Does a booking match the search box (client name, phone, booking number)? */
export function bookingMatches(
  booking: { booking_number: string; client: { full_name: string; phone_number?: string } },
  query: string
): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const digits = q.replace(/\D/g, "")
  const phone = (booking.client.phone_number || "").replace(/\D/g, "")
  return (
    booking.client.full_name.toLowerCase().includes(q) ||
    booking.booking_number.toLowerCase().includes(q) ||
    (digits.length > 0 && phone.includes(digits))
  )
}
