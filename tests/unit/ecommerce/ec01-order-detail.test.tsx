import React from "react"
import { describe, expect, it, vi, beforeAll, beforeEach } from "vitest"
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react"
import { renderEc } from "./ec00-helpers"
import { isFinalStatus, selectableStatuses } from "@/app/(tenant)/ecommerce/orders/[id]/_components/order-header-card"
import { paymentActions } from "@/app/(tenant)/ecommerce/orders/[id]/_components/order-payment-card"
import { timelineEntries } from "@/app/(tenant)/ecommerce/orders/[id]/_components/order-timeline-card"
import { variantSummary } from "@/app/(tenant)/ecommerce/orders/[id]/_components/order-items-card"

vi.mock("next/navigation", () => ({ useParams: () => ({ id: "17" }), useRouter: () => ({ push: vi.fn() }), usePathname: () => "/ecommerce/orders/17" }))

const retrieve = vi.fn()
const refund = vi.fn()
vi.mock("@/api/generated", () => ({
  ecommerceAdminOrdersRetrieve: (...a: unknown[]) => retrieve(...a),
  ecommerceAdminOrdersRefundCreate: (...a: unknown[]) => refund(...a),
}))
const post = vi.fn()
vi.mock("@/api/axios", () => ({ default: { post: (...a: unknown[]) => post(...a) } }))
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn() }))
vi.mock("sonner", () => ({ toast }))
const access = vi.hoisted(() => ({ current: { isEcommerceManager: true } }))
vi.mock("@/hooks/useMyAccess", () => ({ useMyAccess: () => access.current }))

import OrderDetailPage from "@/app/(tenant)/ecommerce/orders/[id]/page"

function makeOrder(over: Record<string, unknown> = {}) {
  return {
    id: 17,
    order_number: "ORD-DEMO-1017",
    status: "confirmed",
    payment_status: "pending",
    payment_method: "cash_on_delivery",
    payment_provider: "",
    subtotal: "360.00",
    shipping_cost: "0.00",
    tax_amount: "0.00",
    discount_amount: "15.00",
    total_amount: "345.00",
    created_at: "2026-10-29T12:00:00Z",
    confirmed_at: "2026-10-29T13:00:00Z",
    notes: "Ring twice",
    admin_notes: "",
    tracking_number: "GE900016",
    courier_provider: "",
    payment_metadata: {
      quickshipper_quote: { provider_name: "Deliverers" },
      quickshipper: { provider_name: "Wolt", tracking_url: "https://track.example/1" },
    },
    client_details: { id: 3, full_name: "Ketevan Gogoladze", email: "k@example.com", phone_number: "+995555100001" },
    delivery_address: { label: "Home", address: "11 Rustaveli Ave", city: "Batumi", extra_instructions: "Gate 2" },
    shipping_method_details: { name: { en: "Courier", ka: "კურიერი" }, estimated_days: 2 },
    items: [
      {
        id: 1,
        product_name: { en: "Running sneakers", ka: "სარბენი ბოტასები" },
        quantity: 2,
        price: "180.00",
        subtotal: "360.00",
        variant: 9,
        variant_details: {
          id: 9,
          sku: "SNK-BL-41",
          name: { en: "Black / 41" },
          image: null,
          attributes: [{ key: "size", name: { en: "Size" }, value: "41" }],
        },
      },
    ],
    ...over,
  }
}

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn()
  Element.prototype.hasPointerCapture = vi.fn(() => false)
  Element.prototype.releasePointerCapture = vi.fn()
})

beforeEach(() => {
  retrieve.mockReset().mockResolvedValue(makeOrder())
  refund.mockReset()
  post.mockReset()
  Object.values(toast).forEach((f) => f.mockReset())
  access.current = { isEcommerceManager: true }
})

describe("EC-01 order detail: rules (unchanged)", () => {
  it("status menu: cancel only for managers once paid; final statuses", () => {
    expect(selectableStatuses("confirmed", "paid", false)).not.toContain("cancelled")
    expect(selectableStatuses("confirmed", "paid", true)).toContain("cancelled")
    expect(selectableStatuses("confirmed", "pending", false)).toContain("cancelled")
    expect(selectableStatuses("cancelled", "paid", false)).toContain("cancelled")
    expect(isFinalStatus("refunded")).toBe(true)
    expect(isFinalStatus("delivered")).toBe(false)
  })

  it("payment actions are manager-only and closed orders have none", () => {
    expect(paymentActions({ status: "confirmed", payment_status: "pending" } as never, true)).toEqual({ canMarkPaid: true, canRefund: true })
    expect(paymentActions({ status: "confirmed", payment_status: "paid" } as never, true)).toEqual({ canMarkPaid: false, canRefund: true })
    expect(paymentActions({ status: "cancelled", payment_status: "pending" } as never, true)).toEqual({ canMarkPaid: false, canRefund: false })
    expect(paymentActions({ status: "confirmed", payment_status: "pending" } as never, false)).toEqual({ canMarkPaid: false, canRefund: false })
  })

  it("timeline keeps the milestone order and skips missing dates", () => {
    const t = (k: string) => k
    const entries = timelineEntries(makeOrder({ shipped_at: "2026-10-30T10:00:00Z", paid_at: null }) as never, t)
    expect(entries.map((e) => e.key)).toEqual(["created", "confirmed", "shipped"])
    expect(variantSummary(makeOrder().items[0].variant_details as never, "en")).toBe("Black / 41 · Size: 41")
  })
})

