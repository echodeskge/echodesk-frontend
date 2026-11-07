/**
 * Hand-written client for the optional HR features of leave management
 * (substitutes, KPI, payroll, attendance). The generated client does not
 * have these endpoints yet, so they are called through the shared axios
 * instance. Shapes mirror echodesk-back/leave_management serializers.
 */
import axios from "@/api/axios"
import { filenameFromContentDisposition } from "@/lib/downloadBlob"

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

export interface Paginated<T> {
  count?: number
  next?: string | null
  previous?: string | null
  results: T[]
}

/** Accepts either a bare array or a DRF paginated payload. */
export function unwrapList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]
  const results = (data as { results?: unknown } | null | undefined)?.results
  return Array.isArray(results) ? (results as T[]) : []
}

/** `leave_features` block of GET /api/auth/profile/ (null without the leave feature). */
export interface LeaveFeatures {
  substitutes: boolean
  substitution_pay: boolean
  payroll: boolean
  payroll_self_view: boolean
  kpi: boolean
  attendance: boolean
  can_manage_payroll: boolean
  pending_substitute_count: number
}

export type LeaveFeatureKey = Exclude<keyof LeaveFeatures, "pending_substitute_count">

/** Minimal user row used by pickers (`/api/users/?lite=1`). */
export interface LiteUser {
  id: number
  email: string
  first_name?: string
  last_name?: string
  full_name?: string
  job_title?: string
  is_active?: boolean
  department?: { id: number; name: string } | null
  manager?: number | null
}

export function userLabel(u: Pick<LiteUser, "email" | "full_name" | "first_name" | "last_name">): string {
  const name = u.full_name || [u.first_name, u.last_name].filter(Boolean).join(" ")
  return name.trim() || u.email
}

export async function fetchLiteUsers(params: Record<string, unknown> = {}): Promise<LiteUser[]> {
  const res = await axios.get("/api/users/", {
    params: { lite: 1, page_size: 200, is_active: true, ...params },
  })
  return unwrapList<LiteUser>(res.data)
}

// ---------------------------------------------------------------------------
// Leave requests (detail with substitutes + audit history)
// ---------------------------------------------------------------------------

export type LeaveRequestStatus =
  | "awaiting_substitutes"
  | "pending"
  | "manager_approved"
  | "hr_approved"
  | "approved"
  | "rejected"
  | "cancelled"

export type SubstituteStatus = "pending" | "accepted" | "rejected" | "skipped"

export interface RequestSubstitute {
  id: number
  substitute: number
  substitute_name: string
  substitute_email: string
  task: string
  status: SubstituteStatus
  responded_at: string | null
  comment: string
}

export interface HistoryEvent {
  id: number
  kind: string
  action: string
  from_status: string
  to_status: string
  actor: number | null
  actor_name: string | null
  data: Record<string, unknown>
  created_at: string
}

export interface LeaveRequestDetail {
  id: number
  employee: number
  employee_name: string
  employee_email?: string
  leave_type: number
  leave_type_details?: { id: number; name?: unknown; name_display?: string; code?: string; color?: string; is_paid?: boolean }
  start_date: string
  end_date: string
  total_days: string
  reason: string
  status: LeaveRequestStatus | string
  status_display?: string
  manager_approver_name?: string | null
  manager_approved_at?: string | null
  manager_comments?: string
  hr_approver_name?: string | null
  hr_approved_at?: string | null
  hr_comments?: string
  final_approver_name?: string | null
  final_approved_at?: string | null
  final_comments?: string
  rejected_by_name?: string | null
  rejected_at?: string | null
  rejection_reason?: string
  cancelled_at?: string | null
  cancellation_reason?: string
  substitutes?: RequestSubstitute[]
  substitutes_skipped_by?: number | null
  substitutes_skipped_by_name?: string | null
  substitutes_skipped_at?: string | null
  substitutes_skip_reason?: string
  history?: HistoryEvent[]
  created_at: string
  updated_at?: string
}

/** Which detail endpoint to read a request from. */
export type LeaveRequestScope = "employee" | "manager" | "admin" | "covering"

