import React from "react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react"
import { renderEcQuery } from "./ec00-helpers"
import { nextSort, sortRows } from "@/app/(tenant)/ecommerce/orders/_components/sort-header"
import { orderSortValue } from "@/app/(tenant)/ecommerce/orders/_components/orders-table-columns"

const push = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
  usePathname: () => "/ecommerce/orders",
  useSearchParams: () => new URLSearchParams(),
}))
// Not a store admin: no "Active | Cleaned" switch (EC-05 covers it).
vi.mock("@/hooks/useMyAccess", () => ({ useMyAccess: () => ({ isStoreAdmin: false }) }))

const list = vi.fn()
vi.mock("@/api/generated", () => ({ ecommerceAdminOrdersList: (...args: unknown[]) => list(...args) }))

const post = vi.fn()
const get = vi.fn()
vi.mock("@/api/axios", () => ({ default: { post: (...a: unknown[]) => post(...a), get: (...a: unknown[]) => get(...a) } }))

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn() }))
vi.mock("sonner", () => ({ toast }))

const download = vi.fn()
vi.mock("@/lib/downloadBlob", () => ({ downloadBlob: (...a: unknown[]) => download(...a) }))

import EcommerceOrdersPage from "@/app/(tenant)/ecommerce/orders/page"

function order(id: number, over: Record<string, unknown> = {}) {
  return {
    id,
    order_number: `ORD-${1000 + id}`,
    client: id,
    client_name: `Client ${id}`,
    client_email: `c${id}@example.com`,
    total_items: id,
    status: "pending",
    payment_status: "pending",
    payment_provider: "",
    total_amount: `${id * 10}.50`,
    created_at: "2026-10-29T12:00:00Z",
    ...over,
  }
}

const ROWS = [order(1, { status: "shipped", payment_status: "paid", payment_provider: "bog" }), order(2), order(3, { client_name: "" })]

beforeEach(() => {
  push.mockReset()
  list.mockReset().mockResolvedValue({ count: 45, results: ROWS })
  post.mockReset()
  get.mockReset()
  download.mockReset()
  Object.values(toast).forEach((f) => f.mockReset())
})

const lastListArgs = () => list.mock.calls[list.mock.calls.length - 1]

describe("EC-01 orders: sorting helpers", () => {
  it("cycles ascending → descending → off like the old headers", () => {
    expect(nextSort(null, "total")).toEqual({ id: "total", desc: false })
    expect(nextSort({ id: "total", desc: false }, "total")).toEqual({ id: "total", desc: true })
    expect(nextSort({ id: "total", desc: true }, "total")).toBeNull()
    expect(nextSort({ id: "total", desc: true }, "date")).toEqual({ id: "date", desc: false })
  })

  it("sorts numbers numerically, names locale-aware, empty values last", () => {
    const rows = [order(1, { total_amount: "9.00" }), order(2, { total_amount: "100.00" }), order(3, { total_amount: "" })]
    const asc = sortRows(rows as never[], { id: "total", desc: false }, orderSortValue as never)
    expect(asc.map((r: { id: number }) => r.id)).toEqual([1, 2, 3])
    const desc = sortRows(rows as never[], { id: "total", desc: true }, orderSortValue as never)
    expect(desc.map((r: { id: number }) => r.id)).toEqual([2, 1, 3])
    expect(sortRows(rows, null, () => 0)).toBe(rows)
  })
})

