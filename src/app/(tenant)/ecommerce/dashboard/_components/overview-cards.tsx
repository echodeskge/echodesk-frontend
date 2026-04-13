"use client"

import {
  HandCoins,
  ShoppingBag,
  BadgePercent,
  TrendingUp,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface OverviewCardsProps {
  revenue: { today: number; week: number; month: number; total: number }
  orders: { today: number; week: number; month: number; total: number }
  t: (key: string) => string
}

function formatCurrency(amount: number) {
  return `₾${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function OverviewCards({ revenue, orders, t }: OverviewCardsProps) {
  const avgOrderValue = orders.total > 0 ? revenue.total / orders.total : 0

  const metrics = [
    {
      label: t("overview.totalRevenue"),
      value: formatCurrency(revenue.total),
      icon: HandCoins,
    },
    {
      label: t("overview.totalOrders"),
      value: orders.total.toLocaleString(),
      icon: ShoppingBag,
    },
    {
      label: t("overview.avgOrderValue"),
      value: formatCurrency(avgOrderValue),
      icon: BadgePercent,
    },
    {
      label: t("overview.monthRevenue"),
      value: formatCurrency(revenue.month),
      icon: TrendingUp,
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
      {metrics.map((metric) => (
        <Card key={metric.label}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {metric.label}
            </CardTitle>
            <metric.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metric.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
