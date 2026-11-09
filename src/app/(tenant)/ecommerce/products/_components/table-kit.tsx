"use client"

import { ArrowDown, ArrowUp, ChevronsUpDown, Settings2 } from "lucide-react"
import { useTranslations } from "next-intl"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { rdButton } from "@/app/(tenant)/ecommerce/_components/ui"
import { cn } from "@/lib/utils"
import { nextSort, type SortState } from "../_lib/table-kit"

/**
 * A sortable 11px table header (click: ascending, descending, off). The
 * arrow shows the current direction; unsorted columns show a faint
 * up/down icon on hover and focus.
 */
export function SortHeader({
  id,
  label,
  sort,
  onSortChange,
  align = "start",
}: {
  id: string
  label: string
  sort: SortState | null
  onSortChange: (sort: SortState | null) => void
  align?: "start" | "end"
}) {
  const t = useTranslations("ecommerceUi")
  const active = sort?.id === id ? sort.direction : null
  const Icon = active === "asc" ? ArrowUp : active === "desc" ? ArrowDown : ChevronsUpDown
  return (
    <button
      type="button"
      onClick={() => onSortChange(nextSort(sort, id))}
      className={cn(
        "group -mx-1 inline-flex h-6 min-w-0 items-center gap-1 rounded px-1 uppercase tracking-[.03em] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        align === "end" && "flex-row-reverse",
        active && "text-foreground"
      )}
      aria-label={t(active === "asc" ? "sortedAsc" : active === "desc" ? "sortedDesc" : "sortBy", { column: label })}
      title={t(active === "asc" ? "sortedAsc" : active === "desc" ? "sortedDesc" : "sortBy", { column: label })}
      data-testid={`ec-sort-${id}`}
      data-sort={active ?? "none"}
    >
      <span className="truncate">{label}</span>
      <Icon
        aria-hidden
        className={cn(
          "h-3 w-3 shrink-0",
          !active && "opacity-0 transition-opacity group-hover:opacity-60 group-focus-visible:opacity-60"
        )}
      />
    </button>
  )
}

/** "View" menu: which optional columns the table shows (translated column names). */
export function ColumnsMenu({
  columns,
  hidden,
  onChange,
}: {
  columns: { id: string; label: string }[]
  hidden: ReadonlySet<string>
  onChange: (hidden: Set<string>) => void
}) {
  const t = useTranslations("common.table")
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className={rdButton.outlineSm} data-testid="ec-columns-menu">
          <Settings2 className="h-3.5 w-3.5" aria-hidden />
          <span className="hidden sm:inline">{t("view")}</span>
          <span className="sr-only sm:hidden">{t("toggleColumns")}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuLabel className="text-xs">{t("toggleColumns")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {columns.map((c) => (
          <DropdownMenuCheckboxItem
            key={c.id}
            className="text-[13px]"
            checked={!hidden.has(c.id)}
            onSelect={(e) => e.preventDefault()}
            onCheckedChange={(checked) => {
              const next = new Set(hidden)
              if (checked) next.delete(c.id)
              else next.add(c.id)
              onChange(next)
            }}
          >
            {c.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
