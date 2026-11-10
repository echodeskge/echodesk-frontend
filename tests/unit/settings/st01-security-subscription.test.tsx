/**
 * ST-01: Security (segmented tabs, logs table, IP allow list) and
 * Subscription (segmented tabs, sections) — same hooks, handlers and gates.
 */
import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen, fireEvent, act, within } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderSt } from "./st-helpers"

const h = vi.hoisted(() => ({
  logs: {
    count: 1,
    next: null,
    previous: null,
    results: [
      {
        id: 1,
        event_type: "login_failed",
        event_type_display: "Failed Login",
        failure_reason: "Wrong password",
        user_email: "",
        attempted_email: "x@demo.ge",
        ip_address: "10.0.0.1",
        city: "Tbilisi",
        country: "Georgia",
        device_type: "desktop",
        device_type_display: "Desktop",
        browser: "Chrome",
        operating_system: "macOS",
        created_at: "2026-11-05T09:30:00",
      },
    ],
  },
  filters: [] as unknown[],
  whitelist: { ip_whitelist_enabled: true, superadmin_bypass_whitelist: false, entries: [] as unknown[] },
  toggle: vi.fn(async (_d: unknown) => ({})),
  superuser: false,
  billingAdmin: true,
  get: vi.fn(),
  post: vi.fn(),
}))

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))
vi.mock("@/hooks/useMyAccess", () => ({ useMyAccess: () => ({ isSuperuser: h.superuser, isBillingAdmin: h.billingAdmin }) }))
vi.mock("@/hooks/api/useSecurity", () => ({
  useSecurityLogs: (f: unknown) => {
    h.filters.push(f)
    return { data: h.logs, isLoading: false, refetch: vi.fn() }
  },
  useSecurityLogsStats: () => ({ data: { total_logins: 5, failed_logins: 1, unique_ips: 2, unique_users: 3 } }),
  useIPWhitelist: () => ({ data: h.whitelist, isLoading: false }),
  useCurrentIP: () => ({ data: { ip_address: "1.2.3.4", city: "Tbilisi", country: "Georgia" } }),
  useCreateIPWhitelist: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateIPWhitelist: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteIPWhitelist: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useToggleIPWhitelist: () => ({ mutateAsync: h.toggle, isPending: false }),
}))
vi.mock("@/hooks/api/useTenant", () => ({
  useTenantSubscription: () => ({
    data: {
      has_subscription: true,
      limits: { max_users: 10, max_whatsapp_messages: -1, max_storage_gb: 5 },
      usage: { current_users: 4, whatsapp_messages_used: 1200, storage_used_gb: 0.5 },
      usage_limits: {},
    },
    isLoading: false,
  }),
}))
vi.mock("@/contexts/TenantContext", () => ({ useTenant: () => ({ tenant: { payment_provider: "bog" } }) }))
vi.mock("@/hooks/api/usePayments", () => ({
  useInvoices: () => ({ data: { invoices: [] }, isLoading: false }),
  useSavedCard: () => ({ data: [{ id: 7, card_type: "visa", masked_card_number: "4111********1111", is_default: true, card_expiry: "12/28" }], isLoading: false }),
  useAddNewCard: () => ({ mutateAsync: vi.fn() }),
  useRemoveSavedCard: () => ({ mutateAsync: vi.fn() }),
  useSetDefaultCard: () => ({ mutateAsync: vi.fn() }),
}))
vi.mock("@/api/axios", () => ({ default: { get: h.get, post: h.post } }))

import SecuritySettingsPage from "@/app/(tenant)/settings/security/page"
import SubscriptionPage from "@/app/(tenant)/settings/subscription/page"

function withQuery(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{ui}</QueryClientProvider>
}

beforeEach(() => {
  vi.clearAllMocks()
  h.filters = []
  h.superuser = false
  h.billingAdmin = true
  h.whitelist = { ip_whitelist_enabled: true, superadmin_bypass_whitelist: false, entries: [] }
  h.get.mockResolvedValue({
    data: {
      agent_count: 3,
      features_by_category: {
        Core: [{ id: 1, key: "tickets", name: "Tickets", description: "Boards", price_per_user_gel: 5, monthly_cost_for_current_agents: 15, is_selected: true }],
      },
    },
  })
})

