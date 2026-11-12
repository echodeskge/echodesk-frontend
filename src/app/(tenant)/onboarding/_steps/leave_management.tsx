"use client"

import { useTranslations } from "next-intl"
import { UserCheck, Users, UsersRound } from "lucide-react"
import { SectionCard } from "@/components/redesign/section-card"
import { Segmented } from "@/components/redesign/segmented"
import { cn } from "@/lib/utils"
import type { OnboardingStep } from "../_lib/onboarding-api"
import { errorAt, listErrorAt, rowErrorsAt } from "../_lib/nested-errors"
import { EditableTable, MultiChoiceCards, NumberField, SelectField, Toggle, UsersPicker, inputClass, pickerUserLabel, type PickerUser } from "../_components/fields"
import type { StepComponentProps, StepDefinition } from "./types"

/**
 * SCHEMAS.md `leave_management`:
 * {"working_days_per_week": int, "weekend_days": [int]  (0 = Monday), "auto_georgian_holidays": bool,
 *  "leave_types": [{code, name: I18n, is_paid, calculation_method: "annual"|"accrual"|"manual", days_per_year,
 *                   carry_forward_max_days, carry_forward_expiry_months, color}],
 *  "approval": "manager"|"hr"|"both", "org": [{user_id, manager_id, department}],
 *  "allow_negative_balance": bool, "max_negative_days": int,
 *  "extras": {substitutes, attendance_grid, kpi, payroll: {enabled, mode, income_tax_rate, pension_rate, currency, manager_ids}},
 *  "initialize_balances": bool}
 * context = {users: [{id, email, name, role, manager_id, department}], departments, type_presets, existing_types}
 */
export type CalculationMethod = "annual" | "accrual" | "manual"
export type Approval = "manager" | "hr" | "both"
export type PayrollMode = "gross" | "net"

export interface LeaveTypeRow {
  code: string
  name_ka: string
  name_en: string
  is_paid: boolean
  calculation_method: CalculationMethod
  days_per_year: number | null
  carry_forward_max_days: number | null
  carry_forward_expiry_months: number | null
  color: string
}

export interface OrgRow {
  user_id: number
  manager_id: number | null
  department: string
}

export interface LeavePayroll {
  enabled: boolean
  mode: PayrollMode
  income_tax_rate: string
  pension_rate: string
  currency: string
  manager_ids: number[]
}

export interface LeaveExtras {
  substitutes: boolean
  attendance_grid: boolean
  kpi: boolean
  payroll: LeavePayroll
}

export interface LeaveAnswers {
  working_days: number[]
  auto_georgian_holidays: boolean
  leave_types: LeaveTypeRow[]
  approval: Approval
  org: OrgRow[]
  allow_negative_balance: boolean
  max_negative_days: number | null
  extras: LeaveExtras
  initialize_balances: boolean
  [key: string]: unknown
}

export const METHODS: CalculationMethod[] = ["annual", "accrual", "manual"]
const APPROVALS: Approval[] = ["manager", "hr", "both"]
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]
const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const
const TYPE_COLORS = ["#3b82f6", "#ef4444", "#6b7280", "#ec4899", "#8b5cf6", "#f59e0b", "#10b981"]
const CURRENCIES = ["GEL", "USD", "EUR"]

const str = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : fallback)
const bool = (v: unknown, fallback: boolean): boolean => (typeof v === "boolean" ? v : fallback)
const int = (v: unknown, fallback: number | null): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v)
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Math.trunc(Number(v))
  return fallback
}
const rec = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {})
const rate = (v: unknown, fallback: string): string => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN
  return Number.isFinite(n) ? n.toFixed(2) : fallback
}

export function emptyLeaveType(index = 0): LeaveTypeRow {
  return {
    code: "",
    name_ka: "",
    name_en: "",
    is_paid: true,
    calculation_method: "annual",
    days_per_year: 0,
    carry_forward_max_days: null,
    carry_forward_expiry_months: null,
    color: TYPE_COLORS[index % TYPE_COLORS.length],
  }
}

