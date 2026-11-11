import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { makeRow, renderBookings } from "./bkg00-helpers"
import { api, httpError, resetApi } from "./bkg00-api-mock"

vi.mock("@/api/generated", async () => (await import("./bkg00-api-mock")).api)
const nav = vi.hoisted(() => ({ replace: vi.fn(), search: "" }))
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: nav.replace }),
  usePathname: () => "/bookings/clients",
  useSearchParams: () => new URLSearchParams(nav.search),
}))

import BookingClientsPage, { parseClientParam } from "@/app/(tenant)/bookings/clients/page"

const client = (id: number, over: Record<string, unknown> = {}) => ({
  id,
  email: `c${id}@example.com`,
  phone_number: `+99559300000${id}`,
  first_name: `First${id}`,
  last_name: `Last${id}`,
  full_name: `Client ${id}`,
  is_verified: id % 2 === 1,
  is_booking_enabled: true,
  created_at: "2026-10-01T00:00:00Z",
  ...over,
})
const CLIENTS = [client(1), client(2), client(3)]
const stats = (total: number) => ({ total_bookings: total, completed_bookings: total - 1, cancelled_bookings: 0, total_spent: total * 100, last_booking: null })

beforeEach(() => {
  resetApi()
  nav.replace.mockReset()
  nav.search = ""
  api.bookingsAdminClientsList.mockResolvedValue({ count: 3, results: CLIENTS })
  api.bookingsAdminClientsStatsRetrieve.mockImplementation(async (id: number) => stats(id * 2))
  api.bookingsAdminClientsBookingsRetrieve.mockResolvedValue([makeRow(1, { client: { id: 1, full_name: "Client 1" }, status: "completed" }), makeRow(2, { client: { id: 1, full_name: "Client 1" } })])
  api.bookingsAdminClientsRetrieve.mockImplementation(async (id: number) => client(id))
})

describe("BKG-01 clients directory", () => {
  it("parses the ?client= deep link", () => {
    expect(parseClientParam("12")).toBe(12)
    expect(parseClientParam("0")).toBeNull()
    expect(parseClientParam("abc")).toBeNull()
    expect(parseClientParam(null)).toBeNull()
  })

  it("lists clients with the lazily loaded bookings count, searches on the server and pages", async () => {
    renderBookings(<BookingClientsPage />)
    const rows = await screen.findAllByTestId("bkg-table-row")
    expect(api.bookingsAdminClientsList).toHaveBeenCalledWith(undefined, undefined, 1, 20, undefined)
    expect(rows).toHaveLength(3)
    expect(rows[0]).toHaveTextContent("Client 1")
    expect(rows[0]).toHaveTextContent("+995593000001")
    expect(rows[0]).toHaveTextContent("c1@example.com")
    expect(within(rows[0]).getByTestId("bkg-client-verified")).toHaveTextContent("Verified")
    expect(within(rows[1]).getByTestId("bkg-client-verified")).toHaveTextContent("Unverified")
    await waitFor(() => expect(within(rows[0]).getByTestId("bkg-client-count")).toHaveTextContent("2"))
    expect(within(rows[2]).getByTestId("bkg-client-count")).toHaveTextContent("6")
    expect(api.bookingsAdminClientsStatsRetrieve).toHaveBeenCalledTimes(3)
    expect(await screen.findByTestId("bkg-header-sub")).toHaveTextContent("3 clients")

    fireEvent.change(screen.getByTestId("bkg-clients-search"), { target: { value: "salome" } })
    await waitFor(() => expect(api.bookingsAdminClientsList).toHaveBeenLastCalledWith(undefined, undefined, 1, 20, "salome"))
  })

  it("row click opens the rail with stats and the client's bookings; close drops it", async () => {
    renderBookings(<BookingClientsPage />)
    const rows = await screen.findAllByTestId("bkg-table-row")
    fireEvent.click(rows[0])
    const rail = await screen.findByTestId("bkg-client-rail")
    expect(rail).toHaveTextContent("Client 1")
    expect(rail).toHaveTextContent("c1@example.com")
    await waitFor(() => expect(within(rail).getByTestId("bkg-client-stats")).toHaveTextContent("₾200.00"))
    expect(api.bookingsAdminClientsBookingsRetrieve).toHaveBeenCalledWith(1, "en", true)
    const list = await within(rail).findByTestId("bkg-client-bookings")
    const links = within(list).getAllByTestId("bkg-client-booking")
    expect(links).toHaveLength(2)
    expect(links[0]).toHaveAttribute("href", "/bookings/bookings/1")
    expect(links[0]).toHaveTextContent("Whitening")
    expect(links[0]).toHaveTextContent("Nov 10, 2026 · 09:00 – 10:00 · ₾350.00")
    expect(within(links[0]).getByTestId("bkg-status-pill")).toHaveTextContent("Completed")
    expect(rows[0]).toHaveAttribute("aria-selected", "true")
    fireEvent.click(within(rail).getByTestId("bkg-client-rail-close"))
    await waitFor(() => expect(screen.queryByTestId("bkg-client-rail")).toBeNull())
  })

  it("?client=<id> opens the rail, loading the client by id when it is not on the page", async () => {
    nav.search = "client=9"
    renderBookings(<BookingClientsPage />)
    await screen.findAllByTestId("bkg-table-row")
    const rail = await screen.findByTestId("bkg-client-rail")
    expect(api.bookingsAdminClientsRetrieve).toHaveBeenCalledWith(9)
    expect(rail).toHaveTextContent("Client 9")
    fireEvent.click(within(rail).getByTestId("bkg-client-rail-close"))
    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith("/bookings/clients", { scroll: false }))
  })

  it("an unknown ?client= id closes the rail and drops the param", async () => {
    nav.search = "client=404"
    api.bookingsAdminClientsRetrieve.mockRejectedValue(httpError(404))
    renderBookings(<BookingClientsPage />)
    await screen.findAllByTestId("bkg-table-row")
    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith("/bookings/clients", { scroll: false }))
    expect(screen.queryByTestId("bkg-client-rail")).toBeNull()
  })

  it("empty, filtered-empty and error states", async () => {
    api.bookingsAdminClientsList.mockResolvedValue({ count: 0, results: [] })
    renderBookings(<BookingClientsPage />)
    expect(await screen.findByTestId("bkg-table-empty")).toHaveTextContent("No clients yet")
    fireEvent.change(screen.getByTestId("bkg-clients-search"), { target: { value: "zzz" } })
    await waitFor(() => expect(screen.getByTestId("bkg-table-empty")).toHaveTextContent("Nothing matches these filters"))
    api.bookingsAdminClientsList.mockRejectedValue(httpError(500))
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }))
    await screen.findByTestId("bkg-error")
  })

  it("renders in Georgian", async () => {
    renderBookings(<BookingClientsPage />, "ka")
    const rows = await screen.findAllByTestId("bkg-table-row")
    expect(within(rows[0]).getByTestId("bkg-client-verified")).toHaveTextContent("დადასტურებული")
    expect(await screen.findByTestId("bkg-header-sub")).toHaveTextContent("3 კლიენტი")
  })
})
