"use client"

import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"

export interface SortState {
  id: string
  desc: boolean
}

/** Next sort state after clicking a column: ascending, then descending, then off (as the old table headers). */
export function nextSort(current: SortState | null, id: string): SortState | null {
  if (!current || current.id !== id) return { id, desc: false }
  if (!current.desc) return { id, desc: true }
  return null
}

/** Sorts a copy of the rows with `value` (strings compare locale-aware, numbers numerically, empty last). */
export function sortRows<T>(rows: T[], sort: SortState | null, value: (row: T, id: string) => string | number | null | undefined): T[] {
  if (!sort) return rows
  const dir = sort.desc ? -1 : 1
  return [...rows].sort((a, b) => {
    const va = value(a, sort.id)
    const vb = value(b, sort.id)
    const ea = va === null || va === undefined || va === ""
    const eb = vb === null || vb === undefined || vb === ""
    if (ea || eb) return ea === eb ? 0 : ea ? 1 : -1
    if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir
    return String(va).localeCompare(String(vb), undefined, { numeric: true, sensitivity: "base" }) * dir
  })
}

/**
 * Clickable 11px column header that sorts the rows of the current page
 * (the orders API is paged; sorting is client-side as before).
 */
export function SortHeader({
  id,
  label,
  sort,
  onSort,
  align = "start",
  ariaLabel,
}: {
  id: string
  label: string
  sort: SortState | null
  onSort: (next: SortState | null) => void
  align?: "start" | "end"
  /** Translated "Sort by {column}". */
  ariaLabel: string
}) {
  const active = sort?.id === id
  const Icon = !active ? ChevronsUpDown : sort.desc ? ArrowDown : ArrowUp
  return (
    <button
      type="button"
      onClick={() => onSort(nextSort(sort, id))}
      aria-label={ariaLabel}
      title={ariaLabel}
      aria-pressed={active}
      data-sort={active ? (sort.desc ? "desc" : "asc") : undefined}
      className={cn(
        "-mx-1 inline-flex min-w-0 items-center gap-1 rounded px-1 uppercase tracking-[.03em] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        align === "end" && "flex-row-reverse",
        active && "text-foreground"
      )}
    >
      <span className="truncate">{label}</span>
      <Icon aria-hidden className={cn("h-3 w-3 shrink-0", !active && "opacity-50")} />
    </button>
  )
}
