/** `?client=<id>` (the booking detail's client link) → a positive integer id, or null. */
export function parseClientParam(raw: string | null | undefined): number | null {
  if (!raw || !/^\d+$/.test(raw)) return null
  const n = Number(raw)
  return Number.isSafeInteger(n) && n > 0 ? n : null
}
