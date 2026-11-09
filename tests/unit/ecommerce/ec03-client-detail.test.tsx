import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import type { EcommerceClient, OrderList } from "@/api/generated/interfaces"
import { renderEc } from "./ec00-helpers"

const api = { retrieve: vi.fn(), orders: vi.fn() }
vi.mock("@/api/generated", () => ({
  ecommerceAdminClientsRetrieve: (...a: unknown[]) => api.retrieve(...a),
  ecommerceAdminOrdersList: (...a: unknown[]) => api.orders(...a),
}))
const toast = { success: vi.fn(), error: vi.fn() }
vi.mock("sonner", () => ({ toast: { success: (...a: unknown[]) => toast.success(...a), error: (...a: unknown[]) => toast.error(...a) } }))
const push = vi.fn()
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }), useParams: () => ({ id: "15" }), usePathname: () => "/ecommerce/clients/15" }))

import ClientDetailPage from "@/app/(tenant)/ecommerce/clients/[id]/page"
import { formatEcDate } from "@/app/(tenant)/ecommerce/_components/ui"

const CLIENT: EcommerceClient = {
  id: 15,
  first_name: "Gela",
  last_name: "Sharashidze",
  full_name: "Gela Sharashidze",
  email: "gela.sharashidze@example.com",
  phone_number: "+995555100014",
  date_of_birth: "1994-03-10",
  is_active: true,
  is_verified: true,
  last_login: "",
  created_at: "2024-10-19T12:00:00Z",
  updated_at: "2024-10-19T12:00:00Z",
  addresses: [
    { id: 2, client: 15, label: "Office", address: "3 Chavchavadze Ave", city: "Tbilisi", is_default: false, created_at: "", updated_at: "" },
    { id: 1, client: 15, label: "Home", address: "24 Rustaveli Ave", city: "Zugdidi", is_default: true, created_at: "", updated_at: "" },
  ],
  favorites: [],
}
const order = (id: number, total: string, status: string, payment: string): OrderList => ({
  id,
  order_number: `ORD-${id}`,
  client: 15,
  client_name: "Gela Sharashidze",
  client_email: CLIENT.email,
  total_items: 1,
  status: status as OrderList["status"],
  payment_status: payment as OrderList["payment_status"],
  total_amount: total,
  created_at: "2024-10-26T12:00:00Z",
})

describe("ClientDetailPage", () => {
  beforeEach(() => {
    api.retrieve.mockReset().mockResolvedValue(CLIENT)
    api.orders.mockReset().mockResolvedValue({ count: 2, results: [order(1015, "311", "shipped", "paid"), order(1016, "1200.5", "pending", "pending")] })
    push.mockReset()
    toast.error.mockReset()
  })

  it("shows the client with breadcrumb, stats, orders and addresses (same two requests)", async () => {
    renderEc(<ClientDetailPage />)
    expect(await screen.findByTestId("ec-header-crumb")).toHaveTextContent("Gela Sharashidze")
    expect(api.retrieve).toHaveBeenCalledWith(15)
    expect(api.orders).toHaveBeenCalledWith(15, undefined, undefined, undefined, undefined, 1, 100)
    const header = screen.getByTestId("client-header-card")
    expect(header).toHaveTextContent("gela.sharashidze@example.com")
    expect(header).toHaveTextContent("Active")
    expect(header).toHaveTextContent("Verified")
    expect(header).toHaveTextContent(`Joined ${formatEcDate(CLIENT.created_at, "en")}`)
    await waitFor(() => expect(screen.getByTestId("client-stats")).toHaveTextContent("₾1,511.50"))
    expect(screen.getByTestId("client-stats")).toHaveTextContent("₾755.75")
    const rows = within(screen.getByTestId("client-orders-card")).getAllByTestId("ec-table-row")
    expect(rows[0]).toHaveTextContent("#ORD-1015")
    expect(rows[0]).toHaveTextContent("₾311.00")
    expect(rows[0]).toHaveTextContent("Shipped")
    expect(rows[0]).toHaveTextContent("Paid")
    fireEvent.click(rows[1])
    expect(push).toHaveBeenCalledWith("/ecommerce/orders/1016")
    const info = screen.getByTestId("client-info-card")
    expect(info).toHaveTextContent("Mar 10, 1994")
    const addresses = screen.getByTestId("client-addresses-card")
    expect(addresses.textContent!.indexOf("Home")).toBeLessThan(addresses.textContent!.indexOf("Office"))
    expect(addresses).toHaveTextContent("Default")
    expect(screen.getByRole("link", { name: "Back to Clients" })).toHaveAttribute("href", "/ecommerce/clients")
  })

  it("shows not found for a 404 and the error state with retry otherwise", async () => {
    api.retrieve.mockRejectedValueOnce({ response: { status: 404 } })
    const { unmount } = renderEc(<ClientDetailPage />)
    expect(await screen.findByTestId("client-not-found")).toHaveTextContent("Client not found")
    expect(toast.error).toHaveBeenCalledWith("Failed to load client details")
    unmount()

    api.retrieve.mockRejectedValueOnce({ response: { status: 500 } })
    renderEc(<ClientDetailPage />)
    expect(await screen.findByTestId("ec-error")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(await screen.findByTestId("ec-header-crumb")).toHaveTextContent("Gela Sharashidze")
  })

  it("shows the orders error inside the card (no empty table) and retries", async () => {
    api.orders.mockRejectedValueOnce({ response: { status: 500 } })
    renderEc(<ClientDetailPage />)
    const card = await screen.findByTestId("client-orders-card")
    await waitFor(() => expect(within(card).getByTestId("ec-error")).toBeInTheDocument())
    fireEvent.click(within(card).getByRole("button", { name: "Try again" }))
    await waitFor(() => expect(within(card).getAllByTestId("ec-table-row")).toHaveLength(2))
  })

  it("renders Georgian dates and labels", async () => {
    api.orders.mockResolvedValue({ count: 0, results: [] })
    renderEc(<ClientDetailPage />, "ka")
    await screen.findByTestId("client-header-card")
    expect(screen.getByTestId("client-info-card")).toHaveTextContent("10 მარ 1994")
    expect(screen.getByTestId("client-info-card")).toHaveTextContent("რეგისტრაცია")
    await waitFor(() => expect(screen.getByTestId("client-orders-card")).toHaveTextContent("ბოლო შეკვეთები არ არის."))
  })
})
