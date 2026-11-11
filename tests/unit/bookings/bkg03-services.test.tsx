import React from "react"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { renderBookings } from "./bkg00-helpers"
import { api, httpError, makeCategory, makeService, makeStaff, page, resetApi } from "./bkg03-api-mock"

vi.mock("@/api/generated", async () => (await import("./bkg03-api-mock")).api)
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }))
vi.mock("sonner", () => ({ toast }))
const access = vi.hoisted(() => ({ current: { isBookingAdmin: true, userId: 1, loaded: true } }))
vi.mock("@/hooks/useMyAccess", () => ({ useMyAccess: () => access.current }))

import ServicesPage from "@/app/(tenant)/bookings/services/page"
import { serviceToForm, serviceToPayload, validateServiceForm } from "@/app/(tenant)/bookings/services/_components/service-form"

const SERVICES = [
  makeService(1, { name: { en: "Teeth cleaning", ka: "კბილების წმენდა" }, name_display: "Teeth cleaning", category: makeCategory(2, { name_display: "Hygiene" }), deposit_percentage: 20, buffer_time_minutes: 15, staff_members: [makeStaff(1)] }),
  makeService(2, { name: { en: "Whitening", ka: "გათეთრება" }, name_display: "Whitening", duration_minutes: 60, base_price: "350.00", booking_type: "fixed_slots", status: "inactive" }),
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
  api.bookingsAdminServicesList.mockResolvedValue(page(SERVICES))
  api.bookingsAdminCategoriesList.mockResolvedValue(page([makeCategory(2, { name_display: "Hygiene" }), makeCategory(3)]))
  api.bookingsAdminStaffList.mockResolvedValue(page([makeStaff(1), makeStaff(2)]))
  api.bookingsAdminServicesCreate.mockResolvedValue(makeService(9))
  api.bookingsAdminServicesPartialUpdate.mockResolvedValue(makeService(1))
  api.bookingsAdminServicesDestroy.mockResolvedValue({})
  api.bookingsAdminServicesDeactivateCreate.mockResolvedValue(makeService(1, { status: "inactive" }))
  api.bookingsAdminServicesActivateCreate.mockResolvedValue(makeService(2, { status: "active" }))
})

const fill = (testId: string, value: string) => fireEvent.change(screen.getByTestId(testId), { target: { value } })

describe("BKG-03 services: form helpers", () => {
  it("builds the form from a service with both languages and every field", () => {
    const f = serviceToForm(SERVICES[0] as never)
    expect(f.name).toEqual({ en: "Teeth cleaning", ka: "კბილების წმენდა" })
    expect(f.categoryId).toBe("2")
    expect(f.depositPercentage).toBe("20")
    expect(f.bufferMinutes).toBe("15")
    expect(f.staffIds).toEqual([1])
  })

  it("sends localized objects, numbers and a null category; validates price ≥ 0", () => {
    const f = serviceToForm(makeService(5, { category: null, base_price: "0.00", name: "Legacy string" }) as never)
    expect(f.name).toEqual({ en: "Legacy string", ka: "" })
    const t = (k: string) => k
    expect(validateServiceForm(f, t)).toEqual({})
    expect(validateServiceForm({ ...f, basePrice: "-1" }, t)).toEqual({ basePrice: "priceNotNegative" })
    expect(validateServiceForm({ ...f, name: { en: "", ka: "" }, durationMinutes: "0", depositPercentage: "120" }, t)).toEqual({ name: "nameRequired", durationMinutes: "durationPositive", depositPercentage: "depositRange" })
    const payload = serviceToPayload(f)
    expect(payload).toEqual({
      name: { en: "Legacy string", ka: "Legacy string" },
      description: { en: "", ka: "" },
      category_id: null,
      base_price: "0.00",
      deposit_percentage: 0,
      duration_minutes: 45,
      buffer_time_minutes: 0,
      booking_type: "duration_based",
      status: "active",
      staff_ids: [],
    })
    expect(typeof payload.name).toBe("object")
  })
})

