import React from "react"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { renderBookings } from "./bkg00-helpers"
import { api, httpError, makeStaff, page, resetApi } from "./bkg03-api-mock"

vi.mock("@/api/generated", async () => (await import("./bkg03-api-mock")).api)
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }))
vi.mock("sonner", () => ({ toast }))
const access = vi.hoisted(() => ({ current: { isBookingAdmin: true, userId: 1, loaded: true } }))
vi.mock("@/hooks/useMyAccess", () => ({ useMyAccess: () => access.current }))

import StaffAvailabilityPage from "@/app/(tenant)/bookings/staff/availability/page"
import { scheduleText } from "@/app/(tenant)/bookings/staff/availability/_components/schedule-text"
import { scheduleToPayload, validateSchedule } from "@/app/(tenant)/bookings/staff/availability/_components/schedule-dialog"
import { exceptionToPayload } from "@/app/(tenant)/bookings/staff/availability/_components/exception-dialog"

const STAFF = [
  makeStaff(1, { user: { id: 31, email: "nino@example.com", first_name: "Nino", last_name: "Beridze", full_name: "Nino Beridze" } }),
  makeStaff(2, { user: { id: 32, email: "lasha@example.com", first_name: "Lasha", last_name: "Meladze", full_name: "Lasha Meladze" } }),
]
const avail = (id: number, day: number, over: Record<string, unknown> = {}) => ({
  id,
  staff: 1,
  day_of_week: day,
  day_name: "",
  start_time: "09:00:00",
  end_time: "17:00:00",
  is_available: true,
  break_start: "13:00:00",
  break_end: "14:00:00",
  ...over,
})
const AVAILABILITY = [avail(11, 0), avail(12, 1, { break_start: null, break_end: null }), avail(15, 5, { is_available: false })]
const EXCEPTIONS = [
  { id: 21, staff: 1, date: "2026-11-12", start_time: null, end_time: null, is_available: false, reason: "Dental conference" },
  { id: 22, staff: 1, date: "2026-11-20", start_time: "10:00:00", end_time: "13:00:00", is_available: true, reason: "" },
]

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn()
  Element.prototype.hasPointerCapture = vi.fn(() => false)
  Element.prototype.releasePointerCapture = vi.fn()
})

beforeEach(() => {
  resetApi()
  Object.values(toast).forEach((f) => f.mockReset())
  access.current = { isBookingAdmin: true, userId: 1, loaded: true }
  api.bookingsAdminStaffList.mockResolvedValue(page(STAFF))
  api.bookingsAdminAvailabilityList.mockImplementation(async (...args: unknown[]) => page(args[6] === 1 ? AVAILABILITY : []))
  api.bookingsAdminExceptionsList.mockImplementation(async (...args: unknown[]) => page(args[6] === 1 ? EXCEPTIONS : []))
  api.bookingsAdminAvailabilityCreate.mockResolvedValue(avail(99, 6))
  api.bookingsAdminAvailabilityPartialUpdate.mockResolvedValue(avail(11, 0))
  api.bookingsAdminExceptionsCreate.mockResolvedValue(EXCEPTIONS[0])
  api.bookingsAdminExceptionsPartialUpdate.mockResolvedValue(EXCEPTIONS[0])
  api.bookingsAdminExceptionsDestroy.mockResolvedValue({})
})

const t = (key: string, values?: Record<string, string>) => (values ? `${key}:${Object.values(values).join(",")}` : key)

