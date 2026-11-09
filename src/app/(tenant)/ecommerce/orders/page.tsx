"use client"

import { downloadBlob } from "@/lib/downloadBlob"
import { useState, useEffect, useCallback } from "react"
import { useTranslations } from "next-intl"
import { ecommerceAdminOrdersList } from "@/api/generated"
import axiosInstance from "@/api/axios"
import { toast } from "sonner"
import { Download } from "lucide-react"
import { getApiErrorMessage } from "@/lib/utils"
import type { BulkUpdateStatusResponse } from "@/api/generated/interfaces"
import { OrderListItem } from "./_types"
import { OrdersTable } from "./_components/orders-table"
import { OrdersBulkActionsBar } from "./_components/orders-bulk-actions-bar"
import { OrdersTableToolbar } from "./_components/orders-table-toolbar"
import { EcPage, EcommerceHeaderBridge } from "../_components/ui"

const DEFAULT_PAGE_SIZE = 20

export default function EcommerceOrdersPage() {
  const t = useTranslations("ecommerceOrders")
  const tUi = useTranslations("ecommerceUi")
  // undefined until the first load finishes (table skeleton)
  const [orders, setOrders] = useState<OrderListItem[] | undefined>(undefined)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<number>>(
    new Set()
  )
  const [bulkActionLoading, setBulkActionLoading] = useState(false)

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true)
      setLoadError(null)
      const statusParam =
        statusFilter === "all"
          ? undefined
          : (statusFilter as
              | "cancelled"
              | "confirmed"
              | "delivered"
              | "pending"
              | "processing"
              | "refunded"
              | "shipped")
      const response = await ecommerceAdminOrdersList(
        undefined, // client
        undefined, // createdAfter
        undefined, // createdBefore
        undefined, // hasTracking
        undefined, // ordering
        page,
        pageSize,
        undefined, // paymentMethod
        undefined, // paymentProvider
        undefined, // paymentStatus
        undefined, // paymentStatus_In
        searchQuery || undefined,
        statusParam
      )
      setOrders((response.results || []) as unknown as OrderListItem[])
      setTotalCount(response.count || 0)
    } catch (error) {
      setLoadError(error)
      toast.error(t("toast.loadFailed"))
    } finally {
      setLoading(false)
    }
  }, [searchQuery, statusFilter, page, pageSize, t])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value)
    setPage(1)
    setSelectedOrderIds(new Set())
  }, [])

  const handleStatusFilterChange = useCallback((value: string) => {
    setStatusFilter(value)
    setPage(1)
    setSelectedOrderIds(new Set())
  }, [])

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage)
    setSelectedOrderIds(new Set())
  }, [])

  const handlePageSizeChange = useCallback((newSize: number) => {
    setPageSize(newSize)
    setPage(1)
    setSelectedOrderIds(new Set())
  }, [])

  const handleSelectionChange = useCallback((ids: Set<number>) => {
    setSelectedOrderIds(ids)
  }, [])

  const handleInitiatePayment = useCallback(
    async (orderId: number) => {
      try {
        const response = await axiosInstance.post(
          `/api/ecommerce/admin/orders/${orderId}/initiate_payment/`,
          {
            payment_method: "card",
            return_url_success: `${window.location.origin}/ecommerce/orders/payment/success`,
            return_url_fail: `${window.location.origin}/ecommerce/orders/payment/failed`,
          }
        )
        if (response.data?.payment_url) {
          toast.success(t("toast.paymentRedirect"))
          window.location.href = response.data.payment_url
        } else {
          toast.success(t("toast.paymentInitiated"))
          await fetchOrders()
        }
      } catch (error) {
        toast.error(getApiErrorMessage(error, t("toast.paymentFailed")))
      }
    },
    [fetchOrders, t]
  )

  const handleBulkStatusUpdate = useCallback(
    async (status: string) => {
      if (selectedOrderIds.size === 0) return
      setBulkActionLoading(true)
      try {
        const { data } = await axiosInstance.post<BulkUpdateStatusResponse>(
          "/api/ecommerce/admin/orders/bulk-update/",
          {
            order_ids: Array.from(selectedOrderIds),
            status,
          }
        )
        toast.success(
          t("toast.updated", {
            count: data?.updated ?? selectedOrderIds.size,
            status: t.has(`status.${status}`) ? t(`status.${status}`) : status,
          })
        )
        // Final (cancelled/refunded) orders and orders paid meanwhile are skipped.
        const skipped = data?.skipped || []
        if (skipped.length > 0) {
          toast.warning(
            t("toast.skipped", {
              count: skipped.length,
              list: skipped.map((s) => `#${s.id} (${s.error})`).join(", "),
            })
          )
        }
        await fetchOrders()
        setSelectedOrderIds(new Set())
      } catch (error) {
        // e.g. 403 when a paid order is in the selection and the user is not a manager
        toast.error(getApiErrorMessage(error, t("toast.updateFailed")))
      } finally {
        setBulkActionLoading(false)
      }
    },
    [selectedOrderIds, fetchOrders, t]
  )

  const handleExportSelected = useCallback(() => {
    try {
      const selected = (orders ?? []).filter((o) => selectedOrderIds.has(o.id))
      const csvQuote = (value: string) => `"${value.replace(/"/g, '""')}"`
      const headers = [
        "Order Number",
        "Customer",
        "Email",
        "Items",
        "Total",
        "Status",
        "Date",
      ]
      const rows = selected.map((order) => [
        csvQuote(order.order_number),
        csvQuote(order.client_name || "Unknown"),
        csvQuote(order.client_email || ""),
        csvQuote(String(order.total_items ?? "")),
        csvQuote(parseFloat(order.total_amount).toFixed(2)),
        csvQuote(String(order.status)),
        csvQuote(new Date(order.created_at).toISOString()),
      ])
      const csv = [headers.map(csvQuote), ...rows]
        .map((r) => r.join(","))
        .join("\n")
      const blob = new Blob([csv], { type: "text/csv" })
      downloadBlob(blob, `orders-export-${new Date().toISOString().slice(0, 10)}.csv`)
      toast.success(t("toast.exportedSelected", { count: selected.length }))
    } catch {
      toast.error(t("toast.exportFailed"))
    }
  }, [orders, selectedOrderIds, t])

  const handleExportAllCSV = useCallback(async () => {
    try {
      const response = await axiosInstance.get(
        "/api/ecommerce/admin/orders/export/",
        { responseType: "blob" }
      )
      const blob = new Blob([response.data], { type: "text/csv" })
      downloadBlob(blob, `all-orders-${new Date().toISOString().slice(0, 10)}.csv`)
      toast.success(t("toast.exported"))
    } catch {
      toast.error(t("toast.exportFailed"))
    }
  }, [t])

  const filtered = searchQuery !== "" || statusFilter !== "all"
  const handleClearFilters = useCallback(() => {
    handleSearchChange("")
    handleStatusFilterChange("all")
  }, [handleSearchChange, handleStatusFilterChange])

  return (
    <EcPage fill testId="ec-orders">
      <EcommerceHeaderBridge
        sub={orders ? t("ordersFound", { count: totalCount }) : null}
        secondary={[{ label: t("exportCsv"), icon: Download, onClick: handleExportAllCSV, testId: "ec-orders-export" }]}
      />
      {selectedOrderIds.size > 0 ? (
        <OrdersBulkActionsBar
          selectedCount={selectedOrderIds.size}
          loading={bulkActionLoading}
          onMarkShipped={() => handleBulkStatusUpdate("shipped")}
          onMarkDelivered={() => handleBulkStatusUpdate("delivered")}
          onExportSelected={handleExportSelected}
          onClear={() => setSelectedOrderIds(new Set())}
          t={t}
          tUi={tUi}
        />
      ) : (
        <OrdersTableToolbar
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          onSearchChange={handleSearchChange}
          onStatusFilterChange={handleStatusFilterChange}
          t={t}
          tUi={tUi}
        />
      )}
      <OrdersTable
        data={orders}
        totalCount={totalCount}
        page={page}
        pageSize={pageSize}
        loading={loading}
        error={loadError}
        onRetry={fetchOrders}
        filtered={filtered}
        onClearFilters={handleClearFilters}
        selected={selectedOrderIds}
        onSelectionChange={handleSelectionChange}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        t={t}
        tUi={tUi}
      />
    </EcPage>
  )
}
