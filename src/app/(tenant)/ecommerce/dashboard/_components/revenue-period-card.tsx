"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface RevenuePeriodCardProps {
  revenue: { today: number; week: number; month: number; total: number }
  orders: { today: number; week: number; month: number; total: number }
  t: (key: string) => string
}

function formatCurrency(amount: number) {
  return `₾${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function RevenuePeriodCard({
  revenue,
  orders,
  t,
}: RevenuePeriodCardProps) {
  const periods = [
    {
      label: t("revenue.today"),
      revenue: revenue.today,
      orders: orders.today,
    },
    {
      label: t("revenue.week"),
      revenue: revenue.week,
      orders: orders.week,
    },
    {
      label: t("revenue.month"),
      revenue: revenue.month,
      orders: orders.month,
    },
    {
      label: t("revenue.total"),
      revenue: revenue.total,
      orders: orders.total,
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("revenuePeriod.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {periods.map((period) => (
            <div
              key={period.label}
              className="flex items-center justify-between"
            >
              <div>
                <p className="text-sm font-medium">{period.label}</p>
                <p className="text-xs text-muted-foreground">
                  {period.orders} {t("revenuePeriod.orders")}
                </p>
              </div>
              <span className="text-sm font-semibold">
                {formatCurrency(period.revenue)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
