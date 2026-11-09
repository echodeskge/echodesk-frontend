"use client"

import { ListChecks } from "lucide-react"
import { TONE_DOT } from "@/components/redesign/tones"
import { cn } from "@/lib/utils"
import { InfoCard, ORDER_STATUSES, formatCount, orderStatusTone } from "../../_components/ui"
import { labelOr, type Translator } from "../_lib/labels"

interface OrderStatusChartProps {
  statusBreakdown: Record<string, number>
  t: Translator
}

/** Breakdown rows in the order-flow order (pending … refunded), unknown statuses last. */
export function statusRows(breakdown: Record<string, number>) {
  const known = ORDER_STATUSES as readonly string[]
  return Object.entries(breakdown)
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => {
      const ia = known.indexOf(a.status)
      const ib = known.indexOf(b.status)
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
    })
}

/** Order count per status as horizontal bars in the status tones. */
export function OrderStatusChart({ statusBreakdown, t }: OrderStatusChartProps) {
  const rows = statusRows(statusBreakdown)
  const max = Math.max(1, ...rows.map((r) => r.count))

  return (
    <InfoCard title={t("statusBreakdown.title")} icon={<ListChecks />} testId="ec-dash-status">
      {rows.length === 0 ? (
        <p className="py-8 text-center text-xs text-muted-foreground">{t("statusBreakdown.empty")}</p>
      ) : (
        <ul className="flex flex-col gap-1" aria-label={t("statusBreakdown.title")}>
          {rows.map((r) => {
            const label = labelOr(t, `statusLabels.${r.status}`, r.status)
            return (
              <li
                key={r.status}
                className="grid min-h-8 grid-cols-[minmax(84px,30%)_1fr_40px] items-center gap-3 text-[13px]"
                data-testid="ec-dash-status-row"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span aria-hidden className={cn("h-2 w-2 shrink-0 rounded-full", TONE_DOT[orderStatusTone(r.status)])} />
                  <span className="truncate">{label}</span>
                </span>
                <span className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
                  <span
                    className={cn("block h-full rounded-full", TONE_DOT[orderStatusTone(r.status)])}
                    style={{ width: `${(r.count / max) * 100}%` }}
                  />
                </span>
                <span className="text-end font-medium tabular-nums" aria-label={`${label}: ${r.count}`}>
                  {formatCount(r.count)}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </InfoCard>
  )
}
