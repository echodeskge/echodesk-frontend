"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { format } from "date-fns"

interface SalesTrendChartProps {
  data: Array<{ date: string; revenue: number; orders: number }>
  t: (key: string) => string
}

export function SalesTrendChart({ data, t }: SalesTrendChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    label: format(new Date(d.date), "MMM dd"),
  }))

  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1)
  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0)
  const avgRevenue = data.length > 0 ? totalRevenue / data.length : 0
  const highestDay = data.reduce((max, d) => (d.revenue > max.revenue ? d : max), data[0] || { date: "", revenue: 0 })
  const lowestDay = data.reduce((min, d) => (d.revenue < min.revenue ? d : min), data[0] || { date: "", revenue: 0 })

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{t("salesTrend.title")}</CardTitle>
          <span className="text-xs text-muted-foreground">{t("salesTrend.last7Days")}</span>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary stats */}
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">{t("salesTrend.highest")}</p>
            <p className="text-lg font-semibold">₾{highestDay?.revenue?.toFixed(2) || "0"}</p>
            {highestDay?.date && (
              <p className="text-xs text-muted-foreground">
                {format(new Date(highestDay.date), "MMM dd")}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("salesTrend.lowest")}</p>
            <p className="text-lg font-semibold">₾{lowestDay?.revenue?.toFixed(2) || "0"}</p>
            {lowestDay?.date && (
              <p className="text-xs text-muted-foreground">
                {format(new Date(lowestDay.date), "MMM dd")}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("salesTrend.total")}</p>
            <p className="text-lg font-semibold">₾{totalRevenue.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("salesTrend.average")}</p>
            <p className="text-lg font-semibold">₾{avgRevenue.toFixed(2)}</p>
          </div>
        </div>

        {data.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            {t("salesTrend.noData")}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12 }}
                className="fill-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                className="fill-muted-foreground"
                tickFormatter={(v) => `₾${v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}`}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid hsl(var(--border))",
                  backgroundColor: "hsl(var(--background))",
                  color: "hsl(var(--foreground))",
                }}
                formatter={(value) => [`₾${Number(value).toFixed(2)}`, "Revenue"]}
              />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
