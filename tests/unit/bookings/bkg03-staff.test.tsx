import React from "react"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { renderBookings } from "./bkg00-helpers"
import { api, httpError, makeService, makeStaff, page, resetApi } from "./bkg03-api-mock"

vi.mock("@/api/generated", async () => (await import("./bkg03-api-mock")).api)
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }))
vi.mock("sonner", () => ({ toast }))
const access = vi.hoisted(() => ({ current: { isBookingAdmin: true, userId: 1, loaded: true } }))
vi.mock("@/hooks/useMyAccess", () => ({ useMyAccess: () => access.current }))

import StaffPage from "@/app/(tenant)/bookings/staff/page"

const svc = (id: number, name: string) => ({ id, name: { en: name, ka: name }, name_display: name })
const STAFF = [
  makeStaff(1, { user: { id: 31, email: "nino@example.com", first_name: "Nino", last_name: "Beridze", full_name: "Nino Beridze" }, services: [svc(1, "Consultation"), svc(2, "Whitening"), svc(3, "Implant check")], services_count: 3 }),
  makeStaff(2, { user: { id: 32, email: "mariam@example.com", first_name: "Mariam", last_name: "Kiknadze", full_name: "Mariam Kiknadze" }, is_active_for_bookings: false, bio: "Surgeon" }),
]
const USERS = [
  { id: 40, email: "lasha@example.com", first_name: "Lasha", last_name: "Meladze", full_name: "Lasha Meladze" },
  { id: 41, email: "ana@example.com", first_name: "Ana", last_name: "Tsereteli", full_name: "Ana Tsereteli" },
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
  api.bookingsAdminServicesList.mockResolvedValue(page([makeService(1, { name_display: "Consultation" }), makeService(2, { name_display: "Whitening" }), makeService(3, { name_display: "Implant check", status: "inactive" })]))
  api.bookingsAdminStaffAvailableUsersRetrieve.mockImplementation(async (search?: string) => (search ? USERS.filter((u) => u.full_name.toLowerCase().includes(search.toLowerCase())) : USERS))
  api.bookingsAdminStaffCreate.mockResolvedValue(makeStaff(3))
  api.bookingsAdminStaffPartialUpdate.mockResolvedValue(STAFF[1])
  api.bookingsAdminStaffDestroy.mockResolvedValue({})
})