describe("security", () => {
  it("shows the logs tab with stats and translated event names", () => {
    renderSt(<SecuritySettingsPage />, "ka")
    expect(screen.getByTestId("security-stats")).toHaveTextContent("5")
    const table = screen.getByRole("table", { name: "უსაფრთხოების ჟურნალი" })
    expect(within(table).getByText("წარუმატებელი შესვლა")).toBeInTheDocument()
    expect(within(table).queryByText("Failed Login")).not.toBeInTheDocument()
    // Georgian month (5 Nov 2026), clock-independent: the year is always shown.
    expect(within(table).getByText("5 ნოე 2026")).toBeInTheDocument()
    expect(within(table).getByText("Wrong password")).toBeInTheDocument()
  })

  it("search and type filter feed the same filters (page reset to 1)", () => {
    renderSt(<SecuritySettingsPage />)
    fireEvent.change(screen.getByTestId("security-logs-search"), { target: { value: "x@demo" } })
    expect(h.filters.at(-1)).toEqual({ page: 1, page_size: 20, search: "x@demo" })
  })

  it("switches to the allow list; toggles save instantly; bypass stays superuser-only", async () => {
    renderSt(<SecuritySettingsPage />)
    fireEvent.click(within(screen.getByTestId("security-tabs")).getByRole("radio", { name: "IP Whitelist" }))
    expect(screen.queryByTestId("security-stats")).not.toBeInTheDocument()
    expect(screen.getByTestId("whitelist-no-entries")).toBeInTheDocument()
    expect(screen.getByRole("switch", { name: /Superadmin Bypass/ })).toBeDisabled()
    await act(async () => {
      fireEvent.click(screen.getByRole("switch", { name: "Enable IP Whitelist" }))
    })
    expect(h.toggle).toHaveBeenCalledWith({ enabled: false })
    expect(screen.getByTestId("whitelist-current-ip")).toHaveTextContent("1.2.3.4")
    expect(screen.getByText("No IP addresses whitelisted")).toBeInTheDocument()
  })
})

describe("subscription", () => {
  it("opens on features (translated card), then usage and billing tabs", async () => {
    await act(async () => {
      renderSt(withQuery(<SubscriptionPage />), "ka")
    })
    expect(await screen.findByText("ფუნქციების მართვა")).toBeInTheDocument()
    expect(screen.getByText("3 ოპერატორი")).toBeInTheDocument()
    expect(h.get).toHaveBeenCalledWith("/api/subscription/features/available/")

    fireEvent.click(within(screen.getByTestId("subscription-tabs")).getByRole("radio", { name: "გამოყენება" }))
    expect(screen.getByTestId("usage-stats")).toBeInTheDocument()
    expect(screen.getByTestId("usage-details")).toHaveTextContent("1,200")

    fireEvent.click(within(screen.getByTestId("subscription-tabs")).getByRole("radio", { name: "გადახდა" }))
    expect(screen.getByTestId("payment-methods")).toBeInTheDocument()
    expect(screen.getByTestId("payment-add-card")).toBeInTheDocument()
    expect(screen.getByTestId("invoice-history")).toBeInTheDocument()
  })

  it("asks for confirmation before removing a feature (no request until confirmed)", async () => {
    await act(async () => {
      renderSt(withQuery(<SubscriptionPage />))
    })
    fireEvent.click(await screen.findByTestId("feature-toggle-tickets"))
    expect(screen.getByRole("alertdialog")).toHaveTextContent("You are about to remove Tickets from your subscription.")
    expect(h.post).not.toHaveBeenCalled()
  })

  it("hides card actions from non-billing admins", async () => {
    h.billingAdmin = false
    await act(async () => {
      renderSt(withQuery(<SubscriptionPage />))
    })
    fireEvent.click(within(screen.getByTestId("subscription-tabs")).getByRole("radio", { name: "Billing" }))
    expect(screen.queryByTestId("payment-add-card")).not.toBeInTheDocument()
  })
})
