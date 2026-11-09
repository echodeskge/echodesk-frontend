"use client"

import { useEffect, useState } from "react"
import { Segmented, Toolbar, ToolbarSearch, ToolbarSpacer } from "../../_components/ui"
import { STATUS_OPTIONS } from "../_data/constants"

type Translate = (key: string, values?: Record<string, string | number>) => string

interface OrdersTableToolbarProps {
  searchQuery: string
  statusFilter: string
  onSearchChange: (value: string) => void
  onStatusFilterChange: (value: string) => void
  t: Translate
  tUi: Translate
}

/** Status filter (server `status`) and debounced search (server `search`, 300ms as before). */
export function OrdersTableToolbar({
  searchQuery,
  statusFilter,
  onSearchChange,
  onStatusFilterChange,
  t,
  tUi,
}: OrdersTableToolbarProps) {
  const [localSearch, setLocalSearch] = useState(searchQuery)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== searchQuery) {
        onSearchChange(localSearch)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [localSearch, searchQuery, onSearchChange])

  // Sync external search changes
  useEffect(() => {
    setLocalSearch(searchQuery)
  }, [searchQuery])

  return (
    <Toolbar testId="ec-orders-toolbar">
      <Segmented
        value={statusFilter}
        onChange={onStatusFilterChange}
        ariaLabel={t("filterByStatus")}
        options={STATUS_OPTIONS.map((s) => ({ value: s, label: s === "all" ? tUi("all") : t(`status.${s}`) }))}
        className="max-w-full"
        testId="ec-orders-status"
      />
      <ToolbarSpacer />
      <ToolbarSearch
        value={localSearch}
        onChange={setLocalSearch}
        placeholder={t("searchPlaceholder")}
        clearLabel={tUi("clearSearch")}
        className="max-sm:max-w-none"
        testId="ec-orders-search"
      />
    </Toolbar>
  )
}
