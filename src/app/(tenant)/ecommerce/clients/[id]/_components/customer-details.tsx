"use client"

import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EcommerceClient, OrderList } from "@/api/generated/interfaces"
import { CustomerHeaderCard } from "./customer-header-card"
import { CustomerInfoCard } from "./customer-info-card"
import { CustomerStatsCard } from "./customer-stats-card"
import { CustomerOrdersCard } from "./customer-orders-card"

interface CustomerDetailsProps {
  client: EcommerceClient
  orders: OrderList[]
  ordersLoading: boolean
  totalSpent: number
  t: (key: string) => string
  tOrders: (key: string) => string
}

export function CustomerDetails({
  client,
  orders,
  ordersLoading,
  totalSpent,
  t,
  tOrders,
}: CustomerDetailsProps) {
  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/ecommerce/clients">
          <ChevronLeft className="me-1 h-4 w-4" />
          {t("backToClients")}
        </Link>
      </Button>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-4">
          <CustomerHeaderCard client={client} t={t} />
          <CustomerInfoCard client={client} t={t} />
        </div>
        <div className="space-y-4 md:col-span-2">
          <CustomerStatsCard
            totalOrders={orders.length}
            totalSpent={totalSpent}
            t={t}
          />
          <CustomerOrdersCard
            orders={orders}
            loading={ordersLoading}
            t={t}
            tOrders={tOrders}
          />
        </div>
      </div>
    </div>
  )
}
