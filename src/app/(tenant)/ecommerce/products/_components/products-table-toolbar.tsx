"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { AlertTriangle } from "lucide-react"
import {
  Segmented,
  Toolbar,
  ToolbarSearch,
  ToolbarSpacer,
  rdButton,
} from "@/app/(tenant)/ecommerce/_components/ui"
import { cn } from "@/lib/utils"
import { PRODUCT_STATUS_LABEL_KEYS, PRODUCT_STATUS_OPTIONS } from "../_data/constants"
import { ColumnsMenu } from "./table-kit"

type StatusOption = (typeof PRODUCT_STATUS_OPTIONS)[number]

interface ProductsTableToolbarProps {
  searchQuery: string
  statusFilter: string
  lowStockOnly: boolean
  lowStockCount: number
  onSearchChange: (value: string) => void
  onStatusFilterChange: (value: string) => void
  onLowStockToggle: () => void
  columns: { id: string; label: string }[]
  hiddenColumns: ReadonlySet<string>
  onHiddenColumnsChange: (hidden: Set<string>) => void
}

/**
 * Products toolbar (44px): status segmented control (same values and
 * `?status=` deep link as the old select), the low-stock toggle with the
 * count of low-stock products on this page, the column menu and the
 * search (debounced 300ms, as before).
 */
export function ProductsTableToolbar({
  searchQuery,
  statusFilter,
  lowStockOnly,
  lowStockCount,
  onSearchChange,
  onStatusFilterChange,
  onLowStockToggle,
  columns,
  hiddenColumns,
  onHiddenColumnsChange,
}: ProductsTableToolbarProps) {
  const t = useTranslations("products")
  const tu = useTranslations("ecommerceUi")
  const [localSearch, setLocalSearch] = useState(searchQuery)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== searchQuery) onSearchChange(localSearch)
    }, 300)
    return () => clearTimeout(timer)
  }, [localSearch, searchQuery, onSearchChange])

  useEffect(() => {
    setLocalSearch(searchQuery)
  }, [searchQuery])

  const options = PRODUCT_STATUS_OPTIONS.map((status) => ({
    value: status,
    label: status === "all" ? tu("all") : t(PRODUCT_STATUS_LABEL_KEYS[status] || status),
  }))

  return (
    <Toolbar testId="ec-products-toolbar">
      <Segmented<StatusOption>
        value={(PRODUCT_STATUS_OPTIONS as readonly string[]).includes(statusFilter) ? (statusFilter as StatusOption) : "all"}
        onChange={onStatusFilterChange}
        options={options}
        ariaLabel={t("filterByStatus")}
        testId="ec-products-status"
      />
      <button
        type="button"
        onClick={onLowStockToggle}
        aria-pressed={lowStockOnly}
        className={cn(
          rdButton.outlineSm,
          lowStockOnly && "border-amber-500/50 bg-amber-500/10 text-amber-800 hover:bg-amber-500/15 dark:text-amber-300"
        )}
        data-testid="ec-products-low-stock"
      >
        <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
        {t("lowStock")}
        {lowStockCount > 0 && !lowStockOnly && (
          <span className="min-w-4 rounded-full bg-amber-500/15 px-1 text-center text-[10px] leading-4 tabular-nums text-amber-800 dark:text-amber-300">
            {lowStockCount}
          </span>
        )}
      </button>
      <ToolbarSpacer />
      <ColumnsMenu columns={columns} hidden={hiddenColumns} onChange={onHiddenColumnsChange} />
      <ToolbarSearch
        value={localSearch}
        onChange={setLocalSearch}
        placeholder={t("searchPlaceholder")}
        clearLabel={tu("clearSearch")}
        testId="ec-products-search"
      />
    </Toolbar>
  )
}
