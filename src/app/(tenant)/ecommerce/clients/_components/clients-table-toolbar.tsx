"use client"

import { useEffect, useState } from "react"
import { Table } from "@tanstack/react-table"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DataTableViewOptions } from "@/components/ui/data-table/data-table-column-toggle"
import { CLIENT_STATUS_OPTIONS } from "../_data/constants"
import { EcommerceClientList } from "@/api/generated/interfaces"

interface ClientsTableToolbarProps {
  table: Table<EcommerceClientList>
  searchQuery: string
  statusFilter: string
  onSearchChange: (value: string) => void
  onStatusFilterChange: (value: string) => void
  t: (key: string) => string
}

export function ClientsTableToolbar({
  table,
  searchQuery,
  statusFilter,
  onSearchChange,
  onStatusFilterChange,
  t,
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
    <div className="flex items-center gap-2 max-md:w-full max-md:flex-wrap">
      <div className="relative max-md:w-full">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t("searchPlaceholder")}
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="h-9 pl-8 max-md:w-full md:w-60"
          aria-label="Search clients"
        />
      </div>
      <Select value={statusFilter} onValueChange={onStatusFilterChange}>
        <SelectTrigger className="h-9 w-32" aria-label="Filter by status">
          <SelectValue placeholder={t("filters.all")} />
        </SelectTrigger>
        <SelectContent>
          {CLIENT_STATUS_OPTIONS.map((status) => (
            <SelectItem key={status} value={status}>
              {t(`filters.${status}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <DataTableViewOptions table={table} />
    </div>
  )
}
