import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderLeave } from "./lv00-helpers"

// --- mocks -----------------------------------------------------------------
const get = vi.fn()
const post = vi.fn()
const put = vi.fn()
vi.mock("@/api/axios", () => ({
  default: {
    get: (...a: unknown[]) => get(...a),
    post: (...a: unknown[]) => post(...a),
    put: (...a: unknown[]) => put(...a),
  },
}))

const approve = vi.fn()
const reject = vi.fn()
const retrieve = vi.fn()
vi.mock("@/api/generated/api", () => ({
  leaveManagerTeamRequestsApproveCreate: (...a: unknown[]) => approve(...a),
  leaveManagerTeamRequestsRejectCreate: (...a: unknown[]) => reject(...a),
  leaveManagerTeamRequestsRetrieve: (...a: unknown[]) => retrieve(...a),
}))

const access = { userId: 2, isSuperuser: false }
vi.mock("@/hooks/useMyAccess", () => ({ useMyAccess: () => access }))

const features = {
  loaded: true,
  userId: 3,
  isStaff: false,
  features: { substitutes: true, pending_substitute_count: 2 } as Record<string, unknown> | null,
}
vi.mock("@/app/(tenant)/leave/_lib/useLeaveFeatures", () => ({ useLeaveFeatures: () => features }))

const toastError = vi.fn()
const toastSuccess = vi.fn()
vi.mock("sonner", () => ({ toast: { error: (...a: unknown[]) => toastError(...a), success: (...a: unknown[]) => toastSuccess(...a) } }))

import TeamRequestsPage from "@/app/(tenant)/leave/team-requests/page"
import AllRequestsPage from "@/app/(tenant)/leave/all-requests/page"
import CoveringPage from "@/app/(tenant)/leave/covering/page"
import MySubstitutesPage from "@/app/(tenant)/leave/my-substitutes/page"

// Dates in the current year so the labels carry no year (clock independent).
const Y = new Date().getFullYear()
const req = (id: number, status: string, extra: Record<string, unknown> = {}) => ({
  id,
  employee: 10 + id,
  employee_name: `Employee ${id}`,
  leave_type: 1,
  leave_type_name: "Annual vacation",
  leave_type_color: "#3b82f6",
  start_date: `${Y}-11-16`,
  end_date: `${Y}-11-20`,
  total_days: "5.0",
  status,
  created_at: `${Y}-11-01T10:00:00Z`,
  ...extra,
})

function withQuery(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{ui}</QueryClientProvider>
}

beforeEach(() => {
  get.mockReset()
  post.mockReset()
  put.mockReset()
  approve.mockReset()
  reject.mockReset()
  retrieve.mockReset()
  toastError.mockReset()
  toastSuccess.mockReset()
  access.userId = 2
  access.isSuperuser = false
  features.isStaff = false
  features.features = { substitutes: true, pending_substitute_count: 2 }
  window.history.replaceState(null, "", "/leave")
})

