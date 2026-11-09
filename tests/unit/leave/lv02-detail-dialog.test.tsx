import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { renderLeave } from "./lv00-helpers"

const get = vi.fn()
const post = vi.fn()
vi.mock("@/api/axios", () => ({
  default: { get: (...a: unknown[]) => get(...a), post: (...a: unknown[]) => post(...a) },
}))
const features = { loaded: true, userId: 1, isStaff: true, features: null }
vi.mock("@/app/(tenant)/leave/_lib/useLeaveFeatures", () => ({ useLeaveFeatures: () => features }))
const toastError = vi.fn()
vi.mock("sonner", () => ({ toast: { error: (...a: unknown[]) => toastError(...a), success: vi.fn() } }))

import { LeaveRequestDetailDialog } from "@/app/(tenant)/leave/_components/LeaveRequestDetailDialog"

const detail = (extra: Record<string, unknown> = {}) => ({
  id: 7,
  employee: 3,
  employee_name: "Mariam Lomidze",
  employee_email: "agent@demo.ge",
  leave_type: 1,
  leave_type_details: { id: 1, name_display: "Annual vacation", code: "VAC", color: "#3b82f6" },
  start_date: "2026-12-28",
  end_date: "2027-01-03",
  total_days: "5.0",
  reason: "Family trip",
  status: "awaiting_substitutes",
  substitutes: [
    { id: 1, substitute: 4, substitute_name: "Luka Tsiklauri", substitute_email: "", task: "Reply to tickets", status: "accepted", responded_at: null, comment: "" },
    { id: 2, substitute: 5, substitute_name: "Ana Javakhishvili", substitute_email: "", task: "Daily report", status: "pending", responded_at: null, comment: "" },
  ],
  history: [
    { id: 1, kind: "request", action: "created", from_status: "new", to_status: "awaiting_substitutes", actor: 3, actor_name: "Mariam Lomidze", data: {}, created_at: "2026-11-08T10:00:00Z" },
  ],
  created_at: "2026-11-08T10:00:00Z",
  ...extra,
})

beforeEach(() => {
  get.mockReset()
  post.mockReset()
  toastError.mockReset()
  features.isStaff = true
})

describe("LeaveRequestDetailDialog", () => {
  it("renders the header, fields, substitutes and history from the scope's endpoint", async () => {
    get.mockResolvedValue({ data: detail() })
    renderLeave(<LeaveRequestDetailDialog requestId={7} scope="manager" onClose={() => {}} />)
    const dlg = await screen.findByTestId("leave-request-detail")
    await within(dlg).findByText("Mariam Lomidze")
    expect(get).toHaveBeenCalledWith("/api/leave/manager/team-requests/7/", { params: { lang: "en" } })
    expect(within(dlg).getByText("agent@demo.ge")).toBeInTheDocument()
    expect(within(dlg).getByTestId("leave-status-pill")).toHaveTextContent("Awaiting substitutes")
    const fields = within(dlg).getByTestId("detail-fields")
    // across years: both years spelled out, no timezone shift
    expect(fields).toHaveTextContent("Dec 28, 2026 – Jan 3, 2027")
    expect(fields).toHaveTextContent("5 days")
    expect(fields).toHaveTextContent("Family trip")
    const subs = within(dlg).getByTestId("detail-substitutes")
    const tones = [...subs.querySelectorAll("[data-tone]")].map((n) => n.getAttribute("data-tone"))
    expect(tones).toEqual(["success", "warning"])
    expect(within(dlg).getByTestId("detail-history")).toHaveTextContent("Request submitted")
  })

  it("lists approval steps in order with their notes", async () => {
    get.mockResolvedValue({
      data: detail({
        status: "rejected",
        substitutes: [],
        history: [],
        manager_approver_name: "Giorgi Kapanadze",
        manager_approved_at: "2026-11-09T09:00:00Z",
        rejected_by_name: "Nino Beridze",
        rejected_at: "2026-11-10T09:00:00Z",
        rejection_reason: "Busy week",
      }),
    })
    renderLeave(<LeaveRequestDetailDialog requestId={7} scope="admin" onClose={() => {}} />)
    const steps = await screen.findByTestId("detail-approvals")
    const items = within(steps).getAllByRole("listitem").map((li) => li.textContent)
    expect(items[0]).toContain("Giorgi Kapanadze")
    expect(items[0]).toContain("Manager")
    expect(items[1]).toContain("Rejected by")
    expect(items[1]).toContain("Busy week")
    expect(screen.queryByRole("button", { name: "Skip pending consents" })).toBeNull()
  })

  it("lets staff skip pending consents with a required reason", async () => {
    get.mockResolvedValue({ data: detail() })
    post.mockResolvedValue({ data: detail({ status: "pending", substitutes_skipped_at: "2026-11-09T10:00:00Z", substitutes_skipped_by_name: "Nino" }) })
    const onChanged = vi.fn()
    renderLeave(<LeaveRequestDetailDialog requestId={7} scope="admin" onClose={() => {}} onChanged={onChanged} />)
    fireEvent.click(await screen.findByRole("button", { name: "Skip pending consents" }))
    fireEvent.click(screen.getByRole("button", { name: "Skip and send for approval" }))
    expect(toastError).toHaveBeenCalledWith("A reason is required")
    expect(post).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText("Reason (required)"), { target: { value: " covered " } })
    fireEvent.click(screen.getByRole("button", { name: "Skip and send for approval" }))
    await waitFor(() => expect(post).toHaveBeenCalledWith("/api/leave/admin/leave-requests/7/skip-substitutes/", { reason: "covered" }))
    await waitFor(() => expect(onChanged).toHaveBeenCalled())
  })

  it("hides skip for non-staff and renders the caller's actions", async () => {
    features.isStaff = false
    get.mockResolvedValue({ data: detail() })
    renderLeave(
      <LeaveRequestDetailDialog
        requestId={7}
        scope="covering"
        onClose={() => {}}
        renderActions={(d) => <button type="button">act-{d.id}</button>}
      />
    )
    const footer = await screen.findByTestId("detail-footer")
    expect(await within(footer).findByText("act-7")).toBeInTheDocument()
    expect(within(footer).queryByText("Skip pending consents")).toBeNull()
  })

  it("shows Georgian dates without Latin month names", async () => {
    get.mockResolvedValue({ data: detail() })
    renderLeave(<LeaveRequestDetailDialog requestId={7} scope="employee" onClose={() => {}} />, "ka")
    const fields = await screen.findByTestId("detail-fields")
    expect(fields).toHaveTextContent("28 დეკ 2026 – 3 იან 2027")
    expect(fields.textContent).not.toMatch(/Dec|Jan|Nov/)
  })
})
