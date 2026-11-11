import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { renderBookings } from "./bkg00-helpers"
import { STAFF, api, calendarPayload, makeCalendarBooking, mockViewport, resetApi } from "./bkg02-api-mock"

const axiosGet = vi.fn()
vi.mock("@/api/axios", () => ({ default: { get: (...args: unknown[]) => axiosGet(...args) } }))
vi.mock("@/api/generated", async () => (await import("./bkg02-api-mock")).api)
const access = { current: { isBookingAdmin: true, userId: 1 } }
vi.mock("@/hooks/useMyAccess", () => ({ useMyAccess: () => access.current }))
const push = vi.fn()
const replace = vi.fn()
const search = { current: new URLSearchParams() }
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
  usePathname: () => "/bookings/calendar",
  useSearchParams: () => search.current,
}))
const toastFn = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: toastFn }))

import BookingCalendarPage from "@/app/(tenant)/bookings/calendar/page"

/** The `params` of the last calendar request. */
const lastParams = () => axiosGet.mock.calls.at(-1)?.[1]?.params as Record<string, string | undefined>

const DAY = [
  makeCalendarBooking(7, { staff_id: 3, start_time: "10:00:00", end_time: "11:30:00", client: { id: 1, full_name: "Salome Japaridze", phone_number: "+995593441007", email: "" }, client_notes: "Sensitive teeth" }),
  makeCalendarBooking(8, { staff_id: 2, start_time: "09:00:00", end_time: "09:45:00", status: "confirmed", client: { id: 2, full_name: "Giorgi Kapanadze", phone_number: "+995593000002", email: "" } }),
  makeCalendarBooking(9, { staff_id: 3, start_time: "15:00:00", end_time: "16:00:00", status: "completed", client: { id: 3, full_name: "Davit Lomidze", phone_number: "", email: "" } }),
]

beforeEach(() => {
  resetApi()
  axiosGet.mockReset()
  push.mockReset()
  replace.mockReset()
  toastFn.mockReset()
  toastFn.success.mockReset()
  toastFn.error.mockReset()
  access.current = { isBookingAdmin: true, userId: 1 }
  search.current = new URLSearchParams("date=2026-11-10")
  mockViewport(1440)
  axiosGet.mockImplementation(async (_url: string, cfg: { params: { date_from: string; date_to: string } }) =>
    ({ data: calendarPayload(DAY, { date_from: cfg.params.date_from, date_to: cfg.params.date_to }) }))
  api.bookingsAdminStaffList.mockResolvedValue({ count: 2, results: STAFF.map((s) => ({ id: s.id, user: { id: s.user_id, full_name: s.full_name, email: "" }, services: [{ id: 7 }], is_active_for_bookings: true })) })
  api.bookingsAdminServicesList.mockResolvedValue({ count: 1, results: [{ id: 7, name: { en: "Whitening", ka: "გათეთრება" }, name_display: "Whitening", duration_minutes: 60, base_price: "350.00", status: "active" }] })
  api.bookingsAdminSlotsRetrieve.mockResolvedValue({ slots: [] })
})

