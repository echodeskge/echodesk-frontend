import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { renderBookings } from "./bkg00-helpers"
import { api, httpError, resetApi } from "./bkg02-api-mock"

vi.mock("@/api/axios", () => ({ default: { get: vi.fn() } }))
vi.mock("@/api/generated", async () => (await import("./bkg02-api-mock")).api)
const toastFn = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast: toastFn }))

import { NewBookingDialog } from "@/app/(tenant)/bookings/calendar/_components/new-booking-dialog"

const SERVICES = [
  { id: 7, name: { en: "Whitening", ka: "გათეთრება" }, name_display: "Whitening", duration_minutes: 60, base_price: "350.00", status: "active" },
  { id: 8, name: { en: "Consultation", ka: "კონსულტაცია" }, name_display: "Consultation", duration_minutes: 30, base_price: "50.00", status: "active" },
  { id: 9, name: { en: "Old", ka: "ძველი" }, name_display: "Old", duration_minutes: 30, base_price: "10.00", status: "inactive" },
]

beforeEach(() => {
  resetApi()
  toastFn.success.mockReset()
  Element.prototype.scrollIntoView = vi.fn()
  api.bookingsAdminStaffList.mockResolvedValue({
    count: 2,
    results: [
      { id: 3, user: { id: 30, full_name: "Nino Beridze", email: "" }, services: [{ id: 7 }], is_active_for_bookings: true },
      { id: 2, user: { id: 20, full_name: "Lasha Meladze", email: "" }, services: [{ id: 7 }, { id: 8 }], is_active_for_bookings: true },
    ],
  })
  api.bookingsAdminServicesList.mockResolvedValue({ count: 3, results: SERVICES })
  api.bookingsAdminSlotsRetrieve.mockResolvedValue({ slots: [{ start_time: "12:00:00", end_time: "13:00:00" }, { start_time: "13:00:00", end_time: "14:00:00" }] })
  api.bookingsAdminClientsList.mockResolvedValue({ count: 1, results: [{ id: 41, full_name: "Salome Japaridze", phone_number: "+995593441007", email: "s@example.com" }] })
})

function renderDialog(preset = { staffId: 3, date: "2026-11-10", time: "12:00" }) {
  const onCreated = vi.fn()
  const onOpenChange = vi.fn()
  renderBookings(<NewBookingDialog open onOpenChange={onOpenChange} preset={preset} onCreated={onCreated} />)
  return { onCreated, onOpenChange }
}

