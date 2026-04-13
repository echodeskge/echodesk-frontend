"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface OrderStatusChartProps {
  statusBreakdown: Record<string, number>
  t: (key: string) => string
}

const STATUS_CHART_COLORS: Record<string, string> = {
  pending: "hsl(45, 93%, 47%)",
  confirmed: "hsl(217, 91%, 60%)",
  processing: "hsl(271, 91%, 65%)",
  shipped: "hsl(239, 84%, 67%)",
  delivered: "hsl(142, 71%, 45%)",
  cancelled: "hsl(0, 84%, 60%)",
}

export function OrderStatusChart({
  statusBreakdown,
  t,
}: OrderStatusChartProps) {
  const data = Object.entries(statusBreakdown).map(([status, count]) => ({
    status,
    label: (() => {
      try {
        return t(`statusLabels.${status}`)
      } catch {
        return status.charAt(0).toUpperCase() + status.slice(1)
      }
    })(),
    count,
    color: STATUS_CHART_COLORS[status] || "hsl(220, 14%, 46%)",
  }))

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("statusBreakdown.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            {t("statusBreakdown.empty")}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("statusBreakdown.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12 }}
              className="fill-muted-foreground"
            />
            <YAxis
              tick={{ fontSize: 12 }}
              className="fill-muted-foreground"
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid hsl(var(--border))",
                backgroundColor: "hsl(var(--background))",
                color: "hsl(var(--foreground))",
              }}
              formatter={(value) => [String(value), "Orders"]}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