const DETAIL_BASE: Record<LeaveRequestScope, string> = {
  employee: "/api/leave/employee/my-requests/",
  manager: "/api/leave/manager/team-requests/",
  admin: "/api/leave/admin/leave-requests/",
  covering: "/api/leave/employee/covering/",
}

export async function fetchLeaveRequestDetail(
  scope: LeaveRequestScope,
  id: number,
  lang?: string
): Promise<LeaveRequestDetail> {
  const res = await axios.get(`${DETAIL_BASE[scope]}${id}/`, { params: lang ? { lang } : undefined })
  return res.data
}

export async function skipSubstitutes(id: number, reason: string): Promise<LeaveRequestDetail> {
  const res = await axios.post(`/api/leave/admin/leave-requests/${id}/skip-substitutes/`, { reason })
  return res.data
}

// ---------------------------------------------------------------------------
// Settings / leave types / holidays
// ---------------------------------------------------------------------------

export type PayrollMode = "gross" | "net"

export interface HrSettingsFields {
  substitutes_enabled: boolean
  substitution_pay_enabled: boolean
  payroll_enabled: boolean
  payroll_self_view_enabled: boolean
  kpi_enabled: boolean
  attendance_grid_enabled: boolean
  auto_georgian_holidays: boolean
  block_deactivation_with_open_requests: boolean
  payroll_mode: PayrollMode
  income_tax_rate: string
  pension_rate: string
  payroll_currency: string
  payroll_managers: number[]
}

export interface LoadGeorgianHolidaysResult {
  year: number
  created: string[]
  skipped: string[]
}

export async function loadGeorgianHolidays(year: number): Promise<LoadGeorgianHolidaysResult> {
  const res = await axios.post("/api/leave/admin/public-holidays/load-georgian/", { year })
  return res.data
}

// ---------------------------------------------------------------------------
// Substitutes
// ---------------------------------------------------------------------------

export interface SubstituteAssignment {
  id: number
  substitute: number
  substitute_name: string
  substitute_email: string
  task: string
  sort_order: number
}

export interface SubstituteInput {
  substitute: number
  task: string
}

export async function fetchMySubstitutes(): Promise<SubstituteAssignment[]> {
  const res = await axios.get("/api/leave/employee/my-substitutes/")
  return unwrapList<SubstituteAssignment>(res.data)
}

export async function replaceMySubstitutes(items: SubstituteInput[]): Promise<SubstituteAssignment[]> {
  const res = await axios.put("/api/leave/employee/my-substitutes/replace/", { items })
  return unwrapList<SubstituteAssignment>(res.data)
}

export interface CoveringRequest {
  id: number
  employee: number
  employee_name: string
  leave_type: number
  leave_type_name: string
  leave_type_color: string
  start_date: string
  end_date: string
  total_days: string
  status: LeaveRequestStatus | string
  my_row_id: number | null
  my_task: string | null
  my_status: SubstituteStatus | null
  created_at: string
}

export async function fetchCovering(state: "awaiting" | "all", lang?: string): Promise<CoveringRequest[]> {
  const res = await axios.get("/api/leave/employee/covering/", {
    params: { state, lang, page_size: 100 },
  })
  return unwrapList<CoveringRequest>(res.data)
}

export async function respondCovering(
  id: number,
  action: "accept" | "reject",
  comment: string
): Promise<LeaveRequestDetail> {
  const res = await axios.post(`/api/leave/employee/covering/${id}/respond/`, { action, comment })
  return res.data
}

// ---------------------------------------------------------------------------
// KPI
// ---------------------------------------------------------------------------

export type KpiStatus = "draft" | "pending" | "approved" | "returned"
export type KpiDirection = "higher" | "lower"
export type KpiScope = "mine" | "team" | "all"

export interface KpiGoal {
  id: number
  employee: number
  employee_name: string
  period: string
  title: string
  target: string
  unit: string
  direction: KpiDirection
  actual: string | null
  employee_note: string
  manager_feedback: string
  status: KpiStatus
  percent: string | null
  target_met: boolean | null
  submitted_at: string | null
  reviewed_at: string | null
  reviewed_by: number | null
  reviewed_by_name: string | null
  created_by: number | null
  created_by_name: string | null
  created_at: string
  updated_at: string
  can_edit_target: boolean
  can_submit: boolean
  can_review: boolean
  history: HistoryEvent[]
}

