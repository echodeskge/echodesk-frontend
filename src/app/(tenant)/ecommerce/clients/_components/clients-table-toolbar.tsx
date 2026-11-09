"use client"

import { useEffect, useState } from "react"
import { Segmented, Toolbar, ToolbarSearch, ToolbarSpacer } from "@/app/(tenant)/ecommerce/_components/ui"
import { CLIENT_STATUS_OPTIONS } from "../_data/constants"

type Status = (typeof CLIENT_STATUS_OPTIONS)[number]

interface ClientsTableToolbarProps {
  searchQuery: string
  statusFilter: string
  onSearchChange: (value: string) => void
  onStatusFilterChange: (value: string) => void
  t: (key: string) => string
  clearSearchLabel: string
  /** Short "All" for the first segment. */
  allLabel: string
}

/** Status segments (all / active / inactive) left, debounced search (300ms, as before) right. */
export function ClientsTableToolbar({
  searchQuery,
  statusFilter,
  onSearchChange,
  onStatusFilterChange,
  t,
  clearSearchLabel,
  allLabel,
}: ClientsTableToolbarProps) {
  const [localSearch, setLocalSearch] = useState(searchQuery)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== searchQuery) {
        onSearchChange(localSearch)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [localSearch, searchQuery, onSearchChange])

  useEffect(() => {
    setLocalSearch(searchQuery)
  }, [searchQuery])

  return (
    <Toolbar testId="clients-toolbar">
      <Segmented<Status>
        ariaLabel={t("table.status")}
        value={(CLIENT_STATUS_OPTIONS as readonly string[]).includes(statusFilter) ? (statusFilter as Status) : "all"}
        onChange={onStatusFilterChange}
        options={CLIENT_STATUS_OPTIONS.map((s) => ({ value: s, label: s === "all" ? allLabel : t(`filters.${s}`) }))}
        testId="clients-status-filter"
      />
      <ToolbarSpacer />
      <ToolbarSearch
        value={localSearch}
        onChange={setLocalSearch}
        placeholder={t("searchPlaceholder")}
        clearLabel={clearSearchLabel}
        testId="clients-search"
        className="max-w-[300px]"
      />
    </Toolbar>
  )
}
