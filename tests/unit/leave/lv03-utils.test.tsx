import React from "react"
import { describe, it, expect } from "vitest"
import { screen } from "@testing-library/react"
import { KPI_BAR_CLASS, coverageMonthTotals, kpiActionsWidth, kpiMetShare } from "@/app/(tenant)/leave/_lib/lv03-utils"
import { KpiProgress } from "@/app/(tenant)/leave/kpi/_components/kpi-progress"
import { MoneyCell } from "@/app/(tenant)/leave/payroll/_components/money"
import { LeaveTable, SectionCard, type LeaveColumn } from "@/app/(tenant)/leave/_components/ui"
import { renderLeave } from "./lv00-helpers"

describe("kpiMetShare", () => {
  it("rounds the met share and handles no goals", () => {
    expect(kpiMetShare({ total: 8, met: 3 })).toBe("38%")
    expect(kpiMetShare({ total: 3, met: 3 })).toBe("100%")
    expect(kpiMetShare({ total: 0, met: 0 })).toBe("0%")
  })
})

describe("kpiActionsWidth", () => {
  const goal = (over: Partial<{ can_submit: boolean; can_review: boolean; can_edit_target: boolean; status: string }> = {}) => ({
    can_submit: false,
    can_review: false,
    can_edit_target: false,
    status: "approved",
    ...over,
  })
  const never = () => false
  it("has a minimum width when no row has actions", () => {
    expect(kpiActionsWidth([goal()], never)).toBe("64px")
    expect(kpiActionsWidth([], never)).toBe("64px")
  })
  it("fits the widest row and grows for Georgian labels", () => {
    const rows = [goal({ can_review: true, can_edit_target: true }), goal({ can_submit: true })]
    const en = parseInt(kpiActionsWidth(rows, never, "en"))
    const ka = parseInt(kpiActionsWidth(rows, never, "ka"))
    expect(en).toBe(190 + 6 + 28)
    expect(ka).toBeGreaterThan(en)
  })
  it("counts the delete button through the predicate", () => {
    const rows = [goal({ status: "draft", can_edit_target: true })]
    expect(kpiActionsWidth(rows, () => true)).toBe("64px")
    expect(kpiActionsWidth([goal({ can_submit: true, status: "draft" })], () => true)).toBe(`${120 + 6 + 28}px`)
  })
})

describe("coverageMonthTotals", () => {
  it("splits the selected period from the other months (sorted)", () => {
    expect(coverageMonthTotals({ "2026-12": "10.00", "2026-11": "135.00", "2026-10": "5.00" }, "2026-11")).toEqual({
      current: "135.00",
      others: [
        { period: "2026-10", amount: "5.00" },
        { period: "2026-12", amount: "10.00" },
      ],
    })
  })
  it("returns null for a period without pay and tolerates missing totals", () => {
    expect(coverageMonthTotals({ "2026-10": "5.00" }, "2026-11").current).toBeNull()
    expect(coverageMonthTotals(null, "2026-11")).toEqual({ current: null, others: [] })
  })
})

describe("KpiProgress", () => {
  it("renders a clamped bar with the tone and the percent label", () => {
    renderLeave(<KpiProgress percent="111.7" />)
    const bar = screen.getByRole("progressbar")
    expect(bar.getAttribute("aria-valuenow")).toBe("100")
    expect(bar.getAttribute("aria-valuetext")).toBe("111.7%")
    expect(bar.parentElement?.getAttribute("data-tone")).toBe("good")
    expect((bar.firstChild as HTMLElement).className).toContain(KPI_BAR_CLASS.good.split(" ")[0])
  })
  it("shows a dash and the neutral tone without a result", () => {
    renderLeave(<KpiProgress percent={null} />)
    expect(screen.getByText("—")).toBeTruthy()
    expect(screen.getByRole("progressbar").parentElement?.getAttribute("data-tone")).toBe("none")
  })
})

describe("MoneyCell", () => {
  it("shows the currency as a suffix, but not after a dash", () => {
    const { container, rerender } = renderLeave(<MoneyCell amount="1,500.00" currency="GEL" />)
    expect(container.textContent).toContain("1,500.00GEL")
    rerender(<MoneyCell amount="—" currency="GEL" />)
    expect(container.textContent).not.toContain("GEL")
  })
})

describe("LeaveTable rowClassName (LV-03)", () => {
  it("adds per-row classes", () => {
    type R = { id: number; total?: boolean }
    const cols: LeaveColumn<R>[] = [{ id: "id", header: "Id", width: "1fr", mobile: "title", cell: (r) => r.id }]
    renderLeave(
      <LeaveTable
        ariaLabel="t"
        columns={cols}
        rows={[{ id: 1 }, { id: 2, total: true }]}
        rowKey={(r) => r.id}
        rowClassName={(r) => (r.total ? "is-total" : undefined)}
      />
    )
    const rows = screen.getAllByTestId("leave-table-row")
    expect(rows[0].className).not.toContain("is-total")
    expect(rows[1].className).toContain("is-total")
  })
})

describe("SectionCard actions (LV-03)", () => {
  it("lets the header actions wrap", () => {
    renderLeave(
      <SectionCard title="Report" actions={<button type="button">Lock</button>}>
        body
      </SectionCard>
    )
    const group = screen.getByRole("button", { name: "Lock" }).parentElement as HTMLElement
    expect(group.className).toContain("flex-wrap")
    expect(group.className).not.toContain("shrink-0")
  })
})
