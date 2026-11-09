"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * Detail page body (order, client): a main column and a 320px side rail of
 * cards from `lg` (1024px); one column below, rail after the main column
 * (`railFirst` puts it first on phones, e.g. the order status card).
 * Max width 1200px, 16px gutter (24px from `sm`).
 */
export function DetailLayout({
  main,
  rail,
  header,
  className,
  testId,
}: {
  /** Full-width block above both columns (the summary card with id, status, actions). */
  header?: ReactNode
  main: ReactNode
  rail: ReactNode
  className?: string
  testId?: string
}) {
  return (
    <section className={cn("w-full p-4 sm:p-6", className)} data-testid={testId}>
      <div className="flex w-full max-w-[1200px] min-w-0 flex-col gap-4">
        {header}
        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <div className="flex min-w-0 flex-col gap-4">{main}</div>
          <aside className="flex min-w-0 flex-col gap-4">{rail}</aside>
        </div>
      </div>
    </section>
  )
}

/**
 * Side-rail / main card: 8px radius, 1px border, 44px header (13px semibold
 * title, optional icon and actions), body padding 16px (or `flush` for a
 * table / list that runs edge to edge).
 */
export function InfoCard({
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
    <section className={cn("min-w-0 overflow-hidden rounded-lg border bg-card", className)} data-testid={testId}>
      <div className="flex min-h-11 items-center gap-2 border-b px-4 py-2">
        {icon && <span className="flex shrink-0 text-muted-foreground [&>svg]:h-4 [&>svg]:w-4">{icon}</span>}
        <h2 className="min-w-0 truncate text-[13px] font-semibold">{title}</h2>
        {actions && <div className="ms-auto flex shrink-0 items-center gap-1.5">{actions}</div>}
      </div>
      <div className={flush ? undefined : "px-4 py-3"}>{children}</div>
    </section>
  )
}

/** Label / value rows (12px muted label left, 13px value right; wraps on phones). */
export function InfoRows({ rows, className }: { rows: { key: string; label: ReactNode; value: ReactNode; hidden?: boolean }[]; className?: string }) {
  return (
    <dl className={cn("flex min-w-0 flex-col", className)}>
      {rows
        .filter((r) => !r.hidden)
        .map((r) => (
          <div key={r.key} className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-1.5">
            <dt className="text-xs text-muted-foreground">{r.label}</dt>
            <dd className="min-w-0 break-words text-end text-[13px]">{r.value}</dd>
          </div>
        ))}
    </dl>
  )
}

/** Money summary lines (subtotal, shipping, tax, discount) and a bold total line, all tabular. */
export function SummaryRows({
  rows,
  total,
  className,
}: {
  rows: { key: string; label: ReactNode; value: ReactNode; hidden?: boolean }[]
  total?: { label: ReactNode; value: ReactNode }
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-1.5 text-[13px] tabular-nums", className)}>
      {rows
        .filter((r) => !r.hidden)
        .map((r) => (
          <div key={r.key} className="flex items-baseline justify-between gap-3">
            <span className="text-muted-foreground">{r.label}</span>
            <span>{r.value}</span>
          </div>
        ))}
      {total && (
        <div className="mt-1 flex items-baseline justify-between gap-3 border-t pt-2 text-sm font-semibold">
          <span>{total.label}</span>
          <span>{total.value}</span>
        </div>
      )}
    </div>
  )
}
