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
  /** Store admins: "Active | Cleaned" switch (cleaned = hidden orders, URL `?cleaned=1`). */
  showCleanedToggle?: boolean
  cleaned?: boolean
  onCleanedChange?: (cleaned: boolean) => void
  t: Translate
  tUi: Translate
}

/** Status filter (server `status`) and debounced search (server `search`, 300ms as before). */
export function OrdersTableToolbar({
  searchQuery,
  statusFilter,
  onSearchChange,
  onStatusFilterChange,
  showCleanedToggle,
  cleaned,
  onCleanedChange,
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
      {showCleanedToggle && (
        <Segmented
          value={cleaned ? "cleaned" : "active"}
          onChange={(v) => onCleanedChange?.(v === "cleaned")}
          ariaLabel={t("cleaned.viewLabel")}
          options={[
            { value: "active", label: t("cleaned.active") },
            { value: "cleaned", label: t("cleaned.cleaned") },
          ]}
          testId="ec-orders-cleaned"
        />
      )}
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
