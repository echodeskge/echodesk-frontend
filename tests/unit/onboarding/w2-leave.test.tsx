/** ONB-W2 leave / HR step: draft from context presets and users, payload per SCHEMAS.md, org table, nested errors. */
import React, { useState } from "react"
import { describe, expect, it, vi } from "vitest"
import { fireEvent, screen, within } from "@testing-library/react"

vi.mock("@/api/axios", () => ({ default: { get: vi.fn(), post: vi.fn() } }))

import { LeaveStep, initLeaveAnswers, prepareLeaveAnswers, type LeaveAnswers } from "@/app/(tenant)/onboarding/_steps/leave_management"
import { hasStepComponent } from "@/app/(tenant)/onboarding/_steps"
import type { FieldErrors } from "@/app/(tenant)/onboarding/_lib/onboarding-api"
import { renderOnb, step } from "./helpers"

const CONTEXT = {
  users: [
    { id: 1, email: "ana@x.ge", name: "Ana K", role: "admin", manager_id: null, department: "Sales" },
    { id: 2, email: "gio@x.ge", name: "Gio M", role: "agent", manager_id: 1, department: null },
  ],
  departments: ["Sales", "Support"],
  type_presets: [
    { code: "ANNUAL", name: { ka: "წლიური", en: "Annual" }, is_paid: true, calculation_method: "accrual", days_per_year: 24, carry_forward_max_days: 5, carry_forward_expiry_months: 3, color: "#3b82f6" },
    { code: "SICK", name: { ka: "საავადმყოფო", en: "Sick" }, is_paid: true, calculation_method: "annual", days_per_year: 10 },
  ],
  existing_types: 0,
}

function Harness({ initial, errors = null, onChange = () => {}, context = CONTEXT }: { initial: LeaveAnswers; errors?: FieldErrors | null; onChange?: (a: LeaveAnswers) => void; context?: Record<string, unknown> }) {
  const [answers, set] = useState(initial)
  const setAnswers = (next: LeaveAnswers | ((p: LeaveAnswers) => LeaveAnswers)) =>
    set((prev) => {
      const v = typeof next === "function" ? next(prev) : next
      onChange(v)
      return v
    })
  return <LeaveStep step={step("leave_management", 60)} answers={answers} setAnswers={setAnswers} errors={errors} context={context} prefill={{}} />
}

