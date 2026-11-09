/**
 * Pure helpers for the LV-04 configuration pages (leave types, public
 * holidays, /settings/leave). No React, no clock: easy to unit test.
 */

/** Calendar year of a "YYYY-MM-DD" date string (no Date parsing), or null. */
export function yearOf(date: string | null | undefined): number | null {
  const m = /^(\d{4})-\d{2}-\d{2}/.exec(date ?? "")
  return m ? Number(m[1]) : null
}

/** Distinct years present in a holiday list, ascending. */
export function holidayYears(holidays: { date: string }[]): number[] {
  const set = new Set<number>()
  for (const h of holidays) {
    const y = yearOf(h.date)
    if (y !== null) set.add(y)
  }
  return [...set].sort((a, b) => a - b)
}

/** Holidays of one year (`"all"` keeps every holiday). Order is preserved. */
export function filterHolidaysByYear<T extends { date: string }>(holidays: T[], year: string): T[] {
  if (year === "all") return holidays
  const y = Number(year)
  return holidays.filter((h) => yearOf(h.date) === y)
}

/**
 * Stable fingerprint of the settings form, used to tell whether there are
 * unsaved changes. Array order does not matter (weekend days, managers).
 */
export function settingsFingerprint(form: object, hr: object): string {
  const norm = (o: object) =>
    Object.keys(o)
      .sort()
      .map((k) => {
        const v = (o as Record<string, unknown>)[k]
        return [k, Array.isArray(v) ? [...v].map(String).sort() : v]
      })
  return JSON.stringify([norm(form), norm(hr)])
}
