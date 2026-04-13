"use client"

import { useTranslations } from "next-intl"
import { useQuery } from "@tanstack/react-query"
import axiosInstance from "@/api/axios"
import { Loader2, ShoppingCart } from "lucide-react"
import { OverviewCards } from "./_components/overview-cards"
import { RevenuePeriodCard } from "./_components/revenue-period-card"
import { OrderStatusChart } from "./_components/order-status-chart"
import { TopProductsCard } from "./_components/top-products-card"

interface AnalyticsData {
  revenue: {
    today: number
    week: number
    month: number
    total: number
  }
  orders: {
    today: number
    week: number
    month: number
    total: number
  }
  top_products: Array<{
    product__name: Record<string, string> | string
    sold: number
    revenue: number
  }>
  order_status_breakdown: Record<string, number>
}

export default function EcommerceDashboardPage() {
  const t = useTranslations("ecommerceAnalytics")

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
      {/* Overview KPI Cards — spans full width */}
      <div className="col-span-full">
        <OverviewCards
          revenue={analytics.revenue}
          orders={analytics.orders}
          t={t}
        />
      </div>

      {/* Order Status Chart */}
      <OrderStatusChart
        statusBreakdown={analytics.order_status_breakdown}
        t={t}
      />

      {/* Revenue by Period */}
      <RevenuePeriodCard
        revenue={analytics.revenue}
        orders={analytics.orders}
        t={t}
      />

      {/* Top Products — spans full width */}
      <div className="col-span-full">
        <TopProductsCard products={analytics.top_products} t={t} />
      </div>
    </section>
  )
}
