"use client"

import { useTranslations } from "next-intl"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Toolbar, ToolbarSearch, ToolbarSpacer, rdButton } from "../../_components/ui"
import { ZOOM_STEPS, type CalendarView, type Zoom } from "../_lib/calendar-range"

export interface CalendarToolbarProps {
  view: CalendarView
  date: string
  isToday: boolean
  onDateChange: (date: string) => void
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  search: string
  onSearchChange: (value: string) => void
  zoom: Zoom
  onZoomChange: (zoom: Zoom) => void
  /** Admins only: the "+ New booking" button. */
  canCreate: boolean
  onNew: () => void
}

/**
 * ‹ date ›, Today, the name / phone search, the zoom chips (Specialists view)
 * and "+ New booking" (design: 28px controls; wraps into stacked rows at 390).
 */
export function CalendarToolbar({ view, date, isToday, onDateChange, onPrev, onNext, onToday, search, onSearchChange, zoom, onZoomChange, canCreate, onNew }: CalendarToolbarProps) {
  const t = useTranslations("bookingsCalendar")
  const tUi = useTranslations("bookingsUi")
  return (
    <Toolbar inset className="gap-y-2" testId="bkg-calendar-toolbar">
      <div className="flex items-center gap-1">
        <button type="button" className={cn(rdButton.ghostIconSm, "border border-border")} onClick={onPrev} aria-label={t("previous")} title={t("previous")} data-testid="bkg-calendar-prev">
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
        </button>
        <input
          type="date"
          value={date}
          onChange={(e) => e.target.value && onDateChange(e.target.value)}
          aria-label={t("dateAria")}
          className="h-7 w-[150px] min-w-0 rounded-md border border-input bg-background px-2 text-xs tabular-nums text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
          data-testid="bkg-calendar-date"
        />
        <button type="button" className={cn(rdButton.ghostIconSm, "border border-border")} onClick={onNext} aria-label={t("next")} title={t("next")} data-testid="bkg-calendar-next">
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </button>
        <button type="button" className={cn(rdButton.outlineSm, "ms-1")} onClick={onToday} disabled={isToday} data-testid="bkg-calendar-today">
          {t("today")}
        </button>
      </div>
      <ToolbarSearch value={search} onChange={onSearchChange} placeholder={t("timeline.searchPlaceholder")} clearLabel={tUi("clearSearch")} className="w-full min-w-[160px] sm:w-auto" testId="bkg-calendar-search" />
      <ToolbarSpacer />
      {view === "specialists" && (
        <div role="radiogroup" aria-label={t("zoomAria")} className="flex items-center gap-1" data-testid="bkg-calendar-zoom">
          {ZOOM_STEPS.map((step) => {
            const selected = zoom === step
            return (
              <button
                key={step}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onZoomChange(step)}
                className={cn(rdButton.outlineSm, "tabular-nums", selected && "border-primary bg-primary text-primary-foreground hover:bg-primary")}
              >
                {step === 60 ? t("timeline.oneHour") : t("timeline.minutes", { n: step })}
              </button>
            )
          })}
        </div>
      )}
      {canCreate && (
        <button type="button" className={cn(rdButton.primarySm, "ms-1")} onClick={onNew} data-testid="bkg-calendar-new">
          <Plus className="h-3.5 w-3.5" aria-hidden />
          {t("newBooking")}
        </button>
      )}
    </Toolbar>
  )
}