describe("BKG-02 calendar page", () => {
  it("Specialists: one request for the day, rows with counts, blocks placed by time, hatched off-hours and the legend", async () => {
    renderBookings(<BookingCalendarPage />)
    const grid = await screen.findByTestId("bkg-specialists-grid")
    expect(axiosGet).toHaveBeenCalledWith("/api/bookings/admin/calendar/", expect.anything())
    expect(lastParams()).toEqual({ date_from: "2026-11-10", date_to: "2026-11-10", staff: undefined, lang: "en" })
    expect(screen.getByTestId("bkg-calendar-title")).toHaveTextContent("Specialists")
    expect(screen.getByTestId("bkg-calendar-legend")).toHaveTextContent("Pending")
    expect(screen.getByTestId("bkg-calendar-legend")).toHaveTextContent("Cancelled")
    expect(screen.getByTestId("bkg-specialists-head")).toHaveTextContent("Specialists · 3 · 1050 ₾")
    expect(screen.getByTestId("bkg-header-sub")).toHaveTextContent("3 bookings")

    const rows = within(grid).getAllByTestId("bkg-specialist-row")
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent("Nino Beridze")
    expect(rows[0]).toHaveTextContent("2 bookings · 700 ₾")
    expect(rows[1]).toHaveTextContent("1 booking · 350 ₾")

    // range 09:00–19:00 (Lasha starts at 09:00), zoom 30 min = 1.6 px/min: 10:00 sits at 96px, 90 min = 142px wide
    const block = within(rows[0]).getAllByTestId("bkg-timeline-block")[0]
    expect(block).toHaveTextContent("Salome Japaridze")
    expect(block).toHaveTextContent("10:00–11:30")
    expect(block.style.left).toBe("96px")
    expect(block.style.width).toBe("142px")
    expect(block).toHaveAttribute("data-status", "pending")
    // Nino: not working 09:00–10:00 (96px) and a 14:00–14:30 break (48px)
    const off = within(rows[0]).getAllByTestId("bkg-timeline-off")
    expect(off[0].style.left).toBe("0px")
    expect(off[0].style.width).toBe("96px")
    expect(within(rows[0]).getByTestId("bkg-timeline-break").style.width).toBe("48px")
    expect(within(rows[0]).getByTestId("bkg-timeline-break").style.left).toBe("480px")
    // not today → no now-line
    expect(screen.queryByTestId("bkg-now-line")).not.toBeInTheDocument()

    // zoom 1 h: 1.0667 px/min
    fireEvent.click(screen.getByRole("radio", { name: "1 h" }))
    expect(within(rows[0]).getAllByTestId("bkg-timeline-block")[0].style.left).toBe("64.002px")

    // search dims the blocks that don't match
    fireEvent.change(screen.getByTestId("bkg-calendar-search"), { target: { value: "giorgi" } })
    expect(within(rows[0]).getAllByTestId("bkg-timeline-block")[0].className).toContain("opacity-25")
    expect(within(rows[1]).getAllByTestId("bkg-timeline-block")[0].className).not.toContain("opacity-25")
  })

  it("Specialists: the popover confirms and cancels a booking (with a reason) and links to the detail", async () => {
    api.bookingsAdminBookingsConfirmCreate.mockResolvedValue({})
    api.bookingsAdminBookingsCancelCreate.mockResolvedValue({})
    renderBookings(<BookingCalendarPage />)
    await screen.findByTestId("bkg-specialists-grid")
    const block = screen.getAllByTestId("bkg-timeline-block")[0]
    fireEvent.click(block)
    const popover = await screen.findByTestId("bkg-booking-popover")
    expect(popover).toHaveTextContent("Salome Japaridze")
    expect(popover).toHaveTextContent("+995593441007")
    expect(within(popover).getByTestId("bkg-status-pill")).toHaveTextContent("Pending")
    expect(popover).toHaveTextContent("Whitening")
    expect(popover).toHaveTextContent("10:00 – 11:30")
    expect(popover).toHaveTextContent("350 ₾")
    expect(popover).toHaveTextContent("Sensitive teeth")
    expect(within(popover).getByTestId("bkg-popover-open")).toHaveAttribute("href", "/bookings/bookings/7")

    fireEvent.click(within(popover).getByTestId("bkg-popover-confirm"))
    await waitFor(() => expect(api.bookingsAdminBookingsConfirmCreate).toHaveBeenCalledWith(7, {}))
    await waitFor(() => expect(toastFn.success).toHaveBeenCalledWith("Booking confirmed"))
    // the calendar is reloaded after the action
    await waitFor(() => expect(axiosGet.mock.calls.length).toBeGreaterThanOrEqual(2))

    fireEvent.click(screen.getAllByTestId("bkg-timeline-block")[0])
    fireEvent.click(await screen.findByTestId("bkg-popover-cancel"))
    const dialog = await screen.findByTestId("bkg-cancel-dialog")
    fireEvent.change(within(dialog).getByLabelText("Reason"), { target: { value: "Client asked" } })
    fireEvent.click(within(dialog).getByTestId("bkg-cancel-dialog-submit"))
    await waitFor(() => expect(api.bookingsAdminBookingsCancelCreate).toHaveBeenCalledWith(7, { reason: "Client asked" }))
    await waitFor(() => expect(toastFn.success).toHaveBeenCalledWith("Booking cancelled"))
  })

  it("Specialists: a click on a free working slot opens the New booking dialog pre-filled; off-hours only explain", async () => {
    renderBookings(<BookingCalendarPage />)
    await screen.findByTestId("bkg-specialists-grid")
    const lanes = screen.getAllByTestId("bkg-specialist-lane")
    // Nino's lane, 09:30 (zoom 30 → 48px) is before her 10:00 start
    fireEvent.click(lanes[0], { clientX: 48 })
    expect(toastFn).toHaveBeenCalledWith("Outside working hours", expect.anything())
    expect(screen.queryByTestId("bkg-new-booking")).not.toBeInTheDocument()
    // 12:10 → snapped to the 12:00 slot
    fireEvent.click(lanes[0], { clientX: (12 * 60 + 10 - 9 * 60) * 1.6 })
    const dialog = await screen.findByTestId("bkg-new-booking")
    await waitFor(() => expect((within(dialog).getByTestId("bkg-nb-staff") as HTMLSelectElement).value).toBe("3"))
    expect(within(dialog).getByTestId("bkg-nb-date")).toHaveValue("2026-11-10")
    expect(within(dialog).getByTestId("bkg-nb-time")).toHaveValue("12:00")
  })

  it("switches views: request ranges, URL state, titles; Month shows '+N more', List groups by day, Day/Week place events", async () => {
    const many = [
      ...DAY,
      makeCalendarBooking(10, { start_time: "12:00:00", end_time: "12:30:00" }),
      makeCalendarBooking(11, { start_time: "13:00:00", end_time: "13:30:00" }),
      makeCalendarBooking(12, { date: "2026-11-12", start_time: "11:00:00", end_time: "12:00:00", status: "cancelled" }),
    ]
    axiosGet.mockImplementation(async (_url: string, cfg: { params: { date_from: string; date_to: string } }) =>
      ({ data: calendarPayload(many.filter((b) => cfg.params.date_from <= b.date && b.date <= cfg.params.date_to), { date_from: cfg.params.date_from, date_to: cfg.params.date_to }) }))
    renderBookings(<BookingCalendarPage />)
    await screen.findByTestId("bkg-specialists-grid")

    fireEvent.click(screen.getByRole("radio", { name: "Month" }))
    await screen.findByTestId("bkg-month-view")
    await waitFor(() => expect(lastParams()).toEqual({ date_from: "2026-10-26", date_to: "2026-12-06", staff: undefined, lang: "en" }))
    await waitFor(() => expect(replace).toHaveBeenLastCalledWith("/bookings/calendar?date=2026-11-10&view=month", { scroll: false }))
    expect(screen.getByTestId("bkg-calendar-title")).toHaveTextContent("November 2026")
    expect(screen.getAllByTestId("bkg-month-cell")).toHaveLength(42)
    expect(screen.getByTestId("bkg-month-view")).toHaveTextContent("MON")
    const cell = screen.getAllByTestId("bkg-month-cell").find((c) => c.dataset.date === "2026-11-10")!
    await waitFor(() => expect(within(cell).getAllByTestId("bkg-month-event")).toHaveLength(3))
    expect(within(cell).getAllByTestId("bkg-month-event")[0]).toHaveTextContent("09:00 Whitening – Giorgi Kapanadze")
    expect(within(cell).getByTestId("bkg-month-more")).toHaveTextContent("+2 more")
    fireEvent.click(within(cell).getAllByTestId("bkg-month-event")[0])
    expect(push).toHaveBeenCalledWith("/bookings/bookings/8")

    // "+2 more" → the day view of that date
    fireEvent.click(within(cell).getByTestId("bkg-month-more"))
    await screen.findByTestId("bkg-day-view")
    expect(screen.getByTestId("bkg-calendar-title")).toHaveTextContent("November 10, 2026")
    // the day's range was fetched for the Specialists view already: React Query serves it from the cache
    await waitFor(() => expect(replace).toHaveBeenLastCalledWith("/bookings/calendar?date=2026-11-10&view=day", { scroll: false }))
    await waitFor(() => expect(within(screen.getByTestId("bkg-day-view")).getAllByTestId("bkg-grid-event")).toHaveLength(5))
    // 08:00–20:00 grid at 48px per hour: 10:00 → 96px from the top, 90 min → 70px tall
    const ev = within(screen.getByTestId("bkg-day-view")).getAllByTestId("bkg-grid-event").find((e) => e.dataset.booking === "7")!
    expect(ev.style.top).toBe("96px")
    expect(ev.style.height).toBe("70px")
    expect(ev).toHaveTextContent("10:00 Whitening – Salome Japaridze")

    fireEvent.click(screen.getByRole("radio", { name: "Week" }))
    await screen.findByTestId("bkg-week-view")
    await waitFor(() => expect(lastParams()).toEqual({ date_from: "2026-11-09", date_to: "2026-11-15", staff: undefined, lang: "en" }))
    expect(screen.getByTestId("bkg-calendar-title")).toHaveTextContent("Nov 9 – 15, 2026")
    expect(screen.getAllByTestId("bkg-grid-day")).toHaveLength(7)
    expect(screen.getAllByTestId("bkg-grid-day")[0]).toHaveTextContent("MON")
    await waitFor(() => expect(screen.getAllByTestId("bkg-grid-event")).toHaveLength(6))
    // ‹ › move by a week
    fireEvent.click(screen.getByTestId("bkg-calendar-next"))
    await waitFor(() => expect(lastParams().date_from).toBe("2026-11-16"))
    expect(screen.getByTestId("bkg-calendar-date")).toHaveValue("2026-11-17")
    fireEvent.click(screen.getByTestId("bkg-calendar-prev"))
    await waitFor(() => expect(screen.getByTestId("bkg-calendar-date")).toHaveValue("2026-11-10"))
    expect(screen.getByTestId("bkg-calendar-title")).toHaveTextContent("Nov 9 – 15, 2026")

    fireEvent.click(screen.getByRole("radio", { name: "List" }))
    await screen.findByTestId("bkg-list-view")
    const groups = await screen.findAllByTestId("bkg-list-day")
    expect(groups).toHaveLength(2)
    expect(groups[0]).toHaveTextContent("Tuesday, November 10, 2026")
    expect(within(groups[0]).getAllByTestId("bkg-list-event")).toHaveLength(5)
    expect(within(groups[0]).getAllByTestId("bkg-list-event")[0]).toHaveTextContent("09:00 – 09:45")
    expect(within(groups[0]).getAllByTestId("bkg-list-event")[0]).toHaveTextContent("Whitening – Giorgi Kapanadze")
    expect(groups[1]).toHaveTextContent("Thursday, November 12, 2026")
    fireEvent.click(within(groups[1]).getAllByTestId("bkg-list-event")[0])
    expect(push).toHaveBeenCalledWith("/bookings/bookings/12")
    // the search filters the rows
    fireEvent.change(screen.getByTestId("bkg-calendar-search"), { target: { value: "+995593441007" } })
    await waitFor(() => expect(screen.getAllByTestId("bkg-list-event")).toHaveLength(1))
  })

  it("the date input and Today drive the range; Today follows the business timezone", async () => {
    search.current = new URLSearchParams()
    const tz = "Asia/Tbilisi"
    const { todayInTimezone } = await import("@/app/(tenant)/bookings/_components/ui/format")
    renderBookings(<BookingCalendarPage />)
    await screen.findByTestId("bkg-specialists-grid")
    const today = todayInTimezone(tz)
    expect(screen.getByTestId("bkg-calendar-date")).toHaveValue(today)
    expect(screen.getByTestId("bkg-calendar-today")).toBeDisabled()
    fireEvent.change(screen.getByTestId("bkg-calendar-date"), { target: { value: "2026-11-20" } })
    await waitFor(() => expect(lastParams().date_from).toBe("2026-11-20"))
    await waitFor(() => expect(replace).toHaveBeenLastCalledWith("/bookings/calendar?date=2026-11-20", { scroll: false }))
    expect(screen.getByTestId("bkg-calendar-today")).toBeEnabled()
    fireEvent.click(screen.getByTestId("bkg-calendar-today"))
    await waitFor(() => expect(replace).toHaveBeenLastCalledWith("/bookings/calendar", { scroll: false }))
    expect(screen.getByTestId("bkg-calendar-date")).toHaveValue(today)
    expect(screen.getByTestId("bkg-calendar-today")).toBeDisabled()
  })

  it("a non-admin sees no New booking, no Confirm / Cancel in the popover, and cannot book a slot", async () => {
    access.current = { isBookingAdmin: false, userId: 5 }
    renderBookings(<BookingCalendarPage />)
    await screen.findByTestId("bkg-specialists-grid")
    expect(screen.queryByTestId("bkg-calendar-new")).not.toBeInTheDocument()
    expect(screen.getByTestId("bkg-calendar-hint")).toHaveTextContent("Only administrators")
    fireEvent.click(screen.getAllByTestId("bkg-specialist-lane")[0], { clientX: 500 })
    expect(screen.queryByTestId("bkg-new-booking")).not.toBeInTheDocument()
    fireEvent.click(screen.getAllByTestId("bkg-timeline-block")[0])
    const popover = await screen.findByTestId("bkg-booking-popover")
    expect(within(popover).queryByTestId("bkg-popover-confirm")).not.toBeInTheDocument()
    expect(within(popover).queryByTestId("bkg-popover-cancel")).not.toBeInTheDocument()
    expect(within(popover).getByTestId("bkg-popover-open")).toHaveAttribute("href", "/bookings/bookings/7")
  })

  it("shows the error state with retry when the range request fails", async () => {
    axiosGet.mockRejectedValue(Object.assign(new Error("HTTP 500"), { response: { status: 500, data: {} } }))
    renderBookings(<BookingCalendarPage />)
    // one retry (1 s back-off) before the error state
    const error = await screen.findByTestId("bkg-error", {}, { timeout: 5000 })
    expect(error).toHaveTextContent("Couldn't load this page")
    axiosGet.mockImplementation(async () => ({ data: calendarPayload(DAY) }))
    fireEvent.click(within(error).getByRole("button", { name: "Try again" }))
    await screen.findByTestId("bkg-specialists-grid")
  })

  it("at 390px the specialists column narrows to 140px and the grid scrolls sideways", async () => {
    mockViewport(390)
    renderBookings(<BookingCalendarPage />)
    const grid = await screen.findByTestId("bkg-specialists-grid")
    await waitFor(() => expect(screen.getByTestId("bkg-specialists-head").style.width).toBe("140px"))
    expect(grid.className).toContain("overflow-x-auto")
    expect(screen.getByTestId("bkg-calendar-toolbar").className).toContain("flex-wrap")
  })

  it("Georgian: titles, weekday names and texts have no Latin UI text", async () => {
    renderBookings(<BookingCalendarPage />, "ka")
    await screen.findByTestId("bkg-specialists-grid")
    expect(screen.getByTestId("bkg-calendar-title")).toHaveTextContent("სპეციალისტები")
    expect(screen.getByTestId("bkg-calendar-legend")).toHaveTextContent("მოლოდინში")
    fireEvent.click(screen.getByRole("radio", { name: "კვირა" }))
    await screen.findByTestId("bkg-week-view")
    expect(screen.getByTestId("bkg-calendar-title")).toHaveTextContent("9 – 15 ნოე, 2026")
    expect(screen.getAllByTestId("bkg-grid-day")[0]).toHaveTextContent("ორშ")
    const latin = (screen.getByTestId("bkg-calendar").textContent ?? "").replace(/Whitening|Nino Beridze|Lasha Meladze|Salome Japaridze|Giorgi Kapanadze|Davit Lomidze/g, "").match(/[A-Za-z]{2,}/g)
    expect(latin).toBeNull()
  })
})