describe("BKG-03 availability: helpers", () => {
  it("formats the weekly row text", () => {
    expect(scheduleText(undefined, t)).toBe("noScheduleSet")
    expect(scheduleText(avail(1, 0, { is_available: false }) as never, t)).toBe("dayOff")
    expect(scheduleText(avail(1, 0) as never, t)).toBe("09:00 – 17:00 (breakLabel:13:00 – 14:00)")
    expect(scheduleText(avail(1, 0, { break_start: null, break_end: null }) as never, t)).toBe("09:00 – 17:00")
  })

  it("validates the hours and the break, and nulls a removed break in the payload", () => {
    const base = { isAvailable: true, startTime: "09:00", endTime: "17:00", breakStart: "", breakEnd: "" }
    expect(validateSchedule(base, t)).toEqual({})
    expect(validateSchedule({ ...base, endTime: "08:00" }, t)).toEqual({ endTime: "errors.endAfterStart" })
    expect(validateSchedule({ ...base, breakStart: "13:00" }, t)).toEqual({ breakEnd: "errors.breakBothEnds" })
    expect(validateSchedule({ ...base, breakStart: "14:00", breakEnd: "13:00" }, t)).toEqual({ breakEnd: "errors.breakOrder" })
    expect(validateSchedule({ ...base, breakStart: "18:00", breakEnd: "19:00" }, t)).toEqual({ breakEnd: "errors.breakInside" })
    expect(validateSchedule({ ...base, isAvailable: false, endTime: "00:00" }, t)).toEqual({})
    expect(scheduleToPayload(1, 2, base)).toEqual({ staff: 1, day_of_week: 2, is_available: true, start_time: "09:00", end_time: "17:00", break_start: null, break_end: null })
    expect(exceptionToPayload(1, { date: "2026-12-01", kind: "unavailable", startTime: "10:00", endTime: "14:00", reason: " Holiday " })).toEqual({ staff: 1, date: "2026-12-01", is_available: false, start_time: null, end_time: null, reason: "Holiday" })
    expect(exceptionToPayload(1, { date: "2026-12-01", kind: "special_hours", startTime: "10:00", endTime: "14:00", reason: "" })).toMatchObject({ is_available: true, start_time: "10:00", end_time: "14:00" })
  })
})