describe("team requests", () => {
  const list = [req(1, "pending"), req(2, "approved"), req(3, "pending", { employee: 2, employee_name: "Me Myself" }), req(4, "manager_approved")]

  it("shows the pending count, the stat strip and only pending rows by default with tz-safe dates", async () => {
    get.mockResolvedValue({ data: { count: 4, results: list } })
    renderLeave(<TeamRequestsPage />)
    expect(await screen.findByText("Employee 1")).toBeInTheDocument()
    expect(get).toHaveBeenCalledWith("/api/leave/manager/team-requests/", { params: { lang: "en", page_size: 100 } })
    expect(screen.getByTestId("outlet-meta")).toHaveTextContent("2 pending")
    const strip = screen.getByTestId("team-requests-stats")
    expect(strip).toHaveTextContent("Pending Approval2")
    expect(strip).toHaveTextContent("Total Requests4")
    // manager_approved + approved
    expect(strip).toHaveTextContent("Approved2")
    expect(screen.queryByText("Employee 2")).not.toBeInTheDocument()
    expect(screen.getAllByText("Nov 16–20").length).toBeGreaterThan(0)
    expect(screen.getAllByText("5 days").length).toBeGreaterThan(0)
    fireEvent.click(within(screen.getByTestId("team-requests-filter")).getByRole("radio", { name: /All/ }))
    expect(screen.getByText("Employee 2")).toBeInTheDocument()
  })

  it("never offers approve/reject on the caller's own request unless superuser", async () => {
    get.mockResolvedValue({ data: { count: 4, results: list } })
    renderLeave(<TeamRequestsPage />)
    await screen.findByText("Employee 1")
    const rows = screen.getAllByTestId("leave-table-row")
    const own = rows.find((r) => r.textContent?.includes("Me Myself"))!
    const other = rows.find((r) => r.textContent?.includes("Employee 1"))!
    expect(within(own).queryByTestId("team-approve")).toBeNull()
    expect(within(other).getByTestId("team-approve")).toBeInTheDocument()
  })

  it("approves with the trimmed comment and reloads", async () => {
    get.mockResolvedValue({ data: { count: 4, results: list } })
    retrieve.mockResolvedValue({ reason: "Family trip", employee_email: "e1@demo.ge" })
    approve.mockResolvedValue({})
    renderLeave(<TeamRequestsPage />)
    await screen.findByText("Employee 1")
    const row = screen.getAllByTestId("leave-table-row").find((r) => r.textContent?.includes("Employee 1"))!
    fireEvent.click(within(row).getByTestId("team-approve"))
    expect(await screen.findByTestId("decision-reason")).toHaveTextContent("Family trip")
    expect(screen.getByText("e1@demo.ge")).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText("Comments (Optional)"), { target: { value: "  enjoy  " } })
    fireEvent.click(screen.getByTestId("decision-confirm"))
    await waitFor(() => expect(approve).toHaveBeenCalledWith("1", { action: "approve", comments: "enjoy" }))
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2))
    expect(toastSuccess).toHaveBeenCalledWith("Leave request approved")
  })

  it("does not reject without a comment", async () => {
    get.mockResolvedValue({ data: { count: 4, results: list } })
    retrieve.mockResolvedValue({ reason: "", employee_email: "" })
    renderLeave(<TeamRequestsPage />)
    await screen.findByText("Employee 1")
    const row = screen.getAllByTestId("leave-table-row").find((r) => r.textContent?.includes("Employee 1"))!
    fireEvent.click(within(row).getByTestId("team-reject"))
    fireEvent.click(await screen.findByTestId("decision-confirm"))
    expect(toastError).toHaveBeenCalledWith("Please add a comment explaining the rejection")
    expect(reject).not.toHaveBeenCalled()
    expect(screen.getByTestId("leave-decision-dialog")).toBeInTheDocument()
  })

  it("shows the translated error state with retry on a failed load (Georgian)", async () => {
    get.mockRejectedValueOnce(Object.assign(new Error("Request failed with status code 403"), { response: { status: 403, data: { detail: "You do not have permission" } } }))
    renderLeave(<TeamRequestsPage />, "ka")
    expect(await screen.findByTestId("leave-error")).toHaveTextContent("მონაცემები ვერ ჩაიტვირთა")
    expect(screen.getByTestId("leave-error")).not.toHaveTextContent("permission")
    get.mockResolvedValue({ data: { count: 1, results: [req(1, "pending")] } })
    fireEvent.click(screen.getByRole("button", { name: "ხელახლა ცდა" }))
    expect(await screen.findByText("Employee 1")).toBeInTheDocument()
  })
})

describe("all requests", () => {
  it("keeps the server-side status filter and shows the submitted date", async () => {
    get.mockResolvedValue({ data: { results: [req(1, "approved")] } })
    renderLeave(<AllRequestsPage />)
    expect(await screen.findByText("Employee 1")).toBeInTheDocument()
    expect(get).toHaveBeenLastCalledWith("/api/leave/admin/leave-requests/", {
      params: { status: undefined, lang: "en", page_size: 100 },
    })
    expect(screen.getByText("Nov 1")).toBeInTheDocument()
    fireEvent.click(within(screen.getByTestId("all-requests-filter")).getByRole("radio", { name: "Rejected" }))
    await waitFor(() =>
      expect(get).toHaveBeenLastCalledWith("/api/leave/admin/leave-requests/", {
        params: { status: "rejected", lang: "en", page_size: 100 },
      })
    )
  })

  it("filters the loaded page by search and offers to clear it", async () => {
    get.mockResolvedValue({ data: { results: [req(1, "approved"), req(2, "pending")] } })
    renderLeave(<AllRequestsPage />)
    await screen.findByText("Employee 1")
    fireEvent.change(screen.getByTestId("all-requests-search"), { target: { value: "employee 2" } })
    expect(screen.queryByText("Employee 1")).not.toBeInTheDocument()
    fireEvent.change(screen.getByTestId("all-requests-search"), { target: { value: "nobody" } })
    expect(screen.getByText("Nothing matches these filters")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }))
    expect(screen.getByText("Employee 1")).toBeInTheDocument()
  })
})

