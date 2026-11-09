"use client"

import type { ReactNode } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export interface StatItem {
  key: string
  label: string
  /** null / undefined = not loaded or not available: shows "—". */
  value: ReactNode | null | undefined
  /** Small line under the value (STATS tile) or the title tooltip (strip). */
  hint?: string
  /** Colour of the hint (STATS `deltaColor`). */
  hintTone?: "muted" | "success" | "danger" | "warning"
  /** Makes the tile a link-like button (e.g. "Team pending" -> team requests). */
  onClick?: () => void
  testId?: string
}

const HINT_TONE = {
  muted: "text-muted-foreground",
  success: "text-green-700 dark:text-green-400",
  danger: "text-destructive",
  warning: "text-amber-700 dark:text-amber-400",
} as const

function display(value: StatItem["value"]) {
  return value === null || value === undefined || value === "" ? "—" : value
}

/**
 * Full-bleed stat strip under the header (design Clients `clientStats`):
 * 1px gaps on the border colour, 11px label, 20px tabular value. Scrolls
 * sideways on narrow screens instead of wrapping.
 */
export function StatStrip({ items, loading, className, testId }: { items: StatItem[]; loading?: boolean; className?: string; testId?: string }) {
  return (
    <div
      className={cn(
        "flex shrink-0 gap-px overflow-x-auto border-b bg-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className
      )}
      data-testid={testId}
    >
      {items.map((item) => {
        const body = (
          <>
            <span className="truncate text-[11px] text-muted-foreground">{item.label}</span>
            {loading ? (
              <Skeleton className="my-0.5 h-5 w-10" />
            ) : (
              <span className="text-xl font-semibold leading-6 tabular-nums tracking-[-.02em]">{display(item.value)}</span>
            )}
          </>
        )
        const cls =
          "flex min-w-[130px] flex-1 flex-col gap-0.5 bg-background px-4 py-2.5 text-start md:min-w-[150px] md:py-3"
        return item.onClick ? (
          <button
            key={item.key}
            type="button"
            onClick={item.onClick}
            title={item.hint ? `${item.label} · ${item.hint}` : item.label}
            className={cn(cls, "transition-colors hover:bg-muted/40")}
            data-testid={item.testId}
          >
            {body}
          </button>
        ) : (
          <div key={item.key} className={cls} title={item.hint ? `${item.label} · ${item.hint}` : item.label} data-testid={item.testId}>
            {body}
          </div>
        )
      })}
    </div>
  )
}

/** One STATS card: 8px radius, 14px 16px padding, 12px label, 24px value, 11px hint. */
export function StatTile({ item, loading, className }: { item: StatItem; loading?: boolean; className?: string }) {
  const body = (
    <>
      {/* Labels and hints wrap to two lines instead of "…": Georgian labels are long. */}
      <span className="line-clamp-2 break-words text-xs leading-4 text-muted-foreground">{item.label}</span>
      {loading ? (
        <Skeleton className="my-0.5 h-6 w-14" />
      ) : (
        <span className="text-2xl font-semibold leading-7 tabular-nums tracking-[-.02em]">{display(item.value)}</span>
      )}
      {item.hint && (
        <span className={cn("line-clamp-2 break-words text-[11px] leading-[14px]", HINT_TONE[item.hintTone ?? "muted"])}>{item.hint}</span>
      )}
    </>
  )
  const cls = cn("flex min-w-0 flex-col gap-1 rounded-lg border bg-card px-4 py-3.5 text-start", className)
  const title = item.hint ? `${item.label} · ${item.hint}` : item.label
  return item.onClick ? (
    <button type="button" onClick={item.onClick} title={title} className={cn(cls, "transition-colors hover:bg-muted/40")} data-testid={item.testId}>
      {body}
    </button>
  ) : (
    <div className={cls} title={title} data-testid={item.testId}>
      {body}
    </div>
  )
}

/** STATS card grid: auto-fit columns of at least 140px, 10px gap (two per row at 390). */
export function StatGrid({ items, loading, className, testId }: { items: StatItem[]; loading?: boolean; className?: string; testId?: string }) {
  return (
    <div className={cn("grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2.5", className)} data-testid={testId}>
      {items.map((item) => (
        <StatTile key={item.key} item={item} loading={loading} />
      ))}
    </div>
  )
}
