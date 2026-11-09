"use client"

import { StatGrid, formatCount, formatMoney, formatPercent, type StatItem } from "../../_components/ui"
import type { Translator } from "../_lib/labels"

export interface PeriodTotals {
  today: number
  week: number
  month: number
  total: number
  change: number
}

interface OverviewCardsProps {
  revenue?: PeriodTotals
  orders?: PeriodTotals
  avgOrderValue?: number
  loading?: boolean
  t: Translator
}

/** "+12.5%" / "-3%": the change of the last 30 days against the 30 before (backend `change`). */
export function formatChange(change: number): string {
  return `${change > 0 ? "+" : ""}${formatPercent(change)}`
}

function changeHint(change: number | undefined, t: OverviewCardsProps["t"]): Pick<StatItem, "hint" | "hintTone"> {
  if (!change) return {}
  return {
    hint: t("overview.vsPrevious", { change: formatChange(change) }),
    hintTone: change > 0 ? "success" : "danger",
  }
}

/** Compact money with the exact amount as the tooltip (₾4.0K, title ₾4,038.00). */
function Compact({ value }: { value: number | undefined }) {
  return <span title={formatMoney(value)}>{formatMoney(value, { compact: true })}</span>
}

/**
 * The four overview numbers as STATS tiles: total revenue, revenue of the
 * last 30 days (with its change), total orders (with its change), average
 * order value.
 */
export function OverviewCards({ revenue, orders, avgOrderValue, loading, t }: OverviewCardsProps) {
  const items: StatItem[] = [
    {
      key: "totalRevenue",
      label: t("overview.totalRevenue"),
      value: revenue ? <Compact value={revenue.total} /> : null,
      testId: "ec-dash-total-revenue",
    },
    {
      key: "monthRevenue",
      label: t("overview.monthRevenue"),
      value: revenue ? <Compact value={revenue.month} /> : null,
      ...changeHint(revenue?.change, t),
      testId: "ec-dash-month-revenue",
    },
    {
      key: "totalOrders",
      label: t("overview.totalOrders"),
      value: orders ? formatCount(orders.total) : null,
      ...changeHint(orders?.change, t),
      testId: "ec-dash-total-orders",
    },
    {
      key: "avgOrderValue",
      label: t("overview.avgOrderValue"),
      value: avgOrderValue === undefined ? null : formatMoney(avgOrderValue),
      testId: "ec-dash-avg-order",
    },
  ]
  return <StatGrid items={items} loading={loading} className="grid-cols-2 md:grid-cols-4" testId="ec-dash-overview" />
}
