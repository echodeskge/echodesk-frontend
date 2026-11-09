import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react"
import { renderLeave } from "./lv00-helpers"

// ---------------------------------------------------------------------------
// Mocks: API, toasts, profile features, router, and components owned by LV-02.
// ---------------------------------------------------------------------------

const axiosGet = vi.fn()
vi.mock("@/api/axios", () => ({ default: { get: (...a: unknown[]) => axiosGet(...a) } }))

const api = {
  leaveEmployeeLeaveTypesList: vi.fn(),
  leaveEmployeeMyRequestsCreate: vi.fn(),
  leaveEmployeeMyRequestsCancelCreate: vi.fn(),
}
vi.mock("@/api/generated/api", () => ({
  leaveEmployeeLeaveTypesList: (...a: unknown[]) => api.leaveEmployeeLeaveTypesList(...a),
  leaveEmployeeMyRequestsCreate: (...a: unknown[]) => api.leaveEmployeeMyRequestsCreate(...a),
  leaveEmployeeMyRequestsCancelCreate: (...a: unknown[]) => api.leaveEmployeeMyRequestsCancelCreate(...a),
}))

const toast = { success: vi.fn(), error: vi.fn() }
vi.mock("sonner", () => ({ toast: { success: (...a: unknown[]) => toast.success(...a), error: (...a: unknown[]) => toast.error(...a) } }))

const features = { current: { substitutes: true, pending_substitute_count: 0 } as Record<string, unknown> | null }
vi.mock("@/app/(tenant)/leave/_lib/useLeaveFeatures", () => ({
  useLeaveFeatures: () => ({ features: features.current, userId: 7, loaded: true }),
}))

const fetchMySubstitutes = vi.fn()
vi.mock("@/app/(tenant)/leave/_lib/hr-api", async (orig) => ({
  ...(await orig<typeof import("@/app/(tenant)/leave/_lib/hr-api")>()),
  fetchMySubstitutes: () => fetchMySubstitutes(),
}))

vi.mock("@/app/(tenant)/leave/_components/UserPicker", () => ({
  useLiteUsers: () => ({ users: [] }),
  UserPicker: () => null,
}))

vi.mock("@/app/(tenant)/leave/_components/LeaveRequestDetailDialog", () => ({
  LeaveRequestDetailDialog: ({ requestId }: { requestId: number | null }) =>
    requestId === null ? null : <div data-testid="detail-dialog">detail {requestId}</div>,
}))

const push = vi.fn()
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }), usePathname: () => "/leave" }))

// Radix Select needs pointer capture in jsdom; a native select keeps the form testable.
vi.mock("@/components/ui/select", () => {
  const Item = ({ value }: { value: string; children?: React.ReactNode }) => <option value={value}>{value}</option>
  return {
    Select: ({ value, onValueChange, children }: { value: string; onValueChange: (v: string) => void; children: React.ReactNode }) => (
      <select data-testid="type-select" value={value} onChange={(e) => onValueChange(e.target.value)}>
        <option value="">-</option>
        {children}
      </select>
    ),
    SelectTrigger: () => null,
    SelectValue: () => null,
    SelectContent: ({ children }: { children: React.ReactNode }) => (
      <>{React.Children.toArray(children).filter((c) => React.isValidElement(c) && c.type === Item)}</>
    ),
    SelectItem: Item,
  }
})

import MyRequestsPage from "@/app/(tenant)/leave/my-requests/page"
import MyBalancePage from "@/app/(tenant)/leave/my-balance/page"
import LeaveDashboard from "@/app/(tenant)/leave/page"
import { NewRequestDialog } from "@/app/(tenant)/leave/my-requests/_components/new-request-dialog"

const REQUESTS = [
  { id: 1, leave_type: 1, leave_type_name: "Annual vacation", leave_type_color: "#3b82f6", start_date: "2026-11-16", end_date: "2026-11-20", total_days: "5.0", status: "pending", created_at: "2026-11-02T10:00:00Z" },
  { id: 2, leave_type: 2, leave_type_name: "Sick leave", leave_type_color: "#ef4444", start_date: "2026-10-05", end_date: "2026-10-06", total_days: "2.0", status: "approved", created_at: "2026-10-01T10:00:00Z" },
  { id: 3, leave_type: 3, leave_type_name: "Personal day", leave_type_color: "red; x", start_date: "2026-08-14", end_date: "2026-08-14", total_days: "0.5", status: "rejected", created_at: "2026-08-01T10:00:00Z" },
]

