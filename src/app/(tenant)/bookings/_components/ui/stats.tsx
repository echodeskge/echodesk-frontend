"use client"

import type { LucideIcon } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export { StatStrip, StatTile, StatGrid } from "@/components/redesign/stats"
export type { StatItem } from "@/components/redesign/stats"

export interface BookingsStatItem {
  key: string
  label: string
  /** null / undefined = not loaded: shows "—". */
  value: string | number | null | undefined
  /** Small line under the value (design "Scheduled for today"). */
  hint?: string
  /** Colour of the value (design: Pending amber, Confirmed blue, Completed green). */
  tone?: "default" | "warning" | "info" | "success"
  /** Muted icon in the top-right corner (design dashboard tiles). */
  icon?: LucideIcon
  href?: string
  testId?: string
}

const VALUE_TONE = {
  default: "",
  warning: "text-amber-600 dark:text-amber-400",
  info: "text-blue-600 dark:text-blue-400",
  success: "text-green-600 dark:text-green-400",
} as const

/**
 * Design stat tile (dashboard / bookings list): 10px radius card, 12px muted
 * label with an optional icon on the right, 24px value, 11px hint.
 */
export function BookingsStatTile({ item, loading, className }: { item: BookingsStatItem; loading?: boolean; className?: string }) {
  const Icon = item.icon
  const value = item.value === null || item.value === undefined || item.value === "" ? "—" : item.value
  return (
    <div
      className={cn("flex min-w-0 flex-col gap-1 rounded-[10px] border bg-card px-4 py-3.5 text-start", className)}
      data-testid={item.testId}
      title={item.hint ? `${item.label} · ${item.hint}` : item.label}
    >
      <span className="flex items-start justify-between gap-2">
        <span className="line-clamp-2 break-words text-xs leading-4 text-muted-foreground">{item.label}</span>
        {Icon && <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />}
      </span>
      {loading ? (
        <Skeleton className="my-0.5 h-6 w-14" />
      ) : (
        <span className={cn("text-2xl font-semibold leading-7 tabular-nums tracking-[-.02em]", VALUE_TONE[item.tone ?? "default"])} data-testid={item.testId ? `${item.testId}-value` : undefined}>
          {value}
        </span>
      )}
      {item.hint && <span className="line-clamp-2 break-words text-[11px] leading-[14px] text-muted-foreground">{item.hint}</span>}
    </div>
  )
}

/** Grid of `BookingsStatTile`s: auto-fit columns of at least 160px, 10px gap (two per row at 390). */
export function BookingsStatGrid({ items, loading, className, testId }: { items: BookingsStatItem[]; loading?: boolean; className?: string; testId?: string }) {
  return (
    <div className={cn("grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-2.5", className)} data-testid={testId}>
      {items.map((item) => (
        <BookingsStatTile key={item.key} item={item} loading={loading} />
      ))}
    </div>
  )
}
