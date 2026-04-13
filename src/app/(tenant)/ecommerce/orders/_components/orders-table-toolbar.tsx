"use client"

import { useEffect, useState } from "react"
import { Table } from "@tanstack/react-table"
import { Search, Download } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DataTableViewOptions } from "@/components/ui/data-table/data-table-column-toggle"
import { STATUS_OPTIONS } from "../_data/constants"
import { OrderListItem } from "../_types"

interface OrdersTableToolbarProps {
  table: Table<OrderListItem>
  searchQuery: string
  statusFilter: string
  onSearchChange: (value: string) => void
  onStatusFilterChange: (value: string) => void
  onExportAll: () => void
  t: (key: string) => string
}

export function OrdersTableToolbar({
  table,
  searchQuery,
  statusFilter,
  onSearchChange,
  onStatusFilterChange,
  onExportAll,
  t,
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
    <div className="flex items-center gap-2 max-md:w-full max-md:flex-wrap">
      <div className="relative max-md:w-full">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t("searchPlaceholder")}
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="h-9 pl-8 max-md:w-full md:w-60"
          aria-label="Search orders"
        />
      </div>
      <Select value={statusFilter} onValueChange={onStatusFilterChange}>
        <SelectTrigger className="h-9 w-32" aria-label="Filter by status">
          <SelectValue placeholder={t("filterByStatus")} />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((status) => (
            <SelectItem key={status} value={status}>
              {t(`status.${status}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <DataTableViewOptions table={table} />
      <Button variant="outline" size="sm" className="h-9" onClick={onExportAll}>
        <Download className="me-2 h-3.5 w-3.5" />
        Export CSV
      </Button>
    </div>
  )
}
