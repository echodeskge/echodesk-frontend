"use client"

import type { CSSProperties, KeyboardEvent, MouseEvent, ReactNode } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

/**
 * Where a column goes on a narrow container (below 768px, `@3xl`):
 * - `title`: line 1, grows and truncates (usually the person or the type);
 * - `end`:   line 1, pushed right (status pill, amount);
 * - `meta`:  line 2, muted, joined with " · " (dates, days);
 * - `hidden`: desktop only.
 * - `actions`: line 3 when present (row buttons), right aligned.
 */
export type MobileSlot = "title" | "end" | "meta" | "hidden" | "actions"

export interface Column<T> {
  id: string
  /** Header text (already translated). Empty for action columns. */
  header: ReactNode
  /** CSS grid track on wide containers, e.g. "minmax(0,1.4fr)" or "90px". */
  width: string
  align?: "start" | "end" | "center"
  mobile?: MobileSlot
  cell: (row: T, index: number) => ReactNode
  /** Extra classes on every cell of this column. */
  className?: string
  /** Mono + tabular (ids, amounts). */
  numeric?: boolean
  /** Muted 12px text on wide containers too (dates, "submitted"). Meta cells are always muted on mobile. */
  muted?: boolean
}

export interface DataTableProps<T> {
  columns: Column<T>[]
  /** `undefined` while the first load runs. */
  rows: T[] | undefined
  rowKey: (row: T) => string | number
  /** Opens the row (detail). Clicks on buttons, links and inputs inside the row are ignored. */
  onRowClick?: (row: T) => void
  isRowSelected?: (row: T) => boolean
  /** Extra classes for one row (e.g. a muted, bold totals row). */
  rowClassName?: (row: T) => string | undefined
  loading?: boolean
  /** A load error: replaces the body with the error state (and `onRetry`). */
  error?: unknown
  onRetry?: () => void
  /** Rendered when `rows` is an empty array. */
  empty?: ReactNode
  /**
   * `fill`: the table takes the remaining height and scrolls (full-bleed pages);
   * `card`: bordered 10px card with a muted header (padded pages, design LIST PAGE);
   * `flush`: no border, for inside a `SectionCard`.
   */
  variant?: "fill" | "card" | "flush"
  /** 36px footer line under the rows (count, paging). */
  footer?: ReactNode
  skeletonRows?: number
  ariaLabel: string
  className?: string
  testId?: string
  /** Defaults to `<idPrefix>-table-row`. */
  rowTestId?: string
  /**
   * Prefix of the built-in test ids (`<prefix>-table-row`, `-table-skeleton`,
   * `-table-empty`) and of the grid-template CSS variable alias
   * (`--<prefix>-cols`, next to `--rd-cols`).
   */
  idPrefix?: string
  /** Body shown for `error` (the section's translated error state). */
  renderError: (error: unknown, onRetry?: () => void) => ReactNode
}

const INTERACTIVE = "button, a, input, select, textarea, label, [role='menuitem'], [role='checkbox'], [role='switch'], [data-row-action]"

const ALIGN = { start: "justify-start text-start", end: "justify-end text-end", center: "justify-center text-center" } as const

/** The desktop grid template for a set of columns (exported for tests and skeletons). */
export function gridTemplate<T>(columns: Column<T>[]): string {
  return columns.map((c) => c.width).join(" ")
}

function slotOf<T>(c: Column<T>): MobileSlot {
  return c.mobile ?? "meta"
}

/** True when a click started on an interactive child of the row (it must not open the row). */
export function isFromInteractive(target: EventTarget | null, row: Element): boolean {
  if (!(target instanceof Element)) return false
  const hit = target.closest(INTERACTIVE)
  return !!hit && hit !== row && row.contains(hit)
}

