/** Pure helpers for the substitutes screens (unit-tested in tests/unit/leave/w2-*.test.ts). */
import type { HistoryEvent, SubstituteInput } from "./hr-api"

export const SUBSTITUTE_TASK_MAX = 300
export const SUBSTITUTES_MAX = 50

/** An editable substitute row (user not chosen yet = null). */
export interface SubstituteDraftRow {
  substitute: number | null
  task: string
}

export type SubstituteRowsError = "empty" | "missingUser" | "missingTask" | "taskTooLong" | "duplicate" | "self" | "tooMany"

/**
 * Client-side check mirroring echodesk-back substitutes.clean_rows:
 * every row has a user and a 1-300 char task, each user once, not yourself.
 * `allowEmpty` lets the "My substitutes" editor save an empty list.
 */
export function validateSubstituteRows(
  rows: SubstituteDraftRow[],
  opts: { selfId?: number; allowEmpty?: boolean } = {}
): SubstituteRowsError | null {
  if (rows.length === 0) return opts.allowEmpty ? null : "empty"
  if (rows.length > SUBSTITUTES_MAX) return "tooMany"
  const seen = new Set<number>()
  for (const row of rows) {
    if (row.substitute === null) return "missingUser"
    const task = row.task.trim()
    if (!task) return "missingTask"
    if (task.length > SUBSTITUTE_TASK_MAX) return "taskTooLong"
    if (opts.selfId !== undefined && row.substitute === opts.selfId) return "self"
    if (seen.has(row.substitute)) return "duplicate"
    seen.add(row.substitute)
  }
  return null
}

/** Rows -> API payload (`[{substitute, task}]`), dropping incomplete rows and trimming tasks. */
export function buildSubstitutesPayload(rows: SubstituteDraftRow[]): SubstituteInput[] {
  return rows
    .filter((r): r is { substitute: number; task: string } => r.substitute !== null && r.task.trim() !== "")
    .map((r) => ({ substitute: r.substitute, task: r.task.trim() }))
}

/** Known audit actions that have their own label (`leave.hr.detail.history.<key>`). */
const HISTORY_KEYS = new Set([
  "request_created",
  "request_status_changed",
  "substitute_snapshot",
  "substitute_accepted",
  "substitute_rejected",
  "substitute_skipped",
  "substitute_worked_days_set",
])

/** i18n key (under `leave`) for a history event; unknown events map to `other`. */
export function historyActionKey(event: Pick<HistoryEvent, "kind" | "action">): string {
  const key = `${event.kind}_${event.action}`
  return `hr.detail.history.${HISTORY_KEYS.has(key) ? key : "other"}`
}

/** Optional free-text note carried by a history event (comment / reason). */
export function historyNote(event: Pick<HistoryEvent, "data">): string {
  const data = event.data || {}
  const value = data.comment ?? data.reason
  return typeof value === "string" ? value.trim() : ""
}

/** Positive integer `id` from a query string (`?id=12`), else null. */
export function parseIdParam(search: string): number | null {
  const raw = new URLSearchParams(search).get("id")
  if (!raw || !/^\d+$/.test(raw)) return null
  const n = Number(raw)
  return n > 0 ? n : null
}

/** Field errors of a DRF 400 body, joined per field (`{leave_type: ["x"]}` -> `{leave_type: "x"}`). */
export function fieldErrors(error: unknown): Record<string, string> {
  const data = (error as { response?: { status?: number; data?: unknown } } | null)?.response?.data
  if (!data || typeof data !== "object" || Array.isArray(data)) return {}
  const out: Record<string, string> = {}
  const flatten = (value: unknown): string[] => {
    if (typeof value === "string") return [value]
    if (Array.isArray(value)) return value.flatMap(flatten)
    if (value && typeof value === "object") return Object.values(value).flatMap(flatten)
    return []
  }
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const messages = flatten(value).filter(Boolean)
    if (messages.length) out[key] = messages.join(" ")
  }
  return out
}
