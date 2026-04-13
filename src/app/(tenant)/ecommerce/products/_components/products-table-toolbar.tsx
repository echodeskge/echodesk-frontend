"use client"

import { useEffect, useState } from "react"
import { Table } from "@tanstack/react-table"
import { Search, Plus, AlertTriangle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DataTableViewOptions } from "@/components/ui/data-table/data-table-column-toggle"
import { PRODUCT_STATUS_OPTIONS } from "../_data/constants"
import { ProductList } from "@/api/generated/interfaces"

interface ProductsTableToolbarProps {
  table: Table<ProductList>
  searchQuery: string
  statusFilter: string
  lowStockOnly: boolean
  lowStockCount: number
  onSearchChange: (value: string) => void
  onStatusFilterChange: (value: string) => void
  onLowStockToggle: () => void
  onAddProduct: () => void
  t: (key: string) => string
}

export function ProductsTableToolbar({
  table,
  searchQuery,
  statusFilter,
  lowStockOnly,
  lowStockCount,
  onSearchChange,
  onStatusFilterChange,
  onLowStockToggle,
  onAddProduct,
  t,
}: ProductsTableToolbarProps) {
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
          aria-label="Search products"
        />
      </div>
      <Select value={statusFilter} onValueChange={onStatusFilterChange}>
        <SelectTrigger className="h-9 w-32" aria-label="Filter by status">
          <SelectValue placeholder={t("allStatus")} />
        </SelectTrigger>
        <SelectContent>
          {PRODUCT_STATUS_OPTIONS.map((status) => (
            <SelectItem key={status} value={status}>
              {status === "all" ? t("allStatus") : t(status)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant={lowStockOnly ? "default" : "outline"}
        size="sm"
        className="h-9"
        onClick={onLowStockToggle}
      >
        <AlertTriangle className="me-2 h-3.5 w-3.5" />
        {t("lowStock")}
        {lowStockCount > 0 && !lowStockOnly && (
          <Badge variant="destructive" className="ml-1 h-4 px-1 text-[10px]">
            {lowStockCount}
          </Badge>
        )}
      </Button>
      <DataTableViewOptions table={table} />
      <Button size="sm" className="h-9" onClick={onAddProduct}>
        <Plus className="me-2 h-3.5 w-3.5" />
        {t("addProduct")}
      </Button>
    </div>
  )
}
