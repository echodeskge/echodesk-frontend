"use client"

import { ShoppingCart, DollarSign, TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface CustomerStatsCardProps {
  totalOrders: number
  totalSpent: number
  t: (key: string) => string
}

export function CustomerStatsCard({
  totalOrders,
  totalSpent,
  t,
}: CustomerStatsCardProps) {
  const avgOrderValue =
    totalOrders > 0 ? totalSpent / totalOrders : 0

  const formatCurrency = (amount: number) => `₾${amount.toFixed(2)}`

  const stats = [
    {
      label: t("stats.totalOrders"),
      value: String(totalOrders),
      icon: ShoppingCart,
    },
    {
      label: t("stats.totalSpent"),
      value: formatCurrency(totalSpent),
      icon: DollarSign,
    },
    {
      label: t("stats.avgOrderValue"),
      value: formatCurrency(avgOrderValue),
      icon: TrendingUp,
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.label}
            </CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