export interface KpiTargetInput {
  employee?: number
  period?: string
  title: string
  target: string
  unit: string
  direction: KpiDirection
}

export async function fetchKpis(params: {
  scope: KpiScope
  period?: string
  employee?: number
  status?: KpiStatus
}): Promise<KpiGoal[]> {
  const res = await axios.get("/api/leave/kpis/", { params: { ...params, page_size: 200 } })
  return unwrapList<KpiGoal>(res.data)
}

export async function fetchKpi(id: number): Promise<KpiGoal> {
  return (await axios.get(`/api/leave/kpis/${id}/`)).data
}

export async function createKpi(data: KpiTargetInput): Promise<KpiGoal> {
  return (await axios.post("/api/leave/kpis/", data)).data
}

export async function updateKpi(id: number, data: Partial<KpiTargetInput>): Promise<KpiGoal> {
  return (await axios.patch(`/api/leave/kpis/${id}/`, data)).data
}

export async function deleteKpi(id: number): Promise<void> {
  await axios.delete(`/api/leave/kpis/${id}/`)
}

export async function submitKpi(id: number, actual: string, note: string): Promise<KpiGoal> {
  return (await axios.post(`/api/leave/kpis/${id}/submit/`, { actual, note })).data
}

export async function approveKpi(id: number, feedback = ""): Promise<KpiGoal> {
  return (await axios.post(`/api/leave/kpis/${id}/approve/`, { feedback })).data
}

export async function returnKpi(id: number, feedback: string): Promise<KpiGoal> {
  return (await axios.post(`/api/leave/kpis/${id}/return/`, { feedback })).data
}

export async function copyPreviousKpis(period: string): Promise<KpiGoal[]> {
  return unwrapList<KpiGoal>((await axios.post("/api/leave/kpis/copy-previous/", { period })).data)
}

// ---------------------------------------------------------------------------
// Attendance
// ---------------------------------------------------------------------------

export type AttendanceDayKind = "working" | "weekend" | "holiday"

export interface AttendanceDay {
  date: string
  kind: AttendanceDayKind
  holiday_name: string | null
}

export interface AttendanceLegendItem {
  code: string
  leave_type: number
  name: string
  color: string
  is_paid: boolean
}

export interface AttendanceGrid {
  period: string
  days: AttendanceDay[]
  rows: { user: { id: number; name: string; department: string | null }; cells: Record<string, string> }[]
  legend: AttendanceLegendItem[]
}

export async function fetchAttendance(params: {
  period: string
  department?: number | string
  lang?: string
}): Promise<AttendanceGrid> {
  return (await axios.get("/api/leave/manager/attendance/", { params })).data
}

// ---------------------------------------------------------------------------
// Payroll
// ---------------------------------------------------------------------------

export interface PayrollRow {
  user: number
  name: string
  email: string
  job_title: string
  currency: string
  monthly_salary: string | null
  working_days: number
  scheduled_days: number
  worked_to_date: number
  paid_leave_days: string | number
  unpaid_days: string | number
  base_pay: string
  substitution_pay: string
  other_currency_substitution_pay: Record<string, string>
  gross: string
  pension?: string
  income_tax?: string
  net?: string
}

export interface PayrollTotals {
  base_pay: string
  substitution_pay: string
  gross: string
  pension?: string
  income_tax?: string
  net?: string
}

export interface PayrollReport {
  period: string
  mode: PayrollMode
  currency: string
  income_tax_rate: string
  pension_rate: string
  working_days: number
  locked: boolean
  locked_at?: string | null
  locked_by?: number | null
  generated_at: string
  rows: PayrollRow[]
  totals: Record<string, PayrollTotals>
}

export async function fetchPayrollReport(period: string): Promise<PayrollReport> {
  return (await axios.get("/api/leave/payroll/report/", { params: { period } })).data
}

export async function fetchPayrollCsv(
  period: string,
  lang: string
): Promise<{ blob: Blob; filename: string }> {
  const res = await axios.get("/api/leave/payroll/report/export/", {
    params: { period, lang },
    responseType: "blob",
  })
  const header = (res.headers as Record<string, string | undefined>)["content-disposition"]
  return {
    blob: res.data as Blob,
    filename: filenameFromContentDisposition(header, `payroll_${period}.csv`),
  }
}

