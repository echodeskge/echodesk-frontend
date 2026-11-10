"use client"

import type { ReactNode } from "react"
import { Download, type LucideIcon } from "lucide-react"
import { Segmented, type SegmentedOption } from "@/components/redesign/segmented"
import { StatGrid, type StatItem } from "@/components/redesign/stats"
import { cn } from "@/lib/utils"

export interface StatsPanelAction {
  label: string
  onClick: () => void
  icon?: LucideIcon
  disabled?: boolean
  testId?: string
}

/**
 * Design STATS block (inside a `SettingsPage width="wide"`): toolbar with the
 * range segment (28px), the range label and "Export CSV" pushed right, then
 * the stat cards (`StatItem.hint` = the change vs the previous period,
 * `hintTone` its colour) and the page's table.
 * `toolbar` replaces the segment for pages with their own period controls
 * (e.g. date inputs) — the layout stays the same.
 */
export function StatsPanel<T extends string>({
  ranges,
  range,
  onRangeChange,
  rangeAriaLabel,
  rangeLabel,
  toolbar,
  exportAction,
  cards,
  loading,
  children,
  className,
  testId = "settings-stats",
}: {
  ranges?: SegmentedOption<T>[]
  range?: T
  onRangeChange?: (value: T) => void
  rangeAriaLabel?: string
  /** "1 – 30 Nov 2026" (already formatted). */
  rangeLabel?: ReactNode
  toolbar?: ReactNode
  exportAction?: StatsPanelAction | null
  cards?: StatItem[]
  loading?: boolean
  children?: ReactNode
  className?: string
  testId?: string
}) {
  const ExportIcon = exportAction?.icon ?? Download
  return (
    <div className={cn("flex min-w-0 flex-col gap-5", className)} data-testid={testId}>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {ranges && range !== undefined && onRangeChange && (
          <Segmented size="sm" value={range} onChange={onRangeChange} options={ranges} ariaLabel={rangeAriaLabel ?? ""} />
        )}
        {toolbar}
        {rangeLabel && <span className="whitespace-nowrap text-xs text-muted-foreground tabular-nums">{rangeLabel}</span>}
        {exportAction && (
          <button
            type="button"
            onClick={exportAction.onClick}
            disabled={exportAction.disabled}
            data-testid={exportAction.testId}
            className="ms-auto inline-flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border bg-background px-2.5 text-xs transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
          >
            <ExportIcon className="h-[13px] w-[13px]" aria-hidden />
            {exportAction.label}
          </button>
        )}
      </div>
      {cards && cards.length > 0 && <StatGrid items={cards} loading={loading} />}
      {children}
    </div>
  )
}

/**
 * Table cell with a horizontal bar (design STATS "Tracked time": 8px muted
 * track, primary fill, 56px tabular value on the right).
 */
export function BarCell({
  value,
  max,
  label,
  ariaLabel,
  className,
}: {
  value: number
  max: number
  /** Shown right of the bar (formatted value). */
  label: ReactNode
  ariaLabel?: string
  className?: string
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0
  return (
    <span className={cn("flex w-full min-w-0 items-center gap-2.5", className)}>
      <span
        role="meter"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-label={ariaLabel}
        className="h-2 min-w-[40px] flex-1 overflow-hidden rounded-full bg-muted"
      >
        <span className="block h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </span>
      <span className="w-14 shrink-0 text-end font-mono text-xs tabular-nums">{label}</span>
    </span>
  )
}

/** "+12%" / "−3%" change vs the previous period and its tone (null when there is no base). */
export function deltaOf(current: number, previous: number | null | undefined): { text: string; tone: "success" | "danger" | "muted" } | null {
  if (previous === null || previous === undefined || !Number.isFinite(previous) || previous === 0) return null
  const pct = Math.round(((current - previous) / previous) * 100)
  if (pct === 0) return { text: "0%", tone: "muted" }
  return { text: `${pct > 0 ? "+" : "−"}${Math.abs(pct)}%`, tone: pct > 0 ? "success" : "danger" }
}