/**
 * Redesign data table (promoted from the leave redesign): a sticky 32px header and 40px rows on wide containers
 * (tickets list), two-line rows on narrow ones (title + end on line 1, meta
 * on line 2, actions on line 3). Desktop columns keep their order through CSS
 * `order`; the mobile lines are `display: contents` wrappers on desktop.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  isRowSelected,
  rowClassName,
  loading,
  error,
  onRetry,
  empty,
  variant = "fill",
  footer,
  skeletonRows = 6,
  ariaLabel,
  className,
  testId,
  idPrefix = "rd",
  rowTestId = `${idPrefix}-table-row`,
  renderError,
}: DataTableProps<T>) {
  const template = gridTemplate(columns)
  const style = { "--rd-cols": template, [`--${idPrefix}-cols`]: template } as CSSProperties
  const grid = "@3xl:grid @3xl:grid-cols-[var(--rd-cols)] @3xl:gap-x-3"
  const showError = !!error && !loading
  const showSkeleton = !showError && (loading || rows === undefined)
  const list = rows ?? []

  const header = (
    <div
      role="row"
      className={cn(
        "sticky top-0 z-[1] hidden h-8 items-center border-b px-4 text-[11px] font-medium uppercase tracking-[.03em] text-muted-foreground",
        grid,
        variant === "card" ? "bg-muted/40 backdrop-blur-sm" : "bg-background"
      )}
    >
      {columns.map((c) => (
        <span
          key={c.id}
          role="columnheader"
          className={cn("flex min-w-0 items-center truncate", ALIGN[c.align ?? "start"])}
        >
          {c.header}
        </span>
      ))}
    </div>
  )

  const renderCell = (c: Column<T>, row: T, index: number, colIndex: number) => {
    const slot = slotOf(c)
    return (
      <span
        key={c.id}
        role="cell"
        style={{ order: colIndex }}
        className={cn(
          "min-w-0 items-center @3xl:flex",
          ALIGN[c.align ?? "start"],
          c.numeric && "font-mono text-xs tabular-nums",
          slot === "hidden" && "hidden",
          slot === "title" && "flex flex-1 truncate",
          slot === "end" && "flex shrink-0",
          slot === "meta" &&
            "flex shrink-0 text-xs text-muted-foreground before:me-1.5 before:content-['·'] first:before:content-none @3xl:before:content-none",
          slot === "meta" && !c.muted && !c.numeric && "@3xl:text-[13px] @3xl:text-foreground",
          slot === "meta" && c.numeric && "@3xl:text-foreground",
          slot !== "meta" && c.muted && "text-xs text-muted-foreground",
          slot === "actions" && "flex shrink-0",
          c.className
        )}
      >
        {c.cell(row, index)}
      </span>
    )
  }

  const body = showError ? (
    renderError(error, onRetry)
  ) : showSkeleton ? (
    <div aria-hidden data-testid={`${idPrefix}-table-skeleton`}>
      {Array.from({ length: skeletonRows }, (_, i) => (
        <div key={i} className={cn("flex h-[52px] flex-col justify-center gap-1.5 border-b px-4 @3xl:h-10", grid, "@3xl:items-center")}>
          {columns.map((c, ci) => (
            <Skeleton
              key={c.id}
              className={cn(
                "h-3",
                ci === 0 ? "w-2/5 @3xl:w-3/5" : "hidden w-1/2 @3xl:block",
                ci === 1 && "block w-1/4 @3xl:w-1/2"
              )}
            />
          ))}
        </div>
      ))}
    </div>
  ) : list.length === 0 ? (
    <div data-testid={`${idPrefix}-table-empty`}>{empty}</div>
  ) : (
    list.map((row, index) => {
      const selected = isRowSelected?.(row) ?? false
      const clickable = !!onRowClick
      const onClick = (e: MouseEvent<HTMLDivElement>) => {
        if (!onRowClick || isFromInteractive(e.target, e.currentTarget)) return
        onRowClick(row)
      }
      const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        if (!onRowClick || e.target !== e.currentTarget) return
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onRowClick(row)
        }
      }
      const byslot = (slot: MobileSlot) => columns.map((c, ci) => [c, ci] as const).filter(([c]) => slotOf(c) === slot)
      const line1 = columns.map((c, ci) => [c, ci] as const).filter(([c]) => ["title", "end", "hidden"].includes(slotOf(c)))
      const line2 = byslot("meta")
      const line3 = byslot("actions")
      return (
        <div
          key={rowKey(row)}
          role="row"
          tabIndex={clickable ? 0 : undefined}
          aria-selected={isRowSelected ? selected : undefined}
          onClick={clickable ? onClick : undefined}
          onKeyDown={clickable ? onKeyDown : undefined}
          data-testid={rowTestId}
          className={cn(
            "flex min-h-[52px] flex-col justify-center gap-1 border-b px-4 py-2 text-[13px] @3xl:h-10 @3xl:min-h-0 @3xl:items-center @3xl:py-0",
            grid,
            clickable && "cursor-pointer outline-none hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
            selected && "bg-muted/50",
            rowClassName?.(row)
          )}
        >
          <span role="none" className="flex min-w-0 items-center gap-2 @3xl:contents">
            {line1.map(([c, ci]) => renderCell(c, row, index, ci))}
          </span>
          {line2.length > 0 && (
            <span role="none" className="flex min-w-0 flex-wrap items-center gap-x-1.5 @3xl:contents">
              {line2.map(([c, ci]) => renderCell(c, row, index, ci))}
            </span>
          )}
          {line3.length > 0 && (
            <span role="none" className="flex min-w-0 items-center justify-end gap-1.5 pt-1 @3xl:contents">
              {line3.map(([c, ci]) => renderCell(c, row, index, ci))}
            </span>
          )}
        </div>
      )
    })
  )

  return (
    <div
      role="table"
      aria-label={ariaLabel}
      aria-busy={showSkeleton || undefined}
      style={style}
      data-testid={testId}
      className={cn(
        "@container flex min-w-0 flex-col",
        variant === "fill" && "min-h-0 flex-1",
        variant === "card" && "overflow-hidden rounded-[10px] border bg-card",
        className
      )}
    >
      <div className={cn("min-w-0", variant === "fill" && "min-h-0 flex-1 overflow-auto")}>
        {header}
        <div role="rowgroup" className={cn(variant !== "fill" && "[&>[role=row]:last-child]:border-b-0")}>{body}</div>
      </div>
      {footer && (
        <div className="flex h-9 shrink-0 items-center gap-2 border-t px-4 text-[11px] text-muted-foreground tabular-nums">
          {footer}
        </div>
      )}
    </div>
  )
}