const TYPES = [
  { id: 1, name: { en: "Annual vacation", ka: "ყოველწლიური შვებულება" }, code: "VAC", color: "#3b82f6", requires_substitutes: true },
  { id: 2, name: "Sick leave", code: "SICK", color: "#ef4444", requires_substitutes: false },
]

beforeEach(() => {
  axiosGet.mockReset()
  features.current = { substitutes: true, pending_substitute_count: 0 }
  api.leaveEmployeeLeaveTypesList.mockResolvedValue({ results: TYPES })
  api.leaveEmployeeMyRequestsCreate.mockResolvedValue({})
  api.leaveEmployeeMyRequestsCancelCreate.mockResolvedValue({})
  fetchMySubstitutes.mockResolvedValue([])
})

const rowsOf = () => screen.queryAllByTestId("leave-table-row")

describe("My requests", () => {
  beforeEach(() => {
    axiosGet.mockImplementation((url: string) =>
      url === "/api/leave/employee/my-requests/" ? Promise.resolve({ data: { results: REQUESTS } }) : Promise.reject(new Error(url))
    )
  })

  it("loads with lang + page_size, shows rows with tz-safe ranges, days and a count in the header", async () => {
    renderLeave(<MyRequestsPage />)
    expect(screen.getByTestId("leave-table-skeleton")).toBeInTheDocument()
    await waitFor(() => expect(rowsOf()).toHaveLength(3))
    expect(axiosGet).toHaveBeenCalledWith("/api/leave/employee/my-requests/", { params: { lang: "en", page_size: 100 } })
    const first = rowsOf()[0]
    expect(first).toHaveTextContent("Annual vacation")
    expect(first).toHaveTextContent(/Nov 16–20/)
    expect(first).toHaveTextContent("Pending")
    expect(within(rowsOf()[2]).getByText("0.5")).toBeInTheDocument()
    expect(screen.getByTestId("leave-header-sub")).toHaveTextContent("· 3 requests")
    // Only open statuses can be cancelled.
    expect(within(rowsOf()[0]).getByTestId("cancel-request")).toBeInTheDocument()
    expect(within(rowsOf()[1]).queryByTestId("cancel-request")).toBeNull()
  })

  it("filters client side with counts and offers clear filters when a bucket is empty", async () => {
    axiosGet.mockResolvedValue({ data: { results: REQUESTS.slice(0, 2) } })
    renderLeave(<MyRequestsPage />)
    await waitFor(() => expect(rowsOf()).toHaveLength(2))
    const filter = screen.getByTestId("my-requests-filter")
    expect(within(filter).getAllByRole("radio").map((r) => r.textContent)).toEqual(["All2", "Active1", "Approved1", "Closed0"])
    fireEvent.click(within(filter).getByRole("radio", { name: /Approved/ }))
    expect(rowsOf()).toHaveLength(1)
    expect(rowsOf()[0]).toHaveTextContent("Sick leave")
    fireEvent.click(within(filter).getByRole("radio", { name: /Closed/ }))
    expect(screen.getByTestId("my-requests-no-matches")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }))
    expect(rowsOf()).toHaveLength(2)
    expect(axiosGet).toHaveBeenCalledTimes(1)
  })

  it("cancels after confirm and reloads; a row click opens the detail", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true)
    renderLeave(<MyRequestsPage />)
    await waitFor(() => expect(rowsOf()).toHaveLength(3))
    fireEvent.click(within(rowsOf()[0]).getByTestId("cancel-request"))
    await waitFor(() => expect(api.leaveEmployeeMyRequestsCancelCreate).toHaveBeenCalledWith("1", {}))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Leave request cancelled"))
    expect(axiosGet).toHaveBeenCalledTimes(2)
    // The cancel click did not open the row.
    expect(screen.queryByTestId("detail-dialog")).toBeNull()
    fireEvent.click(rowsOf()[1])
    expect(screen.getByTestId("detail-dialog")).toHaveTextContent("detail 2")
    confirm.mockReturnValue(false)
    fireEvent.click(within(rowsOf()[0]).getByTestId("cancel-request"))
    expect(api.leaveEmployeeMyRequestsCancelCreate).toHaveBeenCalledTimes(1)
    confirm.mockRestore()
  })

  it("shows the empty state with the create action, and an error state with retry", async () => {
    axiosGet.mockResolvedValueOnce({ data: [] })
    const { unmount } = renderLeave(<MyRequestsPage />)
    await waitFor(() => expect(screen.getByTestId("my-requests-empty")).toBeInTheDocument())
    fireEvent.click(screen.getByRole("button", { name: /Create Your First Request/ }))
    await waitFor(() => expect(screen.getByTestId("new-request-dialog")).toBeInTheDocument())
    unmount()

    axiosGet.mockRejectedValueOnce(new Error("Network Error"))
    renderLeave(<MyRequestsPage />, "ka")
    await waitFor(() => expect(screen.getByTestId("leave-error")).toBeInTheDocument())
    expect(toast.error).toHaveBeenCalled()
    // No English API text in the Georgian error state.
    expect(screen.getByTestId("leave-error").textContent).not.toMatch(/[A-Za-z]/)
    axiosGet.mockResolvedValueOnce({ data: { results: REQUESTS } })
    fireEvent.click(screen.getByRole("button", { name: "ხელახლა ცდა" }))
    await waitFor(() => expect(rowsOf()).toHaveLength(3))
    expect(rowsOf()[0]).toHaveTextContent("16–20 ნოე")
  })

  it("the header primary opens the new request dialog", async () => {
    renderLeave(<MyRequestsPage />)
    await waitFor(() => expect(rowsOf()).toHaveLength(3))
    fireEvent.click(within(screen.getByTestId("outlet-primary")).getByRole("button", { name: "New Request" }))
    await waitFor(() => expect(screen.getByTestId("new-request-dialog")).toBeInTheDocument())
  })
})

