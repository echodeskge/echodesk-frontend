"use client"

import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import { LEGEND_STATUSES, statusDotClass } from "../_lib/calendar-tones"

/** The five status squares under the calendar title (design: 10px square, 11px label). */
export function StatusLegend({ className }: { className?: string }) {
  const t = useTranslations("bookingsCalendar")
  const tUi = useTranslations("bookingsUi")
  return (
    <ul aria-label={t("legendAria")} className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground", className)} data-testid="bkg-calendar-legend">
      {LEGEND_STATUSES.map((status) => (
        <li key={status} className="inline-flex items-center gap-1.5">
          <span aria-hidden className={cn("h-2.5 w-2.5 rounded-[3px]", statusDotClass(status))} />
          {tUi(`status.${status}`)}
        </li>
      ))}
    </ul>
  )
}
