import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { makeRow, renderBookings } from "./bkg00-helpers"
import { api, httpError, resetApi } from "./bkg00-api-mock"
import { todayInTimezone, shiftDateOnly } from "@/app/(tenant)/bookings/_components/ui/format"

vi.mock("@/api/generated", async () => (await import("./bkg00-api-mock")).api)
const push = vi.fn()
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn() }), usePathname: () => "/bookings/bookings", useSearchParams: () => new URLSearchParams() }))

import BookingsListPage from "@/app/(tenant)/bookings/bookings/page"

const ROWS = [
  makeRow(1, { status: "pending", payment_status: "pending" }),
  makeRow(2, { status: "confirmed", payment_status: "fully_paid", date: "2026-11-09", start_time: "12:00:00", end_time: "12:20:00", total_amount: "80.00" }),
  makeRow(3, { status: "cancelled", payment_status: "failed" }),
]

/** The rows call for the table (page_size > 1), as positional generated-client args. */
const tableCalls = () => api.bookingsAdminBookingsRowsList.mock.calls.filter((c) => c[7] !== 1)
const lastTableCall = () => tableCalls()[tableCalls().length - 1]

beforeEach(() => {
  resetApi()
  push.mockReset()
  api.bookingsAdminBookingsRowsList.mockImplementation(async (...args: unknown[]) => {
    // counts: page_size=1 per status
    if (args[7] === 1) {
      const status = args[12]
      return { count: status === "pending" ? 4 : status === "confirmed" ? 5 : status === "completed" ? 6 : 15, results: [] }
    }
    return { count: 45, results: ROWS }
  })
})

