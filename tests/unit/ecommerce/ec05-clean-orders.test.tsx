/**
 * EC-05 "Clean order list": the Orders section of Settings → E-commerce
 * (store admins only; counts, dry-run dialog, clean), the cleaned view of the
 * orders list (toggle, banner, restore row / selected / all) and the cleaned
 * banner + restore on the order detail. The API is mocked; no network.
 */
import React from "react"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { QueryClient } from "@tanstack/react-query"
import { renderEcQuery } from "./ec00-helpers"
import { cleanPayload, CLEAN_STATUSES } from "@/app/(tenant)/settings/ecommerce/_components/orders-section"

const nav = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), search: "" }))
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: nav.push, replace: nav.replace }),
  usePathname: () => "/ecommerce/orders",
  useSearchParams: () => new URLSearchParams(nav.search),
  useParams: () => ({ id: "17" }),
}))

const api = vi.hoisted(() => ({
  ecommerceAdminOrdersList: vi.fn(),
  ecommerceAdminOrdersRetrieve: vi.fn(),
  ecommerceAdminOrdersRefundCreate: vi.fn(),
  ecommerceAdminSettingsList: vi.fn(),
  ecommerceAdminSettingsDeployFrontendCreate: vi.fn(),
  ecommerceAdminSettingsPartialUpdate: vi.fn(),
  ecommerceAdminSettingsCreate: vi.fn(),
  ecommerceAdminSettingsDeleteDeploymentDestroy: vi.fn(),
  ecommerceQuickshipperTestConnection: vi.fn(),
}))
vi.mock("@/api/generated", () => api)
vi.mock("@/api/generated/api", () => api)
const axiosMock = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
vi.mock("@/api/axios", () => ({ default: axiosMock }))
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn() }))
vi.mock("sonner", () => ({ toast }))
const access = vi.hoisted(() => ({ current: { isStoreAdmin: true, isEcommerceManager: true } as Record<string, boolean> }))
vi.mock("@/hooks/useMyAccess", () => ({ useMyAccess: () => access.current }))
vi.mock("@/components/MiniMapPicker", () => ({ MiniMapPicker: () => <div data-testid="map" /> }))
vi.mock("@/lib/downloadBlob", () => ({ downloadBlob: vi.fn() }))

import EcommerceSettingsPage from "@/app/(tenant)/settings/ecommerce/page"
import EcommerceOrdersPage from "@/app/(tenant)/ecommerce/orders/page"
import OrderDetailPage from "@/app/(tenant)/ecommerce/orders/[id]/page"

const ORDERS_URL = "/api/ecommerce/admin/orders/"
const CLEAN_URL = "/api/ecommerce/admin/orders/clean/"
const RESTORE_URL = "/api/ecommerce/admin/orders/restore/"

const SETTINGS = {
  id: 5,
  store_name: "Demo store",
  store_email: "shop@demo.ge",
  store_phone: "+995 555 000 000",
  active_payment_providers: ["bog", "cash"],
  enable_card_payment: true,
  enable_cash_on_delivery: true,
  bog_client_id: "bog-123",
  quickshipper_enabled: false,
  ecommerce_frontend_url: null,
  deployment_status: "pending",
  vercel_project_id: null,
}

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

const CLEANED_ROWS = [
  order(1, { status: "cancelled", is_deleted: true, deleted_at: "2026-11-03T10:15:00Z", deleted_by_name: "Nino Beridze" }),
  order(2, { is_deleted: true, deleted_at: "2026-11-04T08:00:00Z", deleted_by_name: "Nino Beridze" }),
]

function detailOrder(over: Record<string, unknown> = {}) {
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
    discount_amount: "0.00",
    total_amount: "360.00",
    created_at: "2026-10-29T12:00:00Z",
    confirmed_at: "2026-10-29T13:00:00Z",
    notes: "",
    admin_notes: "",
    tracking_number: "",
    courier_provider: "",
    payment_metadata: {},
    client_details: { id: 3, full_name: "Ketevan Gogoladze", email: "k@example.com", phone_number: "+995555100001" },
    delivery_address: { label: "Home", address: "11 Rustaveli Ave", city: "Batumi" },
    shipping_method_details: { name: { en: "Courier", ka: "კურიერი" }, estimated_days: 2 },
    items: [
      {
        id: 1,
        product_name: { en: "Running sneakers", ka: "სარბენი ბოტასები" },
        quantity: 2,
        price: "180.00",
        subtotal: "360.00",
        variant: null,
        variant_details: null,
      },
    ],
    ...over,
  }
}

