import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { renderLeave } from "./lv00-helpers"
import type { AttendanceGrid, KpiGoal, MyPayroll, PayrollReport } from "@/app/(tenant)/leave/_lib/hr-api"

const features = vi.hoisted(() => ({
  value: {
    loaded: true,
    userId: 2,
    isStaff: false,
    isLeaveManager: true,
    features: {
      kpi: true,
      attendance: true,
      payroll: true,
      substitution_pay: true,
      can_manage_payroll: true,
      payroll_self_view: true,
    } as Record<string, boolean>,
  },
}))

vi.mock("@/app/(tenant)/leave/_lib/useLeaveFeatures", () => ({
  useLeaveFeatures: () => features.value,
}))

const api = vi.hoisted(() => ({
  fetchKpis: vi.fn(),
  fetchKpi: vi.fn(),
  fetchLiteUsers: vi.fn(async () => []),
  fetchAttendance: vi.fn(),
  fetchPayrollReport: vi.fn(),
  fetchPayrollRuns: vi.fn(async () => []),
  fetchCompensations: vi.fn(async () => []),
  fetchSubstitutionRates: vi.fn(async () => []),
  fetchCoverage: vi.fn(async () => []),
  fetchMyPayroll: vi.fn(),
}))

vi.mock("@/app/(tenant)/leave/_lib/hr-api", async (orig) => ({
  ...(await orig<typeof import("@/app/(tenant)/leave/_lib/hr-api")>()),
  ...api,
}))
vi.mock("@/api/generated/api", () => ({ departmentsList: vi.fn(async () => []) }))

import KpiPage from "@/app/(tenant)/leave/kpi/page"
import AttendancePage from "@/app/(tenant)/leave/attendance/page"
import PayrollPage from "@/app/(tenant)/leave/payroll/page"
import MyPayrollPage from "@/app/(tenant)/leave/my-payroll/page"

function goal(over: Partial<KpiGoal>): KpiGoal {
  return {
    id: 1, employee: 3, employee_name: "Mariam Lomidze", period: "2026-11", title: "Tickets resolved", target: "120.00",
    unit: "tickets", direction: "higher", actual: "134.00", employee_note: "", manager_feedback: "", status: "approved",
    percent: "111.67", target_met: true, submitted_at: null, reviewed_at: null, reviewed_by: null, reviewed_by_name: null,
    created_by: 2, created_by_name: null, created_at: "2026-11-01T08:00:00Z", updated_at: "2026-11-01T08:00:00Z",
    can_edit_target: false, can_submit: false, can_review: false, history: [], ...over,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  features.value.isStaff = false
  features.value.isLeaveManager = true
  features.value.features = { kpi: true, attendance: true, payroll: true, substitution_pay: true, can_manage_payroll: true, payroll_self_view: true }
})

describe("KPI page (LV-03)", () => {
  it("shows stats, the goals table, the summary footer and the manager actions", async () => {
    api.fetchKpis.mockResolvedValue([
      goal({ id: 1 }),
      goal({ id: 2, title: "First response", status: "pending", target_met: false, percent: "83.3", can_review: true }),
    ])
    renderLeave(<KpiPage />)
    const rows = await screen.findAllByTestId("kpi-row")
    expect(rows).toHaveLength(2)
    expect(api.fetchKpis).toHaveBeenCalledWith({ scope: "mine", period: expect.stringMatching(/^\d{4}-\d{2}$/) })
    expect(within(screen.getByTestId("kpi-stats")).getByText("50% of goals")).toBeTruthy()
    expect(screen.getByText("2 goals · 1 approved · 1 awaiting review · 1 met target")).toBeTruthy()
    // header bridge publishes the primary action for managers
    expect(within(screen.getByTestId("outlet-primary")).getByRole("button", { name: "New target" })).toBeTruthy()
    expect(screen.getByTestId("kpi-copy-last-month")).toBeTruthy()
    // scope segmented: mine + team (no "all" for non-staff)
    expect(within(screen.getByTestId("kpi-scope")).getAllByRole("radio").map((r) => r.textContent)).toEqual(["Mine", "Team"])
    // review action opens the approve dialog without opening the detail
    fireEvent.click(within(rows[1]).getByRole("button", { name: "Approve" }))
    expect(await screen.findByText("Approve result")).toBeTruthy()
    expect(api.fetchKpi).not.toHaveBeenCalled()
  })

  it("plain employees get no create / copy actions and no scope switch", async () => {
    features.value.isLeaveManager = false
    api.fetchKpis.mockResolvedValue([])
    renderLeave(<KpiPage />)
    expect(await screen.findByText("No KPIs for this month")).toBeTruthy()
    expect(screen.queryByTestId("kpi-copy-last-month")).toBeNull()
    expect(screen.queryByTestId("kpi-scope")).toBeNull()
    expect(screen.getByTestId("outlet-primary").textContent).toBe("")
  })

  it("switching scope reloads with the new scope", async () => {
    features.value.isStaff = true
    api.fetchKpis.mockResolvedValue([])
    renderLeave(<KpiPage />)
    await screen.findByText("No KPIs for this month")
    fireEvent.click(within(screen.getByTestId("kpi-scope")).getByRole("radio", { name: "All" }))
    await waitFor(() => expect(api.fetchKpis).toHaveBeenLastCalledWith(expect.objectContaining({ scope: "all" })))
  })

  it("shows a translated error state with retry when loading fails", async () => {
    api.fetchKpis.mockRejectedValueOnce(new Error("Network Error")).mockResolvedValueOnce([])
    renderLeave(<KpiPage />, "ka")
    const retry = await screen.findByRole("button", { name: "ხელახლა ცდა" })
    expect(screen.queryByText("Network Error")).toBeNull()
    fireEvent.click(retry)
    await waitFor(() => expect(api.fetchKpis).toHaveBeenCalledTimes(2))
  })

  it("is gated by the kpi feature", () => {
    features.value.features = { ...features.value.features, kpi: false }
    renderLeave(<KpiPage />)
    expect(screen.getByTestId("leave-feature-off")).toBeTruthy()
    expect(api.fetchKpis).not.toHaveBeenCalled()
  })
})