describe("New request dialog", () => {
  function Harness({ onSubmitted }: { onSubmitted?: () => void }) {
    const [open, setOpen] = React.useState(true)
    return (
      <>
        <span data-testid="open-state">{String(open)}</span>
        <NewRequestDialog open={open} onOpenChange={setOpen} onSubmitted={onSubmitted} />
      </>
    )
  }

  it("loads leave types once when it opens and requires a type", async () => {
    renderLeave(<Harness />)
    await waitFor(() => expect(api.leaveEmployeeLeaveTypesList).toHaveBeenCalledWith(undefined, undefined, 100))
    await waitFor(() => expect(screen.getAllByRole("option")).toHaveLength(3))
    fireEvent.submit(screen.getByTestId("new-request-submit").closest("form")!)
    expect(toast.error).toHaveBeenCalledWith("Please select a leave type")
    expect(api.leaveEmployeeMyRequestsCreate).not.toHaveBeenCalled()
    expect(api.leaveEmployeeLeaveTypesList).toHaveBeenCalledTimes(1)
  })

  it("submits the same payload, closes and calls onSubmitted", async () => {
    const onSubmitted = vi.fn()
    renderLeave(<Harness onSubmitted={onSubmitted} />)
    await waitFor(() => expect(screen.getAllByRole("option")).toHaveLength(3))
    fireEvent.change(screen.getByTestId("type-select"), { target: { value: "2" } })
    fireEvent.change(screen.getByLabelText("Start Date"), { target: { value: "2026-12-21" } })
    fireEvent.change(screen.getByLabelText("End Date"), { target: { value: "2026-12-22" } })
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Flu" } })
    expect(screen.queryByTestId("new-request-substitutes")).toBeNull()
    fireEvent.submit(screen.getByTestId("new-request-submit").closest("form")!)
    await waitFor(() =>
      expect(api.leaveEmployeeMyRequestsCreate).toHaveBeenCalledWith({ leave_type: 2, start_date: "2026-12-21", end_date: "2026-12-22", reason: "Flu" })
    )
    await waitFor(() => expect(onSubmitted).toHaveBeenCalled())
    expect(screen.getByTestId("open-state")).toHaveTextContent("false")
  })

  it("shows the saved substitutes list for a type that needs them", async () => {
    fetchMySubstitutes.mockResolvedValue([
      { id: 9, sort_order: 1, substitute: 4, substitute_name: "Ana Javakhishvili", task: "Daily report" },
      { id: 8, sort_order: 0, substitute: 3, substitute_name: "Luka Tsiklauri", task: "Tickets" },
    ])
    renderLeave(<Harness />)
    await waitFor(() => expect(screen.getAllByRole("option")).toHaveLength(3))
    fireEvent.change(screen.getByTestId("type-select"), { target: { value: "1" } })
    const block = await screen.findByTestId("new-request-substitutes")
    await waitFor(() => expect(within(block).getAllByRole("listitem")).toHaveLength(2))
    expect(within(block).getAllByRole("listitem")[0]).toHaveTextContent("Luka Tsiklauri")
    expect(within(block).getByRole("link", { name: "Edit my substitutes" })).toHaveAttribute("href", "/leave/my-substitutes")
  })

  it("does not ask for substitutes when the feature is off", async () => {
    features.current = { substitutes: false, pending_substitute_count: 0 }
    renderLeave(<Harness />)
    await waitFor(() => expect(screen.getAllByRole("option")).toHaveLength(3))
    fireEvent.change(screen.getByTestId("type-select"), { target: { value: "1" } })
    expect(screen.queryByTestId("new-request-substitutes")).toBeNull()
    expect(fetchMySubstitutes).not.toHaveBeenCalled()
  })

  it("maps API errors under their fields and keeps the dialog open", async () => {
    api.leaveEmployeeMyRequestsCreate.mockRejectedValue({
      response: { status: 400, data: { end_date: ["End date must be after start date"], non_field_errors: ["Overlapping request"] } },
    })
    renderLeave(<Harness />)
    await waitFor(() => expect(screen.getAllByRole("option")).toHaveLength(3))
    fireEvent.change(screen.getByTestId("type-select"), { target: { value: "2" } })
    fireEvent.submit(screen.getByTestId("new-request-submit").closest("form")!)
    await waitFor(() => expect(screen.getAllByRole("alert").map((a) => a.textContent)).toEqual([
      "End date must be after start date",
      "Overlapping request",
    ]))
    expect(screen.getByLabelText("End Date")).toHaveAttribute("aria-invalid", "true")
    expect(screen.getByTestId("open-state")).toHaveTextContent("true")
    expect(toast.error).toHaveBeenCalledWith("Could not submit the leave request", expect.anything())
  })
})

