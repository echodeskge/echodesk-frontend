"use client"

import { useLocale, useTranslations } from "next-intl"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatPeriod, isPeriod, shiftPeriod } from "../_lib/hr-utils"

interface MonthPickerProps {
  value: string
  onChange: (period: string) => void
  className?: string
}

/** YYYY-MM picker with previous / next month buttons. */
export function MonthPicker({ value, onChange, className }: MonthPickerProps) {
  const t = useTranslations("leave")
  const locale = useLocale()
  return (
    <div className={`flex items-center gap-1 ${className ?? ""}`}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={t("hr.common.previousMonth")}
        onClick={() => onChange(shiftPeriod(value, -1))}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Input
        type="month"
        value={value}
        aria-label={formatPeriod(value, locale)}
        title={formatPeriod(value, locale)}
        onChange={(e) => isPeriod(e.target.value) && onChange(e.target.value)}
        className="w-[160px]"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={t("hr.common.nextMonth")}
        onClick={() => onChange(shiftPeriod(value, 1))}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