describe("Attendance page (LV-03)", () => {
  const grid: AttendanceGrid = {
    period: "2026-11",
    days: [
      { date: "2026-11-01", kind: "weekend", holiday_name: null },
      { date: "2026-11-02", kind: "working", holiday_name: null },
      { date: "2026-11-03", kind: "working", holiday_name: null },
    ],
    rows: [
      { user: { id: 1, name: "Ana Javakhishvili", department: "Support" }, cells: { "2026-11-01": "off", "2026-11-02": "worked", "2026-11-03": "leave:4" } },
    ],
    legend: [{ code: "leave:4", leave_type: 4, name: "Sick leave", color: "#ef4444", is_paid: true }],
  }

  it("renders the grid with coloured cells, the legend and the summary", async () => {
    api.fetchAttendance.mockResolvedValue(grid)
    renderLeave(<AttendancePage />)
    const table = await screen.findByTestId("attendance-grid")
    const kinds = [...table.querySelectorAll("[data-kind]")].map((c) => c.getAttribute("data-kind"))
    expect(kinds).toEqual(["off", "worked", "leave"])
    const leaveCell = table.querySelector("[data-kind=leave]") as HTMLElement
    expect(leaveCell.style.backgroundColor).toBe("rgb(239, 68, 68)")
    expect(leaveCell.getAttribute("title")).toBe("Nov 3 · Sick leave")
    expect(within(screen.getByTestId("attendance-legend")).getByText("Sick leave")).toBeTruthy()
    expect(within(table).getByText("1 / 1")).toBeTruthy()
    // The department stays visible under the name (the old grid showed it too).
    expect(within(screen.getByTestId("attendance-row")).getByText("Support")).toBeTruthy()
    expect(screen.getByText("1 employee")).toBeTruthy()
    expect(screen.getByTestId("outlet-meta").textContent).toMatch(/^· \S+ \d{4}$/)
  })

  it("needs the attendance feature and leave-manager rights", () => {
    features.value.isLeaveManager = false
    const { unmount } = renderLeave(<AttendancePage />)
    // Feature on, no role: "no access", not "turned off in leave settings".
    expect(screen.getByTestId("leave-no-access")).toHaveTextContent("You don't have access to this page")
    expect(screen.queryByTestId("leave-feature-off")).toBeNull()
    unmount()
    features.value.features = { ...features.value.features, attendance: false }
    renderLeave(<AttendancePage />)
    expect(screen.getByTestId("leave-feature-off")).toBeTruthy()
    expect(api.fetchAttendance).not.toHaveBeenCalled()
  })
})

