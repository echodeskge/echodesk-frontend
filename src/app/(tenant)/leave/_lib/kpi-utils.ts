/** Pure helpers for the KPI page (unit-tested in tests/unit/leave). */

/** Accepts "12", "12.5", "0" — the API stores decimals with two places, min 0. */
export function isValidKpiNumber(value: string): boolean {
  const v = value.trim()
  if (!/^\d+(\.\d{1,2})?$/.test(v)) return false
  return Number.isFinite(Number(v))
}

/** "120 calls" / "—" for a decimal-string amount with its unit. */
export function formatKpiValue(value: string | null | undefined, unit: string): string {
  if (value === null || value === undefined || value === "") return "—"
  const n = Number(value)
  const shown = Number.isFinite(n) ? String(Number(n.toFixed(2))) : value
  return unit ? `${shown} ${unit}` : shown
}

export interface KpiSummary {
  total: number
  approved: number
  pending: number
  met: number
}

export function summarizeKpis(
  goals: { status: string; target_met: boolean | null }[]
): KpiSummary {
  return {
    total: goals.length,
    approved: goals.filter((g) => g.status === "approved").length,
    pending: goals.filter((g) => g.status === "pending").length,
    met: goals.filter((g) => g.target_met === true).length,
  }
}

/** Read `?id=<n>` from a query string; null when missing/invalid. */
export function deepLinkId(search: string): number | null {
  const raw = new URLSearchParams(search).get("id")
  if (!raw || !/^\d+$/.test(raw)) return null
  return Number(raw)
}