describe("BKG-03 staff page", () => {
  it("renders name, email, service pills with +N, status, the count and both header actions", async () => {
    renderBookings(<StaffPage />)
    const rows = await screen.findAllByTestId("bkg-table-row")
    expect(api.bookingsAdminStaffList).toHaveBeenCalledWith(undefined, undefined, 1, 100)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent("Nino Beridze")
    expect(rows[0]).toHaveTextContent("nino@example.com")
    const cell = within(rows[0]).getByTestId("bkg-staff-services-cell")
    expect(cell).toHaveTextContent("Consultation")
    expect(cell).toHaveTextContent("Whitening")
    expect(cell).not.toHaveTextContent("Implant check")
    expect(within(cell).getByTestId("bkg-staff-services-more")).toHaveTextContent("+1")
    expect(within(rows[0]).getByTestId("bkg-staff-status-pill")).toHaveTextContent("Active")
    expect(within(rows[1]).getByTestId("bkg-staff-status-pill")).toHaveTextContent("Inactive")
    expect(rows[1]).toHaveTextContent("No services")
    expect(await screen.findByTestId("bkg-header-sub")).toHaveTextContent("2 staff member(s) found")
    expect(screen.getByTestId("bkg-staff-add")).toHaveTextContent("Add Staff")
    const hours = screen.getByTestId("bkg-staff-hours")
    expect(hours).toHaveAttribute("href", "/bookings/staff/availability")
    expect(hours).toHaveTextContent("Working hours")

    fireEvent.change(screen.getByTestId("bkg-staff-search"), { target: { value: "mariam@" } })
    expect(screen.getAllByTestId("bkg-table-row")).toHaveLength(1)
  })

  it("adds staff: searches the available users, picks one, assigns services and POSTs the full body", async () => {
    renderBookings(<StaffPage />)
    await screen.findAllByTestId("bkg-table-row")
    fireEvent.click(screen.getByTestId("bkg-staff-add"))
    const sheet = await screen.findByTestId("bkg-staff-form")
    expect(sheet).toHaveTextContent("Add Staff")
    await waitFor(() => expect(api.bookingsAdminStaffAvailableUsersRetrieve).toHaveBeenCalledWith(undefined))
    expect(await within(sheet).findAllByTestId("bkg-staff-user-option")).toHaveLength(2)

    // Submitting without a user is refused locally.
    fireEvent.click(screen.getByTestId("ec-form-submit"))
    expect(await screen.findByText("Please select a user")).toBeInTheDocument()
    expect(api.bookingsAdminStaffCreate).not.toHaveBeenCalled()

    fireEvent.change(screen.getByTestId("bkg-staff-user-search"), { target: { value: "ana" } })
    await waitFor(() => expect(api.bookingsAdminStaffAvailableUsersRetrieve).toHaveBeenCalledWith("ana"))
    await waitFor(() => expect(within(sheet).getAllByTestId("bkg-staff-user-option")).toHaveLength(1))
    fireEvent.click(within(sheet).getByTestId("bkg-staff-user-option"))
    expect(within(sheet).getByRole("radio", { name: /Ana Tsereteli/ })).toHaveAttribute("aria-checked", "true")
    fireEvent.change(screen.getByTestId("bkg-staff-bio"), { target: { value: "Orthodontist" } })
    const services = within(sheet).getByTestId("bkg-staff-services")
    fireEvent.click(within(services).getByLabelText(/Consultation/))
    fireEvent.click(within(services).getByLabelText(/Whitening/))
    expect(sheet).toHaveTextContent("2 service(s) selected")
    fireEvent.click(screen.getByTestId("ec-form-submit"))
    await waitFor(() => expect(api.bookingsAdminStaffCreate).toHaveBeenCalledWith({ user_id: 41, bio: "Orthodontist", is_active_for_bookings: true, service_ids: [1, 2] }))
    expect(toast.success).toHaveBeenCalledWith("Staff member created successfully")
    await waitFor(() => expect(api.bookingsAdminStaffList).toHaveBeenCalledTimes(2))
  })

  it("edits staff: the user is fixed, services are prefilled, the PATCH carries bio, active flag and service_ids", async () => {
    renderBookings(<StaffPage />)
    const rows = await screen.findAllByTestId("bkg-table-row")
    fireEvent.click(within(rows[1]).getByTestId("bkg-staff-actions-edit"))
    const sheet = await screen.findByTestId("bkg-staff-form")
    expect(within(sheet).getByTestId("bkg-staff-form-user")).toHaveTextContent("Mariam Kiknadze")
    expect(within(sheet).queryByTestId("bkg-staff-user-search")).toBeNull()
    expect(api.bookingsAdminStaffAvailableUsersRetrieve).not.toHaveBeenCalled()
    expect(screen.getByTestId("bkg-staff-bio")).toHaveValue("Surgeon")
    expect(within(sheet).getByRole("switch")).toHaveAttribute("aria-checked", "false")
    fireEvent.click(within(sheet).getByRole("switch"))
    const services = await within(sheet).findByTestId("bkg-staff-services")
    fireEvent.click(within(services).getByLabelText(/Implant check/))
    fireEvent.click(screen.getByTestId("ec-form-submit"))
    await waitFor(() => expect(api.bookingsAdminStaffPartialUpdate).toHaveBeenCalledWith(2, { bio: "Surgeon", is_active_for_bookings: true, service_ids: [3] }))
    expect(api.bookingsAdminStaffCreate).not.toHaveBeenCalled()
  })

  it("removing staff asks first; the API error is shown", async () => {
    api.bookingsAdminStaffDestroy.mockRejectedValueOnce(httpError(403, { detail: "Admins only." }))
    renderBookings(<StaffPage />)
    const rows = await screen.findAllByTestId("bkg-table-row")
    fireEvent.click(within(rows[0]).getByTestId("bkg-staff-actions-delete"))
    expect(await screen.findByTestId("bkg-staff-delete")).toHaveTextContent("Nino Beridze")
    fireEvent.click(screen.getByTestId("bkg-staff-delete-confirm"))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Admins only."))
    expect(screen.getByTestId("bkg-staff-delete")).toBeInTheDocument()
    fireEvent.click(screen.getByTestId("bkg-staff-delete-confirm"))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Staff member deleted successfully"))
    expect(api.bookingsAdminStaffDestroy).toHaveBeenCalledWith(1)
  })

  it("a non-admin keeps the Working hours link but gets no write controls; Georgian labels", async () => {
    access.current = { isBookingAdmin: false, userId: 1, loaded: true }
    renderBookings(<StaffPage />, "ka")
    const rows = await screen.findAllByTestId("bkg-table-row")
    expect(screen.queryByTestId("bkg-staff-add")).toBeNull()
    expect(screen.queryByTestId("bkg-staff-actions")).toBeNull()
    expect(screen.getByTestId("bkg-staff-hours")).toHaveTextContent("სამუშაო საათები")
    expect(within(rows[1]).getByTestId("bkg-staff-status-pill")).toHaveTextContent("არააქტიური")
    fireEvent.click(rows[0])
    expect(screen.queryByTestId("bkg-staff-form")).toBeNull()
  })
})
