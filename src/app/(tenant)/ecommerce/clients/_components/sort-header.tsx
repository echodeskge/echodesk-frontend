"use client"

import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ClientSort, ClientSortKey } from "../_lib/sort"

/** A sortable 11px table header label (button, `aria-sort` on the column header text). */
export function SortHeader({
  label,
  sortKey,
  sort,
  onSort,
  sortLabel,
  align = "start",
}: {
  label: string
  sortKey: ClientSortKey
  sort: ClientSort | null
  onSort: (key: ClientSortKey) => void
  /** Translated "Sort by {column}". */
  sortLabel: string
  align?: "start" | "end"
}) {
  const active = sort?.key === sortKey
  const Icon = !active ? ChevronsUpDown : sort.desc ? ArrowDown : ArrowUp
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      aria-label={sortLabel}
      aria-pressed={active}
      title={sortLabel}
      data-sort={active ? (sort.desc ? "desc" : "asc") : undefined}
      className={cn(
        "-mx-1 inline-flex min-w-0 items-center gap-1 rounded px-1 uppercase tracking-[.03em] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active && "text-foreground",
        align === "end" && "flex-row-reverse"
      )}
    >
      <span className="truncate">{label}</span>
      <Icon aria-hidden className={cn("h-3 w-3 shrink-0", !active && "opacity-50")} />
    </button>
  )
}