describe("leave answers", () => {
  it("is registered", () => expect(hasStepComponent("leave_management")).toBe(true))

  it("init: Mon–Fri by default, leave types from the context presets, one org row per user", () => {
    const a = initLeaveAnswers({ answers: {}, prefill: {}, context: CONTEXT })
    expect(a.working_days).toEqual([0, 1, 2, 3, 4])
    expect(a.auto_georgian_holidays).toBe(true)
    expect(a.leave_types).toEqual([
      { code: "ANNUAL", name_ka: "წლიური", name_en: "Annual", is_paid: true, calculation_method: "accrual", days_per_year: 24, carry_forward_max_days: 5, carry_forward_expiry_months: 3, color: "#3b82f6" },
      { code: "SICK", name_ka: "საავადმყოფო", name_en: "Sick", is_paid: true, calculation_method: "annual", days_per_year: 10, carry_forward_max_days: null, carry_forward_expiry_months: null, color: "#ef4444" },
    ])
    expect(a.approval).toBe("manager")
    expect(a.org).toEqual([
      { user_id: 1, manager_id: null, department: "Sales" },
      { user_id: 2, manager_id: 1, department: "" },
    ])
    expect(a.extras.payroll).toEqual({ enabled: false, mode: "gross", income_tax_rate: "20.00", pension_rate: "2.00", currency: "GEL", manager_ids: [] })
    expect(a.initialize_balances).toBe(true)
  })

  it("init: prefill weekend_days and applied org rows win over the context", () => {
    const a = initLeaveAnswers({
      answers: { weekend_days: [5, 6, 4], approval: "both", org: [{ user_id: 2, manager_id: null, department: "Support" }], leave_types: [{ code: "x", name: "Unpaid", is_paid: false }] },
      prefill: {},
      context: CONTEXT,
    })
    expect(a.working_days).toEqual([0, 1, 2, 3])
    expect(a.approval).toBe("both")
    expect(a.org[1]).toEqual({ user_id: 2, manager_id: null, department: "Support" })
    expect(a.leave_types[0]).toMatchObject({ code: "X", name_ka: "Unpaid", name_en: "Unpaid", is_paid: false, calculation_method: "annual", days_per_year: 0 })
  })

  it("prepare emits the SCHEMAS.md payload", () => {
    const a = initLeaveAnswers({ answers: {}, prefill: {}, context: CONTEXT })
    const out = prepareLeaveAnswers({
      ...a,
      working_days: [0, 1, 2, 3, 4, 5],
      leave_types: [...a.leave_types, { code: "", name_ka: "", name_en: "", is_paid: true, calculation_method: "manual", days_per_year: 0, carry_forward_max_days: null, carry_forward_expiry_months: 6, color: "#fff" }],
      org: [
        { user_id: 1, manager_id: 1, department: "  " },
        { user_id: 2, manager_id: 1, department: " Support " },
      ],
      allow_negative_balance: true,
      max_negative_days: 3,
      extras: { substitutes: true, attendance_grid: false, kpi: false, payroll: { enabled: true, mode: "net", income_tax_rate: "20", pension_rate: "2.00", currency: "GEL", manager_ids: [1, 1] } },
    })
    expect(out).toEqual({
      working_days_per_week: 6,
      weekend_days: [6],
      auto_georgian_holidays: true,
      leave_types: [
        { code: "ANNUAL", name: { ka: "წლიური", en: "Annual" }, is_paid: true, calculation_method: "accrual", days_per_year: 24, carry_forward_max_days: 5, carry_forward_expiry_months: 3, color: "#3b82f6" },
        { code: "SICK", name: { ka: "საავადმყოფო", en: "Sick" }, is_paid: true, calculation_method: "annual", days_per_year: 10, carry_forward_max_days: null, carry_forward_expiry_months: null, color: "#ef4444" },
      ],
      approval: "manager",
      org: [{ user_id: 2, manager_id: 1, department: "Support" }],
      allow_negative_balance: true,
      max_negative_days: 3,
      extras: { substitutes: true, attendance_grid: false, kpi: false, payroll: { enabled: true, mode: "net", income_tax_rate: "20.00", pension_rate: "2.00", currency: "GEL", manager_ids: [1] } },
      initialize_balances: true,
    })

    const off = prepareLeaveAnswers({ ...a, allow_negative_balance: false, max_negative_days: 9, org: [] })
    expect(off.max_negative_days).toBe(0)
    expect(off.org).toBeUndefined()
    expect(off.extras.payroll).toEqual({ enabled: false })
  })
})

