"use client"

import {
  HandCoins,
  ShoppingBag,
  BadgePercent,
  TrendingUp,
  TrendingDown,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface OverviewCardsProps {
  revenue: { today: number; week: number; month: number; total: number; change: number }
  orders: { today: number; week: number; month: number; total: number; change: number }
  avgOrderValue: number
  t: (key: string) => string
}

function formatCurrency(amount: number) {
  if (amount >= 1000) {
    return `₾${(amount / 1000).toFixed(1)}K`
  }
  return `₾${amount.toFixed(2)}`
}

function formatLargeNumber(amount: number) {
  if (amount >= 1000000) return `₾${(amount / 1000000).toFixed(2)}M`
  if (amount >= 1000) return `₾${(amount / 1000).toFixed(1)}K`
  return `₾${amount.toFixed(2)}`
}

export function OverviewCards({ revenue, orders, avgOrderValue, t }: OverviewCardsProps) {
  const metrics = [
    {
      label: t("overview.totalRevenue"),
      value: formatLargeNumber(revenue.total),
      change: revenue.change,
      icon: HandCoins,
      period: "vs last month",
    },
    {
      label: t("overview.monthRevenue"),
      value: formatLargeNumber(revenue.month),
      change: revenue.change,
      icon: BadgePercent,
      period: "this month",
    },
    {
      label: t("overview.totalOrders"),
      value: orders.total.toLocaleString(),
      change: orders.change,
      icon: ShoppingBag,
      period: "vs last month",
    },
    {
      label: t("overview.avgOrderValue"),
      value: `₾${avgOrderValue.toFixed(2)}`,
      change: 0,
      icon: HandCoins,
      period: "all time",
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
      {metrics.map((metric) => (
        <Card key={metric.label}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                <metric.icon className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            {metric.change !== 0 && (
              <Badge
                variant="secondary"
                className={
                  metric.change > 0
                    ? "bg-green-100 text-green-700 hover:bg-green-100"
                    : "bg-red-100 text-red-700 hover:bg-red-100"
                }
              >
                {metric.change > 0 ? (
                  <TrendingUp className="mr-1 h-3 w-3" />
                ) : (
                  <TrendingDown className="mr-1 h-3 w-3" />
                )}
                {metric.change > 0 ? "+" : ""}
                {metric.change}%
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">{metric.label}</p>
            <p className="text-2xl font-bold">{metric.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
