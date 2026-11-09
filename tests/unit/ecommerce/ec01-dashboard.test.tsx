import React from "react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { fireEvent, screen, within } from "@testing-library/react"
import { useTranslations } from "next-intl"
import { renderEc, messages, flatten } from "./ec00-helpers"
import { OverviewCards, formatChange } from "@/app/(tenant)/ecommerce/dashboard/_components/overview-cards"
import { RevenueByMethodCard, methodTone } from "@/app/(tenant)/ecommerce/dashboard/_components/revenue-by-method-card"
import { OrderStatusChart, statusRows } from "@/app/(tenant)/ecommerce/dashboard/_components/order-status-chart"
import { SalesTrendChart, summarizeTrend } from "@/app/(tenant)/ecommerce/dashboard/_components/sales-trend-chart"
import { TopProductsCard } from "@/app/(tenant)/ecommerce/dashboard/_components/top-products-card"
import { RecentOrdersCard } from "@/app/(tenant)/ecommerce/dashboard/_components/recent-orders-card"
import { CustomerInsightsCard } from "@/app/(tenant)/ecommerce/dashboard/_components/customer-insights-card"

const push = vi.fn()
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }), usePathname: () => "/ecommerce/dashboard" }))

beforeEach(() => push.mockReset())

type Comp = (props: { t: ReturnType<typeof useTranslations> }) => React.ReactElement
/** Renders a card with the real `ecommerceAnalytics` translator. */
function WithT({ render }: { render: Comp }) {
  const t = useTranslations("ecommerceAnalytics")
  return render({ t })
}
const show = (render: Comp, locale: "en" | "ka" = "en") => renderEc(<WithT render={render} />, locale)

const revenue = { today: 0, week: 356.4, month: 4038, total: 4038, change: 2100 }
const orders = { today: 0, week: 2, month: 23, total: 1204, change: -12.5 }

describe("EC-01 dashboard: overview tiles", () => {
  it("shows compact money with the exact amount as tooltip, counts and change hints", () => {
    show(({ t }) => <OverviewCards revenue={revenue} orders={orders} avgOrderValue={175.566} t={t} />)
    const total = screen.getByTestId("ec-dash-total-revenue")
    expect(total).toHaveTextContent("₾4.0K")
    expect(within(total).getByTitle("₾4,038.00")).toBeInTheDocument()
    expect(screen.getByTestId("ec-dash-month-revenue")).toHaveTextContent("+2100% vs the previous 30 days")
    expect(screen.getByTestId("ec-dash-total-orders")).toHaveTextContent("1,204")
    expect(screen.getByTestId("ec-dash-total-orders")).toHaveTextContent("-12.5% vs the previous 30 days")
    expect(screen.getByTestId("ec-dash-avg-order")).toHaveTextContent("₾175.57")
  })

  it("has no change hint when the change is 0 (and formats the change)", () => {
    show(({ t }) => <OverviewCards revenue={{ ...revenue, change: 0 }} orders={{ ...orders, change: 0 }} avgOrderValue={0} t={t} />)
    expect(screen.queryByText(/previous 30 days/)).toBeNull()
    expect(formatChange(3)).toBe("+3%")
    expect(formatChange(-12.5)).toBe("-12.5%")
  })

  it("translates the change hint in Georgian", () => {
    show(({ t }) => <OverviewCards revenue={revenue} orders={orders} avgOrderValue={1} t={t} />, "ka")
    expect(screen.getByTestId("ec-dash-month-revenue")).toHaveTextContent("+2100% წინა 30 დღესთან შედარებით")
  })
})

