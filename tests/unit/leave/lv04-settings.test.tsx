import React from "react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { fireEvent, screen, waitFor } from "@testing-library/react"
import { renderLeave } from "./lv00-helpers"

const h = vi.hoisted(() => ({
  toast: { success: vi.fn(), error: vi.fn() },
  list: vi.fn(),
  patch: vi.fn(),
  post: vi.fn(),
  invalidate: vi.fn(),
}))
vi.mock("sonner", () => ({ toast: h.toast }))
vi.mock("@/api/generated/api", () => ({ leaveAdminSettingsList: h.list }))
vi.mock("@/api/axios", () => ({ default: { patch: h.patch, post: h.post } }))
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ invalidateQueries: h.invalidate }) }))
vi.mock("@/app/(tenant)/leave/_components/UserPicker", () => ({
  useLiteUsers: () => ({ users: [] }),
  MultiUserPicker: () => <div data-testid="multi-user-picker" />,
}))

import LeaveSettingsPage from "@/app/(tenant)/settings/leave/page"

const ROW = {
  id: 7, require_manager_approval: true, require_hr_approval: false, allow_negative_balance: false, max_negative_days: 0,
  working_days_per_week: 5, weekend_days: [5, 6], substitutes_enabled: false, substitution_pay_enabled: false,
  payroll_enabled: true, payroll_self_view_enabled: false, kpi_enabled: false, attendance_grid_enabled: false,
  auto_georgian_holidays: false, block_deactivation_with_open_requests: true, payroll_mode: "gross",
  income_tax_rate: "20.00", pension_rate: "2.00", payroll_currency: "GEL", payroll_managers: [],
}

beforeEach(() => {
  vi.clearAllMocks()
  h.list.mockResolvedValue({ results: [ROW] })
  h.patch.mockImplementation(async (_url: string, payload: object) => ({ data: { ...ROW, ...payload } }))
})

describe("LV-04 leave settings page", () => {
  it("renders the design sections and dims dependent fields", async () => {
    renderLeave(<LeaveSettingsPage />)
    expect(await screen.findByTestId("leave-settings-approval")).toBeInTheDocument()
    expect(screen.getByTestId("leave-settings-payroll")).toBeInTheDocument()
    expect(screen.getByLabelText(/Maximum Negative Balance/)).toBeDisabled()
    expect(screen.getByRole("switch", { name: "Substitution pay" })).toBeDisabled()
    expect(screen.getByTestId("leave-settings-savebar")).toHaveTextContent("All changes saved")
    // Net-only fields stay hidden in gross mode.
    expect(screen.queryByLabelText("Income tax (%)")).toBeNull()
  })

  it("tracks unsaved changes and saves with one PATCH", async () => {
    renderLeave(<LeaveSettingsPage />)
    await screen.findByTestId("leave-settings-approval")
    fireEvent.click(screen.getByRole("switch", { name: "Require HR Approval" }))
    fireEvent.click(screen.getByRole("checkbox", { name: "Friday" }))
    expect(screen.getByTestId("leave-settings-savebar")).toHaveTextContent("You have unsaved changes")
    fireEvent.click(screen.getByRole("radio", { name: "Net (after tax)" }))
    expect(screen.getByLabelText("Income tax (%)")).toHaveValue(20)
    fireEvent.click(screen.getByTestId("leave-settings-save"))
    await waitFor(() => expect(h.patch).toHaveBeenCalledTimes(1))
    const [url, payload] = h.patch.mock.calls[0]
    expect(url).toBe("/api/leave/admin/settings/7/")
    expect(payload).toMatchObject({ require_hr_approval: true, weekend_days: [4, 5, 6], payroll_mode: "net", payroll_currency: "GEL" })
    expect(h.post).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.getByTestId("leave-settings-savebar")).toHaveTextContent("All changes saved"))
    expect(h.invalidate).toHaveBeenCalledWith({ queryKey: ["userProfile"] })
  })

  it("blocks saving and offers retry when loading fails", async () => {
    h.list.mockRejectedValueOnce(new Error("403"))
    renderLeave(<LeaveSettingsPage />, "ka")
    expect(await screen.findByText(/პარამეტრები ვერ ჩაიტვირთა/)).toBeInTheDocument()
    expect(screen.getByTestId("leave-settings-save")).toBeDisabled()
    fireEvent.click(screen.getByRole("button", { name: "ხელახლა ცდა" }))
    await waitFor(() => expect(screen.getByTestId("leave-settings-save")).not.toBeDisabled())
    expect(h.list).toHaveBeenCalledTimes(2)
  })

  it("shows 'no access' without the form, a retry or a toast on a 403", async () => {
    h.list.mockRejectedValueOnce({ response: { status: 403, data: { detail: "Only administrators can manage leave settings." } } })
    renderLeave(<LeaveSettingsPage />, "ka")
    const state = await screen.findByTestId("leave-no-access")
    expect(state).toHaveAttribute("data-forbidden", "true")
    expect(screen.queryByTestId("leave-settings-save")).toBeNull()
    expect(screen.queryByTestId("leave-settings-approval")).toBeNull()
    expect(screen.queryByRole("button", { name: "ხელახლა ცდა" })).toBeNull()
    expect(h.toast.error).not.toHaveBeenCalled()
  })
})
