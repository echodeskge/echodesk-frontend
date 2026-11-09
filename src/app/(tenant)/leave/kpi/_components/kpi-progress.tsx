"use client"

import { cn } from "@/lib/utils"
import { formatPercent, kpiProgressWidth, kpiTone } from "../../_lib/hr-utils"
import { KPI_BAR_CLASS } from "../../_lib/lv03-utils"

/** 6px KPI progress bar (tone from `kpiTone`) with the percent as 12px tabular text. */
export function KpiProgress({ percent, className }: { percent: string | null; className?: string }) {
  const width = kpiProgressWidth(percent)
  const tone = kpiTone(percent)
  const label = formatPercent(percent)
  return (
    <span className={cn("flex min-w-0 items-center gap-2", className)} data-tone={tone}>
      <span
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={width}
        aria-valuetext={label}
        className="relative h-1.5 min-w-10 flex-1 overflow-hidden rounded-full bg-muted"
      >
        <span className={cn("absolute inset-y-0 start-0 rounded-full", KPI_BAR_CLASS[tone])} style={{ width: `${width}%` }} />
      </span>
      <span className="w-11 shrink-0 text-end text-xs tabular-nums text-foreground">{label}</span>
    </span>
  )
}
