/** Pure helpers for the LV-03 HR pages (KPI, attendance, payroll). Unit-tested in tests/unit/leave/lv03-*. */
import type { KpiTone } from "./hr-utils"

/** Progress bar fill per KPI tone (good green / warn amber / bad red / none muted). */
export const KPI_BAR_CLASS: Record<KpiTone, string> = {
  good: "bg-green-600 dark:bg-green-500",
  warn: "bg-amber-500",
  bad: "bg-destructive",
  none: "bg-muted-foreground/30",
}

/** Share of goals that met their target, as a rounded "40%" label ("0%" for no goals). */
export function kpiMetShare(summary: { total: number; met: number }): string {
  if (summary.total <= 0) return "0%"
  return `${Math.round((summary.met / summary.total) * 100)}%`
}

interface KpiActionFlags {
  can_submit: boolean
  can_review: boolean
  can_edit_target: boolean
  status: string
}

/**
 * Grid track for the KPI row actions. Every row is its own grid, so the column
 * needs one fixed width that fits the widest row's buttons (labels are longer
 * in Georgian).
 */
export function kpiActionsWidth<T extends KpiActionFlags>(
  goals: T[],
  canDelete: (goal: T) => boolean,
  locale = "en"
): string {
  const scale = locale === "ka" ? 1.25 : 1
  let widest = 0
  for (const g of goals) {
    let w = 0
    if (g.can_review) w += 190 * scale
    if (g.can_submit) w += (w ? 6 : 0) + 120 * scale
    if (g.can_edit_target) w += (w ? 6 : 0) + 28
    if (canDelete(g)) w += (w ? 6 : 0) + 28
    widest = Math.max(widest, w)
  }
  return `${Math.max(64, Math.ceil(widest))}px`
}

/**
 * Totals per month of a coverage row, current period first, others after
 * (sorted). Used for the worked-days "pay by month" cell and its tooltip.
 */
export function coverageMonthTotals(
  totals: Record<string, string> | null | undefined,
  period: string
): { current: string | null; others: { period: string; amount: string }[] } {
  const map = totals ?? {}
  const others = Object.keys(map)
    .filter((m) => m !== period)
    .sort()
    .map((m) => ({ period: m, amount: map[m] }))
  return { current: period in map ? map[period] : null, others }
}