describe("LeaveStep form", () => {
  it("work week, leave types table, approval cards, org table, payroll sub-block", () => {
    const onChange = vi.fn()
    renderOnb(<Harness initial={initLeaveAnswers({ answers: {}, prefill: {}, context: CONTEXT })} onChange={onChange} />)
    const last = () => onChange.mock.calls[onChange.mock.calls.length - 1][0] as LeaveAnswers

    expect(screen.getByTestId("onb-leave-day-0")).toHaveAttribute("aria-checked", "true")
    expect(screen.getByTestId("onb-leave-day-5")).toHaveAttribute("aria-checked", "false")
    fireEvent.click(screen.getByTestId("onb-leave-day-5"))
    expect(last().working_days).toEqual([0, 1, 2, 3, 4, 5])
    expect(screen.getByTestId("onb-leave-week-summary")).toHaveTextContent("6 working days, 1 weekend days")

    expect(screen.getByTestId("onb-leave-types-row-0-code")).toHaveValue("ANNUAL")
    fireEvent.change(screen.getByTestId("onb-leave-types-row-1-days_per_year"), { target: { value: "12" } })
    fireEvent.click(screen.getByTestId("onb-leave-types-row-1-is_paid"))
    fireEvent.change(screen.getByTestId("onb-leave-types-row-1-calculation_method"), { target: { value: "manual" } })
    expect(last().leave_types[1]).toMatchObject({ days_per_year: 12, is_paid: false, calculation_method: "manual" })
    fireEvent.click(screen.getByTestId("onb-leave-types-add"))
    expect(last().leave_types).toHaveLength(3)
    expect(last().leave_types[2].color).toBe("#6b7280")

    fireEvent.click(screen.getByTestId("onb-leave-approval-both"))
    expect(last().approval).toBe("both")

    const row1 = screen.getByTestId("onb-leave-org-row-1")
    expect(within(row1).getByText("Gio M")).toBeInTheDocument()
    expect(screen.getByTestId("onb-leave-org-row-1-manager")).toHaveValue("1")
    fireEvent.change(screen.getByTestId("onb-leave-org-row-0-manager"), { target: { value: "2" } })
    fireEvent.change(screen.getByTestId("onb-leave-org-row-1-department"), { target: { value: "Support" } })
    expect(last().org).toEqual([
      { user_id: 1, manager_id: 2, department: "Sales" },
      { user_id: 2, manager_id: 1, department: "Support" },
    ])
    // A user cannot be their own manager.
    expect(within(screen.getByTestId("onb-leave-org-row-0-manager")).queryByRole("option", { name: "Ana K" })).not.toBeInTheDocument()

    expect(screen.queryByTestId("onb-leave-max-negative-input")).not.toBeInTheDocument()
    fireEvent.click(screen.getByTestId("onb-leave-negative-switch"))
    fireEvent.change(screen.getByTestId("onb-leave-max-negative-input"), { target: { value: "2" } })
    expect(last().max_negative_days).toBe(2)

    expect(screen.queryByTestId("onb-leave-payroll-block")).not.toBeInTheDocument()
    fireEvent.click(screen.getByTestId("onb-leave-payroll-switch"))
    fireEvent.click(within(screen.getByTestId("onb-leave-payroll-mode")).getByRole("radio", { name: "Net" }))
    fireEvent.click(screen.getByTestId("onb-leave-payroll-managers-user-1"))
    expect(last().extras.payroll).toMatchObject({ enabled: true, mode: "net", manager_ids: [1] })

    fireEvent.click(screen.getByTestId("onb-leave-init-switch"))
    expect(last().initialize_balances).toBe(false)
  })

  it("renders nested errors: leave_types[1].code, org[0].manager_id, extras.payroll.income_tax_rate", () => {
    const initial = initLeaveAnswers({ answers: { extras: { payroll: { enabled: true } } }, prefill: {}, context: CONTEXT })
    renderOnb(
      <Harness
        initial={initial}
        errors={{
          leave_types: [{}, { code: ["Duplicate code"] }],
          org: [{ manager_id: ["Cannot manage themselves"] }],
          extras: { payroll: { income_tax_rate: ["Max 100"] } },
          approval: ["Pick one"],
          "working_days_per_week": ["At least one day"],
        }}
      />
    )
    expect(screen.getByTestId("onb-leave-types-row-1")).toHaveTextContent("Duplicate code")
    expect(screen.getByTestId("onb-leave-types-row-0")).not.toHaveTextContent("Duplicate code")
    expect(screen.getByTestId("onb-leave-org-row-0")).toHaveTextContent("Cannot manage themselves")
    expect(screen.getByTestId("onb-leave-income-tax-error")).toHaveTextContent("Max 100")
    expect(screen.getByTestId("onb-leave-approval-error")).toHaveTextContent("Pick one")
    expect(screen.getByText("At least one day")).toBeInTheDocument()
  })

  it("explains an empty team instead of an empty table", () => {
    renderOnb(<Harness initial={initLeaveAnswers({ answers: {}, prefill: {}, context: { ...CONTEXT, users: [] } })} context={{ ...CONTEXT, users: [] }} />)
    expect(screen.getByTestId("onb-leave-org-empty")).toBeInTheDocument()
  })
})
