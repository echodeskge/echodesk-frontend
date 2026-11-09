"use client"

import type { ReactNode } from "react"
import { X } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { rdButton } from "@/components/redesign/buttons"
import { cn } from "@/lib/utils"
import type { EcColumn } from "./data-table"

/** Toggle one id in a selection set (returns a new set). */
export function toggleId(selected: ReadonlySet<number>, id: number): Set<number> {
  const next = new Set(selected)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  return next
}

/** Select every id on the page, or clear them all when they are all selected already. */
export function toggleAll(selected: ReadonlySet<number>, ids: number[]): Set<number> {
  const all = ids.length > 0 && ids.every((id) => selected.has(id))
  return all ? new Set() : new Set(ids)
}

/**
 * A 28px checkbox column for `EcTable` (bulk actions on orders and products).
 * The header checkbox selects the visible page (indeterminate when some are
 * selected). Clicks on the checkboxes never open the row. On mobile the
 * checkbox sits on line 1 before the title.
 */
export function selectionColumn<T>({
  rows,
  getId,
  selected,
  onChange,
  selectAllLabel,
  selectRowLabel,
}: {
  rows: T[]
  getId: (row: T) => number
  selected: ReadonlySet<number>
  onChange: (next: Set<number>) => void
  /** Translated "Select all on this page". */
  selectAllLabel: string
  /** Translated "Select row" (the row's title is appended for screen readers by the caller if wanted). */
  selectRowLabel: (row: T) => string
}): EcColumn<T> {
  const ids = rows.map(getId)
  const count = ids.filter((id) => selected.has(id)).length
  const state: boolean | "indeterminate" = count === 0 ? false : count === ids.length ? true : "indeterminate"
  return {
    id: "select",
    width: "28px",
    mobile: "title",
    className: "flex-none",
    header: (
      <Checkbox
        checked={state}
        disabled={ids.length === 0}
        onCheckedChange={() => onChange(toggleAll(selected, ids))}
        aria-label={selectAllLabel}
        className="size-4"
      />
    ),
    cell: (row) => {
      const id = getId(row)
      return (
        <Checkbox
          checked={selected.has(id)}
          onCheckedChange={() => onChange(toggleId(selected, id))}
          aria-label={selectRowLabel(row)}
          className="size-4"
        />
      )
    },
  }
}

/**
 * Replaces the toolbar while rows are selected: "3 selected", the bulk
 * actions (28px buttons) and a clear button. Same height as the toolbar
 * (44px) so the table does not jump.
 */
export function BulkBar({
  count,
  label,
  clearLabel,
  onClear,
  children,
  className,
}: {
  count: number
  /** Translated "{count} selected". */
  label: string
  clearLabel: string
  onClear: () => void
  children: ReactNode
  className?: string
}) {
  if (count <= 0) return null
  return (
    <div
      role="toolbar"
      aria-label={label}
      className={cn("flex min-h-11 min-w-0 shrink-0 flex-wrap items-center gap-2 border-b bg-muted/40 px-4 py-1.5", className)}
      data-testid="ec-bulk-bar"
    >
      <button type="button" onClick={onClear} className={rdButton.ghostIconSm} aria-label={clearLabel} title={clearLabel}>
        <X className="h-3.5 w-3.5" aria-hidden />
      </button>
      <span className="text-xs font-medium tabular-nums">{label}</span>
      <span aria-hidden className="ms-auto" />
      <div className="flex flex-wrap items-center gap-1.5">{children}</div>
    </div>
  )
}