describe("EC-01 orders page", () => {
  it("loads page 1 / 20 per page without filters (same API call as before) and renders the rows", async () => {
    renderEcQuery(<EcommerceOrdersPage />)
    expect(screen.getByTestId("ec-table-skeleton")).toBeInTheDocument()
    await screen.findAllByTestId("ec-table-row")
    expect(lastListArgs()).toEqual([
      undefined, undefined, undefined, undefined, undefined, 1, 20, undefined, undefined, undefined, undefined, undefined, undefined,
    ])
    const rows = screen.getAllByTestId("ec-table-row")
    expect(rows).toHaveLength(3)
    expect(rows[0]).toHaveTextContent("#ORD-1001")
    expect(rows[0]).toHaveTextContent("Client 1")
    expect(rows[0]).toHaveTextContent("c1@example.com")
    expect(within(rows[0]).getByTestId("ec-order-status")).toHaveTextContent("Shipped")
    expect(within(rows[0]).getByTestId("ec-payment-status")).toHaveTextContent("Paid")
    expect(rows[0]).toHaveTextContent("BOG")
    expect(rows[0]).toHaveTextContent("₾10.50")
    expect(rows[0]).toHaveTextContent("Oct 29")
    expect(rows[2]).toHaveTextContent("Unknown")
    // header: count + export
    expect(screen.getByTestId("ec-header-sub")).toHaveTextContent("45 orders found")
    expect(screen.getByTestId("ec-pagination")).toHaveTextContent("1–20 of 45")
    expect(screen.getByTestId("ec-pagination")).toHaveTextContent("Page 1 of 3")
  })

  it("status filter, debounced search, paging and page size go to the API", async () => {
    renderEcQuery(<EcommerceOrdersPage />)
    await screen.findAllByTestId("ec-table-row")

    fireEvent.click(within(screen.getByTestId("ec-orders-status")).getByRole("radio", { name: "Shipped" }))
    await waitFor(() => expect(lastListArgs()[12]).toBe("shipped"))
    expect(lastListArgs()[5]).toBe(1)

    fireEvent.change(screen.getByTestId("ec-orders-search"), { target: { value: "ORD-1002" } })
    await waitFor(() => expect(lastListArgs()[11]).toBe("ORD-1002"), { timeout: 2000 })

    fireEvent.click(await screen.findByRole("button", { name: "Go to next page" }))
    await waitFor(() => expect(lastListArgs()[5]).toBe(2))

    await screen.findAllByTestId("ec-table-row")
    fireEvent.change(within(screen.getByTestId("ec-pagination")).getByRole("combobox"), { target: { value: "50" } })
    await waitFor(() => expect(lastListArgs().slice(5, 7)).toEqual([1, 50]))
  })

  it("sorts the current page by a column header", async () => {
    renderEcQuery(<EcommerceOrdersPage />)
    await screen.findAllByTestId("ec-table-row")
    fireEvent.click(screen.getByRole("button", { name: "Sort by Total" }))
    let ids = screen.getAllByTestId("ec-table-row").map((r) => r.textContent?.match(/#ORD-(\d{4})/)?.[1])
    expect(ids).toEqual(["1001", "1002", "1003"])
    fireEvent.click(screen.getByRole("button", { name: "Sort by Total" }))
    ids = screen.getAllByTestId("ec-table-row").map((r) => r.textContent?.match(/#ORD-(\d{4})/)?.[1])
    expect(ids).toEqual(["1003", "1002", "1001"])
  })

  it("a row click opens the order; the checkbox does not", async () => {
    renderEcQuery(<EcommerceOrdersPage />)
    const rows = await screen.findAllByTestId("ec-table-row")
    fireEvent.click(within(rows[1]).getByRole("checkbox"))
    expect(push).not.toHaveBeenCalled()
    fireEvent.click(rows[1])
    expect(push).toHaveBeenCalledWith("/ecommerce/orders/2")
  })

  it("bulk bar replaces the toolbar and posts the same bulk update", async () => {
    post.mockResolvedValue({ data: { updated: 1, skipped: [{ id: 2, error: "final" }] } })
    renderEcQuery(<EcommerceOrdersPage />)
    const rows = await screen.findAllByTestId("ec-table-row")
    fireEvent.click(within(rows[0]).getByRole("checkbox"))
    fireEvent.click(within(rows[1]).getByRole("checkbox"))
    const bar = screen.getByTestId("ec-bulk-bar")
    expect(bar).toHaveTextContent("2 orders selected")
    expect(screen.queryByTestId("ec-orders-toolbar")).toBeNull()
    expect(screen.getByTestId("ec-pagination")).toHaveTextContent("2 selected")

    await act(async () => {
      fireEvent.click(within(bar).getByRole("button", { name: /Mark as Shipped/ }))
    })
    expect(post).toHaveBeenCalledWith("/api/ecommerce/admin/orders/bulk-update/", { order_ids: [1, 2], status: "shipped" })
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("1 order updated to “Shipped”"))
    expect(toast.warning).toHaveBeenCalledWith("1 order was skipped: #2 (final)")
    await waitFor(() => expect(screen.queryByTestId("ec-bulk-bar")).toBeNull())
  })

  it("select-all, export selected and clear selection", async () => {
    renderEcQuery(<EcommerceOrdersPage />)
    await screen.findAllByTestId("ec-table-row")
    fireEvent.click(screen.getByRole("checkbox", { name: "Select all on this page" }))
    const bar = screen.getByTestId("ec-bulk-bar")
    expect(bar).toHaveTextContent("3 orders selected")
    fireEvent.click(within(bar).getByRole("button", { name: /Export Selected/ }))
    expect(download).toHaveBeenCalledTimes(1)
    expect(toast.success).toHaveBeenCalledWith("Exported 3 orders")
    fireEvent.click(within(bar).getByRole("button", { name: "Clear selection" }))
    expect(screen.queryByTestId("ec-bulk-bar")).toBeNull()
  })

  it("Export CSV in the header downloads the full export", async () => {
    get.mockResolvedValue({ data: "a,b" })
    renderEcQuery(<EcommerceOrdersPage />)
    await screen.findAllByTestId("ec-table-row")
    await act(async () => {
      fireEvent.click(screen.getByTestId("ec-orders-export"))
    })
    expect(get).toHaveBeenCalledWith("/api/ecommerce/admin/orders/export/", { responseType: "blob" })
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Orders exported successfully"))
  })

  it("load error shows the error state with retry (and the toast)", async () => {
    list.mockRejectedValueOnce(new Error("boom"))
    renderEcQuery(<EcommerceOrdersPage />, "ka")
    expect(await screen.findByTestId("ec-error")).toBeInTheDocument()
    expect(toast.error).toHaveBeenCalledWith("შეკვეთების ჩატვირთვა ვერ მოხერხდა")
    fireEvent.click(screen.getByRole("button", { name: "ხელახლა ცდა" }))
    expect(await screen.findAllByTestId("ec-table-row")).toHaveLength(3)
  })

  it("empty and filtered-empty states", async () => {
    list.mockResolvedValue({ count: 0, results: [] })
    renderEcQuery(<EcommerceOrdersPage />)
    expect(await screen.findByTestId("ec-empty")).toHaveTextContent("No orders found")
    fireEvent.click(within(screen.getByTestId("ec-orders-status")).getByRole("radio", { name: "Refunded" }))
    await waitFor(() => expect(screen.getByTestId("ec-empty")).toHaveTextContent("Nothing matches these filters"))
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }))
    await waitFor(() => expect(lastListArgs()[12]).toBeUndefined())
  })
})