describe("covering", () => {
  const rows = [
    { ...req(5, "awaiting_substitutes"), my_row_id: 1, my_task: "Answer the phones", my_status: "pending" },
    { ...req(6, "approved"), my_row_id: 2, my_task: "Weekly report", my_status: "accepted" },
  ]

  it("is gated by the substitutes switch", () => {
    features.features = { substitutes: false, pending_substitute_count: 0 }
    renderLeave(withQuery(<CoveringPage />))
    expect(screen.getByText("This feature is turned off in leave settings.")).toBeInTheDocument()
    expect(get).not.toHaveBeenCalled()
  })

  it("lists asks with my answer and an Answer button only where I still have to answer", async () => {
    get.mockResolvedValue({ data: { results: rows } })
    renderLeave(withQuery(<CoveringPage />))
    expect(await screen.findByText("Answer the phones")).toBeInTheDocument()
    expect(get).toHaveBeenCalledWith("/api/leave/employee/covering/", { params: { state: "awaiting", lang: "en", page_size: 100 } })
    expect(screen.getByTestId("outlet-meta")).toHaveTextContent("2 awaiting your answer")
    expect(screen.getAllByTestId("covering-answer")).toHaveLength(1)
    const answers = screen.getAllByTestId("covering-my-answer").map((p) => [p.textContent, p.getAttribute("data-tone")])
    expect(answers).toEqual([
      ["Waiting", "warning"],
      ["Accepted", "success"],
    ])
    fireEvent.click(within(screen.getByTestId("covering-tabs")).getByRole("radio", { name: "All" }))
    await waitFor(() =>
      expect(get).toHaveBeenLastCalledWith("/api/leave/employee/covering/", { params: { state: "all", lang: "en", page_size: 100 } })
    )
  })
})

describe("my substitutes", () => {
  it("shows an error state, not an empty editor, when the list fails to load", async () => {
    get.mockImplementation((url: string) =>
      url === "/api/leave/employee/my-substitutes/" ? Promise.reject(new Error("Network Error")) : Promise.resolve({ data: [] })
    )
    renderLeave(<MySubstitutesPage />)
    expect(await screen.findByTestId("leave-error")).toBeInTheDocument()
    expect(screen.queryByTestId("my-substitutes-save")).toBeNull()
    expect(screen.queryByText("Add substitute")).toBeNull()
  })

  it("loads the saved list in order and saves the edited list", async () => {
    get.mockImplementation((url: string) =>
      url === "/api/leave/employee/my-substitutes/"
        ? Promise.resolve({
            data: [
              { id: 2, substitute: 5, substitute_name: "B", substitute_email: "b@x", task: "Second", sort_order: 1 },
              { id: 1, substitute: 4, substitute_name: "A", substitute_email: "a@x", task: "First", sort_order: 0 },
            ],
          })
        : Promise.resolve({ data: [{ id: 4, email: "a@x", full_name: "Ana A" }, { id: 5, email: "b@x", full_name: "Beka B" }] })
    )
    put.mockImplementation((_url: string, body: { items: { substitute: number; task: string }[] }) =>
      Promise.resolve({ data: body.items.map((it, i) => ({ id: i + 1, ...it, substitute_name: "", substitute_email: "", sort_order: i })) })
    )
    renderLeave(<MySubstitutesPage />)
    const rows = await screen.findAllByTestId("substitute-row")
    expect(rows.map((r) => (within(r).getByRole("textbox") as HTMLInputElement).value)).toEqual(["First", "Second"])
    expect(screen.getByTestId("my-substitutes-save")).toBeDisabled()
    fireEvent.click(within(rows[0]).getByRole("button", { name: "Move down" }))
    expect(screen.getByTestId("my-substitutes-dirty")).toHaveTextContent("Unsaved changes")
    fireEvent.click(screen.getByTestId("my-substitutes-save"))
    await waitFor(() =>
      expect(put).toHaveBeenCalledWith("/api/leave/employee/my-substitutes/replace/", {
        items: [
          { substitute: 5, task: "Second" },
          { substitute: 4, task: "First" },
        ],
      })
    )
    await waitFor(() => expect(screen.queryByTestId("my-substitutes-dirty")).toBeNull())
  })
})
