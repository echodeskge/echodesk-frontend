import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { renderBookings } from "./bkg00-helpers"
import { api, httpError, resetApi } from "./bkg00-api-mock"

vi.mock("@/api/generated", async () => (await import("./bkg00-api-mock")).api)

import BookingsDashboard from "@/app/(tenant)/bookings/page"

const payload = {
  today: { total_bookings: 6, confirmed: 2, pending: 4, completed: 1, status_breakdown: [], bookings: [] },
  week: { total_bookings: 20, revenue: 970, popular_services: [] },
  overall: { total_clients: 11, total_revenue: 5000, active_staff: 3 },
}

beforeEach(() => {
  resetApi()
  api.bookingsAdminDashboardRetrieve.mockResolvedValue(payload)
  api.bookingsAdminServicesList.mockResolvedValue({ count: 4, results: [{ id: 1 }] })
})

describe("BKG-01 dashboard", () => {
  it("shows the tiles from the real payload, the active services count and the quick links", async () => {
    renderBookings(<BookingsDashboard />)
    await waitFor(() => expect(screen.getByTestId("bkg-tile-today-value")).toHaveTextContent("6"))
    expect(api.bookingsAdminDashboardRetrieve).toHaveBeenCalledWith("en", true)
    // active services = the list's count for status=active, one row requested
    expect(api.bookingsAdminServicesList).toHaveBeenCalledWith(undefined, undefined, undefined, 1, 1, undefined, "active")
    expect(screen.getByTestId("bkg-tile-pending-value")).toHaveTextContent("4")
    expect(screen.getByTestId("bkg-tile-completed-value")).toHaveTextContent("1")
    expect(screen.getByTestId("bkg-tile-revenue-value")).toHaveTextContent("₾970.00")
    expect(screen.getByTestId("bkg-tile-services-value")).toHaveTextContent("4")
    expect(screen.getByTestId("bkg-tile-staff-value")).toHaveTextContent("3")
    expect(screen.getByTestId("bkg-tile-clients-value")).toHaveTextContent("11")
    // honest labels: the API has today's and this week's figures, not the month's
    const stats = screen.getByTestId("bkg-dashboard-stats")
    expect(stats).toHaveTextContent("Today's Bookings")
    expect(stats).toHaveTextContent("Completed today")
    expect(stats).toHaveTextContent("Revenue this week")
    expect(await screen.findByTestId("bkg-header-crumb")).toHaveTextContent("Booking Management")

    const quick = screen.getByTestId("bkg-quick-actions")
    const hrefs = within(quick)
      .getAllByRole("link")
      .map((a) => a.getAttribute("href"))
    expect(hrefs).toEqual(["/bookings/bookings", "/bookings/services", "/bookings/staff", "/bookings/staff/availability", "/bookings/clients"])
    expect(quick).toHaveTextContent("Clients")
  })

  it("shows an error state with retry instead of zeros when the API fails", async () => {
    api.bookingsAdminDashboardRetrieve.mockRejectedValueOnce(httpError(500))
    renderBookings(<BookingsDashboard />)
    const err = await screen.findByTestId("bkg-error")
    expect(err).toHaveTextContent("Couldn't load the dashboard")
    expect(screen.queryByTestId("bkg-tile-today-value")).toBeNull()
    fireEvent.click(within(err).getByRole("button", { name: "Try again" }))
    await waitFor(() => expect(screen.getByTestId("bkg-tile-today-value")).toHaveTextContent("6"))
  })

  it("shows a no-access state on 403", async () => {
    api.bookingsAdminDashboardRetrieve.mockRejectedValueOnce(httpError(403))
    renderBookings(<BookingsDashboard />)
    const err = await screen.findByTestId("bkg-error")
    expect(err).toHaveAttribute("data-forbidden", "true")
    expect(within(err).queryByRole("button")).toBeNull()
  })

  it("renders in Georgian", async () => {
    renderBookings(<BookingsDashboard />, "ka")
    await waitFor(() => expect(screen.getByTestId("bkg-tile-today-value")).toHaveTextContent("6"))
    expect(api.bookingsAdminDashboardRetrieve).toHaveBeenCalledWith("ka", true)
    expect(screen.getByTestId("bkg-dashboard-stats")).toHaveTextContent("დღეს დასრულებული")
    expect(screen.getByTestId("bkg-quick-actions")).toHaveTextContent("სწრაფი მოქმედებები")
  })
})
