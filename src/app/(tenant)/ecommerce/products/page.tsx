"use client"

import { useState, useCallback } from "react"
import { useLocale, useTranslations } from "next-intl"
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

const DEFAULT_PAGE_SIZE = 20

export default function ProductsPage() {
  const locale = useLocale() as Locale
  const t = useTranslations("products")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("active")
  const [lowStockOnly, setLowStockOnly] = useState(false)
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
    low_stock: lowStockOnly || undefined,
    page,
  })

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
      } catch {
        toast.error("Failed to update products. Please try again.")
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
