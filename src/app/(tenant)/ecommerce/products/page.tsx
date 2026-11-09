"use client"

import { useState, useCallback, useEffect } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useSearchParams } from "next/navigation"
import { Plus } from "lucide-react"
import { useProducts, useProduct } from "@/hooks/useProducts"
import { AddProductSheet } from "@/components/products/AddProductSheet"
import { EditProductSheet } from "@/components/products/EditProductSheet"
import { toast } from "sonner"
import axiosInstance from "@/api/axios"
import type { Locale } from "@/lib/i18n"
import { PRODUCT_STATUS_LABEL_KEYS } from "./_data/constants"
import { ProductsTable } from "./_components/products-table"
import { ProductsTableToolbar } from "./_components/products-table-toolbar"
import { HIDEABLE_PRODUCT_COLUMNS } from "./_components/products-table-columns"
import { getApiErrorMessage } from "@/lib/utils"
import {
  BulkBar,
  EcPage,
  EcommerceHeaderBridge,
  StatStrip,
  formatCount,
  rdButton,
} from "@/app/(tenant)/ecommerce/_components/ui"

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
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set())

  const {
    data: productsData,
    isLoading,
    error: productsError,
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
    page_size: pageSize,
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
  const outOfStockCount = products.filter((p) => !p.is_in_stock).length
  const filtered = !!searchQuery || lowStockOnly || statusFilter !== "all"

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

  // "Clear filters" on the no-matches state: everything, every status.
  const handleClearFilters = useCallback(() => {
    setSearchQuery("")
    setStatusFilter("all")
    setLowStockOnly(false)
    setStockFilter(null)
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
          t("bulkActions.updated", {
            count: selectedProductIds.size,
            status: t(PRODUCT_STATUS_LABEL_KEYS[newStatus] || newStatus),
          })
        )
        setSelectedProductIds(new Set())
        refetch()
      } catch (error) {
        toast.error(getApiErrorMessage(error, t("bulkActions.updateFailed")))
      } finally {
        setBulkActionLoading(false)
      }
    },
    [selectedProductIds, refetch, t]
  )

  const columnLabels = HIDEABLE_PRODUCT_COLUMNS.map((id) => ({
    id,
    label: id === "sku" ? t("sku") : id === "price" ? t("price") : id === "quantity" ? t("columns.stock") : t("columns.status"),
  }))

  return (
    <EcPage fill testId="ec-products-page">
      <EcommerceHeaderBridge
        sub={productsData ? t("countLabel", { count: totalCount }) : null}
        primary={{ label: t("addProduct"), icon: Plus, onClick: () => setIsAddProductOpen(true), testId: "ec-products-add" }}
      />

      <StatStrip
        loading={!productsData && isLoading}
        testId="ec-products-stats"
        items={[
          { key: "total", label: t("stats.matching"), value: productsData ? formatCount(totalCount) : null },
          { key: "low", label: t("stats.lowStockPage"), value: productsData ? formatCount(lowStockCount) : null, hint: t("stats.pageHint") },
          { key: "out", label: t("stats.outOfStockPage"), value: productsData ? formatCount(outOfStockCount) : null, hint: t("stats.pageHint") },
        ]}
      />

      {selectedProductIds.size > 0 ? (
        <BulkBar
          count={selectedProductIds.size}
          label={t("bulkActions.selected", { count: selectedProductIds.size })}
          clearLabel={t("bulkActions.clear")}
          onClear={() => setSelectedProductIds(new Set())}
        >
          <span className="hidden text-xs text-muted-foreground sm:inline">{t("bulkActions.setStatus")}</span>
          {(["active", "draft", "inactive"] as const).map((status) => (
            <button
              key={status}
              type="button"
              className={rdButton.outlineSm}
              disabled={bulkActionLoading}
              onClick={() => handleBulkStatusChange(status)}
              data-testid={`ec-products-bulk-${status}`}
            >
              {t(PRODUCT_STATUS_LABEL_KEYS[status])}
            </button>
          ))}
        </BulkBar>
      ) : (
        <ProductsTableToolbar
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          lowStockOnly={lowStockOnly}
          lowStockCount={lowStockCount}
          onSearchChange={handleSearchChange}
          onStatusFilterChange={handleStatusFilterChange}
          onLowStockToggle={handleLowStockToggle}
          columns={columnLabels}
          hiddenColumns={hiddenColumns}
          onHiddenColumnsChange={setHiddenColumns}
        />
      )}

      <ProductsTable
        data={productsData ? products : undefined}
        totalCount={totalCount}
        page={page}
        pageSize={pageSize}
        loading={isLoading}
        error={productsError}
        onRetry={() => refetch()}
        filtered={filtered}
        locale={locale}
        selected={selectedProductIds}
        hiddenColumns={hiddenColumns}
        onSelectionChange={handleSelectionChange}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onAddProduct={() => setIsAddProductOpen(true)}
        onEditProduct={handleEditProduct}
        onClearFilters={handleClearFilters}
      />

      <AddProductSheet
        open={isAddProductOpen}
        onOpenChange={setIsAddProductOpen}
      />
      <EditProductSheet
        open={isEditProductOpen}
        onOpenChange={setIsEditProductOpen}
        product={selectedProduct || null}
      />
    </EcPage>
  )
}
