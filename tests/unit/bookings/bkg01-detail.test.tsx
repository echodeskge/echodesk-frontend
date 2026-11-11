import React from "react"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { makeDetail, renderBookings } from "./bkg00-helpers"
import { api, httpError, resetApi } from "./bkg00-api-mock"
import { timelineEntries } from "@/app/(tenant)/bookings/bookings/[id]/_components/timeline-card"
import { remainingAmount } from "@/app/(tenant)/bookings/bookings/[id]/_components/payment-card"

vi.mock("@/api/generated", async () => (await import("./bkg00-api-mock")).api)
vi.mock("next/navigation", () => ({ useParams: () => ({ id: "4" }), useRouter: () => ({ push: vi.fn() }), usePathname: () => "/bookings/bookings/4" }))
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }))
vi.mock("sonner", () => ({ toast }))
const access = vi.hoisted(() => ({ current: { isBookingAdmin: true, userId: 1, loaded: true } }))
vi.mock("@/hooks/useMyAccess", () => ({ useMyAccess: () => access.current }))

import BookingDetailPage from "@/app/(tenant)/bookings/bookings/[id]/page"

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn()
  Element.prototype.hasPointerCapture = vi.fn(() => false)
  Element.prototype.releasePointerCapture = vi.fn()
})

beforeEach(() => {
  resetApi()
  Object.values(toast).forEach((f) => f.mockReset())
  access.current = { isBookingAdmin: true, userId: 1, loaded: true }
  api.bookingsAdminBookingsRetrieve.mockResolvedValue(makeDetail())
})

const actionNames = () =>
  within(screen.getByTestId("bkg-booking-actions"))
    .getAllByRole("button")
    .map((b) => b.textContent?.trim())

describe("BKG-01 booking detail: helpers", () => {
  it("timeline keeps the milestone order and skips missing dates", () => {
    const entries = timelineEntries(makeDetail({ confirmed_at: "2026-11-07T10:00:00Z", cancelled_at: "2026-11-08T10:00:00Z" }) as never)
    expect(entries.map((e) => e.key)).toEqual(["created", "confirmed", "cancelled"])
    expect(entries.map((e) => e.tone)).toEqual(["neutral", "info", "danger"])
  })

  it("remaining amount: the API field first, then total − paid", () => {
    expect(remainingAmount({ remaining_amount: 120, total_amount: "350", paid_amount: "0" } as never)).toBe(120)
    expect(remainingAmount({ remaining_amount: undefined, total_amount: "350.00", paid_amount: "50.00" } as never)).toBe(300)
  })
})

