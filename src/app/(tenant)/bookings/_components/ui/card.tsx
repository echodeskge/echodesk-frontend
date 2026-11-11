"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * Detail card (design booking detail): 10px radius, 1px border, 44px header
 * with a muted icon, 13px semibold title and optional actions; 16px body
 * padding (or `flush` for a list that runs edge to edge).
 */
export function BookingsCard({
  title,
  icon,
  actions,
  children,
  flush,
  className,
  testId,
}: {
  title: ReactNode
  icon?: ReactNode
  actions?: ReactNode
  children: ReactNode
  flush?: boolean
  className?: string
  testId?: string
}) {
  return (
    <section className={cn("min-w-0 overflow-hidden rounded-[10px] border bg-card", className)} data-testid={testId}>
      <div className="flex min-h-11 items-center gap-2 border-b px-4 py-2">
        {icon && <span className="flex shrink-0 text-muted-foreground [&>svg]:h-4 [&>svg]:w-4">{icon}</span>}
        <h2 className="min-w-0 truncate text-[13px] font-semibold">{title}</h2>
        {actions && <div className="ms-auto flex shrink-0 flex-wrap items-center justify-end gap-1.5">{actions}</div>}
      </div>
      <div className={flush ? undefined : "px-4 py-3"}>{children}</div>
    </section>
  )
}

/** Two-column grid of label / value pairs (design "Date & time / Service / Staff / Status"): 12px muted label over a 13px value. */
export function InfoGrid({ items, className, columns = 2 }: { items: { key: string; label: ReactNode; value: ReactNode; hidden?: boolean; testId?: string }[]; className?: string; columns?: 1 | 2 }) {
  return (
    <dl className={cn("grid gap-x-4 gap-y-3", columns === 2 ? "sm:grid-cols-2" : "", className)}>
      {items
        .filter((i) => !i.hidden)
        .map((i) => (
          <div key={i.key} className="flex min-w-0 flex-col gap-0.5" data-testid={i.testId}>
            <dt className="text-xs text-muted-foreground">{i.label}</dt>
            <dd className="min-w-0 text-[13px] [overflow-wrap:anywhere]">{i.value}</dd>
          </div>
        ))}
    </dl>
  )
}

/** Label left / value right rows (payment card): 12px muted label, 13px tabular value. */
export function SummaryRows({
  rows,
  className,
}: {
  rows: { key: string; label: ReactNode; value: ReactNode; hidden?: boolean; strong?: boolean; className?: string; testId?: string }[]
  className?: string
}) {
  return (
    <dl className={cn("flex min-w-0 flex-col gap-1.5 text-[13px] tabular-nums", className)}>
      {rows
        .filter((r) => !r.hidden)
        .map((r) => (
          <div key={r.key} className={cn("flex items-baseline justify-between gap-3", r.className)} data-testid={r.testId}>
            <dt className="text-muted-foreground">{r.label}</dt>
            <dd className={cn("min-w-0 text-end", r.strong && "text-base font-semibold")}>{r.value}</dd>
          </div>
        ))}
    </dl>
  )
}

/**
 * Detail page body: a main column and a 320px side rail of cards from `lg`
 * (1024px); one column below, rail after the main column. Max width 1200px.
 */
export function DetailColumns({ main, rail, className }: { main: ReactNode; rail: ReactNode; className?: string }) {
  return (
    <div className={cn("grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start", className)}>
      <div className="flex min-w-0 flex-col gap-4">{main}</div>
      <aside className="flex min-w-0 flex-col gap-4">{rail}</aside>
    </div>
  )
}
