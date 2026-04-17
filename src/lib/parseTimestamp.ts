/**
 * Parse a server timestamp into a Date, treating naive ISO strings (no `Z`
 * suffix and no `+hh:mm` / `-hh:mm` offset) as UTC.
 *
 * Some backend code paths emit `datetime.now().isoformat()` which produces
 * strings like `"2026-04-17T18:30:00"` — browsers interpret those as the
 * viewer's local timezone, so a user in GMT+4 would see messages 4 hours in
 * the past. By coercing those to UTC we stay correct regardless of where
 * the agent is viewing from.
 *
 * Accepts strings, numbers (epoch ms), Date, or null/undefined (→ now).
 */
export function parseTimestamp(value: string | number | Date | null | undefined): Date {
  if (value == null) return new Date();
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date(value);

  const s = value.trim();
  // Timezone indicator present: Z (UTC) or ±hh:mm offset at the end
  if (/Z$|[+-]\d{2}:?\d{2}$/.test(s)) return new Date(s);
  // Looks like an ISO-ish string without a tz indicator — treat as UTC
  // to match the server's intent. Handles both T-separated and space-separated
  // forms, e.g. "2026-04-17T18:30:00", "2026-04-17 18:30:00".
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(s)) {
    return new Date(s.replace(' ', 'T') + 'Z');
  }
  // Fallback for anything else (e.g. RFC 2822 date strings) — let the browser decide.
  return new Date(s);
}
