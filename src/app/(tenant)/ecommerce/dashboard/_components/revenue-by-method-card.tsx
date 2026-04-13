"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface RevenueMethod {
  payment_method: string
  revenue: number
  count: number
  percentage: number
}

interface RevenueByMethodCardProps {
  data: RevenueMethod[]
  t: (key: string) => string
}

const METHOD_COLORS: Record<string, string> = {
  card: "hsl(217, 91%, 60%)",
  cash_on_delivery: "hsl(142, 71%, 45%)",
  saved_card: "hsl(271, 91%, 65%)",
  "": "hsl(220, 14%, 46%)",
}

const METHOD_DOT_COLORS: Record<string, string> = {
  card: "bg-blue-500",
  cash_on_delivery: "bg-green-500",
  saved_card: "bg-purple-500",
  "": "bg-gray-500",
}

function getMethodLabel(method: string, t: (key: string) => string): string {
  try {
    return t(`paymentMethods.${method || "unknown"}`)
  } catch {
    return method || "Unknown"
  }
}

export function RevenueByMethodCard({ data, t }: RevenueByMethodCardProps) {
  const total = data.reduce((sum, d) => sum + d.revenue, 0)

  const chartData = data.map((d) => ({
    ...d,
    label: getMethodLabel(d.payment_method, t),
    fill: METHOD_COLORS[d.payment_method] || METHOD_COLORS[""],
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("revenueByMethod.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Total */}
        <div className="mb-4">
          <p className="text-2xl font-bold">
            ₾{total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-muted-foreground">{t("revenueByMethod.totalRevenue")}</p>
        </div>

        {data.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            {t("revenueByMethod.noData")}
          </div>
        ) : (
          <>
            {/* Chart */}
            <ResponsiveContainer width="100%" height={40}>
              <BarChart
                data={[{ name: "revenue", ...Object.fromEntries(chartData.map((d, i) => [`s${i}`, d.revenue])) }]}
                layout="vertical"
                margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
              >
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" hide />
                {chartData.map((d, i) => (
                  <Bar key={i} dataKey={`s${i}`} stackId="a" fill={d.fill} radius={i === 0 ? [4, 0, 0, 4] : i === chartData.length - 1 ? [0, 4, 4, 0] : 0} />
                ))}
              </BarChart>
            </ResponsiveContainer>

            {/* Legend list */}
            <ul className="mt-4 space-y-3">
              {chartData.map((d) => (
                <li
                  key={d.payment_method}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-sm ${METHOD_DOT_COLORS[d.payment_method] || METHOD_DOT_COLORS[""]}`}
                    />
                    <span className="text-sm">{d.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      ₾{d.revenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {d.percentage}%
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  )
}