/** Orders list: visible 40, cleaned 2 (`?cleaned=true`). */
function mockOrderLists() {
  axiosMock.get.mockImplementation(async (url: string, cfg?: { params?: Record<string, unknown> }) => {
    if (url === ORDERS_URL && cfg?.params?.cleaned) return { data: { count: 2, results: CLEANED_ROWS } }
    if (url === ORDERS_URL) return { data: { count: 40, results: [] } }
    return { data: {} }
  })
}

function queryClient() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidate = vi.spyOn(qc, "invalidateQueries")
  return { qc, invalidate }
}

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn()
  Element.prototype.hasPointerCapture = vi.fn(() => false)
  Element.prototype.releasePointerCapture = vi.fn()
})

beforeEach(() => {
  vi.clearAllMocks()
  nav.search = ""
  access.current = { isStoreAdmin: true, isEcommerceManager: true }
  api.ecommerceAdminSettingsList.mockResolvedValue({ results: [SETTINGS] })
  api.ecommerceAdminOrdersList.mockResolvedValue({ count: 40, results: [order(1), order(2)] })
  api.ecommerceAdminOrdersRetrieve.mockResolvedValue(detailOrder())
  mockOrderLists()
  axiosMock.post.mockResolvedValue({ data: {} })
})

describe("EC-05 clean payload", () => {
  it("sends only the chosen filters (no statuses = every status)", () => {
    expect(CLEAN_STATUSES).toEqual(["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"])
    expect(cleanPayload([], "")).toEqual({})
    expect(cleanPayload(["cancelled", "refunded"], "2026-01-01")).toEqual({ status: ["cancelled", "refunded"], created_before: "2026-01-01" })
  })
})

