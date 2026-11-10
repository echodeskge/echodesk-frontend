/**
 * Date range helpers of the rating statistics page.
 *
 * The page used `date.toISOString().split('T')[0]` on local-midnight dates.
 * `toISOString()` is UTC, so east of UTC (Tbilisi is UTC+4) the 1st of the
 * month became the last day of the previous month, and between 00:00 and
 * 04:00 "today" became yesterday. These helpers format the local calendar
 * date instead.
 */

/** `YYYY-MM-DD` of the local calendar day of `d`. */
export function toLocalIsoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/** 1st of this month .. today. */
export function thisMonthRange(now: Date = new Date()): { start: string; end: string } {
  return {
    start: toLocalIsoDate(new Date(now.getFullYear(), now.getMonth(), 1)),
    end: toLocalIsoDate(now),
  }
}

/** 1st .. last day of the previous month. */
export function lastMonthRange(now: Date = new Date()): { start: string; end: string } {
  return {
    start: toLocalIsoDate(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
    end: toLocalIsoDate(new Date(now.getFullYear(), now.getMonth(), 0)),
  }
}
