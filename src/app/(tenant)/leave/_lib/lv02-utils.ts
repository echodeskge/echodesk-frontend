/**
 * Pure helpers for the LV-02 pages (team requests, all requests, covering,
 * request detail). Unit-tested in tests/unit/leave/lv02-utils.test.ts.
 */
import type { LeaveRequestDetail } from "./hr-api"

/** The list fields the approvals pages filter on. */
export interface RequestListRow {
  id: number
  employee: number
  employee_name: string
  leave_type_name: string
  status: string
}

/**
 * Whether the signed-in user may approve / reject a team request: only
 * pending requests, and nobody but a superuser decides on their own leave.
 */
export function canDecideRequest(
  request: Pick<RequestListRow, "status" | "employee">,
  userId: number | null | undefined,
  isSuperuser: boolean
): boolean {
  return request.status === "pending" && (isSuperuser || request.employee !== userId)
}

/**
 * The three team-requests figures. `approved` keeps the existing rule: every
 * status containing "approved" (manager / HR / final approval).
 */
export function teamRequestStats(rows: Pick<RequestListRow, "status">[], totalCount: number) {
  return {
    pending: rows.filter((r) => r.status === "pending").length,
    total: totalCount,
    approved: rows.filter((r) => r.status.includes("approved")).length,
  }
}

/** Case-insensitive match of the search text on the employee or the leave type name. */
export function matchesRequestSearch(row: Pick<RequestListRow, "employee_name" | "leave_type_name">, query: string): boolean {
  const q = query.trim().toLocaleLowerCase()
  if (!q) return true
  return (
    (row.employee_name || "").toLocaleLowerCase().includes(q) ||
    (row.leave_type_name || "").toLocaleLowerCase().includes(q)
  )
}

export type TeamFilter = "pending" | "all"

/** Team requests shown for a toolbar filter + search (client-side over the loaded page). */
export function filterTeamRequests<T extends RequestListRow>(rows: T[], filter: TeamFilter, query: string): T[] {
  return rows.filter((r) => (filter === "all" || r.status === "pending") && matchesRequestSearch(r, query))
}

/** One step of the approval timeline in the request detail. */
export interface ApprovalStep {
  key: "manager" | "hr" | "final" | "rejected"
  name: string
  at: string | null
  note: string
}

/** Approval steps that happened (an approver name is set), in workflow order. */
export function approvalSteps(detail: LeaveRequestDetail): ApprovalStep[] {
  const steps: ApprovalStep[] = [
    { key: "manager", name: detail.manager_approver_name || "", at: detail.manager_approved_at ?? null, note: detail.manager_comments || "" },
    { key: "hr", name: detail.hr_approver_name || "", at: detail.hr_approved_at ?? null, note: detail.hr_comments || "" },
    { key: "final", name: detail.final_approver_name || "", at: detail.final_approved_at ?? null, note: detail.final_comments || "" },
    { key: "rejected", name: detail.rejected_by_name || "", at: detail.rejected_at ?? null, note: detail.rejection_reason || "" },
  ]
  return steps.filter((s) => s.name)
}

/** The leave type's display name from the detail payload (localised name, raw name, then code). */
export function detailTypeName(detail: LeaveRequestDetail | null | undefined): string {
  const lt = detail?.leave_type_details
  return lt?.name_display || (typeof lt?.name === "string" ? lt.name : "") || lt?.code || ""
}

/** True for an HTTP 403 (the list is not for this user's role), as opposed to a failed load. */
export function isForbidden(error: unknown): boolean {
  return (error as { response?: { status?: number } } | null | undefined)?.response?.status === 403
}
