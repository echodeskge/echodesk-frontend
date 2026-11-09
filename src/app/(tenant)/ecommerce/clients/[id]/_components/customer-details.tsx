"use client"

import type { EcommerceClient, OrderList } from "@/api/generated/interfaces"
import { DetailLayout } from "@/app/(tenant)/ecommerce/_components/ui"
import { CustomerHeaderCard } from "./customer-header-card"
import { CustomerInfoCard } from "./customer-info-card"
import { CustomerStatsCard } from "./customer-stats-card"
import { CustomerOrdersCard } from "./customer-orders-card"

interface CustomerDetailsProps {
  client: EcommerceClient
  orders: OrderList[]
  ordersLoading: boolean
  ordersError?: unknown
  onRetryOrders?: () => void
  totalSpent: number
  locale: string
  t: (key: string, values?: Record<string, string>) => string
}

/**
 * Client detail (SPEC §2 EC-03): summary card on top; stats + order history
 * in the main column; contact details and addresses in the 320px rail
 * (stacked under the orders below 1024px).
 */
export function CustomerDetails({
  client,
  orders,
  ordersLoading,
  ordersError,
  onRetryOrders,
  totalSpent,
  locale,
  t,
}: CustomerDetailsProps) {
  return (
    <DetailLayout
      testId="client-detail"
      header={<CustomerHeaderCard client={client} locale={locale} t={t} />}
      main={
        <>
          <CustomerStatsCard
            totalOrders={orders.length}
            totalSpent={totalSpent}
            loading={ordersLoading}
            t={t}
          />
          <CustomerOrdersCard
            orders={orders}
            loading={ordersLoading}
            error={ordersError}
            onRetry={onRetryOrders}
            locale={locale}
            t={t}
          />
        </>
      }
      rail={<CustomerInfoCard client={client} locale={locale} t={t} />}
    />
  )
}
