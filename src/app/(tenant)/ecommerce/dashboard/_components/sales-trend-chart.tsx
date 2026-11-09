"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { useLocale } from "next-intl"
import { TrendingUp } from "lucide-react"
import { InfoCard, formatMoney } from "../../_components/ui"
import { formatShortDay, type Translator } from "../_lib/labels"

interface SalesTrendChartProps {
  data: Array<{ date: string; revenue: number; orders: number }>
  t: Translator
}

export interface TrendSummary {
  total: number
  average: number
  highest: { date: string; revenue: number } | null
  lowest: { date: string; revenue: number } | null
}

/** Total, per-day average and the best / worst day of the trend (same rules as before). */
export function summarizeTrend(data: SalesTrendChartProps["data"]): TrendSummary {
  const total = data.reduce((sum, d) => sum + d.revenue, 0)
  return {
    total,
    average: data.length > 0 ? total / data.length : 0,
    highest: data.length ? data.reduce((max, d) => (d.revenue > max.revenue ? d : max), data[0]) : null,
    lowest: data.length ? data.reduce((min, d) => (d.revenue < min.revenue ? d : min), data[0]) : null,
  }
}

const AXIS_TICK = { fontSize: 11, fill: "hsl(var(--muted-foreground))" }

function Figure({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="truncate text-xs text-muted-foreground">{label}</span>
      <span className="text-base font-semibold tabular-nums">{value}</span>
      {sub && <span className="text-[11px] text-muted-foreground tabular-nums">{sub}</span>}
    </div>
  )
}

/**
 * Daily paid revenue of the last 7 days: four mini figures and a bar chart.
 * Bars are capped at 40px so a single day no longer fills the whole width.
 */
export function SalesTrendChart({ data, t }: SalesTrendChartProps) {
  const locale = useLocale()
  const chartData = data.map((d) => ({ ...d, label: formatShortDay(d.date, locale) }))
  const { total, average, highest, lowest } = summarizeTrend(data)

  return (
    <InfoCard
      title={t("salesTrend.title")}
      icon={<TrendingUp />}
      actions={<span className="text-xs text-muted-foreground">{t("salesTrend.last7Days")}</span>}
      testId="ec-dash-trend"
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Figure
            label={t("salesTrend.highest")}
            value={formatMoney(highest?.revenue ?? 0)}
            sub={highest?.date ? formatShortDay(highest.date, locale) : undefined}
          />
          <Figure
            label={t("salesTrend.lowest")}
            value={formatMoney(lowest?.revenue ?? 0)}
            sub={lowest?.date ? formatShortDay(lowest.date, locale) : undefined}
          />
          <Figure label={t("salesTrend.total")} value={formatMoney(total)} />
          <Figure label={t("salesTrend.average")} value={formatMoney(average)} />
        </div>

        {data.length === 0 ? (
          <p className="py-10 text-center text-xs text-muted-foreground">{t("salesTrend.noData")}</p>
        ) : (
          <div className="h-[240px] w-full" data-testid="ec-dash-trend-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: "hsl(var(--border))" }} />
                <YAxis
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={false}
                  width={56}
                  tickFormatter={(v: number) => formatMoney(v, { compact: true })}
                />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted))", opacity: 0.6 }}
                  contentStyle={{
                    borderRadius: 6,
                    border: "1px solid hsl(var(--border))",
                    backgroundColor: "hsl(var(--popover))",
                    color: "hsl(var(--popover-foreground))",
                    fontSize: 12,
                  }}
                  formatter={(value) => [formatMoney(Number(value)), t("salesTrend.revenue")]}
                />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </InfoCard>
  )
}