describe("EC-05 settings: Orders section", () => {
  it("is not rendered for a manager who is not the store admin", async () => {
    access.current = { isStoreAdmin: false, isEcommerceManager: true }
    renderEcQuery(<EcommerceSettingsPage />)
    expect(await screen.findByLabelText("Store Name")).toHaveValue("Demo store")
    expect(screen.queryByTestId("ec-settings-orders")).not.toBeInTheDocument()
    expect(axiosMock.get).not.toHaveBeenCalledWith(ORDERS_URL, expect.anything())
  })

  it("shows the visible / cleaned counts from two page_size=1 list calls and links to the cleaned view", async () => {
    renderEcQuery(<EcommerceSettingsPage />)
    const section = await screen.findByTestId("ec-settings-orders")
    expect(section).toHaveTextContent("Orders")
    await waitFor(() => expect(screen.getByTestId("ec-settings-orders-counts")).toHaveTextContent("40 orders · 2 cleaned"))
    expect(axiosMock.get).toHaveBeenCalledWith(ORDERS_URL, { params: { page_size: 1 } })
    expect(axiosMock.get).toHaveBeenCalledWith(ORDERS_URL, { params: { page_size: 1, cleaned: true } })
    expect(screen.getByTestId("ec-settings-orders-view-cleaned")).toHaveAttribute("href", "/ecommerce/orders?cleaned=1")
    expect(within(section).getByTestId("ec-settings-orders-clean")).toHaveTextContent("Clean order list")
  })

  it("dialog: live dry-run count, posts the chosen filters, toasts, refetches the counts and invalidates the analytics", async () => {
    axiosMock.post.mockImplementation(async (url: string, body: Record<string, unknown>) => {
      if (url !== CLEAN_URL) return { data: {} }
      if (body.dry_run) return { data: { count: body.status ? 3 : 7 } }
      return { data: { cleaned: 3 } }
    })
    const { qc, invalidate } = queryClient()
    renderEcQuery(<EcommerceSettingsPage />, "en", qc)
    await screen.findByTestId("ec-settings-orders")
    await waitFor(() => expect(axiosMock.get).toHaveBeenCalledTimes(2))

    fireEvent.click(screen.getByRole("button", { name: "Clean…" }))
    const dialog = await screen.findByTestId("ec-clean-dialog")
    expect(dialog).toHaveTextContent("Clean order list")
    // dry run with no filters (debounced)
    await waitFor(() => expect(screen.getByTestId("ec-clean-count")).toHaveTextContent("7 orders will be hidden"))
    expect(axiosMock.post).toHaveBeenCalledWith(CLEAN_URL, { dry_run: true })

    // status chip + date narrow the dry run
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancelled", pressed: false }))
    expect(within(dialog).getByRole("button", { name: "Cancelled" })).toHaveAttribute("aria-pressed", "true")
    fireEvent.change(screen.getByLabelText("Created before"), { target: { value: "2026-01-01" } })
    await waitFor(() => expect(screen.getByTestId("ec-clean-count")).toHaveTextContent("3 orders will be hidden"))
    expect(axiosMock.post).toHaveBeenLastCalledWith(CLEAN_URL, { status: ["cancelled"], created_before: "2026-01-01", dry_run: true })

    const confirm = screen.getByTestId("ec-clean-confirm")
    expect(confirm).toBeEnabled()
    fireEvent.click(confirm)
    await waitFor(() => expect(axiosMock.post).toHaveBeenLastCalledWith(CLEAN_URL, { status: ["cancelled"], created_before: "2026-01-01" }))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("3 orders hidden"))
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["ecommerce-analytics"] })
    // counts refetched: 2 initial + 2 after the clean
    await waitFor(() => expect(axiosMock.get).toHaveBeenCalledTimes(4))
    await waitFor(() => expect(screen.queryByTestId("ec-clean-dialog")).not.toBeInTheDocument())
  })

  it("dialog: the confirm button stays disabled while nothing matches", async () => {
    axiosMock.post.mockResolvedValue({ data: { count: 0 } })
    renderEcQuery(<EcommerceSettingsPage />)
    await screen.findByTestId("ec-settings-orders")
    fireEvent.click(screen.getByRole("button", { name: "Clean…" }))
    await screen.findByTestId("ec-clean-dialog")
    await waitFor(() => expect(screen.getByTestId("ec-clean-count")).toHaveTextContent("No orders match these filters"))
    expect(screen.getByTestId("ec-clean-confirm")).toBeDisabled()
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
    await waitFor(() => expect(screen.queryByTestId("ec-clean-dialog")).not.toBeInTheDocument())
    expect(axiosMock.post).toHaveBeenCalledTimes(1)
  })

  it("reads in Georgian", async () => {
    renderEcQuery(<EcommerceSettingsPage />, "ka")
    const section = await screen.findByTestId("ec-settings-orders")
    expect(section).toHaveTextContent("შეკვეთები")
    await waitFor(() => expect(screen.getByTestId("ec-settings-orders-counts")).toHaveTextContent("40 შეკვეთა · 2 გასუფთავებული"))
    expect(screen.getByRole("button", { name: "გასუფთავება…" })).toBeInTheDocument()
  })
})