describe("BKG-03 services page", () => {
  it("renders the table with duration, price, type and status pills, the count and the header action", async () => {
    renderBookings(<ServicesPage />)
    const rows = await screen.findAllByTestId("bkg-table-row")
    expect(api.bookingsAdminServicesList).toHaveBeenCalledWith(undefined, undefined, undefined, 1, 100)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent("Teeth cleaning")
    expect(rows[0]).toHaveTextContent("Hygiene")
    expect(rows[0]).toHaveTextContent("45 min")
    expect(rows[0]).toHaveTextContent("₾120.00")
    expect(within(rows[0]).getByTestId("bkg-service-type-pill")).toHaveTextContent("Duration Based")
    expect(within(rows[0]).getByTestId("bkg-service-status-pill")).toHaveTextContent("Active")
    expect(within(rows[0]).getByTestId("bkg-service-status-pill")).toHaveAttribute("data-active", "true")
    expect(within(rows[1]).getByTestId("bkg-service-type-pill")).toHaveTextContent("Fixed Time Slots")
    expect(within(rows[1]).getByTestId("bkg-service-status-pill")).toHaveTextContent("Inactive")
    expect(within(rows[1]).getByTestId("bkg-service-status-pill")).not.toHaveAttribute("data-active")
    expect(rows[1]).toHaveTextContent("₾350.00")
    expect(await screen.findByTestId("bkg-header-sub")).toHaveTextContent("2 service(s) found")
    expect(screen.getByTestId("bkg-services-add")).toHaveTextContent("Add Service")

    fireEvent.change(screen.getByTestId("bkg-services-search"), { target: { value: "whit" } })
    expect(screen.getAllByTestId("bkg-table-row")).toHaveLength(1)
    fireEvent.change(screen.getByTestId("bkg-services-search"), { target: { value: "zzz" } })
    expect(screen.getByTestId("bkg-table-empty")).toHaveTextContent("Nothing matches these filters")
  })

  it("creates a service with the full localized payload", async () => {
    renderBookings(<ServicesPage />)
    await screen.findAllByTestId("bkg-table-row")
    fireEvent.click(screen.getByTestId("bkg-services-add"))
    const sheet = await screen.findByTestId("bkg-service-form")
    expect(sheet).toHaveTextContent("Create Service")
    await waitFor(() => expect(within(sheet).getByTestId("bkg-service-category")).toContainHTML("Hygiene"))
    fill("bkg-service-name-en", "Implant check")
    fill("bkg-service-name-ka", "იმპლანტის შემოწმება")
    fill("bkg-service-desc-en", "Quick check")
    fill("bkg-service-desc-ka", "სწრაფი შემოწმება")
    fill("bkg-service-category", "2")
    fill("bkg-service-duration", "20")
    fill("bkg-service-buffer", "10")
    fill("bkg-service-price", "80")
    fill("bkg-service-deposit", "25")
    fill("bkg-service-type", "fixed_slots")
    fill("bkg-service-status", "coming_soon")
    const staffList = await within(sheet).findByTestId("bkg-service-staff")
    fireEvent.click(within(staffList).getByLabelText("Staff 2"))
    fireEvent.click(screen.getByTestId("ec-form-submit"))
    await waitFor(() => expect(api.bookingsAdminServicesCreate).toHaveBeenCalledTimes(1))
    expect(api.bookingsAdminServicesCreate).toHaveBeenCalledWith({
      name: { en: "Implant check", ka: "იმპლანტის შემოწმება" },
      description: { en: "Quick check", ka: "სწრაფი შემოწმება" },
      category_id: 2,
      base_price: "80.00",
      deposit_percentage: 25,
      duration_minutes: 20,
      buffer_time_minutes: 10,
      booking_type: "fixed_slots",
      status: "coming_soon",
      staff_ids: [2],
    })
    expect(toast.success).toHaveBeenCalledWith("Service created successfully")
    await waitFor(() => expect(api.bookingsAdminServicesList).toHaveBeenCalledTimes(2))
  })

  it("validation blocks an empty name and a negative price without a request", async () => {
    renderBookings(<ServicesPage />)
    await screen.findAllByTestId("bkg-table-row")
    fireEvent.click(screen.getByTestId("bkg-services-add"))
    await screen.findByTestId("bkg-service-form")
    fill("bkg-service-price", "-5")
    fireEvent.click(screen.getByTestId("ec-form-submit"))
    expect(await screen.findByText("Service name is required")).toBeInTheDocument()
    expect(screen.getByText("Price can't be negative (0 means free)")).toBeInTheDocument()
    expect(api.bookingsAdminServicesCreate).not.toHaveBeenCalled()
  })

  it("edits a service: the form is prefilled in both languages and PATCHes localized objects", async () => {
    renderBookings(<ServicesPage />)
    const rows = await screen.findAllByTestId("bkg-table-row")
    fireEvent.click(within(rows[0]).getByTestId("bkg-service-actions-edit"))
    const sheet = await screen.findByTestId("bkg-service-form")
    expect(sheet).toHaveTextContent("Edit Service")
    expect(screen.getByTestId("bkg-service-name-en")).toHaveValue("Teeth cleaning")
    expect(screen.getByTestId("bkg-service-name-ka")).toHaveValue("კბილების წმენდა")
    expect(screen.getByTestId("bkg-service-deposit")).toHaveValue(20)
    await waitFor(() => expect(screen.getByTestId("bkg-service-category")).toHaveValue("2"))
    fill("bkg-service-name-ka", "კბილების პროფესიული წმენდა")
    fireEvent.click(screen.getByTestId("ec-form-submit"))
    await waitFor(() => expect(api.bookingsAdminServicesPartialUpdate).toHaveBeenCalledTimes(1))
    const [id, body] = api.bookingsAdminServicesPartialUpdate.mock.calls[0]
    expect(id).toBe(1)
    expect(body.name).toEqual({ en: "Teeth cleaning", ka: "კბილების პროფესიული წმენდა" })
    expect(body).toMatchObject({ category_id: 2, deposit_percentage: 20, buffer_time_minutes: 15, staff_ids: [1], base_price: "120.00" })
  })

  it("delete asks for confirmation; a 409 shows the 'has bookings' message and keeps the dialog open", async () => {
    api.bookingsAdminServicesDestroy.mockRejectedValueOnce(httpError(409, { error: "This service has bookings and cannot be deleted." }))
    renderBookings(<ServicesPage />)
    const rows = await screen.findAllByTestId("bkg-table-row")
    fireEvent.click(within(rows[0]).getByTestId("bkg-service-actions-delete"))
    const dialog = await screen.findByTestId("bkg-service-delete")
    expect(dialog).toHaveTextContent("Teeth cleaning")
    fireEvent.click(screen.getByTestId("bkg-service-delete-confirm"))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("This service has bookings and can't be deleted. Deactivate it instead."))
    expect(screen.getByTestId("bkg-service-delete")).toBeInTheDocument()
    expect(api.bookingsAdminServicesList).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByTestId("bkg-service-delete-confirm"))
    await waitFor(() => expect(api.bookingsAdminServicesDestroy).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Service deleted successfully"))
    await waitFor(() => expect(screen.queryByTestId("bkg-service-delete")).toBeNull())
    expect(api.bookingsAdminServicesList).toHaveBeenCalledTimes(2)
  })

  it("the status pill toggles active / inactive through the activate and deactivate actions", async () => {
    renderBookings(<ServicesPage />)
    const rows = await screen.findAllByTestId("bkg-table-row")
    fireEvent.click(within(rows[0]).getByTestId("bkg-service-status-toggle"))
    await waitFor(() => expect(api.bookingsAdminServicesDeactivateCreate).toHaveBeenCalledWith(1))
    await waitFor(() => expect(within(rows[0]).getByTestId("bkg-service-status-pill")).toHaveTextContent("Inactive"))
    fireEvent.click(within(rows[1]).getByTestId("bkg-service-status-toggle"))
    await waitFor(() => expect(api.bookingsAdminServicesActivateCreate).toHaveBeenCalledWith(2))
    expect(api.bookingsAdminServicesList).toHaveBeenCalledTimes(1)
  })

  it("a non-admin sees the table only: no add button, no actions, no status toggle, no form on row click", async () => {
    access.current = { isBookingAdmin: false, userId: 1, loaded: true }
    renderBookings(<ServicesPage />)
    const rows = await screen.findAllByTestId("bkg-table-row")
    expect(screen.queryByTestId("bkg-services-add")).toBeNull()
    expect(screen.queryByTestId("bkg-service-actions")).toBeNull()
    expect(screen.queryByTestId("bkg-service-status-toggle")).toBeNull()
    fireEvent.click(rows[0])
    expect(screen.queryByTestId("bkg-service-form")).toBeNull()
  })

  it("shows the error state when the list fails and renders in Georgian", async () => {
    api.bookingsAdminServicesList.mockRejectedValueOnce(httpError(500))
    const { unmount } = renderBookings(<ServicesPage />)
    await screen.findByTestId("bkg-error")
    unmount()
    renderBookings(<ServicesPage />, "ka")
    const rows = await screen.findAllByTestId("bkg-table-row")
    expect(rows[0]).toHaveTextContent("45 წთ")
    expect(within(rows[0]).getByTestId("bkg-service-status-pill")).toHaveTextContent("აქტიური")
    expect(screen.getByTestId("bkg-services-add")).toHaveTextContent("სერვისის დამატება")
  })
})
