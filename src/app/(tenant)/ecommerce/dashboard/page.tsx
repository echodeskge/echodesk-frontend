"use client"

import { useTranslations } from "next-intl"
import { useQuery } from "@tanstack/react-query"
import axiosInstance from "@/api/axios"
import { Loader2, ShoppingCart } from "lucide-react"
import { OverviewCards } from "./_components/overview-cards"
import { SalesTrendChart } from "./_components/sales-trend-chart"
import { CustomerInsightsCard } from "./_components/customer-insights-card"
import { RevenueByMethodCard } from "./_components/revenue-by-method-card"
import { OrderStatusChart } from "./_components/order-status-chart"
import { TopProductsCard } from "./_components/top-products-card"
import { RecentOrdersCard } from "./_components/recent-orders-card"

interface AnalyticsData {
  revenue: {
    today: number
    week: number
    month: number
    total: number
    change: number
  }
  orders: {
    today: number
    week: number
    month: number
    total: number
    change: number
  }
  avg_order_value: number
  top_products: Array<{
    product__name: Record<string, string> | string
    sold: number
    revenue: number
  }>
  order_status_breakdown: Record<string, number>
  sales_trend: Array<{ date: string; revenue: number; orders: number }>
  customer_insights: { total: number; new: number; returning: number }
  revenue_by_method: Array<{
    payment_method: string
    revenue: number
    count: number
    percentage: number
  }>
  recent_orders: Array<{
    id: number
    order_number: string
    status: string
    payment_status: string
    total_amount: number
    created_at: string
    client_name: string
  }>
}

export default function EcommerceDashboardPage() {
  const t = useTranslations("ecommerceAnalytics")
  const tOrders = useTranslations("ecommerceOrders")

  const {
    data: analytics,
    isLoading,
    isError,
  } = useQuery<AnalyticsData>({
    queryKey: ["ecommerce-analytics"],
    queryFn: () =>
      axiosInstance
        .get("/api/ecommerce/admin/orders/analytics/")
        .then((r) => r.data),
    staleTime: 60 * 1000,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (isError || !analytics) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <ShoppingCart className="h-12 w-12 text-muted-foreground opacity-50" />
        <p className="mt-4 text-muted-foreground">{t("errorLoading")}</p>
      </div>
    )
  }

  return (
    <section className="container grid gap-4 p-4 md:grid-cols-2">
      {/* Overview KPI Cards */}
      <div className="col-span-full">
        <OverviewCards
          revenue={analytics.revenue}
          orders={analytics.orders}
          avgOrderValue={analytics.avg_order_value}
          t={t}
        />
      </div>

      {/* Customer Insights + Revenue by Method */}
      <CustomerInsightsCard
        insights={analytics.customer_insights}
        t={t}
      />
      <RevenueByMethodCard
        data={analytics.revenue_by_method}
        t={t}
      />

      {/* Sales Trend — full width */}
      <div className="col-span-full">
        <SalesTrendChart data={analytics.sales_trend} t={t} />
      </div>

      {/* Order Status + Top Products */}
      <OrderStatusChart
        statusBreakdown={analytics.order_status_breakdown}
        t={t}
      />
      <TopProductsCard products={analytics.top_products} t={t} />

      {/* Recent Orders — full width */}
      <div className="col-span-full">
        <RecentOrdersCard
          orders={analytics.recent_orders}
          t={t}
          tOrders={tOrders}
        />
      </div>
    </section>
  )
}