describe("EC-05 orders list: cleaned view", () => {
  it("store admins get the Active | Cleaned switch, which writes ?cleaned=1 to the URL", async () => {
    renderEcQuery(<EcommerceOrdersPage />)
    await screen.findAllByTestId("ec-table-row")
    expect(api.ecommerceAdminOrdersList).toHaveBeenCalledTimes(1)
    expect(axiosMock.get).not.toHaveBeenCalledWith(ORDERS_URL, expect.anything())
    const toggle = screen.getByTestId("ec-orders-cleaned")
    expect(within(toggle).getByRole("radio", { name: "Active" })).toHaveAttribute("aria-checked", "true")
    fireEvent.click(within(toggle).getByRole("radio", { name: "Cleaned" }))
    expect(nav.replace).toHaveBeenCalledWith("/ecommerce/orders?cleaned=1")
    expect(screen.getByTestId("ec-orders-export")).toBeInTheDocument()
  })

  it("managers see no switch", async () => {
    access.current = { isStoreAdmin: false, isEcommerceManager: true }
    renderEcQuery(<EcommerceOrdersPage />)
    await screen.findAllByTestId("ec-table-row")
    expect(screen.queryByTestId("ec-orders-cleaned")).not.toBeInTheDocument()
  })

  it("?cleaned=1 lists with cleaned=true, shows the banner, the Cleaned pill with the date, and no export / status actions", async () => {
    nav.search = "cleaned=1"
    renderEcQuery(<EcommerceOrdersPage />)
    const rows = await screen.findAllByTestId("ec-table-row")
    expect(api.ecommerceAdminOrdersList).not.toHaveBeenCalled()
    expect(axiosMock.get).toHaveBeenCalledWith(ORDERS_URL, {
      params: { cleaned: true, page: 1, page_size: 20, search: undefined, status: undefined },
    })
    expect(rows).toHaveLength(2)
    expect(screen.getByRole("status")).toHaveTextContent("These orders are hidden from staff, statistics and customers.")
    expect(within(rows[0]).getByTestId("ec-order-cleaned")).toHaveTextContent("Cleaned")
    expect(rows[0]).toHaveTextContent("Nov 3")
    expect(within(rows[0]).queryByTestId("ec-order-status")).not.toBeInTheDocument()
    expect(screen.queryByTestId("ec-orders-export")).not.toBeInTheDocument()
    expect(screen.getByTestId("ec-header-sub")).toHaveTextContent("2 orders found")
    expect(within(screen.getByTestId("ec-orders-cleaned")).getByRole("radio", { name: "Cleaned" })).toHaveAttribute("aria-checked", "true")

    // selecting rows: only "Restore selected", no status / export actions
    fireEvent.click(within(rows[0]).getByRole("checkbox"))
    expect(screen.getByTestId("ec-orders-restore-selected")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Mark as Shipped" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Export Selected" })).not.toBeInTheDocument()
  })

  it("restore row / selected / all post the right bodies, toast, reload and invalidate the analytics", async () => {
    nav.search = "cleaned=1"
    axiosMock.post.mockImplementation(async (url: string, body: Record<string, unknown>) =>
      url === RESTORE_URL ? { data: { restored: body.all ? 2 : (body.ids as number[]).length } } : { data: {} }
    )
    const { qc, invalidate } = queryClient()
    renderEcQuery(<EcommerceOrdersPage />, "en", qc)
    let rows = await screen.findAllByTestId("ec-table-row")

    // row action
    fireEvent.click(within(rows[1]).getByTestId("ec-order-restore"))
    await waitFor(() => expect(axiosMock.post).toHaveBeenCalledWith(RESTORE_URL, { ids: [2] }))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("1 order restored"))
    expect(nav.push).not.toHaveBeenCalled() // the button click does not open the row
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["ecommerce-analytics"] })
    await waitFor(() => expect(axiosMock.get).toHaveBeenCalledTimes(2))

    // bulk action
    rows = await screen.findAllByTestId("ec-table-row")
    fireEvent.click(within(rows[0]).getByRole("checkbox"))
    fireEvent.click(within(rows[1]).getByRole("checkbox"))
    fireEvent.click(screen.getByTestId("ec-orders-restore-selected"))
    await waitFor(() => expect(axiosMock.post).toHaveBeenCalledWith(RESTORE_URL, { ids: [1, 2] }))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("2 orders restored"))
    await waitFor(() => expect(screen.queryByTestId("ec-orders-restore-selected")).not.toBeInTheDocument())

    // restore all (confirmed)
    fireEvent.click(screen.getByTestId("ec-orders-restore-all"))
    expect(await screen.findByText("Restore all cleaned orders?")).toBeInTheDocument()
    fireEvent.click(screen.getByTestId("ec-orders-restore-all-confirm"))
    await waitFor(() => expect(axiosMock.post).toHaveBeenCalledWith(RESTORE_URL, { all: true }))
    expect(invalidate).toHaveBeenCalledTimes(3)
  })

  it("non-admins in the cleaned view get no restore controls", async () => {
    nav.search = "cleaned=1"
    access.current = { isStoreAdmin: false, isEcommerceManager: true }
    renderEcQuery(<EcommerceOrdersPage />)
    const rows = await screen.findAllByTestId("ec-table-row")
    expect(within(rows[0]).queryByTestId("ec-order-restore")).not.toBeInTheDocument()
    expect(screen.queryByTestId("ec-orders-restore-all")).not.toBeInTheDocument()
    fireEvent.click(within(rows[0]).getByRole("checkbox"))
    expect(screen.queryByTestId("ec-orders-restore-selected")).not.toBeInTheDocument()
  })

  it("restore failure shows the backend message", async () => {
    nav.search = "cleaned=1"
    axiosMock.post.mockRejectedValue({ response: { status: 403, data: { detail: "Store admin only" } } })
    renderEcQuery(<EcommerceOrdersPage />)
    const rows = await screen.findAllByTestId("ec-table-row")
    fireEvent.click(within(rows[0]).getByTestId("ec-order-restore"))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Store admin only"))
    expect(toast.success).not.toHaveBeenCalled()
  })

  it("reads in Georgian", async () => {
    nav.search = "cleaned=1"
    renderEcQuery(<EcommerceOrdersPage />, "ka")
    const rows = await screen.findAllByTestId("ec-table-row")
    expect(screen.getByRole("status")).toHaveTextContent("ეს შეკვეთები დამალულია")
    expect(within(rows[0]).getByTestId("ec-order-cleaned")).toHaveTextContent("გასუფთავებული")
    expect(rows[0]).toHaveTextContent("3 ნოე")
    expect(screen.getByTestId("ec-orders-restore-all")).toHaveTextContent("ყველას აღდგენა")
  })
})

