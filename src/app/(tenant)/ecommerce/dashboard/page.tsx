"use client"

import { useTranslations } from "next-intl"
import { useQuery } from "@tanstack/react-query"
import axiosInstance from "@/api/axios"
import { Skeleton } from "@/components/ui/skeleton"
import { isForbiddenError } from "@/components/redesign/states"
import { EcErrorState, EcPage } from "../_components/ui"
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

function CardSkeleton({ height }: { height: number }) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="flex h-11 items-center border-b px-4">
        <Skeleton className="h-3 w-32" />
      </div>
      <div className="p-4">
        <Skeleton className="w-full" style={{ height }} />
      </div>
    </div>
  )
}

export default function EcommerceDashboardPage() {
  const t = useTranslations("ecommerceAnalytics")

  const {
    data: analytics,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<AnalyticsData>({
    queryKey: ["ecommerce-analytics"],
    queryFn: () => axiosInstance.get("/api/ecommerce/admin/orders/analytics/").then((r) => r.data),
    staleTime: 60 * 1000,
  })

  return (
    <EcPage width="full" testId="ec-dashboard">
      <div className="flex w-full max-w-[1200px] min-w-0 flex-col gap-4">
        {isLoading ? (
          <>
            <OverviewCards loading t={t} />
            <div className="grid gap-4 lg:grid-cols-2" aria-busy>
              <CardSkeleton height={64} />
              <CardSkeleton height={64} />
            </div>
            <CardSkeleton height={240} />
          </>
        ) : isError || !analytics ? (
          <div className="rounded-lg border bg-card">
            <EcErrorState error={error} description={isForbiddenError(error) ? undefined : t("errorLoading")} onRetry={() => refetch()} />
          </div>
        ) : (
          <>
            <OverviewCards
              revenue={analytics.revenue}
              orders={analytics.orders}
              avgOrderValue={analytics.avg_order_value}
              t={t}
            />
            <div className="grid min-w-0 gap-4 lg:grid-cols-2">
              <CustomerInsightsCard insights={analytics.customer_insights} t={t} />
              <RevenueByMethodCard data={analytics.revenue_by_method} t={t} />
            </div>
            <SalesTrendChart data={analytics.sales_trend} t={t} />
            <div className="grid min-w-0 gap-4 lg:grid-cols-2 lg:items-start">
              <OrderStatusChart statusBreakdown={analytics.order_status_breakdown} t={t} />
              <TopProductsCard products={analytics.top_products} t={t} />
            </div>
            <RecentOrdersCard orders={analytics.recent_orders} t={t} />
          </>
        )}
      </div>
    </EcPage>
  )
}
