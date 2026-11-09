import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import type { EcommerceClientList } from "@/api/generated/interfaces"
import { renderEc } from "./ec00-helpers"

const fetchClients = vi.fn()
vi.mock("@/app/(tenant)/ecommerce/clients/_lib/fetch-clients", () => ({
  fetchEcommerceClients: (...a: unknown[]) => fetchClients(...a),
}))
const toast = { success: vi.fn(), error: vi.fn() }
vi.mock("sonner", () => ({ toast: { success: (...a: unknown[]) => toast.success(...a), error: (...a: unknown[]) => toast.error(...a) } }))
const push = vi.fn()
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }), usePathname: () => "/ecommerce/clients" }))

import ClientsPage from "@/app/(tenant)/ecommerce/clients/page"
import { nextSort, sortClients } from "@/app/(tenant)/ecommerce/clients/_lib/sort"
import { formatEcDate } from "@/app/(tenant)/ecommerce/_components/ui"

// Expected dates come from the same formatter, so the tests pass in any time zone.
const JAN5 = "2024-01-05T12:00:00Z"

const client = (id: number, name: string, extra: Partial<EcommerceClientList> = {}): EcommerceClientList => ({
  id,
  email: `${name.toLowerCase().replace(/\s/g, ".")}@example.com`,
  first_name: name.split(" ")[0],
  last_name: name.split(" ")[1] ?? "",
  full_name: name,
  phone_number: `+99555510${String(id).padStart(4, "0")}`,
  is_active: true,
  is_verified: true,
  created_at: "2024-10-20T12:00:00Z",
  ...extra,
})
const CLIENTS = [
  client(1, "Zurab Japaridze", { created_at: JAN5 }),
  client(2, "Anano Nadiradze", { is_verified: false }),
  client(3, "Dachi Papava", { is_active: false, phone_number: "" }),
]

describe("sortClients / nextSort", () => {
  it("cycles ascending -> descending -> API order and sorts on the loaded page", () => {
    let s = nextSort(null, "full_name")
    expect(s).toEqual({ key: "full_name", desc: false })
    expect(sortClients(CLIENTS, s).map((c) => c.id)).toEqual([2, 3, 1])
    s = nextSort(s, "full_name")
    expect(sortClients(CLIENTS, s).map((c) => c.id)).toEqual([1, 3, 2])
    s = nextSort(s, "full_name")
    expect(s).toBeNull()
    expect(sortClients(CLIENTS, s)).toBe(CLIENTS)
    expect(sortClients(CLIENTS, { key: "created_at", desc: false })[0].id).toBe(1)
    expect(sortClients(CLIENTS, { key: "is_active", desc: false })[0].id).toBe(3)
    expect(nextSort({ key: "full_name", desc: true }, "phone_number")).toEqual({ key: "phone_number", desc: false })
  })
})