describe("BKG-02 new booking dialog", () => {
  it("pre-fills the slot, lists the specialist's own active services, defaults the price and offers free times", async () => {
    renderDialog()
    const dialog = await screen.findByTestId("bkg-new-booking")
    await waitFor(() => expect((within(dialog).getByTestId("bkg-nb-staff") as HTMLSelectElement).value).toBe("3"))
    expect(within(dialog).getByTestId("bkg-nb-date")).toHaveValue("2026-11-10")
    expect(within(dialog).getByTestId("bkg-nb-time")).toHaveValue("12:00")
    // Nino performs only Whitening (and the inactive service is never offered)
    const service = within(dialog).getByTestId("bkg-nb-service") as HTMLSelectElement
    await waitFor(() => expect(Array.from(service.options).map((o) => o.textContent)).toEqual(["Select service", "Whitening · 60 min"]))
    fireEvent.change(within(dialog).getByTestId("bkg-nb-staff"), { target: { value: "2" } })
    await waitFor(() => expect(Array.from(service.options).map((o) => o.textContent)).toEqual(["Select service", "Whitening · 60 min", "Consultation · 30 min"]))
    fireEvent.change(service, { target: { value: "8" } })
    expect(within(dialog).getByTestId("bkg-nb-price")).toHaveValue(50)
    // slots/?date&service&staff → chips
    await waitFor(() => expect(api.bookingsAdminSlotsRetrieve).toHaveBeenCalledWith("2026-11-10", undefined, undefined, 8, 2))
    const slots = await within(dialog).findByTestId("bkg-nb-slots")
    expect(slots).toHaveTextContent("12:00")
    fireEvent.click(within(slots).getByRole("button", { name: "13:00" }))
    expect(within(dialog).getByTestId("bkg-nb-time")).toHaveValue("13:00")
  })

  it("picks an existing customer through the search and posts the booking", async () => {
    api.bookingsAdminBookingsCreate.mockResolvedValue({ id: 99 })
    const { onCreated, onOpenChange } = renderDialog()
    const dialog = await screen.findByTestId("bkg-new-booking")
    await waitFor(() => expect((within(dialog).getByTestId("bkg-nb-staff") as HTMLSelectElement).value).toBe("3"))
    fireEvent.change(within(dialog).getByTestId("bkg-nb-service"), { target: { value: "7" } })

    // required: a customer
    fireEvent.click(within(dialog).getByTestId("bkg-new-booking-submit"))
    expect(await within(dialog).findByTestId("bkg-nb-error")).toHaveTextContent("Choose a customer or add a new one.")
    expect(api.bookingsAdminBookingsCreate).not.toHaveBeenCalled()

    fireEvent.click(within(dialog).getByTestId("bkg-nb-customer"))
    const option = await screen.findByTestId("bkg-nb-client-option")
    expect(option).toHaveTextContent("Salome Japaridze")
    // clients/?search= with the typed text
    await waitFor(() => expect(api.bookingsAdminClientsList).toHaveBeenCalledWith(undefined, undefined, undefined, 8, undefined))
    fireEvent.click(option)
    expect(within(dialog).getByTestId("bkg-nb-client")).toHaveTextContent("Salome Japaridze")

    fireEvent.change(within(dialog).getByTestId("bkg-nb-notes"), { target: { value: "VIP" } })
    fireEvent.click(within(dialog).getByTestId("bkg-nb-notify"))
    fireEvent.click(within(dialog).getByTestId("bkg-new-booking-submit"))
    await waitFor(() =>
      expect(api.bookingsAdminBookingsCreate).toHaveBeenCalledWith({
        service_id: 7,
        staff_id: 3,
        date: "2026-11-10",
        start_time: "12:00",
        client_id: 41,
        first_name: undefined,
        last_name: undefined,
        phone_number: undefined,
        email: undefined,
        total_amount: "350.00",
        staff_notes: "VIP",
        notify_client: false,
      })
    )
    await waitFor(() => expect(onCreated).toHaveBeenCalled())
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(toastFn.success).toHaveBeenCalledWith("Booking added")
  })

  it("adds a new customer inline and shows the API error in the dialog", async () => {
    api.bookingsAdminBookingsCreate.mockRejectedValue(httpError(400, { error: "This time is already booked" }))
    const { onCreated } = renderDialog({ staffId: 3, date: "2026-11-10", time: "12:00" })
    const dialog = await screen.findByTestId("bkg-new-booking")
    await waitFor(() => expect((within(dialog).getByTestId("bkg-nb-staff") as HTMLSelectElement).value).toBe("3"))
    fireEvent.change(within(dialog).getByTestId("bkg-nb-service"), { target: { value: "7" } })
    fireEvent.click(within(dialog).getByTestId("bkg-nb-customer"))
    const input = await screen.findByPlaceholderText("Name, phone or email")
    fireEvent.change(input, { target: { value: "+995555000111" } })
    fireEvent.click(await screen.findByText("Add new customer “+995555000111”"))
    const form = within(dialog).getByTestId("bkg-nb-new-client")
    expect(within(form).getByLabelText(/Phone/)).toHaveValue("+995555000111")
    fireEvent.change(within(form).getByLabelText(/First name/), { target: { value: "Ana" } })
    fireEvent.click(within(dialog).getByTestId("bkg-new-booking-submit"))
    await waitFor(() => expect(api.bookingsAdminBookingsCreate).toHaveBeenCalledWith(expect.objectContaining({ client_id: undefined, first_name: "Ana", last_name: "", phone_number: "+995555000111", email: undefined })))
    expect(await within(dialog).findByTestId("bkg-nb-error")).toHaveTextContent("This time is already booked")
    expect(onCreated).not.toHaveBeenCalled()
  })
})