describe("BKG-01 bookings list", () => {
  it("loads page 1 / 20 of the slim rows, the stat counts, and renders the design columns", async () => {
    renderBookings(<BookingsListPage />)
    expect(screen.getByTestId("bkg-table-skeleton")).toBeInTheDocument()
    const rows = await screen.findAllByTestId("bkg-table-row")
    // client, dateFrom, dateTo, lang, mine, ordering, page, pageSize, paymentStatus, search, service, staff, status
    expect(lastTableCall()).toEqual([undefined, undefined, undefined, "en", undefined, undefined, 1, 20, undefined, undefined, undefined, undefined, undefined])
    expect(rows).toHaveLength(3)
    expect(rows[0]).toHaveTextContent("BK-1051")
    expect(rows[0]).toHaveTextContent("Client 1")
    expect(rows[0]).toHaveTextContent("Whitening")
    expect(rows[0]).toHaveTextContent("Nov 10, 2026")
    expect(rows[0]).toHaveTextContent("09:00 – 10:00")
    expect(rows[0]).toHaveTextContent("Unassigned")
    expect(rows[0]).toHaveTextContent("₾350.00")
    expect(within(rows[0]).getByTestId("bkg-payment-pill")).toHaveTextContent("Unpaid")
    expect(within(rows[0]).getByTestId("bkg-status-pill")).toHaveTextContent("Pending")
    expect(rows[1]).toHaveTextContent("Nino Beridze")
    expect(within(rows[1]).getByTestId("bkg-payment-pill")).toHaveTextContent("Fully paid")
    expect(within(rows[1]).getByTestId("bkg-status-pill")).toHaveTextContent("Confirmed")
    // backend payment status names (pending / failed), not the old unpaid / partially_refunded
    expect(within(rows[2]).getByTestId("bkg-payment-pill")).toHaveTextContent("Failed")
    expect(within(rows[2]).getByTestId("bkg-status-pill")).toHaveTextContent("Cancelled")
    expect(within(rows[0]).getByRole("link", { name: "Open booking BK-1051" })).toHaveAttribute("href", "/bookings/bookings/1")

    await waitFor(() => expect(screen.getByTestId("bkg-stat-total-value")).toHaveTextContent("15"))
    expect(screen.getByTestId("bkg-stat-pending-value")).toHaveTextContent("4")
    expect(screen.getByTestId("bkg-stat-confirmed-value")).toHaveTextContent("5")
    expect(screen.getByTestId("bkg-stat-completed-value")).toHaveTextContent("6")
    expect(await screen.findByTestId("bkg-header-sub")).toHaveTextContent("45 booking(s) found")
    expect(screen.getByTestId("bkg-pagination")).toHaveTextContent("1–20 of 45")
    expect(screen.getByTestId("bkg-pagination")).toHaveTextContent("Page 1 of 3")
  })

  it("status, date (business timezone), search and paging go to the server", async () => {
    renderBookings(<BookingsListPage />)
    await screen.findAllByTestId("bkg-table-row")

    fireEvent.change(screen.getByTestId("bkg-bookings-status"), { target: { value: "confirmed" } })
    await waitFor(() => expect(lastTableCall()[12]).toBe("confirmed"))
    expect(lastTableCall()[6]).toBe(1)

    const today = todayInTimezone("Asia/Tbilisi")
    fireEvent.change(screen.getByTestId("bkg-bookings-date"), { target: { value: "today" } })
    await waitFor(() => expect(lastTableCall()[1]).toBe(today))
    expect(lastTableCall()[2]).toBe(today)
    fireEvent.change(screen.getByTestId("bkg-bookings-date"), { target: { value: "past" } })
    await waitFor(() => expect(lastTableCall()[2]).toBe(shiftDateOnly(today, -1)))
    expect(lastTableCall()[1]).toBeUndefined()
    fireEvent.change(screen.getByTestId("bkg-bookings-date"), { target: { value: "upcoming" } })
    await waitFor(() => expect(lastTableCall()[1]).toBe(today))
    expect(lastTableCall()[2]).toBeUndefined()

    fireEvent.change(screen.getByTestId("bkg-bookings-search"), { target: { value: "salome" } })
    await waitFor(() => expect(lastTableCall()[9]).toBe("salome"))

    fireEvent.click(screen.getByRole("button", { name: "Go to next page" }))
    await waitFor(() => expect(lastTableCall()[6]).toBe(2))
    fireEvent.change(screen.getByTestId("bkg-page-size"), { target: { value: "50" } })
    await waitFor(() => expect(lastTableCall()[7]).toBe(50))
    expect(lastTableCall()[6]).toBe(1)
  })

  it("opens the booking on row click", async () => {
    renderBookings(<BookingsListPage />)
    const rows = await screen.findAllByTestId("bkg-table-row")
    fireEvent.click(rows[1])
    expect(push).toHaveBeenCalledWith("/bookings/bookings/2")
  })

  it("shows the filtered empty state with a clear button, and an error state with retry", async () => {
    api.bookingsAdminBookingsRowsList.mockImplementation(async (...args: unknown[]) => (args[7] === 1 ? { count: 0, results: [] } : { count: 0, results: [] }))
    renderBookings(<BookingsListPage />)
    await screen.findByTestId("bkg-table-empty")
    expect(screen.getByTestId("bkg-table-empty")).toHaveTextContent("No bookings found")
    fireEvent.change(screen.getByTestId("bkg-bookings-status"), { target: { value: "no_show" } })
    await waitFor(() => expect(screen.getByTestId("bkg-table-empty")).toHaveTextContent("Nothing matches these filters"))
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }))
    await waitFor(() => expect(lastTableCall()[12]).toBeUndefined())

    api.bookingsAdminBookingsRowsList.mockImplementation(async (...args: unknown[]) => {
      if (args[7] === 1) return { count: 0, results: [] }
      throw httpError(500)
    })
    fireEvent.change(screen.getByTestId("bkg-bookings-status"), { target: { value: "pending" } })
    const err = await screen.findByTestId("bkg-error")
    expect(within(err).getByRole("button", { name: "Try again" })).toBeInTheDocument()
  })

  it("renders in Georgian without Latin UI text", async () => {
    renderBookings(<BookingsListPage />, "ka")
    const rows = await screen.findAllByTestId("bkg-table-row")
    expect(lastTableCall()[3]).toBe("ka")
    expect(within(rows[0]).getByTestId("bkg-status-pill")).toHaveTextContent("მოლოდინში")
    expect(within(rows[0]).getByTestId("bkg-payment-pill")).toHaveTextContent("გადაუხდელი")
    expect(rows[0]).toHaveTextContent("10 ნოე 2026")
    expect(rows[0]).toHaveTextContent("მიუნიჭებელი")
  })
})