function leaveTypeRow(raw: unknown, index: number): LeaveTypeRow {
  const r = rec(raw)
  const name = typeof r.name === "string" ? { ka: r.name, en: r.name } : rec(r.name)
  const method = str(r.calculation_method)
  return {
    code: str(r.code).toUpperCase(),
    name_ka: str(name.ka, str(r.name_ka)),
    name_en: str(name.en, str(r.name_en)),
    is_paid: bool(r.is_paid, true),
    calculation_method: (METHODS as string[]).includes(method) ? (method as CalculationMethod) : "annual",
    days_per_year: int(r.days_per_year, 0),
    carry_forward_max_days: int(r.carry_forward_max_days, null),
    carry_forward_expiry_months: int(r.carry_forward_expiry_months, null),
    color: str(r.color, TYPE_COLORS[index % TYPE_COLORS.length]),
  }
}

interface ContextUser extends PickerUser {
  manager_id?: number | null
  department?: string | null
}

function contextUsers(context: Record<string, unknown>): ContextUser[] {
  return Array.isArray(context.users) ? (context.users as ContextUser[]).filter((u) => u && typeof u.id === "number") : []
}

/** Draft: last answers else prefill; leave types from `context.type_presets`; one org row per `context.users` entry. */
export function initLeaveAnswers(step: Pick<OnboardingStep, "answers" | "prefill" | "context">): LeaveAnswers {
  const src = (Object.keys(step.answers ?? {}).length ? step.answers : step.prefill) ?? {}
  const ctx = step.context ?? {}

  let workingDays: number[]
  if (Array.isArray(src.weekend_days)) {
    const weekend = src.weekend_days.map((d) => int(d, -1)).filter((d): d is number => d !== null && d >= 0 && d <= 6)
    workingDays = ALL_DAYS.filter((d) => !weekend.includes(d))
  } else {
    const n = Math.min(7, Math.max(0, int(src.working_days_per_week, 5) ?? 5))
    workingDays = ALL_DAYS.slice(0, n)
  }

  const typesSrc = Array.isArray(src.leave_types) && src.leave_types.length ? src.leave_types : Array.isArray(ctx.type_presets) ? ctx.type_presets : []
  const leaveTypes = typesSrc.map(leaveTypeRow)

  const users = contextUsers(ctx)
  const orgSrc = Array.isArray(src.org) ? src.org.map(rec) : []
  const org: OrgRow[] = users.map((u) => {
    const given = orgSrc.find((o) => int(o.user_id, null) === u.id)
    return {
      user_id: u.id,
      manager_id: given ? int(given.manager_id, null) : (int(u.manager_id, null) ?? null),
      department: given ? str(given.department) : str(u.department),
    }
  })

  const approval = str(src.approval)
  const extras = rec(src.extras)
  const payroll = rec(extras.payroll)
  const mode = str(payroll.mode)
  return {
    working_days: workingDays,
    auto_georgian_holidays: bool(src.auto_georgian_holidays, true),
    leave_types: leaveTypes,
    approval: (APPROVALS as string[]).includes(approval) ? (approval as Approval) : "manager",
    org,
    allow_negative_balance: bool(src.allow_negative_balance, false),
    max_negative_days: int(src.max_negative_days, 5),
    extras: {
      substitutes: bool(extras.substitutes, false),
      attendance_grid: bool(extras.attendance_grid, false),
      kpi: bool(extras.kpi, false),
      payroll: {
        enabled: bool(payroll.enabled, false),
        mode: mode === "net" ? "net" : "gross",
        income_tax_rate: rate(payroll.income_tax_rate, "20.00"),
        pension_rate: rate(payroll.pension_rate, "2.00"),
        currency: str(payroll.currency, "GEL"),
        manager_ids: Array.isArray(payroll.manager_ids) ? payroll.manager_ids.map((id) => int(id, null)).filter((id): id is number => id !== null) : [],
      },
    },
    initialize_balances: bool(src.initialize_balances, true),
  }
}