describe("EC-01 dashboard: cards", () => {
  it("customer insights show three counts", () => {
    show(({ t }) => <CustomerInsightsCard insights={{ total: 1500, new: 2, returning: 3 }} t={t} />)
    const card = screen.getByTestId("ec-dash-customers")
    expect(card).toHaveTextContent("1,500")
    expect(card).toHaveTextContent("New This Month")
  })

  it("revenue by method: total, one row per method with amount and share", () => {
    show(({ t }) => (
      <RevenueByMethodCard
        data={[
          { payment_method: "card", revenue: 3023.6, count: 10, percentage: 74.9 },
          { payment_method: "cash_on_delivery", revenue: 1014.4, count: 5, percentage: 25.1 },
          { payment_method: "", revenue: 0, count: 0, percentage: 0 },
        ]}
        t={t}
      />
    ))
    const card = screen.getByTestId("ec-dash-methods")
    expect(card).toHaveTextContent("₾4,038.00")
    const rows = screen.getAllByTestId("ec-dash-method-row")
    expect(rows).toHaveLength(3)
    expect(rows[0]).toHaveTextContent("Card₾3,023.6074.9%")
    expect(rows[1]).toHaveTextContent("Cash on Delivery")
    expect(rows[2]).toHaveTextContent("Other")
    expect(methodTone("card")).toBe("info")
    expect(methodTone("whatever")).toBe("neutral")
  })

  it("revenue by method: empty text", () => {
    show(({ t }) => <RevenueByMethodCard data={[]} t={t} />, "ka")
    expect(screen.getByTestId("ec-dash-methods")).toHaveTextContent(messages.ka.ecommerceAnalytics.revenueByMethod.noData)
  })

  it("status breakdown: flow order, translated labels, unknown humanised last", () => {
    expect(statusRows({ delivered: 5, on_hold: 1, pending: 4, refunded: 2 }).map((r) => r.status)).toEqual([
      "pending",
      "delivered",
      "refunded",
      "on_hold",
    ])
    show(({ t }) => <OrderStatusChart statusBreakdown={{ delivered: 5, pending: 4, on_hold: 1 }} t={t} />, "ka")
    const rows = screen.getAllByTestId("ec-dash-status-row")
    expect(rows[0]).toHaveTextContent("მოლოდინში4")
    expect(rows[1]).toHaveTextContent("მიტანილი5")
    expect(rows[2]).toHaveTextContent("On hold1")
  })

  it("status breakdown: empty text", () => {
    show(({ t }) => <OrderStatusChart statusBreakdown={{}} t={t} />)
    expect(screen.getByText("No order status data yet")).toBeInTheDocument()
  })

  it("sales trend: summary figures and the empty text", () => {
    const data = [
      { date: "2026-11-01", revenue: 100, orders: 1 },
      { date: "2026-11-02", revenue: 356.4, orders: 2 },
      { date: "2026-11-03", revenue: 50, orders: 1 },
    ]
    expect(summarizeTrend(data)).toMatchObject({ total: 506.4, highest: data[1], lowest: data[2] })
    expect(summarizeTrend([])).toEqual({ total: 0, average: 0, highest: null, lowest: null })
    show(({ t }) => <SalesTrendChart data={[]} t={t} />)
    const card = screen.getByTestId("ec-dash-trend")
    expect(card).toHaveTextContent("No sales data for this period")
    expect(card).toHaveTextContent("Last 7 days")
    expect(screen.queryByTestId("ec-dash-trend-chart")).toBeNull()
  })

  it("top products: rank, localized name, sold and revenue", () => {
    show(
      ({ t }) => (
        <TopProductsCard
          products={[
            { product__name: { en: "Leather wallet", ka: "ტყავის საფულე" }, sold: 10, revenue: 850 },
            { product__name: {}, sold: 1, revenue: 5 },
          ]}
          t={t}
        />
      ),
      "ka"
    )
    const rows = screen.getAllByTestId("ec-dash-top-product")
    expect(rows[0]).toHaveTextContent("1ტყავის საფულე10₾850.00")
    expect(rows[1]).toHaveTextContent(messages.ka.ecommerceAnalytics.topProducts.unknown)
  })

  it("recent orders: id, pill, money; a row opens the order", () => {
    show(({ t }) => (
      <RecentOrdersCard
        orders={[
          {
            id: 17,
            order_number: "ORD-1017",
            status: "shipped",
            payment_status: "paid",
            total_amount: 360,
            created_at: "2026-10-29T12:00:00Z",
            client_name: "Ketevan Gogoladze",
          },
        ]}
        t={t}
      />
    ))
    const row = screen.getByTestId("ec-table-row")
    expect(row).toHaveTextContent("#ORD-1017")
    expect(row).toHaveTextContent("Oct 29")
    expect(within(row).getByTestId("ec-order-status")).toHaveTextContent("Shipped")
    expect(row).toHaveTextContent("₾360.00")
    expect(within(row).getByRole("link")).toHaveAttribute("href", "/ecommerce/orders/17")
    fireEvent.click(row)
    expect(push).toHaveBeenCalledWith("/ecommerce/orders/17")
  })

  it("recent orders: empty state", () => {
    show(({ t }) => <RecentOrdersCard orders={[]} t={t} />)
    expect(screen.getByTestId("ec-empty")).toHaveTextContent("No recent orders")
  })
})

describe("EC-01 i18n", () => {
  it("every ec-01 key exists in both languages with the same ICU arguments and no Latin in Georgian", async () => {
    const pending = (await import("@/i18n/pending/ec-01.json")).default as { en: object; ka: object }
    const en = flatten(pending.en)
    const ka = flatten(pending.ka)
    expect(Object.keys(ka).sort()).toEqual(Object.keys(en).sort())
    const args = (s: string) => [...s.matchAll(/\{(\w+)/g)].map((m) => m[1])
    for (const key of Object.keys(en)) {
      expect(new Set(args(ka[key])), key).toEqual(new Set(args(en[key]).filter((a) => !["plural", "one", "other"].includes(a))))
      // Georgian text: no Latin letters outside ICU placeholders
      expect(ka[key].replace(/\{[^}]*\}/g, ""), key).not.toMatch(/[A-Za-z]/)
    }
  })
})