export interface Compensation {
  id: number
  user: number
  user_name: string
  monthly_salary: string
  currency: string
  effective_from: string
  note: string
  created_by: number | null
  created_at: string
}

export async function fetchCompensations(user?: number): Promise<Compensation[]> {
  const res = await axios.get("/api/leave/payroll/compensations/", {
    params: { user, page_size: 200 },
  })
  return unwrapList<Compensation>(res.data)
}

export async function createCompensation(data: {
  user: number
  monthly_salary: string
  currency: string
  effective_from: string
  note?: string
}): Promise<Compensation> {
  return (await axios.post("/api/leave/payroll/compensations/", data)).data
}

export async function deleteCompensation(id: number): Promise<void> {
  await axios.delete(`/api/leave/payroll/compensations/${id}/`)
}

export interface PayrollRun {
  id: number
  period: string
  mode: PayrollMode
  is_locked: boolean
  locked_by: number | null
  locked_by_name: string | null
  locked_at: string | null
  unlocked_by: number | null
  unlocked_at: string | null
  unlock_reason: string
}

export async function fetchPayrollRuns(): Promise<PayrollRun[]> {
  return unwrapList<PayrollRun>((await axios.get("/api/leave/payroll/runs/", { params: { page_size: 200 } })).data)
}

export async function lockPayrollMonth(period: string): Promise<PayrollRun> {
  return (await axios.post("/api/leave/payroll/runs/lock/", { period })).data
}

export async function unlockPayrollRun(id: number, reason: string): Promise<PayrollRun> {
  return (await axios.post(`/api/leave/payroll/runs/${id}/unlock/`, { reason })).data
}

export interface MyPayroll {
  period: string
  mode: PayrollMode
  locked: boolean
  row: PayrollRow | null
  substitutions: {
    leave_request: number
    employee_name: string
    task: string
    /** Worked dates in the period (views_payroll.py MyPayrollViewSet.list). */
    days: string[]
    amount: string | null
    currency: string
  }[]
}

export async function fetchMyPayroll(period: string): Promise<MyPayroll> {
  return (await axios.get("/api/leave/payroll/my/", { params: { period } })).data
}

export type RateMode = "day" | "month"

export interface SubstitutionRate {
  id: number
  owner: number
  owner_name: string
  substitute: number
  substitute_name: string
  task: string
  rate: { mode: RateMode; amount: string; currency: string } | null
}

export async function fetchSubstitutionRates(owner?: number): Promise<SubstitutionRate[]> {
  const res = await axios.get("/api/leave/payroll/substitution-rates/", {
    params: { owner, page_size: 200 },
  })
  return unwrapList<SubstitutionRate>(res.data)
}

export async function setSubstitutionRate(
  id: number,
  data: { mode: RateMode; amount: string; currency?: string }
): Promise<SubstitutionRate> {
  return (await axios.put(`/api/leave/payroll/substitution-rates/${id}/rate/`, data)).data
}

export async function deleteSubstitutionRate(id: number): Promise<void> {
  await axios.delete(`/api/leave/payroll/substitution-rates/${id}/rate/`)
}

export interface CoverageRow {
  id: number
  leave_request: number
  employee: number
  employee_name: string
  start_date: string
  end_date: string
  request_status: string
  substitute: number
  substitute_name: string
  task: string
  status: SubstituteStatus
  rate_mode: RateMode | null
  rate_amount: string | null
  rate_currency: string | null
  worked_days: string[]
  totals_by_month: Record<string, string>
  workable_days: string[]
  worked_confirmed_by: number | null
  worked_confirmed_by_name: string | null
  worked_confirmed_at: string | null
}

export async function fetchCoverage(params: {
  period?: string
  substitute?: number
  leave_request?: number
}): Promise<CoverageRow[]> {
  const res = await axios.get("/api/leave/payroll/coverage/", { params: { ...params, page_size: 200 } })
  return unwrapList<CoverageRow>(res.data)
}

export async function setCoverageWorkedDays(id: number, days: string[]): Promise<CoverageRow> {
  return (await axios.post(`/api/leave/payroll/coverage/${id}/worked-days/`, { days })).data
}
