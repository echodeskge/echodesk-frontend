/** Pure helpers for the attendance grid (unit-tested in tests/unit/leave). */
import type { AttendanceDay, AttendanceLegendItem } from "./hr-api"

export type AttendanceCellKind = "worked" | "leave" | "off" | "future" | "not_employed" | "unknown"

export interface AttendanceCell {
  kind: AttendanceCellKind
  /** Legend entry for leave cells. */
  legend?: AttendanceLegendItem
}

/** Classify an API cell code (`worked`, `future`, `off`, `not_employed`, `leave:<id>`). */
export function classifyAttendanceCell(
  code: string | undefined,
  legendByCode: Map<string, AttendanceLegendItem>
): AttendanceCell {
  if (!code) return { kind: "unknown" }
  if (code.startsWith("leave:")) return { kind: "leave", legend: legendByCode.get(code) }
  if (code === "worked" || code === "off" || code === "future" || code === "not_employed") {
    return { kind: code }
  }
  return { kind: "unknown" }
}

/** Day of month (1-31) from a YYYY-MM-DD string, without timezone shifts. */
export function dayOfMonth(isoDate: string): number {
  return Number(isoDate.slice(8, 10))
}

/** Weekend and holiday columns are rendered muted. */
export function isMutedDay(day: Pick<AttendanceDay, "kind">): boolean {
  return day.kind !== "working"
}

/** Count leave / worked days per row for the summary column. */
export function summarizeCells(cells: Record<string, string>): { worked: number; leave: number } {
  let worked = 0
  let leave = 0
  for (const code of Object.values(cells)) {
    if (code === "worked") worked += 1
    else if (code.startsWith("leave:")) leave += 1
  }
  return { worked, leave }
}

/** Sorted unique department names from the grid rows (for the client-side fallback filter). */
export function departmentNames(rows: { user: { department: string | null } }[]): string[] {
  return Array.from(new Set(rows.map((r) => r.user.department).filter((d): d is string => !!d))).sort()
}
