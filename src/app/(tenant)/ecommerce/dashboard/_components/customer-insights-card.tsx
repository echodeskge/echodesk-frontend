"use client"

import { Users } from "lucide-react"
import { InfoCard, formatCount } from "../../_components/ui"
import type { Translator } from "../_lib/labels"

interface CustomerInsightsCardProps {
  insights: {
    total: number
    new: number
    returning: number
  }
  t: Translator
}

/** Three mini figures: all customers, new this month, returning. */
export function CustomerInsightsCard({ insights, t }: CustomerInsightsCardProps) {
  const items = [
    { key: "total", label: t("customerInsights.total"), value: insights.total },
    { key: "new", label: t("customerInsights.new"), value: insights.new },
    { key: "returning", label: t("customerInsights.returning"), value: insights.returning },
  ]

  return (
    <InfoCard title={t("customerInsights.title")} icon={<Users />} testId="ec-dash-customers">
      <dl className="grid grid-cols-3 gap-3 py-1">
        {items.map((item) => (
          <div key={item.key} className="flex min-w-0 flex-col gap-0.5">
            <dt className="line-clamp-2 break-words text-xs leading-4 text-muted-foreground">{item.label}</dt>
            <dd className="text-2xl font-semibold leading-7 tabular-nums tracking-[-.02em]">{formatCount(item.value)}</dd>
          </div>
        ))}
      </dl>
    </InfoCard>
  )
}
