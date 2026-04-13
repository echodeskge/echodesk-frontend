"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Timeline,
  TimelineContent,
  TimelineDot,
  TimelineHeading,
  TimelineItem,
  TimelineLine,
} from "@/components/ui/timeline"
import { formatDateWithTime } from "../../_lib/utils"
import { OrderDetail } from "../../_types"

interface OrderTimelineCardProps {
  order: OrderDetail
  t: (key: string) => string
}

interface TimelineEntry {
  label: string
  date: string
  description: string
}

export function OrderTimelineCard({ order, t }: OrderTimelineCardProps) {
  const raw = order as unknown as Record<string, unknown>
  const entries: TimelineEntry[] = []

  if (order.created_at) {
    entries.push({
      label: t("detail.created"),
      date: order.created_at,
      description: t("detail.timelineCreatedDesc"),
    })
  }
  if (order.confirmed_at) {
    entries.push({
      label: t("detail.confirmed"),
      date: order.confirmed_at,
      description: t("detail.timelineConfirmedDesc"),
    })
  }
  if (order.paid_at) {
    entries.push({
      label: t("detail.paid"),
      date: order.paid_at,
      description: t("detail.timelinePaidDesc"),
    })
  }
  if (raw.processing_at) {
    entries.push({
      label: t("detail.processing"),
      date: raw.processing_at as string,
      description: t("detail.timelineProcessingDesc"),
    })
  }
  if (order.shipped_at) {
    entries.push({
      label: t("detail.shipped"),
      date: order.shipped_at,
      description: t("detail.timelineShippedDesc"),
    })
  }
  if (order.delivered_at) {
    entries.push({
      label: t("detail.delivered"),
      date: order.delivered_at,
      description: t("detail.timelineDeliveredDesc"),
    })
  }
  if (raw.cancelled_at) {
    entries.push({
      label: t("detail.cancelled"),
      date: raw.cancelled_at as string,
      description: t("detail.timelineCancelledDesc"),
    })
  }

  if (entries.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("detail.timeline")}</CardTitle>
      </CardHeader>
      <CardContent>
        <Timeline>
          {entries.map((entry, index) => {
            const isLast = index === entries.length - 1

            return (
              <TimelineItem key={entry.label} status="done">
                <TimelineDot status={isLast ? "current" : "done"} />
                {!isLast && <TimelineLine done />}
                <TimelineHeading>{entry.label}</TimelineHeading>
                <TimelineContent>
                  <p className="text-xs text-muted-foreground">
                    {formatDateWithTime(entry.date)}
                  </p>
                  <p className="text-sm">{entry.description}</p>
                </TimelineContent>
              </TimelineItem>
            )
          })}
        </Timeline>
      </CardContent>
    </Card>
  )
}