/** Payload in the contract shape: weekend from the working days, I18n names, org rows with a manager or department only. */
export function prepareLeaveAnswers(a: LeaveAnswers): LeaveAnswers {
  const working = [...new Set(a.working_days)].sort()
  const out: Record<string, unknown> = {
    working_days_per_week: working.length,
    weekend_days: ALL_DAYS.filter((d) => !working.includes(d)),
    auto_georgian_holidays: a.auto_georgian_holidays,
  }

  const types = a.leave_types
    .map((t) => ({
      code: t.code.trim().toUpperCase(),
      name: { ka: t.name_ka.trim(), en: t.name_en.trim() },
      is_paid: t.is_paid,
      calculation_method: t.calculation_method,
      days_per_year: t.days_per_year ?? 0,
      carry_forward_max_days: t.carry_forward_max_days,
      carry_forward_expiry_months: t.carry_forward_max_days === null ? null : t.carry_forward_expiry_months,
      color: t.color,
    }))
    .filter((t) => t.code || t.name.ka || t.name.en)
  if (types.length) out.leave_types = types

  out.approval = a.approval

  const org = a.org
    .map((o) => ({ user_id: o.user_id, manager_id: o.manager_id === o.user_id ? null : o.manager_id, department: o.department.trim() || null }))
    .filter((o) => o.manager_id !== null || o.department !== null)
  if (org.length) out.org = org

  out.allow_negative_balance = a.allow_negative_balance
  out.max_negative_days = a.allow_negative_balance ? (a.max_negative_days ?? 0) : 0

  const p = a.extras.payroll
  out.extras = {
    substitutes: a.extras.substitutes,
    attendance_grid: a.extras.attendance_grid,
    kpi: a.extras.kpi,
    payroll: p.enabled
      ? { enabled: true, mode: p.mode, income_tax_rate: rate(p.income_tax_rate, "20.00"), pension_rate: rate(p.pension_rate, "2.00"), currency: p.currency, manager_ids: [...new Set(p.manager_ids)] }
      : { enabled: false },
  }

  out.initialize_balances = a.initialize_balances
  return out as LeaveAnswers
}