describe("ClientsPage", () => {
  beforeEach(() => {
    fetchClients.mockReset().mockResolvedValue({ count: 23, results: CLIENTS })
    push.mockReset()
    toast.error.mockReset()
  })

  it("lists clients with the count in the header, pills, dates and paging", async () => {
    renderEc(<ClientsPage />)
    await waitFor(() => expect(screen.getAllByTestId("ec-table-row")).toHaveLength(3))
    expect(fetchClients).toHaveBeenCalledWith({ isActive: undefined, page: 1, pageSize: 20, search: undefined })
    expect(await screen.findByTestId("ec-header-sub")).toHaveTextContent("23 clients")
    const [zurab, anano, dachi] = screen.getAllByTestId("ec-table-row")
    expect(zurab).toHaveTextContent("Zurab Japaridze")
    expect(zurab).toHaveTextContent("zurab.japaridze@example.com")
    expect(zurab).toHaveTextContent(formatEcDate(JAN5, "en"))
    expect(anano).toHaveTextContent("Unverified")
    expect(within(dachi).getByTestId("ec-active")).toHaveTextContent("Inactive")
    expect(dachi).toHaveTextContent("—")
    expect(screen.getByTestId("ec-pagination")).toHaveTextContent("1–20 of 23")
  })

  it("filters by status (inactive sends isActive=false), pages and opens a client", async () => {
    renderEc(<ClientsPage />)
    await waitFor(() => expect(screen.getAllByTestId("ec-table-row")).toHaveLength(3))
    fireEvent.click(screen.getByRole("radio", { name: "Inactive" }))
    await waitFor(() => expect(fetchClients).toHaveBeenLastCalledWith({ isActive: false, page: 1, pageSize: 20, search: undefined }))
    fireEvent.click(screen.getByRole("radio", { name: "Active" }))
    await waitFor(() => expect(fetchClients).toHaveBeenLastCalledWith({ isActive: true, page: 1, pageSize: 20, search: undefined }))
    await waitFor(() => expect(screen.getAllByTestId("ec-table-row")).toHaveLength(3))
    fireEvent.click(screen.getByRole("button", { name: "Go to next page" }))
    await waitFor(() => expect(fetchClients).toHaveBeenLastCalledWith({ isActive: true, page: 2, pageSize: 20, search: undefined }))
    await waitFor(() => expect(screen.getAllByTestId("ec-table-row")).toHaveLength(3))
    fireEvent.click(screen.getAllByTestId("ec-table-row")[0])
    expect(push).toHaveBeenCalledWith("/ecommerce/clients/1")
  })

  it("debounces the search and resets to page 1", async () => {
    renderEc(<ClientsPage />)
    await waitFor(() => expect(screen.getAllByTestId("ec-table-row")).toHaveLength(3))
    fireEvent.change(screen.getByTestId("clients-search"), { target: { value: "Gela" } })
    await waitFor(() => expect(fetchClients).toHaveBeenLastCalledWith({ isActive: undefined, page: 1, pageSize: 20, search: "Gela" }), { timeout: 2000 })
  })

  it("sorts by a column header on the loaded page", async () => {
    renderEc(<ClientsPage />)
    await waitFor(() => expect(screen.getAllByTestId("ec-table-row")).toHaveLength(3))
    fireEvent.click(screen.getByRole("button", { name: "Sort by Client" }))
    expect(screen.getAllByTestId("ec-table-row")[0]).toHaveTextContent("Anano")
    fireEvent.click(screen.getByRole("button", { name: "Sort by Client" }))
    expect(screen.getAllByTestId("ec-table-row")[0]).toHaveTextContent("Zurab")
  })

  it("shows the filtered empty state with a clear button, and the error state with retry", async () => {
    fetchClients.mockResolvedValue({ count: 0, results: [] })
    renderEc(<ClientsPage />)
    await waitFor(() => expect(screen.getByTestId("ec-empty")).toHaveTextContent("No clients found"))
    fireEvent.click(screen.getByRole("radio", { name: "Inactive" }))
    await waitFor(() => expect(screen.getByTestId("ec-empty")).toHaveTextContent("Nothing matches these filters"))
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }))
    await waitFor(() => expect(fetchClients).toHaveBeenLastCalledWith({ isActive: undefined, page: 1, pageSize: 20, search: undefined }))

    fetchClients.mockRejectedValue({ response: { status: 500 } })
    fireEvent.click(screen.getByRole("radio", { name: "Active" }))
    await waitFor(() => expect(screen.getByTestId("ec-error")).toBeInTheDocument())
    expect(toast.error).toHaveBeenCalledWith("Couldn't load clients")
    expect(screen.queryByTestId("ec-header-sub")).toBeNull()
    fetchClients.mockResolvedValue({ count: 3, results: CLIENTS })
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    await waitFor(() => expect(screen.getAllByTestId("ec-table-row")).toHaveLength(3))
  })

  it("renders in Georgian without Latin interface text in the new keys", async () => {
    renderEc(<ClientsPage />, "ka")
    await waitFor(() => expect(screen.getAllByTestId("ec-table-row")).toHaveLength(3))
    expect(await screen.findByTestId("ec-header-sub")).toHaveTextContent("23 კლიენტი")
    expect(screen.getByRole("radio", { name: "არააქტიური" })).toBeInTheDocument()
    expect(screen.getAllByTestId("ec-table-row")[0]).toHaveTextContent(formatEcDate(JAN5, "ka"))
  })
})