describe("BKG-01 booking detail page", () => {
  it("renders the header, cards, pills and the actions for a pending booking", async () => {
    renderBookings(<BookingDetailPage />)
    expect(screen.getByTestId("bkg-booking-loading")).toBeInTheDocument()
    await screen.findByTestId("bkg-booking-header")
    expect(api.bookingsAdminBookingsRetrieve).toHaveBeenCalledWith(4)
    expect(await screen.findByTestId("bkg-header-crumb")).toHaveTextContent("#BK-1054")
    const header = screen.getByTestId("bkg-booking-header")
    expect(within(header).getByRole("link", { name: /Bookings/ })).toHaveAttribute("href", "/bookings/bookings")
    expect(within(header).getByTestId("bkg-status-pill")).toHaveTextContent("Pending")
    expect(header).toHaveTextContent("Whitening")
    expect(actionNames()).toEqual(["Confirm", "Check in", "Reschedule", "Assign staff", "No-show", "Cancel"])

    const info = screen.getByTestId("bkg-card-info")
    expect(within(info).getByTestId("bkg-info-when")).toHaveTextContent("Nov 10, 2026, 09:00 – 10:00")
    expect(info).toHaveTextContent("60 min")
    expect(within(info).getByTestId("bkg-info-staff")).toHaveTextContent("Unassigned")

    const client = screen.getByTestId("bkg-card-client")
    expect(within(client).getByTestId("bkg-client-link")).toHaveAttribute("href", "/bookings/clients?client=104")
    expect(client).toHaveTextContent("salome.j@gmail.com")
    expect(client).toHaveTextContent("+995593441007")

    expect(screen.getByTestId("bkg-card-notes")).toHaveTextContent("No notes")
    const pay = screen.getByTestId("bkg-card-payment")
    expect(within(pay).getByTestId("bkg-pay-total")).toHaveTextContent("₾350.00")
    expect(within(pay).getByTestId("bkg-pay-remaining")).toHaveTextContent("₾350.00")
    expect(within(pay).getByTestId("bkg-payment-pill")).toHaveTextContent("Unpaid")
    expect(within(pay).getByTestId("bkg-record-payment")).toBeInTheDocument()
    expect(within(pay).queryByTestId("bkg-check-payment")).toBeNull()
    expect(screen.getByTestId("bkg-timeline-created")).toHaveTextContent("Created")
    expect(screen.queryByTestId("bkg-card-rating")).toBeNull()
    expect(screen.queryByTestId("bkg-card-cancellation")).toBeNull()
  })

  it("actions follow the status: confirmed, in progress and final bookings", async () => {
    api.bookingsAdminBookingsRetrieve.mockResolvedValue(makeDetail({ status: "confirmed", confirmed_at: "2026-11-07T10:00:00Z" }))
    const { unmount } = renderBookings(<BookingDetailPage />)
    await screen.findByTestId("bkg-booking-header")
    expect(actionNames()).toEqual(["Check in", "Complete", "Reschedule", "Assign staff", "No-show", "Cancel"])
    expect(screen.getByTestId("bkg-timeline-confirmed")).toBeInTheDocument()
    unmount()

    api.bookingsAdminBookingsRetrieve.mockResolvedValue(makeDetail({ status: "in_progress" }))
    const r2 = renderBookings(<BookingDetailPage />)
    await screen.findByTestId("bkg-booking-header")
    expect(actionNames()).toEqual(["Complete", "Cancel"])
    r2.unmount()

    api.bookingsAdminBookingsRetrieve.mockResolvedValue(makeDetail({ status: "completed", completed_at: "2026-11-10T10:00:00Z", rating: 4, review: "Great", payment_status: "fully_paid", paid_amount: "350.00", remaining_amount: 0 }))
    renderBookings(<BookingDetailPage />)
    await screen.findByTestId("bkg-booking-header")
    expect(within(screen.getByTestId("bkg-booking-actions")).queryAllByRole("button")).toHaveLength(0)
    expect(screen.getByTestId("bkg-card-rating")).toHaveTextContent("4/5")
    expect(screen.getByTestId("bkg-card-rating")).toHaveTextContent("Great")
    expect(screen.queryByTestId("bkg-record-payment")).toBeNull()
  })

  it("confirm, check in, complete and no-show hit their endpoints and replace the booking", async () => {
    api.bookingsAdminBookingsConfirmCreate.mockResolvedValue(makeDetail({ status: "confirmed", confirmed_at: "2026-11-07T10:00:00Z" }))
    api.bookingsAdminBookingsCheckInCreate.mockResolvedValue(makeDetail({ status: "in_progress" }))
    api.bookingsAdminBookingsCompleteCreate.mockResolvedValue(makeDetail({ status: "completed", completed_at: "2026-11-10T10:00:00Z" }))
    renderBookings(<BookingDetailPage />)
    await screen.findByTestId("bkg-booking-header")

    fireEvent.click(screen.getByTestId("bkg-action-confirm"))
    await waitFor(() => expect(api.bookingsAdminBookingsConfirmCreate).toHaveBeenCalledWith(4, {}))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Booking confirmed"))
    expect(within(screen.getByTestId("bkg-booking-header")).getByTestId("bkg-status-pill")).toHaveTextContent("Confirmed")

    fireEvent.click(screen.getByTestId("bkg-action-checkIn"))
    await waitFor(() => expect(api.bookingsAdminBookingsCheckInCreate).toHaveBeenCalledWith(4, {}))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Client checked in"))
    expect(actionNames()).toEqual(["Complete", "Cancel"])

    fireEvent.click(screen.getByTestId("bkg-action-complete"))
    await waitFor(() => expect(api.bookingsAdminBookingsCompleteCreate).toHaveBeenCalledWith(4))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Booking completed"))
    expect(screen.getByTestId("bkg-timeline-completed")).toBeInTheDocument()
  })

  it("no-show and a failed action", async () => {
    api.bookingsAdminBookingsNoShowCreate.mockResolvedValue(makeDetail({ status: "no_show" }))
    renderBookings(<BookingDetailPage />)
    await screen.findByTestId("bkg-booking-header")
    api.bookingsAdminBookingsConfirmCreate.mockRejectedValueOnce(httpError(400, { error: "Cannot confirm booking with status: pending" }))
    fireEvent.click(screen.getByTestId("bkg-action-confirm"))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Cannot confirm booking with status: pending"))
    expect(screen.queryByTestId("bkg-force-dialog")).toBeNull()

    fireEvent.click(screen.getByTestId("bkg-action-noShow"))
    await waitFor(() => expect(api.bookingsAdminBookingsNoShowCreate).toHaveBeenCalledWith(4))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Marked as no-show"))
    expect(within(screen.getByTestId("bkg-booking-header")).getByTestId("bkg-status-pill")).toHaveTextContent("No show")
  })

  it("an unpaid online-card refusal opens the force prompt, which retries with force=true", async () => {
    api.bookingsAdminBookingsConfirmCreate
      .mockRejectedValueOnce(httpError(400, { error: "Cannot confirm booking without payment. Use force=true to override." }))
      .mockResolvedValueOnce(makeDetail({ status: "confirmed" }))
    renderBookings(<BookingDetailPage />)
    await screen.findByTestId("bkg-booking-header")
    fireEvent.click(screen.getByTestId("bkg-action-confirm"))
    const dlg = await screen.findByTestId("bkg-force-dialog")
    expect(dlg).toHaveTextContent("Proceed without payment?")
    expect(toast.error).not.toHaveBeenCalled()
    fireEvent.click(within(dlg).getByTestId("bkg-force-confirm"))
    await waitFor(() => expect(api.bookingsAdminBookingsConfirmCreate).toHaveBeenLastCalledWith(4, { force: true }))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Booking confirmed"))
  })

  it("cancel: reason dialog, refund + cash-to-return toasts, cancellation card with the translated actor", async () => {
    api.bookingsAdminBookingsCancelCreate.mockResolvedValue(
      makeDetail({
        status: "cancelled",
        cancelled_at: "2026-11-08T10:00:00Z",
        cancelled_by: "admin",
        cancellation_reason: "Client asked",
        refund: { status: "pending", amount: "50.00" },
        manual_refund_due: "20.00",
      })
    )
    renderBookings(<BookingDetailPage />)
    await screen.findByTestId("bkg-booking-header")
    fireEvent.click(screen.getByTestId("bkg-action-cancel"))
    const dlg = await screen.findByTestId("bkg-cancel-dialog")
    fireEvent.change(within(dlg).getByLabelText("Reason"), { target: { value: " Client asked " } })
    fireEvent.click(within(dlg).getByTestId("bkg-cancel-dialog-submit"))
    await waitFor(() => expect(api.bookingsAdminBookingsCancelCreate).toHaveBeenCalledWith(4, { reason: "Client asked" }))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Booking cancelled"))
    expect(toast.info).toHaveBeenCalledWith("A refund of ₾50.00 was started")
    expect(toast.warning).toHaveBeenCalledWith("Return ₾20.00 paid in cash to the client by hand.")
    const card = await screen.findByTestId("bkg-card-cancellation")
    expect(within(card).getByTestId("bkg-cancelled-by")).toHaveTextContent("an administrator")
    expect(card).toHaveTextContent("Client asked")
    expect(within(card).getByTestId("bkg-refund")).toHaveTextContent("Refund pending · ₾50.00")
    expect(within(card).getByTestId("bkg-manual-refund")).toHaveTextContent("₾20.00 paid in cash is to be returned by hand.")
    expect(within(screen.getByTestId("bkg-booking-actions")).queryAllByRole("button")).toHaveLength(0)
  })

  it("reschedule: free times come from slots/ for the service, staff and day (excluding this booking)", async () => {
    api.bookingsAdminBookingsRetrieve.mockResolvedValue(makeDetail({ staff: { id: 3, user: { id: 30, first_name: "Nino", last_name: "Beridze", full_name: "Nino Beridze", email: "n@x.ge" } } }))
    api.bookingsAdminSlotsRetrieve.mockResolvedValue({
      date: "2026-11-12",
      slots: [
        { start_time: "10:00:00", end_time: "11:00:00", staff_id: 3, staff_name: "Nino", available_staff: [] },
        { start_time: "11:30:00", end_time: "12:30:00", staff_id: 3, staff_name: "Nino", available_staff: [] },
      ],
    })
    api.bookingsAdminBookingsRescheduleCreate.mockResolvedValue(makeDetail({ date: "2026-11-12", start_time: "11:30:00", end_time: "12:30:00" }))
    renderBookings(<BookingDetailPage />)
    await screen.findByTestId("bkg-booking-header")
    fireEvent.click(screen.getByTestId("bkg-action-reschedule"))
    const dlg = await screen.findByTestId("bkg-reschedule-dialog")
    // opens on the booking's own day
    await waitFor(() => expect(api.bookingsAdminSlotsRetrieve).toHaveBeenCalledWith("2026-11-10", 4, undefined, 7, 3))
    fireEvent.change(within(dlg).getByLabelText("New date"), { target: { value: "2026-11-12" } })
    await waitFor(() => expect(api.bookingsAdminSlotsRetrieve).toHaveBeenLastCalledWith("2026-11-12", 4, undefined, 7, 3))
    const slots = await within(dlg).findByTestId("bkg-slots")
    expect(within(slots).getAllByRole("radio").map((r) => r.textContent)).toEqual(["10:00", "11:30"])
    expect(within(dlg).getByTestId("bkg-reschedule-dialog-submit")).toBeDisabled()
    fireEvent.click(within(slots).getByRole("radio", { name: "11:30" }))
    fireEvent.click(within(dlg).getByTestId("bkg-reschedule-dialog-submit"))
    await waitFor(() => expect(api.bookingsAdminBookingsRescheduleCreate).toHaveBeenCalledWith(4, { date: "2026-11-12", start_time: "11:30" }))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Booking rescheduled"))
    await waitFor(() => expect(screen.queryByTestId("bkg-reschedule-dialog")).toBeNull())
    expect(within(screen.getByTestId("bkg-card-info")).getByTestId("bkg-info-when")).toHaveTextContent("Nov 12, 2026, 11:30 – 12:30")
  })

  it("shows 'no free times' when the day has no slots", async () => {
    api.bookingsAdminSlotsRetrieve.mockResolvedValue({ date: "2026-11-10", slots: [] })
    renderBookings(<BookingDetailPage />)
    await screen.findByTestId("bkg-booking-header")
    fireEvent.click(screen.getByTestId("bkg-action-reschedule"))
    const dlg = await screen.findByTestId("bkg-reschedule-dialog")
    expect(await within(dlg).findByTestId("bkg-slots-empty")).toHaveTextContent("No free times on this day")
  })

  it("assign staff: active staff list in a select, posts the chosen id", async () => {
    api.bookingsAdminStaffList.mockResolvedValue({
      count: 2,
      next: null,
      results: [
        { id: 3, user: { id: 30, first_name: "Nino", last_name: "Beridze", full_name: "Nino Beridze", email: "n@x.ge" }, is_active_for_bookings: true },
        { id: 5, user: { id: 50, first_name: "Ana", last_name: "Tsereteli", full_name: "Ana Tsereteli", email: "a@x.ge" }, is_active_for_bookings: true },
      ],
    })
    api.bookingsAdminBookingsAssignStaffCreate.mockResolvedValue(makeDetail({ staff: { id: 5, user: { id: 50, first_name: "Ana", last_name: "Tsereteli", full_name: "Ana Tsereteli", email: "a@x.ge" } } }))
    renderBookings(<BookingDetailPage />)
    await screen.findByTestId("bkg-booking-header")
    fireEvent.click(screen.getByTestId("bkg-action-assignStaff"))
    const dlg = await screen.findByTestId("bkg-assign-dialog")
    const select = await within(dlg).findByLabelText("Staff member")
    expect(api.bookingsAdminStaffList).toHaveBeenCalledWith(true, undefined, 1, 100)
    fireEvent.change(select, { target: { value: "5" } })
    fireEvent.click(within(dlg).getByTestId("bkg-assign-dialog-submit"))
    await waitFor(() => expect(api.bookingsAdminBookingsAssignStaffCreate).toHaveBeenCalledWith(4, { staff_id: 5 }))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Staff assigned"))
    expect(within(screen.getByTestId("bkg-card-info")).getByTestId("bkg-info-staff")).toHaveTextContent("Ana Tsereteli")
  })

  it("record payment (admins): amount defaults to what is owed, validates, posts and lists the payment", async () => {
    api.bookingsAdminBookingsRecordPaymentCreate.mockResolvedValue(
      makeDetail({
        paid_amount: "350.00",
        remaining_amount: 0,
        payment_status: "fully_paid",
        manual_payments: [{ amount: "350.00", method: "card", note: "Receipt 12", recorded_by: 1, recorded_by_name: "Nino", recorded_at: "2026-11-10T10:05:00Z" }],
      })
    )
    renderBookings(<BookingDetailPage />)
    await screen.findByTestId("bkg-booking-header")
    fireEvent.click(screen.getByTestId("bkg-record-payment"))
    const dlg = await screen.findByTestId("bkg-payment-dialog")
    const amount = within(dlg).getByLabelText("Amount (₾)") as HTMLInputElement
    expect(amount.value).toBe("350.00")
    fireEvent.change(amount, { target: { value: "400" } })
    fireEvent.click(within(dlg).getByTestId("bkg-payment-dialog-submit"))
    expect(dlg).toHaveTextContent("Enter an amount between 0.01 and ₾350.00")
    expect(api.bookingsAdminBookingsRecordPaymentCreate).not.toHaveBeenCalled()
    fireEvent.change(amount, { target: { value: "350" } })
    fireEvent.change(within(dlg).getByLabelText("Method"), { target: { value: "card" } })
    fireEvent.change(within(dlg).getByLabelText("Note"), { target: { value: "Receipt 12" } })
    fireEvent.click(within(dlg).getByTestId("bkg-payment-dialog-submit"))
    await waitFor(() => expect(api.bookingsAdminBookingsRecordPaymentCreate).toHaveBeenCalledWith(4, { amount: "350.00", method: "card", note: "Receipt 12" }))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Payment recorded"))
    const pay = screen.getByTestId("bkg-card-payment")
    expect(within(pay).getByTestId("bkg-payment-pill")).toHaveTextContent("Fully paid")
    expect(within(pay).getByTestId("bkg-manual-payments")).toHaveTextContent("Card · Receipt 12")
    expect(within(pay).getByTestId("bkg-manual-payments")).toHaveTextContent("₾350.00")
    expect(within(pay).queryByTestId("bkg-record-payment")).toBeNull()
  })

  it("check payment status for online orders, and the price edit (admins)", async () => {
    api.bookingsAdminBookingsRetrieve.mockResolvedValue(makeDetail({ bog_order_id: "bog-123", payment_method: "card" }))
    api.bookingsAdminBookingsCheckPaymentStatusRetrieve.mockResolvedValue({ payment_status: "fully_paid" })
    api.bookingsAdminBookingsPartialUpdate.mockResolvedValue(makeDetail({ bog_order_id: "bog-123", total_amount: "300.00", remaining_amount: 300 }))
    renderBookings(<BookingDetailPage />)
    await screen.findByTestId("bkg-booking-header")
    fireEvent.click(screen.getByTestId("bkg-check-payment"))
    await waitFor(() => expect(api.bookingsAdminBookingsCheckPaymentStatusRetrieve).toHaveBeenCalledWith(4))
    await waitFor(() => expect(toast.info).toHaveBeenCalledWith("Payment status: Fully paid"))
    expect(api.bookingsAdminBookingsRetrieve).toHaveBeenCalledTimes(2)

    fireEvent.click(screen.getByTestId("bkg-price-edit"))
    const form = screen.getByTestId("bkg-price-form")
    fireEvent.change(within(form).getByLabelText("Price (₾)"), { target: { value: "300" } })
    fireEvent.click(within(form).getByTestId("bkg-price-save"))
    await waitFor(() => expect(api.bookingsAdminBookingsPartialUpdate).toHaveBeenCalledWith(4, { total_amount: "300.00" }))
    await waitFor(() => expect(screen.getByTestId("bkg-pay-total")).toHaveTextContent("₾300.00"))
  })

  it("notes: inline edit PATCHes both notes (admin or the booking's handler); others only read", async () => {
    api.bookingsAdminBookingsPartialUpdate.mockResolvedValue(makeDetail({ client_notes: "Allergic to dye", staff_notes: "Use room 2" }))
    const { unmount } = renderBookings(<BookingDetailPage />)
    await screen.findByTestId("bkg-booking-header")
    fireEvent.click(screen.getByTestId("bkg-notes-edit"))
    const form = screen.getByTestId("bkg-notes-form")
    fireEvent.change(within(form).getByLabelText("Client notes"), { target: { value: "Allergic to dye" } })
    fireEvent.change(within(form).getByLabelText("Staff notes"), { target: { value: " Use room 2 " } })
    fireEvent.click(within(form).getByTestId("bkg-notes-save"))
    await waitFor(() => expect(api.bookingsAdminBookingsPartialUpdate).toHaveBeenCalledWith(4, { client_notes: "Allergic to dye", staff_notes: "Use room 2" }))
    await waitFor(() => expect(screen.getByTestId("bkg-card-notes")).toHaveTextContent("Use room 2"))
    expect(screen.queryByTestId("bkg-notes-form")).toBeNull()
    unmount()

    // not an admin, not the handler: read only, no record payment, no price edit
    access.current = { isBookingAdmin: false, userId: 99, loaded: true }
    api.bookingsAdminBookingsRetrieve.mockResolvedValue(makeDetail({ staff: { id: 3, user: { id: 30, first_name: "Nino", last_name: "Beridze", full_name: "Nino Beridze", email: "n@x.ge" } } }))
    const r2 = renderBookings(<BookingDetailPage />)
    await screen.findByTestId("bkg-booking-header")
    expect(screen.queryByTestId("bkg-notes-edit")).toBeNull()
    expect(screen.queryByTestId("bkg-record-payment")).toBeNull()
    expect(screen.queryByTestId("bkg-price-edit")).toBeNull()
    // status actions stay available to every booking user (the backend allows them)
    expect(screen.getByTestId("bkg-action-confirm")).toBeInTheDocument()
    r2.unmount()

    // the handler (assigned staff member's user) may edit the notes
    access.current = { isBookingAdmin: false, userId: 30, loaded: true }
    renderBookings(<BookingDetailPage />)
    await screen.findByTestId("bkg-booking-header")
    expect(screen.getByTestId("bkg-notes-edit")).toBeInTheDocument()
  })

  it("404 shows a not-found state with a back link; other errors show retry", async () => {
    api.bookingsAdminBookingsRetrieve.mockRejectedValueOnce(httpError(404))
    const { unmount } = renderBookings(<BookingDetailPage />)
    const nf = await screen.findByTestId("bkg-booking-not-found")
    expect(nf).toHaveTextContent("Booking not found")
    expect(within(nf).getByRole("link")).toHaveAttribute("href", "/bookings/bookings")
    unmount()

    api.bookingsAdminBookingsRetrieve.mockRejectedValueOnce(httpError(500))
    renderBookings(<BookingDetailPage />)
    const err = await screen.findByTestId("bkg-error")
    fireEvent.click(within(err).getByRole("button", { name: "Try again" }))
    await screen.findByTestId("bkg-booking-header")
  })

  it("renders in Georgian", async () => {
    renderBookings(<BookingDetailPage />, "ka")
    await screen.findByTestId("bkg-booking-header")
    expect(actionNames()).toEqual(["დადასტურება", "მოსვლის აღნიშვნა", "გადანიშვნა", "თანამშრომლის მინიჭება", "არ გამოცხადდა", "გაუქმება"])
    expect(screen.getByTestId("bkg-card-payment")).toHaveTextContent("გადახდის ინფორმაცია")
    expect(within(screen.getByTestId("bkg-card-info")).getByTestId("bkg-info-when")).toHaveTextContent("10 ნოე 2026, 09:00 – 10:00")
  })
})