describe("EC-05 order detail: cleaned order", () => {
  const cleaned = () => detailOrder({ is_deleted: true, deleted_at: "2026-11-03T10:15:00Z", deleted_by_name: "Nino Beridze" })

  it("shows the banner with who / when, locks the status, mark-paid and refund, and restores", async () => {
    api.ecommerceAdminOrdersRetrieve.mockResolvedValueOnce(cleaned()).mockResolvedValueOnce(detailOrder())
    axiosMock.post.mockResolvedValue({ data: detailOrder() })
    const { qc, invalidate } = queryClient()
    renderEcQuery(<OrderDetailPage />, "en", qc)
    const banner = await screen.findByTestId("ec-order-cleaned-banner")
    expect(banner).toHaveTextContent("This order is cleaned (hidden from staff, statistics and customers) by Nino Beridze on Nov 3, 10:15.")
    expect(screen.getByTestId("ec-order-status-select")).toBeDisabled()
    expect(screen.queryByTestId("ec-order-mark-paid")).not.toBeInTheDocument()
    expect(screen.queryByTestId("ec-order-refund")).not.toBeInTheDocument()

    fireEvent.click(screen.getByTestId("ec-order-restore"))
    await waitFor(() => expect(axiosMock.post).toHaveBeenCalledWith("/api/ecommerce/admin/orders/17/restore/"))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Order restored"))
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["ecommerce-analytics"] })
    await waitFor(() => expect(api.ecommerceAdminOrdersRetrieve).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(screen.queryByTestId("ec-order-cleaned-banner")).not.toBeInTheDocument())
    expect(screen.getByTestId("ec-order-status-select")).toBeEnabled()
    expect(screen.getByTestId("ec-order-mark-paid")).toBeInTheDocument()
  })

  it("managers see the banner without a Restore button", async () => {
    access.current = { isStoreAdmin: false, isEcommerceManager: true }
    api.ecommerceAdminOrdersRetrieve.mockResolvedValue(cleaned())
    renderEcQuery(<OrderDetailPage />)
    await screen.findByTestId("ec-order-cleaned-banner")
    expect(screen.queryByTestId("ec-order-restore")).not.toBeInTheDocument()
    expect(screen.getByTestId("ec-order-status-select")).toBeDisabled()
  })

  it("reads in Georgian", async () => {
    api.ecommerceAdminOrdersRetrieve.mockResolvedValue(cleaned())
    renderEcQuery(<OrderDetailPage />, "ka")
    const banner = await screen.findByTestId("ec-order-cleaned-banner")
    expect(banner).toHaveTextContent("ეს შეკვეთა გასუფთავებულია")
    expect(banner).toHaveTextContent("Nino Beridze, 3 ნოე, 10:15")
    expect(screen.getByTestId("ec-order-restore")).toHaveTextContent("აღდგენა")
  })
})