export function LeaveStep({ answers, setAnswers, errors, context }: StepComponentProps<LeaveAnswers>) {
  const t = useTranslations("onboarding.leave")
  const tf = useTranslations("onboarding.fields.hours.days")
  const patch = (p: Partial<LeaveAnswers>) => setAnswers((prev) => ({ ...prev, ...p }))
  const patchExtras = (p: Partial<LeaveExtras>) => setAnswers((prev) => ({ ...prev, extras: { ...prev.extras, ...p } }))
  const patchPayroll = (p: Partial<LeavePayroll>) => patchExtras({ payroll: { ...answers.extras.payroll, ...p } })

  const users = contextUsers(context)
  const ctxDepartments = Array.isArray(context.departments)
    ? (context.departments as unknown[]).map((d) => (typeof d === "string" ? d : str(rec(d).name))).filter(Boolean)
    : []
  const departments = [...new Set([...ctxDepartments, ...answers.org.map((o) => o.department.trim()).filter(Boolean)])]
  const orgErrors = rowErrorsAt(errors, "org")
  const existing = int(context.existing_types, 0) ?? 0

  const toggleDay = (d: number) =>
    patch({ working_days: answers.working_days.includes(d) ? answers.working_days.filter((x) => x !== d) : [...answers.working_days, d].sort() })

  return (
    <div className="flex flex-col gap-4" data-testid="onb-step-leave_management">
      <SectionCard title={t("week.title")} hint={t("week.hint")} bodyClassName="flex flex-col gap-4 p-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium">{t("week.workingDays")}</span>
          <div role="group" aria-label={t("week.workingDays")} className="flex flex-wrap gap-1.5">
            {ALL_DAYS.map((d) => {
              const on = answers.working_days.includes(d)
              return (
                <button
                  key={d}
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => toggleDay(d)}
                  className={cn("inline-flex h-8 min-w-[44px] items-center justify-center rounded-md border px-2.5 text-[13px] font-medium", on ? "border-primary bg-primary/10 text-foreground" : "border-border bg-background text-muted-foreground hover:bg-accent")}
                  data-testid={`onb-leave-day-${d}`}
                >
                  {tf(DAY_KEYS[d])}
                </button>
              )
            })}
          </div>
          <span className="text-xs text-muted-foreground" data-testid="onb-leave-week-summary">
            {t("week.summary", { working: answers.working_days.length, weekend: 7 - answers.working_days.length })}
          </span>
          {(errorAt(errors, "working_days_per_week") ?? errorAt(errors, "weekend_days")) && (
            <span role="alert" className="text-xs text-destructive">
              {errorAt(errors, "working_days_per_week") ?? errorAt(errors, "weekend_days")}
            </span>
          )}
        </div>
        <Toggle label={t("week.holidays")} help={t("week.holidaysHint")} checked={answers.auto_georgian_holidays} onChange={(v) => patch({ auto_georgian_holidays: v })} error={errorAt(errors, "auto_georgian_holidays")} testId="onb-leave-holidays" />
      </SectionCard>

      <SectionCard title={t("types.title")} hint={existing > 0 ? t("types.existing", { count: existing }) : t("types.hint")} bodyClassName="p-4">
        <EditableTable<LeaveTypeRow>
          columns={[
            { key: "code", label: t("types.code"), placeholder: "ANNUAL", width: "90px" },
            { key: "name_ka", label: t("types.nameKa"), width: "minmax(0,1.2fr)" },
            { key: "name_en", label: t("types.nameEn"), width: "minmax(0,1.2fr)" },
            {
              key: "is_paid",
              label: t("types.paid"),
              type: "custom",
              width: "56px",
              render: (row, update, index) => (
                <input type="checkbox" checked={row.is_paid} aria-label={t("types.paid")} onChange={(e) => update({ is_paid: e.target.checked })} className="mt-2 h-4 w-4 accent-primary" data-testid={`onb-leave-types-row-${index}-is_paid`} />
              ),
            },
            { key: "calculation_method", label: t("types.method"), type: "select", options: METHODS.map((m) => ({ value: m, label: t(`types.methods.${m}`) })), width: "110px" },
            { key: "days_per_year", label: t("types.daysPerYear"), type: "number", width: "70px" },
            { key: "carry_forward_max_days", label: t("types.carryMax"), type: "number", placeholder: "—", width: "70px" },
            { key: "carry_forward_expiry_months", label: t("types.carryExpiry"), type: "number", placeholder: "—", width: "70px" },
            {
              key: "color",
              label: t("types.color"),
              type: "custom",
              width: "48px",
              render: (row, update, index) => (
                <input type="color" value={row.color || "#3b82f6"} aria-label={t("types.color")} onChange={(e) => update({ color: e.target.value })} className="h-8 w-9 cursor-pointer rounded-md border bg-background p-0.5" data-testid={`onb-leave-types-row-${index}-color`} />
              ),
            },
          ]}
          rows={answers.leave_types}
          onChange={(leave_types) => patch({ leave_types })}
          newRow={() => emptyLeaveType(answers.leave_types.length)}
          rowErrors={rowErrorsAt(errors, "leave_types")}
          error={listErrorAt(errors, "leave_types")}
          addLabel={t("types.add")}
          emptyText={t("types.empty")}
          testId="onb-leave-types"
        />
      </SectionCard>

      <SectionCard title={t("approval.title")} hint={t("approval.hint")} bodyClassName="p-4">
        <MultiChoiceCards
          options={[
            { value: "manager", label: t("approval.manager"), description: t("approval.managerHint"), icon: UserCheck },
            { value: "hr", label: t("approval.hr"), description: t("approval.hrHint"), icon: Users },
            { value: "both", label: t("approval.both"), description: t("approval.bothHint"), icon: UsersRound },
          ]}
          value={answers.approval}
          onChange={(v) => patch({ approval: v })}
          columns={3}
          error={errorAt(errors, "approval")}
          testId="onb-leave-approval"
        />
      </SectionCard>

      <SectionCard title={t("org.title")} hint={t("org.hint")} bodyClassName="p-4">
        {users.length === 0 ? (
          <div className="px-3 py-4 text-center text-xs text-muted-foreground" data-testid="onb-leave-org-empty">
            {t("org.empty")}
          </div>
        ) : (
          <div className="overflow-hidden rounded-[10px] border bg-card" data-testid="onb-leave-org">
            <div className="hidden items-center gap-2 border-b bg-muted/35 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:grid sm:[grid-template-columns:minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
              <span>{t("org.person")}</span>
              <span>{t("org.manager")}</span>
              <span>{t("org.department")}</span>
            </div>
            <datalist id="onb-leave-departments">
              {departments.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
            {answers.org.map((row, index) => {
              const user = users.find((u) => u.id === row.user_id)
              const errs = orgErrors[index]
              const managerErr = errs ? errorAt(errs, "manager_id") : null
              const depErr = errs ? errorAt(errs, "department") : null
              const update = (p: Partial<OrgRow>) => patch({ org: answers.org.map((o, i) => (i === index ? { ...o, ...p } : o)) })
              return (
                <div key={row.user_id} className="grid grid-cols-1 gap-2 border-b p-3 last:border-b-0 sm:items-start sm:px-3 sm:py-2 sm:[grid-template-columns:minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]" data-testid={`onb-leave-org-row-${index}`}>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-[13px] font-medium">{user ? pickerUserLabel(user) : row.user_id}</span>
                    {user?.email && <span className="truncate text-xs text-muted-foreground">{user.email}</span>}
                  </div>
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="text-[11px] font-medium text-muted-foreground sm:hidden">{t("org.manager")}</span>
                    <select
                      value={row.manager_id ?? ""}
                      aria-label={`${user ? pickerUserLabel(user) : row.user_id}: ${t("org.manager")}`}
                      aria-invalid={managerErr ? true : undefined}
                      onChange={(e) => update({ manager_id: e.target.value === "" ? null : Number(e.target.value) })}
                      className={cn(inputClass, "h-8 text-xs")}
                      data-testid={`onb-leave-org-row-${index}-manager`}
                    >
                      <option value="">{t("org.noManager")}</option>
                      {users
                        .filter((u) => u.id !== row.user_id)
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {pickerUserLabel(u)}
                          </option>
                        ))}
                    </select>
                    {managerErr && (
                      <span role="alert" className="text-[11px] text-destructive">
                        {managerErr}
                      </span>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="text-[11px] font-medium text-muted-foreground sm:hidden">{t("org.department")}</span>
                    <input
                      type="text"
                      list="onb-leave-departments"
                      value={row.department}
                      placeholder={t("org.departmentPlaceholder")}
                      aria-label={`${user ? pickerUserLabel(user) : row.user_id}: ${t("org.department")}`}
                      aria-invalid={depErr ? true : undefined}
                      onChange={(e) => update({ department: e.target.value })}
                      className={cn(inputClass, "h-8 text-xs")}
                      data-testid={`onb-leave-org-row-${index}-department`}
                    />
                    {depErr && (
                      <span role="alert" className="text-[11px] text-destructive">
                        {depErr}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {listErrorAt(errors, "org") && (
          <span role="alert" className="mt-2 block text-xs text-destructive">
            {listErrorAt(errors, "org")}
          </span>
        )}
      </SectionCard>

      <SectionCard title={t("balance.title")} hint={t("balance.hint")} bodyClassName="flex flex-col gap-4 p-4">
        <Toggle label={t("balance.negative")} help={t("balance.negativeHint")} checked={answers.allow_negative_balance} onChange={(v) => patch({ allow_negative_balance: v })} error={errorAt(errors, "allow_negative_balance")} testId="onb-leave-negative" />
        {answers.allow_negative_balance && (
          <NumberField label={t("balance.maxNegative")} value={answers.max_negative_days} onChange={(v) => patch({ max_negative_days: v })} min={0} max={365} suffix={t("balance.days")} error={errorAt(errors, "max_negative_days")} testId="onb-leave-max-negative" />
        )}
      </SectionCard>

      <SectionCard title={t("extras.title")} hint={t("extras.hint")} bodyClassName="flex flex-col gap-4 p-4">
        <Toggle label={t("extras.substitutes")} help={t("extras.substitutesHint")} checked={answers.extras.substitutes} onChange={(v) => patchExtras({ substitutes: v })} testId="onb-leave-substitutes" />
        <Toggle label={t("extras.attendance")} help={t("extras.attendanceHint")} checked={answers.extras.attendance_grid} onChange={(v) => patchExtras({ attendance_grid: v })} testId="onb-leave-attendance" />
        <Toggle label={t("extras.kpi")} help={t("extras.kpiHint")} checked={answers.extras.kpi} onChange={(v) => patchExtras({ kpi: v })} testId="onb-leave-kpi" />
        <Toggle label={t("extras.payroll")} help={t("extras.payrollHint")} checked={answers.extras.payroll.enabled} onChange={(v) => patchPayroll({ enabled: v })} error={errorAt(errors, "extras.payroll.enabled")} testId="onb-leave-payroll" />
        {answers.extras.payroll.enabled && (
          <div className="flex flex-col gap-4 rounded-[10px] border bg-muted/20 p-3" data-testid="onb-leave-payroll-block">
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium">{t("extras.mode")}</span>
              <Segmented
                size="md"
                ariaLabel={t("extras.mode")}
                value={answers.extras.payroll.mode}
                onChange={(v) => patchPayroll({ mode: v })}
                options={[
                  { value: "gross", label: t("extras.gross") },
                  { value: "net", label: t("extras.net") },
                ]}
                testId="onb-leave-payroll-mode"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <NumberField label={t("extras.incomeTax")} value={Number(answers.extras.payroll.income_tax_rate)} onChange={(v) => patchPayroll({ income_tax_rate: rate(v, "20.00") })} min={0} max={100} step={0.5} suffix="%" error={errorAt(errors, "extras.payroll.income_tax_rate")} testId="onb-leave-income-tax" />
              <NumberField label={t("extras.pension")} value={Number(answers.extras.payroll.pension_rate)} onChange={(v) => patchPayroll({ pension_rate: rate(v, "2.00") })} min={0} max={100} step={0.5} suffix="%" error={errorAt(errors, "extras.payroll.pension_rate")} testId="onb-leave-pension" />
              <SelectField label={t("extras.currency")} value={answers.extras.payroll.currency} onChange={(v) => patchPayroll({ currency: v })} options={CURRENCIES.map((c) => ({ value: c, label: c }))} error={errorAt(errors, "extras.payroll.currency")} testId="onb-leave-currency" />
            </div>
            <UsersPicker label={t("extras.payrollManagers")} help={t("extras.payrollManagersHint")} users={context.users} value={answers.extras.payroll.manager_ids} onChange={(ids) => patchPayroll({ manager_ids: ids })} error={errorAt(errors, "extras.payroll.manager_ids")} testId="onb-leave-payroll-managers" />
          </div>
        )}
      </SectionCard>

      <SectionCard title={t("init.title")} bodyClassName="p-4">
        <Toggle label={t("init.balances")} help={t("init.balancesHint")} checked={answers.initialize_balances} onChange={(v) => patch({ initialize_balances: v })} error={errorAt(errors, "initialize_balances")} testId="onb-leave-init" />
      </SectionCard>
    </div>
  )
}

export const step: StepDefinition<LeaveAnswers> = {
  key: "leave_management",
  titleKey: "steps.leave_management.title",
  Component: LeaveStep,
  init: initLeaveAnswers,
  prepare: prepareLeaveAnswers,
}