describe("EC-01 order detail page", () => {
  it("renders header, items, summary, customer, delivery, payment and timeline", async () => {
    renderEc(<OrderDetailPage />)
    expect(screen.getByTestId("ec-order-loading")).toBeInTheDocument()
    await screen.findByTestId("ec-order-header")
    expect(retrieve).toHaveBeenCalledWith(17)
    expect(screen.getByTestId("ec-header-crumb")).toHaveTextContent("#ORD-DEMO-1017")
    const header = screen.getByTestId("ec-order-header")
    expect(header).toHaveTextContent("Placed on Oct 29")
    expect(within(header).getByTestId("ec-order-status")).toHaveTextContent("Confirmed")
    expect(within(header).getByTestId("ec-payment-status")).toHaveTextContent("Pending")
    expect(within(header).getByRole("link", { name: "Back" })).toHaveAttribute("href", "/ecommerce/orders")

    const items = screen.getByTestId("ec-order-items")
    expect(items).toHaveTextContent("Running sneakers")
    expect(items).toHaveTextContent("Black / 41 · Size: 41")
    expect(items).toHaveTextContent("SNK-BL-41")
    expect(items).toHaveTextContent("₾180.00")
    expect(items).toHaveTextContent("Shipping · Deliverers")
    expect(items).toHaveTextContent("Free")
    expect(items).toHaveTextContent("-₾15.00")
    expect(items).toHaveTextContent("Total₾345.00")

    expect(screen.getByTestId("ec-order-notes")).toHaveTextContent("Ring twice")
    expect(screen.getByTestId("ec-order-customer")).toHaveTextContent("Ketevan Gogoladze")
    const shipping = screen.getByTestId("ec-order-shipping")
    expect(shipping).toHaveTextContent("11 Rustaveli Ave")
    expect(shipping).toHaveTextContent("Courier")
    expect(shipping).toHaveTextContent("2 days")
    expect(shipping).toHaveTextContent("GE900016")
    expect(shipping).toHaveTextContent("Wolt")
    expect(shipping).toHaveTextContent("Customer chose Deliverers")
    expect(within(shipping).getByRole("link", { name: /Track shipment/ })).toHaveAttribute("href", "https://track.example/1")
    expect(screen.getByTestId("ec-order-payment")).toHaveTextContent("Cash on Delivery")
    expect(screen.getAllByTestId("ec-order-timeline-entry")).toHaveLength(2)
  })

  it("status change asks first (translated status) and posts update_status", async () => {
    post.mockResolvedValue({ data: makeOrder({ status: "shipped" }) })
    renderEc(<OrderDetailPage />, "ka")
    await screen.findByTestId("ec-order-header")
    const trigger = screen.getByTestId("ec-order-status-select")
    trigger.focus()
    fireEvent.keyDown(trigger, { key: "Enter" })
    const option = await screen.findByRole("option", { name: "გაგზავნილი" })
    fireEvent.keyDown(option, { key: "Enter" })
    const dialog = await screen.findByRole("alertdialog")
    expect(dialog).toHaveTextContent("გაგზავნილი")
    expect(dialog).not.toHaveTextContent("shipped")
    await act(async () => {
      fireEvent.click(within(dialog).getByRole("button", { name: "დადასტურება" }))
    })
    expect(post).toHaveBeenCalledWith("/api/ecommerce/admin/orders/17/update_status/", { status: "shipped" })
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("შეკვეთის სტატუსი შეიცვალა: „გაგზავნილი“"))
  })

  it("mark as paid and refund (with its confirm dialog) for managers", async () => {
    post.mockResolvedValue({ data: {} })
    refund.mockResolvedValue({ status: "refunded" })
    renderEc(<OrderDetailPage />)
    await screen.findByTestId("ec-order-header")
    await act(async () => {
      fireEvent.click(screen.getByTestId("ec-order-mark-paid"))
    })
    expect(post).toHaveBeenCalledWith("/api/ecommerce/admin/orders/17/mark-paid/")
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Order marked as paid"))
    // the page stays on screen while it reloads
    expect(screen.getByTestId("ec-order-header")).toBeInTheDocument()

    fireEvent.click(screen.getByTestId("ec-order-refund"))
    const dialog = await screen.findByRole("alertdialog")
    await act(async () => {
      fireEvent.click(within(dialog).getByRole("button", { name: "Refund Order" }))
    })
    expect(refund).toHaveBeenCalledWith(17)
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Order has been refunded successfully"))
  })

  it("no payment buttons for non-managers", async () => {
    access.current = { isEcommerceManager: false }
    renderEc(<OrderDetailPage />)
    await screen.findByTestId("ec-order-header")
    expect(screen.queryByTestId("ec-order-mark-paid")).toBeNull()
    expect(screen.queryByTestId("ec-order-refund")).toBeNull()
  })

  it("404 shows not found with a back link", async () => {
    retrieve.mockRejectedValue({ response: { status: 404 } })
    renderEc(<OrderDetailPage />)
    const empty = await screen.findByTestId("ec-empty")
    expect(empty).toHaveTextContent("Order Not Found")
    expect(within(empty).getByRole("link", { name: /Back/ })).toHaveAttribute("href", "/ecommerce/orders")
    expect(toast.error).toHaveBeenCalledWith("Failed to load order details")
  })

  it("other load errors show the error state with retry; 403 shows no access", async () => {
    retrieve.mockRejectedValueOnce(new Error("network"))
    renderEc(<OrderDetailPage />)
    await screen.findByTestId("ec-error")
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    await screen.findByTestId("ec-order-header")
    expect(retrieve).toHaveBeenCalledTimes(2)
  })

  it("403 shows no access", async () => {
    retrieve.mockRejectedValue({ response: { status: 403 } })
    renderEc(<OrderDetailPage />, "ka")
    const err = await screen.findByTestId("ec-error")
    expect(err).toHaveTextContent("წვდომა არ გაქვთ")
    expect(screen.queryByRole("button", { name: "ხელახლა ცდა" })).toBeNull()
  })
})