describe("BKG-03 staff availability page", () => {
  it("renders the back link, staff select, the weekly schedule and the exceptions for the first staff member", async () => {
    renderBookings(<StaffAvailabilityPage />)
    const days = await screen.findAllByTestId("bkg-day-row")
    expect(api.bookingsAdminAvailabilityList).toHaveBeenCalledWith(undefined, undefined, undefined, 1, 100, undefined, 1)
    expect(api.bookingsAdminExceptionsList).toHaveBeenCalledWith(undefined, undefined, 1, 100, undefined, undefined, 1)
    expect(screen.getByTestId("bkg-back")).toHaveAttribute("href", "/bookings/staff")
    expect(screen.getByTestId("bkg-back")).toHaveTextContent("Staff/Staff Availability")
    expect(await screen.findByTestId("bkg-header-crumb")).toHaveTextContent("Staff Availability")
    expect(screen.getByTestId("bkg-availability-staff")).toHaveValue("1")
    expect(days).toHaveLength(7)
    expect(days[0]).toHaveTextContent("Monday")
    expect(within(days[0]).getByTestId("bkg-day-hours")).toHaveTextContent("09:00 – 17:00 (Break: 13:00 – 14:00)")
    expect(within(days[0]).getByTestId("bkg-day-status")).toHaveTextContent("Working")
    expect(within(days[1]).getByTestId("bkg-day-hours")).toHaveTextContent("09:00 – 17:00")
    expect(within(days[5]).getByTestId("bkg-day-hours")).toHaveTextContent("Day Off")
    expect(within(days[5]).getByTestId("bkg-day-status")).toHaveTextContent("Day Off")
    expect(within(days[6]).getByTestId("bkg-day-hours")).toHaveTextContent("No schedule set for this day")

    const exceptions = screen.getAllByTestId("bkg-exception-row")
    expect(exceptions).toHaveLength(2)
    expect(within(exceptions[0]).getByTestId("bkg-exception-row-date")).toHaveTextContent("Nov 12, 2026")
    expect(within(exceptions[0]).getByTestId("bkg-exception-kind")).toHaveTextContent("Unavailable")
    expect(exceptions[0]).toHaveTextContent("Dental conference")
    expect(within(exceptions[1]).getByTestId("bkg-exception-kind")).toHaveTextContent("Special hours")
    expect(exceptions[1]).toHaveTextContent("10:00 – 13:00")
  })

  it("switching the staff member reloads both lists", async () => {
    renderBookings(<StaffAvailabilityPage />)
    await screen.findAllByTestId("bkg-day-row")
    fireEvent.change(screen.getByTestId("bkg-availability-staff"), { target: { value: "2" } })
    await waitFor(() => expect(api.bookingsAdminAvailabilityList).toHaveBeenLastCalledWith(undefined, undefined, undefined, 1, 100, undefined, 2))
    await waitFor(() => expect(screen.getByTestId("bkg-exceptions-empty")).toBeInTheDocument())
    const days = screen.getAllByTestId("bkg-day-row")
    expect(within(days[0]).getByTestId("bkg-day-hours")).toHaveTextContent("No schedule set for this day")
    expect(await screen.findByTestId("bkg-header-sub")).toHaveTextContent("Lasha Meladze")
  })

  it("edits a weekday (PATCH) and creates a missing one as a day off (POST)", async () => {
    renderBookings(<StaffAvailabilityPage />)
    const days = await screen.findAllByTestId("bkg-day-row")
    fireEvent.click(within(days[0]).getByTestId("bkg-day-edit"))
    const dialog = await screen.findByTestId("bkg-schedule-dialog")
    expect(dialog).toHaveTextContent("Edit Monday")
    expect(screen.getByTestId("bkg-schedule-start")).toHaveValue("09:00")
    expect(screen.getByTestId("bkg-schedule-end")).toHaveValue("17:00")
    expect(screen.getByTestId("bkg-schedule-break-start")).toHaveValue("13:00")
    expect(screen.getByTestId("bkg-schedule-break-end")).toHaveValue("14:00")
    fireEvent.change(screen.getByTestId("bkg-schedule-end"), { target: { value: "08:00" } })
    fireEvent.click(screen.getByTestId("bkg-schedule-dialog-submit"))
    expect(await screen.findByText("End time must be after the start time")).toBeInTheDocument()
    expect(api.bookingsAdminAvailabilityPartialUpdate).not.toHaveBeenCalled()
    fireEvent.change(screen.getByTestId("bkg-schedule-end"), { target: { value: "18:00" } })
    fireEvent.change(screen.getByTestId("bkg-schedule-break-start"), { target: { value: "" } })
    fireEvent.change(screen.getByTestId("bkg-schedule-break-end"), { target: { value: "" } })
    fireEvent.click(screen.getByTestId("bkg-schedule-dialog-submit"))
    await waitFor(() =>
      expect(api.bookingsAdminAvailabilityPartialUpdate).toHaveBeenCalledWith(11, { staff: 1, day_of_week: 0, is_available: true, start_time: "09:00", end_time: "18:00", break_start: null, break_end: null })
    )
    expect(toast.success).toHaveBeenCalledWith("Schedule saved")
    await waitFor(() => expect(screen.queryByTestId("bkg-schedule-dialog")).toBeNull())
    expect(api.bookingsAdminAvailabilityList).toHaveBeenCalledTimes(2)

    fireEvent.click(within(screen.getAllByTestId("bkg-day-row")[6]).getByTestId("bkg-day-edit"))
    await screen.findByTestId("bkg-schedule-dialog")
    fireEvent.click(screen.getByTestId("bkg-schedule-available"))
    expect(screen.queryByTestId("bkg-schedule-start")).toBeNull()
    fireEvent.click(screen.getByTestId("bkg-schedule-dialog-submit"))
    await waitFor(() =>
      expect(api.bookingsAdminAvailabilityCreate).toHaveBeenCalledWith({ staff: 1, day_of_week: 6, is_available: false, start_time: "09:00", end_time: "17:00", break_start: null, break_end: null })
    )
  })

  it("a refused write (403) is shown as a toast and the dialog stays open", async () => {
    api.bookingsAdminAvailabilityPartialUpdate.mockRejectedValueOnce(httpError(403, { detail: "Only booking admins can change availability." }))
    renderBookings(<StaffAvailabilityPage />)
    const days = await screen.findAllByTestId("bkg-day-row")
    fireEvent.click(within(days[0]).getByTestId("bkg-day-edit"))
    await screen.findByTestId("bkg-schedule-dialog")
    fireEvent.click(screen.getByTestId("bkg-schedule-dialog-submit"))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Only booking admins can change availability."))
    expect(screen.getByTestId("bkg-schedule-dialog")).toBeInTheDocument()
  })

  it("adds an exception with special hours, edits one and deletes one through the confirm dialog", async () => {
    renderBookings(<StaffAvailabilityPage />)
    await screen.findAllByTestId("bkg-day-row")
    fireEvent.click(screen.getByTestId("bkg-exception-add"))
    const dialog = await screen.findByTestId("bkg-exception-dialog")
    expect(dialog).toHaveTextContent("Add Exception")
    fireEvent.click(screen.getByTestId("bkg-exception-dialog-submit"))
    expect(await screen.findByText("Pick a date")).toBeInTheDocument()
    fireEvent.change(screen.getByTestId("bkg-exception-date"), { target: { value: "2026-12-24" } })
    fireEvent.click(within(dialog).getByRole("radio", { name: "Special hours" }))
    fireEvent.change(screen.getByTestId("bkg-exception-start"), { target: { value: "11:00" } })
    fireEvent.change(screen.getByTestId("bkg-exception-end"), { target: { value: "15:00" } })
    fireEvent.change(screen.getByTestId("bkg-exception-reason"), { target: { value: "Short day" } })
    fireEvent.click(screen.getByTestId("bkg-exception-dialog-submit"))
    await waitFor(() => expect(api.bookingsAdminExceptionsCreate).toHaveBeenCalledWith({ staff: 1, date: "2026-12-24", is_available: true, start_time: "11:00", end_time: "15:00", reason: "Short day" }))
    expect(toast.success).toHaveBeenCalledWith("Exception added")
    await waitFor(() => expect(screen.queryByTestId("bkg-exception-dialog")).toBeNull())

    const rows = screen.getAllByTestId("bkg-exception-row")
    fireEvent.click(within(rows[1]).getByTestId("bkg-exception-edit"))
    await screen.findByTestId("bkg-exception-dialog")
    expect(screen.getByTestId("bkg-exception-date")).toHaveValue("2026-11-20")
    expect(screen.getByTestId("bkg-exception-start")).toHaveValue("10:00")
    fireEvent.click(screen.getByRole("radio", { name: "Unavailable all day" }))
    fireEvent.click(screen.getByTestId("bkg-exception-dialog-submit"))
    await waitFor(() => expect(api.bookingsAdminExceptionsPartialUpdate).toHaveBeenCalledWith(22, { staff: 1, date: "2026-11-20", is_available: false, start_time: null, end_time: null, reason: "" }))

    fireEvent.click(within(screen.getAllByTestId("bkg-exception-row")[0]).getByTestId("bkg-exception-delete"))
    expect(await screen.findByTestId("bkg-exception-delete-dialog")).toHaveTextContent("Nov 12, 2026")
    expect(api.bookingsAdminExceptionsDestroy).not.toHaveBeenCalled()
    fireEvent.click(screen.getByTestId("bkg-exception-delete-dialog-confirm"))
    await waitFor(() => expect(api.bookingsAdminExceptionsDestroy).toHaveBeenCalledWith(21))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Exception deleted"))
  })

  it("a non-admin sees the schedule read-only: no row buttons, no add / edit / delete", async () => {
    access.current = { isBookingAdmin: false, userId: 1, loaded: true }
    renderBookings(<StaffAvailabilityPage />)
    const days = await screen.findAllByTestId("bkg-day-row")
    expect(within(days[0]).getByTestId("bkg-day-hours")).toHaveTextContent("09:00 – 17:00")
    expect(screen.queryByTestId("bkg-day-edit")).toBeNull()
    expect(screen.queryByTestId("bkg-exception-add")).toBeNull()
    expect(screen.queryByTestId("bkg-exception-edit")).toBeNull()
    expect(screen.queryByTestId("bkg-exception-delete")).toBeNull()
    expect(screen.getByText("Only administrators and managers can change working hours.")).toBeInTheDocument()
  })

  it("load errors show the error state; Georgian weekday names and pills", async () => {
    api.bookingsAdminAvailabilityList.mockRejectedValueOnce(httpError(500))
    const { unmount } = renderBookings(<StaffAvailabilityPage />)
    await screen.findByTestId("bkg-availability-error")
    unmount()
    renderBookings(<StaffAvailabilityPage />, "ka")
    const days = await screen.findAllByTestId("bkg-day-row")
    expect(days[0]).toHaveTextContent("ორშაბათი")
    expect(within(days[0]).getByTestId("bkg-day-hours")).toHaveTextContent("09:00 – 17:00 (შესვენება: 13:00 – 14:00)")
    expect(within(days[0]).getByTestId("bkg-day-status")).toHaveTextContent("სამუშაო")
    expect(within(days[5]).getByTestId("bkg-day-status")).toHaveTextContent("დასვენების დღე")
    expect(within(screen.getAllByTestId("bkg-exception-row")[0]).getByTestId("bkg-exception-row-date")).toHaveTextContent("12 ნოე 2026")
  })
})
