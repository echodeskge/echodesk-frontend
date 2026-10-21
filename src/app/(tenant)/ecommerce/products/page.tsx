"use client"

import { useState, useCallback, useEffect } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useProducts, useProduct } from "@/hooks/useProducts"
import { AddProductSheet } from "@/components/products/AddProductSheet"
import { EditProductSheet } from "@/components/products/EditProductSheet"
import { toast } from "sonner"
import axiosInstance from "@/api/axios"
import type { Locale } from "@/lib/i18n"
import { ProductsTable } from "./_components/products-table"
import { getApiErrorMessage } from "@/lib/utils"

const DEFAULT_PAGE_SIZE = 20

export default function ProductsPage() {
  const locale = useLocale() as Locale
  const t = useTranslations("products")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("active")
  const [lowStockOnly, setLowStockOnly] = useState(false)
  // Set from the low-stock notification link (?stock=low_or_out); it also
  // covers sold-out products, which low_stock=true leaves out.
  const [stockFilter, setStockFilter] = useState<"low" | "out" | "low_or_out" | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [isAddProductOpen, setIsAddProductOpen] = useState(false)
  const [isEditProductOpen, setIsEditProductOpen] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null)
  const [selectedProductIds, setSelectedProductIds] = useState<Set<number>>(
    new Set()
  )
  const [bulkActionLoading, setBulkActionLoading] = useState(false)

  const {
    data: productsData,
    isLoading,
    refetch,
  } = useProducts({
    search: searchQuery || undefined,
    status: (statusFilter === "all" ? undefined : statusFilter) as
      | "active"
      | "draft"
      | "inactive"
      | "out_of_stock"
      | undefined,
    low_stock: (lowStockOnly && !stockFilter) || undefined,
    stock: (lowStockOnly && stockFilter) || undefined,
    page,
  })

  // Deep links from notifications: ?status=&stock= (low-stock digest) and
  // ?edit=<id> (single low-stock product). Re-applied whenever the query
  // string changes, e.g. clicking another notification while on this page.
  const searchParams = useSearchParams()
  const searchKey = searchParams?.toString() ?? ""
  useEffect(() => {
    const params = new URLSearchParams(searchKey)
    const status = params.get("status")
    if (status && ["all", "active", "draft", "inactive", "out_of_stock"].includes(status)) {
      setStatusFilter(status)
    }
    const stock = params.get("stock")
    if (stock === "low" || stock === "out" || stock === "low_or_out") {
      setStockFilter(stock)
      setLowStockOnly(true)
    } else if (params.get("low_stock") === "true") {
      setLowStockOnly(true)
    }
    const edit = Number(params.get("edit"))
    if (Number.isInteger(edit) && edit > 0) {
      setSelectedProductId(edit)
      setIsEditProductOpen(true)
    }
  }, [searchKey])

  const { data: selectedProduct } = useProduct(selectedProductId!)

  const products = productsData?.results || []
  const totalCount = productsData?.count || 0
  const lowStockCount = products.filter((p) => p.is_low_stock).length

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value)
    setPage(1)
    setSelectedProductIds(new Set())
  }, [])

  const handleStatusFilterChange = useCallback((value: string) => {
    setStatusFilter(value)
    setPage(1)
    setSelectedProductIds(new Set())
  }, [])

  const handleLowStockToggle = useCallback(() => {
    setLowStockOnly((prev) => !prev)
    setStockFilter(null)
    setPage(1)
    setSelectedProductIds(new Set())
  }, [])

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage)
    setSelectedProductIds(new Set())
  }, [])

  const handlePageSizeChange = useCallback((newSize: number) => {
    setPageSize(newSize)
    setPage(1)
    setSelectedProductIds(new Set())
  }, [])

  const handleEditProduct = useCallback((productId: number) => {
    setSelectedProductId(productId)
    setIsEditProductOpen(true)
  }, [])

  const handleSelectionChange = useCallback((ids: Set<number>) => {
    setSelectedProductIds(ids)
  }, [])

  const handleBulkStatusChange = useCallback(
    async (newStatus: string) => {
      if (selectedProductIds.size === 0) return
      setBulkActionLoading(true)
      try {
        await axiosInstance.post("/api/ecommerce/admin/products/bulk-update/", {
          product_ids: Array.from(selectedProductIds),
          status: newStatus,
        })
        toast.success(
          `${selectedProductIds.size} products updated to ${newStatus}`
        )
        setSelectedProductIds(new Set())
        refetch()
      } catch (error) {
        toast.error(getApiErrorMessage(error, "Failed to update products. Please try again."))
      } finally {
        setBulkActionLoading(false)
      }
    },
    [selectedProductIds, refetch]
  )

  return (
    <section className="container p-4">
      <ProductsTable
        data={products}
        totalCount={totalCount}
        page={page}
        pageSize={pageSize}
        loading={isLoading}
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        lowStockOnly={lowStockOnly}
        lowStockCount={lowStockCount}
        locale={locale}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onSearchChange={handleSearchChange}
        onStatusFilterChange={handleStatusFilterChange}
        onLowStockToggle={handleLowStockToggle}
        onAddProduct={() => setIsAddProductOpen(true)}
        onEditProduct={handleEditProduct}
        onSelectionChange={handleSelectionChange}
        t={t}
      />

      {/* Floating Bulk Actions Bar */}
      {selectedProductIds.size > 0 && (
        <div
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 transform"
          role="region"
          aria-live="polite"
          aria-label="Selection actions"
        >
          <div className="flex items-center gap-3 rounded-lg border bg-background px-6 py-3 shadow-lg">
            <span className="text-sm font-medium">
              {t("bulkActions.selected").replace(
                "{count}",
                String(selectedProductIds.size)
              )}
            </span>
            <Select
              onValueChange={(value) => handleBulkStatusChange(value)}
              disabled={bulkActionLoading}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder={t("bulkActions.changeStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">{t("active")}</SelectItem>
                <SelectItem value="draft">{t("draft")}</SelectItem>
                <SelectItem value="inactive">{t("inactive")}</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedProductIds(new Set())}
            >
              {t("bulkActions.clear")}
            </Button>
          </div>
        </div>
      )}

      <AddProductSheet
        open={isAddProductOpen}
        onOpenChange={setIsAddProductOpen}
      />
      <EditProductSheet
        open={isEditProductOpen}
        onOpenChange={setIsEditProductOpen}
        product={selectedProduct || null}
      />
    </section>
  )
}