describe("Payroll page (LV-03)", () => {
  const report: PayrollReport = {
    period: "2026-11", mode: "gross", currency: "GEL", income_tax_rate: "20", pension_rate: "2", working_days: 20,
    locked: false, generated_at: "2026-11-09T10:00:00Z",
    rows: [
      {
        user: 1, name: "Nino Beridze", email: "nino@demo.ge", job_title: "Owner", currency: "GEL", monthly_salary: "6500.00",
        working_days: 20, scheduled_days: 20, worked_to_date: 6, paid_leave_days: 0, unpaid_days: 0, base_pay: "6500.00",
        substitution_pay: "0.00", other_currency_substitution_pay: {}, gross: "6500.00",
      },
    ],
    totals: { GEL: { base_pay: "6500.00", substitution_pay: "0.00", gross: "6500.00" } },
  }

  it("shows the tabs as a segmented control, the tab as breadcrumb and a totals row", async () => {
    api.fetchPayrollReport.mockResolvedValue(report)
    renderLeave(<PayrollPage />)
    const rows = await screen.findAllByTestId("payroll-report-row")
    expect(rows).toHaveLength(2)
    expect(rows[1].className).toContain("bg-muted/40")
    expect(within(rows[1]).getByText("Total (GEL)")).toBeTruthy()
    // Phones keep every figure (paid leave, unpaid, base pay...): no cell is hidden.
    expect(within(rows[0]).getAllByRole("cell").filter((c) => c.classList.contains("hidden"))).toHaveLength(0)
    expect(screen.getByTestId("leave-header-crumb").textContent).toBe("Report")
    expect(screen.getByTestId("payroll-draft-pill").textContent).toBe("Not locked")
    fireEvent.click(within(screen.getByTestId("payroll-tabs")).getByRole("radio", { name: "Salaries" }))
    await waitFor(() => expect(screen.getByTestId("leave-header-crumb").textContent).toBe("Salaries"))
    expect(api.fetchCompensations).toHaveBeenCalled()
    // salaries do not use a month: no picker in the toolbar
    expect(within(screen.getByTestId("payroll-toolbar")).queryByTestId("leave-month-picker")).toBeNull()
  })

  it("only lists the tabs of the enabled features", async () => {
    features.value.features = { ...features.value.features, payroll: false }
    renderLeave(<PayrollPage />)
    await waitFor(() => expect(api.fetchSubstitutionRates).toHaveBeenCalled())
    expect(within(screen.getByTestId("payroll-tabs")).getAllByRole("radio").map((r) => r.textContent)).toEqual([
      "Substitution rates",
      "Worked days",
    ])
    expect(api.fetchPayrollReport).not.toHaveBeenCalled()
  })

  it("is locked for users who cannot manage payroll", () => {
    features.value.features = { ...features.value.features, can_manage_payroll: false }
    const { unmount } = renderLeave(<PayrollPage />)
    expect(screen.getByTestId("leave-no-access")).toBeTruthy()
    unmount()
    features.value.features = { ...features.value.features, payroll: false, substitution_pay: false }
    renderLeave(<PayrollPage />)
    expect(screen.getByTestId("leave-feature-off")).toBeTruthy()
    expect(api.fetchPayrollReport).not.toHaveBeenCalled()
  })
})

describe("My payslip page (LV-03)", () => {
  it("shows the headline stats, the breakdown and the substitutions", async () => {
    const data: MyPayroll = {
      period: "2026-11", mode: "net", locked: true,
      row: {
        user: 3, name: "Mariam", email: "m@demo.ge", job_title: "", currency: "GEL", monthly_salary: "2400.00", working_days: 20,
        scheduled_days: 20, worked_to_date: 5, paid_leave_days: 0, unpaid_days: 0, base_pay: "2400.00", substitution_pay: "135.00",
        other_currency_substitution_pay: {}, gross: "2535.00", pension: "50.70", income_tax: "496.86", net: "1987.44",
      },
      substitutions: [{ leave_request: 9, employee_name: "Luka Tsiklauri", task: "VIP queue", days: ["2026-11-02", "2026-11-03"], amount: "90.00", currency: "GEL" }],
    } as MyPayroll
    api.fetchMyPayroll.mockResolvedValue(data)
    renderLeave(<MyPayrollPage />)
    const headline = await screen.findByTestId("my-payroll-headline")
    expect(headline.textContent).toContain("Net")
    expect(headline.textContent).toContain("1,987.44")
    expect(headline.textContent).toContain("Locked")
    expect(screen.getByText("of 20 scheduled")).toBeTruthy()
    const breakdown = screen.getByTestId("my-payroll-breakdown")
    expect(within(breakdown).getByText("Income tax")).toBeTruthy()
    expect(within(breakdown).getByText("Final: this month is locked.", { exact: false })).toBeTruthy()
    const subs = screen.getByTestId("my-payroll-substitutions")
    expect(within(subs).getByText("Luka Tsiklauri")).toBeTruthy()
    expect(within(subs).getByText("2")).toBeTruthy()
  })

  it("shows the empty state when there is no payroll row", async () => {
    api.fetchMyPayroll.mockResolvedValue({ period: "2026-11", mode: "gross", locked: false, row: null, substitutions: [] })
    renderLeave(<MyPayrollPage />, "ka")
    expect(await screen.findByTestId("my-payroll-empty")).toBeTruthy()
    expect(screen.getByText("ამ თვისთვის თქვენი სახელფასო მონაცემები არ არის.")).toBeTruthy()
  })
})

describe("KPI detail (LV-03 bug fix)", () => {
  it("does not reopen when closed while the detail is still loading", async () => {
    api.fetchKpis.mockResolvedValue([goal({ id: 7, title: "Calls answered" })])
    let resolve: (g: KpiGoal) => void = () => {}
    api.fetchKpi.mockImplementation(() => new Promise<KpiGoal>((r) => (resolve = r)))
    renderLeave(<KpiPage />)
    fireEvent.click(await screen.findByTestId("kpi-row"))
    const dialog = await screen.findByRole("dialog")
    fireEvent.keyDown(dialog, { key: "Escape" })
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    resolve(goal({ id: 7, title: "Calls answered" }))
    await new Promise((r) => setTimeout(r, 20))
    expect(screen.queryByRole("dialog")).toBeNull()
  })
})
