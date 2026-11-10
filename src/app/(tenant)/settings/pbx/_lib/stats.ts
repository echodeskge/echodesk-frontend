/**
 * Small helpers shared by the PBX overview and statistics pages.
 */

/**
 * Answer rate of an overview payload as a 0..1 ratio. The backend's
 * `/api/call-stats/overview/` sends `answered_calls` and `total_calls` but no
 * `answer_rate`, so the tile always showed "—": derive it when it is missing.
 */
export function answerRateOf(o: { answer_rate?: number | null; answered_calls?: number; total_calls?: number }): number | null {
  if (typeof o.answer_rate === "number" && !Number.isNaN(o.answer_rate)) return o.answer_rate
  if (!o.total_calls) return null
  return (o.answered_calls ?? 0) / o.total_calls
}

/** "62%" or "—". */
export function formatRate(r: number | null | undefined): string {
  if (r == null || Number.isNaN(r)) return "—"
  return `${Math.round(r * 100)}%`
}