const BALANCES = [
  { id: 1, leave_type: 1, leave_type_name: "Annual vacation", leave_type_code: "VAC", year: 2026, allocated_days: "24.0", used_days: "0.0", carried_forward_days: "2.0", pending_days: "5.0", available_days: "21.0", total_allocated: "26.0" },
  { id: 2, leave_type: 2, leave_type_name: "Unpaid leave", leave_type_code: "UNPAID", year: 2026, allocated_days: "0.0", used_days: "0.0", carried_forward_days: "0.0", pending_days: "0.0", available_days: "0.0", total_allocated: "0.0" },
]

describe("My balance", () => {
  it("pluralises the remaining-days pill (1 day, 1.5 days)", async () => {
    const one = { ...BALANCES[0], id: 7, available_days: "1.0", used_days: "24.0", pending_days: "1.0" }
    const half = { ...BALANCES[0], id: 8, leave_type: 3, available_days: "1.5", used_days: "24.0", pending_days: "0.5" }
    axiosGet.mockResolvedValue({ data: { results: [one, half] } })
    renderLeave(<MyBalancePage />)
    await waitFor(() => expect(screen.getAllByTestId("balance-card")).toHaveLength(2))
    const [a, b] = screen.getAllByTestId("balance-remaining")
    expect(a).toHaveTextContent(/^1 day left$/)
    expect(b).toHaveTextContent(/^1\.5 days left$/)
  })

  it("shows totals, one card per type with remaining pill, progress and figures", async () => {
    axiosGet.mockResolvedValue({ data: { results: BALANCES } })
    renderLeave(<MyBalancePage />)
    await waitFor(() => expect(screen.getAllByTestId("balance-card")).toHaveLength(2))
    const year = new Date().getFullYear()
    expect(axiosGet).toHaveBeenCalledWith("/api/leave/employee/my-balance/", { params: { year, lang: "en", page_size: 100 } })
    expect(screen.getByTestId("leave-header-sub")).toHaveTextContent(String(year))
    expect(screen.getByTestId("my-balance-stats")).toHaveTextContent(/Total Allocated\s*26/)
    const [vac, unpaid] = screen.getAllByTestId("balance-card")
    expect(within(vac).getByTestId("balance-remaining")).toHaveTextContent("21 days left")
    expect(within(vac).getByTestId("balance-remaining")).toHaveAttribute("data-tone", "success")
    expect(within(unpaid).getByTestId("balance-remaining")).toHaveAttribute("data-tone", "neutral")
    expect(within(unpaid).getByTestId("balance-remaining")).toHaveTextContent("0 days left")
    expect(within(vac).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0")
    expect(within(vac).getByText("VAC")).toBeInTheDocument()
  })

  it("shows the empty state and the error state", async () => {
    axiosGet.mockResolvedValueOnce({ data: [] })
    const { unmount } = renderLeave(<MyBalancePage />)
    await waitFor(() => expect(screen.getByTestId("my-balance-empty")).toBeInTheDocument())
    unmount()
    axiosGet.mockRejectedValueOnce(new Error("boom"))
    renderLeave(<MyBalancePage />)
    await waitFor(() => expect(screen.getByTestId("leave-error")).toBeInTheDocument())
    expect(screen.getByTestId("my-balance-stats")).toHaveTextContent(/Remaining\s*—/)
  })
})

describe("Leave landing", () => {
  const ok = (data: unknown) => Promise.resolve({ data })
  function mockLanding(team: "ok" | 403 | 500) {
    axiosGet.mockImplementation((url: string) => {
      switch (url) {
        case "/api/leave/employee/my-requests/pending/":
          return ok({ count: 3, results: [] })
        case "/api/leave/employee/my-requests/approved/":
          return ok({ results: [{ start_date: `${new Date().getFullYear()}-06-01` }, { start_date: "1999-01-01" }] })
        case "/api/leave/employee/my-balance/summary/":
          return ok({ total_available: "31.0" })
        case "/api/leave/manager/team-requests/pending/":
          return team === "ok" ? ok({ count: 5 }) : Promise.reject({ response: { status: team } })
        case "/api/leave/employee/leave-types/":
          return ok({ count: 4 })
        case "/api/leave/employee/holidays/upcoming/":
          return ok([])
        default:
          return Promise.reject(new Error(url))
      }
    })
  }

  it("shows the six counters; the team tile links to team requests", async () => {
    mockLanding("ok")
    renderLeave(<LeaveDashboard />)
    await waitFor(() => expect(screen.getByTestId("stat-my-pending")).toHaveTextContent("3"))
    expect(screen.getByTestId("stat-approved")).toHaveTextContent(/Approved Leaves\s*1/)
    expect(screen.getByTestId("stat-balance")).toHaveTextContent("31")
    expect(screen.getByTestId("stat-leave-types")).toHaveTextContent("4")
    expect(screen.getByTestId("stat-holidays")).toHaveTextContent("0")
    fireEvent.click(screen.getByTestId("stat-team-pending"))
    expect(push).toHaveBeenCalledWith("/leave/team-requests")
    expect(toast.error).not.toHaveBeenCalled()
    expect(within(screen.getByTestId("leave-quick-links")).getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual([
      "/leave/my-requests",
      "/leave/my-balance",
      "/leave/team-requests",
      "/leave/all-requests",
    ])
  })

  it("hides the team tile on 403, shows a dash and one toast on other failures", async () => {
    mockLanding(403)
    const { unmount } = renderLeave(<LeaveDashboard />)
    await waitFor(() => expect(screen.getByTestId("stat-my-pending")).toHaveTextContent("3"))
    expect(screen.queryByTestId("stat-team-pending")).toBeNull()
    expect(toast.error).not.toHaveBeenCalled()
    unmount()
    mockLanding(500)
    renderLeave(<LeaveDashboard />)
    await waitFor(() => expect(screen.getByTestId("stat-team-pending")).toHaveTextContent("—"))
    expect(toast.error).toHaveBeenCalledTimes(1)
  })

  it("shows the covering banner only with the substitutes feature and pending asks", async () => {
    mockLanding(403)
    features.current = { substitutes: true, pending_substitute_count: 2 }
    const { unmount } = renderLeave(<LeaveDashboard />)
    expect(screen.getByTestId("covering-banner-link")).toHaveAttribute("href", "/leave/covering")
    unmount()
    features.current = { substitutes: false, pending_substitute_count: 2 }
    renderLeave(<LeaveDashboard />)
    expect(screen.queryByTestId("covering-banner-link")).toBeNull()
    await act(async () => {})
  })

  it("opens the new request dialog from the header and reloads the counters after a create", async () => {
    mockLanding(403)
    renderLeave(<LeaveDashboard />)
    await waitFor(() => expect(screen.getByTestId("stat-my-pending")).toHaveTextContent("3"))
    const calls = axiosGet.mock.calls.length
    fireEvent.click(within(screen.getByTestId("outlet-primary")).getByRole("button", { name: "New Request" }))
    await waitFor(() => expect(screen.getAllByRole("option")).toHaveLength(3))
    fireEvent.change(screen.getByTestId("type-select"), { target: { value: "2" } })
    fireEvent.submit(screen.getByTestId("new-request-submit").closest("form")!)
    await waitFor(() => expect(axiosGet.mock.calls.length).toBe(calls * 2))
  })
})
