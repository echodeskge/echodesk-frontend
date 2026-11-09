"use client"

import { StatGrid, formatCount, formatMoney } from "@/app/(tenant)/ecommerce/_components/ui"

interface CustomerStatsCardProps {
  totalOrders: number
  totalSpent: number
  loading?: boolean
  t: (key: string) => string
}

/** Orders, total spent and average order (same numbers as before: the loaded orders). */
export function CustomerStatsCard({ totalOrders, totalSpent, loading, t }: CustomerStatsCardProps) {
  const avgOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0
  return (
    <StatGrid
      loading={loading}
      testId="client-stats"
      items={[
        { key: "orders", label: t("stats.totalOrders"), value: formatCount(totalOrders) },
        { key: "spent", label: t("stats.totalSpent"), value: formatMoney(totalSpent) },
        { key: "avg", label: t("stats.avgOrderValue"), value: formatMoney(avgOrderValue) },
      ]}
    />
  )
}
