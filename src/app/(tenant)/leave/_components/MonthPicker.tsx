"use client"

import { useLocale, useTranslations } from "next-intl"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatPeriod, isPeriod, shiftPeriod } from "../_lib/hr-utils"

interface MonthPickerProps {
  value: string
  onChange: (period: string) => void
  className?: string
}

/**
 * YYYY-MM picker with previous / next month buttons (LV-00 design: one 32px
 * outlined control). The visible label is `formatPeriod` (Georgian month names
 * written out, Chrome has none); a transparent native month input on top keeps
 * the browser's month picker.
 */
export function MonthPicker({ value, onChange, className }: MonthPickerProps) {
  const t = useTranslations("leave")
  const locale = useLocale()
  const label = formatPeriod(value, locale)
  const nav =
    "inline-flex h-full w-8 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
  return (
    <div
      className={cn("inline-flex h-8 shrink-0 items-stretch overflow-hidden rounded-md border bg-background", className)}
      data-testid="leave-month-picker"
    >
      <button
        type="button"
        className={cn(nav, "border-e")}
        aria-label={t("hr.common.previousMonth")}
        title={t("hr.common.previousMonth")}
        onClick={() => onChange(shiftPeriod(value, -1))}
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
      </button>
      <label className="relative flex min-w-[124px] cursor-pointer items-center justify-center px-2.5 text-[13px] font-medium tabular-nums hover:bg-muted/50">
        <span aria-hidden className="whitespace-nowrap">{label}</span>
        <input
          type="month"
          value={value}
          aria-label={label}
          title={label}
          onClick={(e) => {
            try {
              e.currentTarget.showPicker?.()
            } catch {
              /* not allowed without a user gesture in some browsers */
            }
          }}
          onChange={(e) => isPeriod(e.target.value) && onChange(e.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>
      <button
        type="button"
        className={cn(nav, "border-s")}
        aria-label={t("hr.common.nextMonth")}
        title={t("hr.common.nextMonth")}
        onClick={() => onChange(shiftPeriod(value, 1))}
      >
        <ChevronRight className="h-4 w-4" aria-hidden />
      </button>
    </div>
  )
}
