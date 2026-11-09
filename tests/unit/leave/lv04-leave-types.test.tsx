import React from "react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { renderLeave } from "./lv00-helpers"

const h = vi.hoisted(() => ({
  toast: { success: vi.fn(), error: vi.fn() },
  api: {
    leaveAdminLeaveTypesList: vi.fn(),
    leaveAdminLeaveTypesRetrieve: vi.fn(),
    leaveAdminLeaveTypesCreate: vi.fn(),
    leaveAdminLeaveTypesUpdate: vi.fn(),
    leaveAdminLeaveTypesDestroy: vi.fn(),
  },
}))
vi.mock("sonner", () => ({ toast: h.toast }))
vi.mock("@/api/generated/api", () => h.api)
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }))

import LeaveTypesPage from "@/app/(tenant)/leave/leave-types/page"

const VAC = {
  id: 1, name: { en: "Annual vacation", ka: "ყოველწლიური შვებულება" }, code: "VAC", is_paid: true, requires_approval: true,
  color: "#3b82f6", is_active: true, calculation_method: "annual", default_days_per_year: "24.0", max_carry_forward_days: 5,
  carry_forward_expiry_months: 3, accrual_rate_per_month: "0", sort_order: 0, requires_substitutes: true,
  max_requests_per_month: 2, max_days_per_request: null, description: { en: "", ka: "" },
}
const UNPAID = { ...VAC, id: 4, name: { en: "Unpaid leave", ka: "უხელფასო" }, code: "UNPAID", is_paid: false, is_active: false, calculation_method: "manual", default_days_per_year: "0.0", max_carry_forward_days: 0 }

beforeEach(() => {
  vi.clearAllMocks()
  h.api.leaveAdminLeaveTypesList.mockResolvedValue({ results: [{ id: 1 }, { id: 4 }] })
  h.api.leaveAdminLeaveTypesRetrieve.mockImplementation(async (id: string) => (id === "1" ? VAC : UNPAID))
})

describe("LV-04 leave types page", () => {
  it("renders the card table with pills, code and count", async () => {
    renderLeave(<LeaveTypesPage />)
    const rows = await screen.findAllByTestId("leave-table-row")
    expect(rows).toHaveLength(2)
    expect(within(rows[0]).getByText("Annual vacation")).toBeInTheDocument()
    expect(within(rows[0]).getByTestId("leave-type-code")).toHaveTextContent("VAC")
    expect(within(rows[0]).getByText("Paid")).toBeInTheDocument()
    expect(within(rows[1]).getByText("Unpaid")).toBeInTheDocument()
    expect(within(rows[1]).getByText("Inactive")).toBeInTheDocument()
    expect(screen.getByTestId("outlet-meta")).toHaveTextContent("2 leave types")
    expect(screen.getByText(/2 leave types · click a row to edit/)).toBeInTheDocument()
  })

  it("opens the prefilled edit dialog on row click and saves with PUT", async () => {
    h.api.leaveAdminLeaveTypesUpdate.mockResolvedValue({})
    renderLeave(<LeaveTypesPage />)
    const rows = await screen.findAllByTestId("leave-table-row")
    fireEvent.click(rows[0])
    const dialog = await screen.findByTestId("leave-type-dialog")
    expect(within(dialog).getByLabelText("Name (English)")).toHaveValue("Annual vacation")
    expect(within(dialog).getByLabelText("Max requests per month")).toHaveValue(2)
    fireEvent.click(within(dialog).getByTestId("leave-type-submit"))
    await waitFor(() => expect(h.api.leaveAdminLeaveTypesUpdate).toHaveBeenCalledTimes(1))
    const [id, payload] = h.api.leaveAdminLeaveTypesUpdate.mock.calls[0]
    expect(id).toBe("1")
    expect(payload).toMatchObject({ code: "VAC", requires_substitutes: true, max_requests_per_month: 2, max_days_per_request: null })
  })

  it("delete asks for confirmation and does not open the row", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false)
    renderLeave(<LeaveTypesPage />)
    const rows = await screen.findAllByTestId("leave-table-row")
    fireEvent.click(within(rows[0]).getByTestId("leave-type-delete"))
    expect(confirm).toHaveBeenCalled()
    expect(h.api.leaveAdminLeaveTypesDestroy).not.toHaveBeenCalled()
    expect(screen.queryByTestId("leave-type-dialog")).toBeNull()
    confirm.mockReturnValue(true)
    h.api.leaveAdminLeaveTypesDestroy.mockResolvedValue({})
    fireEvent.click(within(rows[0]).getByTestId("leave-type-delete"))
    await waitFor(() => expect(h.api.leaveAdminLeaveTypesDestroy).toHaveBeenCalledWith("1"))
    confirm.mockRestore()
  })

  it("shows a translated error state with retry when the list fails", async () => {
    h.api.leaveAdminLeaveTypesList.mockRejectedValueOnce(new Error("Only administrators can manage leave types."))
    renderLeave(<LeaveTypesPage />, "ka")
    const err = await screen.findByTestId("leave-error")
    expect(err.textContent).not.toMatch(/administrators/)
    fireEvent.click(within(err).getByRole("button"))
    expect(await screen.findAllByTestId("leave-table-row")).toHaveLength(2)
    expect(h.api.leaveAdminLeaveTypesList).toHaveBeenCalledTimes(2)
  })

  it("a 403 shows the Georgian no-access state, no retry and no English toast", async () => {
    const forbidden = Object.assign(new Error("Only administrators can manage leave types."), { response: { status: 403 } })
    h.api.leaveAdminLeaveTypesList.mockRejectedValueOnce(forbidden)
    renderLeave(<LeaveTypesPage />, "ka")
    const err = await screen.findByTestId("leave-error")
    expect(err).toHaveTextContent("ამ გვერდზე წვდომა არ გაქვთ")
    expect(within(err).queryByRole("button")).toBeNull()
    expect(h.toast.error).not.toHaveBeenCalled()
    // No "New leave type" for a user who can't create one.
    expect(screen.queryByTestId("leave-types-new")).toBeNull()
  })

  it("creates from the header button with an empty form", async () => {
    h.api.leaveAdminLeaveTypesCreate.mockResolvedValue({})
    renderLeave(<LeaveTypesPage />)
    await screen.findAllByTestId("leave-table-row")
    fireEvent.click(screen.getByTestId("leave-types-new"))
    const dialog = await screen.findByTestId("leave-type-dialog")
    expect(within(dialog).getByLabelText("Name (English)")).toHaveValue("")
    expect(within(dialog).getByRole("heading", { name: "Create Leave Type" })).toBeInTheDocument()
  })
})
