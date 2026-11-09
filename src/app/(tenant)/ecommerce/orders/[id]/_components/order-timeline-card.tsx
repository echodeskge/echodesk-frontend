"use client"

import { Check, History } from "lucide-react"
import { useLocale } from "next-intl"
import { cn } from "@/lib/utils"
import { InfoCard, formatEcDateTime } from "../../../_components/ui"
import { OrderDetail } from "../../_types"

interface OrderTimelineCardProps {
  order: OrderDetail
  t: (key: string) => string
}

interface TimelineEntry {
  key: string
  label: string
  date: string
  description: string
}

/** The order's dated milestones, in the same order as before (created … cancelled). */
export function timelineEntries(order: OrderDetail, t: (key: string) => string): TimelineEntry[] {
  const raw = order as unknown as Record<string, unknown>
  const steps: [string, unknown, string, string][] = [
    ["created", order.created_at, "detail.created", "detail.timelineCreatedDesc"],
    ["confirmed", order.confirmed_at, "detail.confirmed", "detail.timelineConfirmedDesc"],
    ["paid", order.paid_at, "detail.paid", "detail.timelinePaidDesc"],
    ["processing", raw.processing_at, "detail.processing", "detail.timelineProcessingDesc"],
    ["shipped", order.shipped_at, "detail.shipped", "detail.timelineShippedDesc"],
    ["delivered", order.delivered_at, "detail.delivered", "detail.timelineDeliveredDesc"],
    ["cancelled", raw.cancelled_at, "detail.cancelled", "detail.timelineCancelledDesc"],
  ]
  return steps
    .filter(([, date]) => !!date)
    .map(([key, date, label, desc]) => ({ key, label: t(label), date: date as string, description: t(desc) }))
}

export function OrderTimelineCard({ order, t }: OrderTimelineCardProps) {
  const locale = useLocale()
  const entries = timelineEntries(order, t)
  if (entries.length === 0) return null

  return (
    <InfoCard title={t("detail.timeline")} icon={<History />} testId="ec-order-timeline">
      <ol className="flex flex-col py-1">
        {entries.map((entry, index) => {
          const isLast = index === entries.length - 1
          return (
            <li key={entry.key} className="relative flex gap-3 pb-4 last:pb-0" data-testid="ec-order-timeline-entry">
              {!isLast && <span aria-hidden className="absolute start-[10px] top-[24px] bottom-0 w-px bg-border" />}
              <span
                aria-hidden
                className={cn(
                  "relative flex size-[22px] shrink-0 items-center justify-center rounded-full border",
                  isLast ? "border-primary bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}
              >
                <Check className="h-3 w-3" />
              </span>
              <span className="flex min-w-0 flex-col gap-0.5 pt-0.5">
                <span className="text-[13px] font-medium leading-4">{entry.label}</span>
                <span className="text-[11px] text-muted-foreground tabular-nums">{formatEcDateTime(entry.date, locale)}</span>
                <span className="text-xs text-muted-foreground">{entry.description}</span>
              </span>
            </li>
          )
        })}
      </ol>
    </InfoCard>
  )
}
