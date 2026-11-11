"use client"

import { useLocale } from "next-intl"
import { Clock } from "lucide-react"
import type { BookingDetail } from "@/api/generated/interfaces"
import { cn } from "@/lib/utils"
import { BookingsCard, TONE_DOT, formatBookingDateTime, type BookingsTone } from "../../../_components/ui"

type Translate = (key: string, values?: Record<string, string | number>) => string

export interface TimelineEntry {
  key: "created" | "confirmed" | "completed" | "cancelled"
  at: string
  tone: BookingsTone
}

/** Milestones in order, skipping the missing timestamps. */
export function timelineEntries(b: Pick<BookingDetail, "created_at" | "confirmed_at" | "completed_at" | "cancelled_at">): TimelineEntry[] {
  const out: TimelineEntry[] = []
  if (b.created_at) out.push({ key: "created", at: b.created_at, tone: "neutral" })
  if (b.confirmed_at) out.push({ key: "confirmed", at: b.confirmed_at, tone: "info" })
  if (b.completed_at) out.push({ key: "completed", at: b.completed_at, tone: "success" })
  if (b.cancelled_at) out.push({ key: "cancelled", at: b.cancelled_at, tone: "danger" })
  return out
}

/** Timeline card: a dot per milestone (Created grey, Confirmed blue, Completed green, Cancelled red) with its timestamp. */
export function TimelineCard({ booking, t }: { booking: BookingDetail; t: Translate }) {
  const locale = useLocale()
  const entries = timelineEntries(booking)
  return (
    <BookingsCard title={t("cards.timeline")} icon={<Clock />} testId="bkg-card-timeline">
      <ol className="flex flex-col gap-3">
        {entries.map((e) => (
          <li key={e.key} className="flex items-start gap-3" data-testid={`bkg-timeline-${e.key}`}>
            <span aria-hidden className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", TONE_DOT[e.tone])} />
            <span className="flex min-w-0 flex-col">
              <span className="text-[13px] font-medium">{t(`timeline.${e.key}`)}</span>
              <span className="text-xs text-muted-foreground tabular-nums">{formatBookingDateTime(e.at, locale)}</span>
            </span>
          </li>
        ))}
      </ol>
    </BookingsCard>
  )
}
