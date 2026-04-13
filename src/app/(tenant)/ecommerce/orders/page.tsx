"use client"

import { useState, useEffect, useCallback } from "react"
import { useTranslations } from "next-intl"
import { ecommerceAdminOrdersList } from "@/api/generated"
import axiosInstance from "@/api/axios"
import { toast } from "sonner"
import { OrderListItem } from "./_types"
import { OrdersTable } from "./_components/orders-table"
import { OrdersBulkActionsBar } from "./_components/orders-bulk-actions-bar"

const DEFAULT_PAGE_SIZE = 20

export default function EcommerceOrdersPage() {
  const t = useTranslations("ecommerceOrders")
  const [orders, setOrders] = useState<OrderListItem[]>([])
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
        undefined,
        undefined,
        page,
        pageSize,
        searchQuery || undefined,
        statusParam
      )
      setOrders((response.results || []) as unknown as OrderListItem[])
      setTotalCount(response.count || 0)
    } catch {
      toast.error("Failed to load orders")
    } finally {
      setLoading(false)
    }
  }, [searchQuery, statusFilter, page, pageSize])

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
          toast.success("Redirecting to payment page...")
          window.location.href = response.data.payment_url
        } else {
          toast.success("Payment initiated successfully")
          await fetchOrders()
        }
      } catch {
        toast.error("Failed to initiate payment. Please try again.")
      }
    },
    [fetchOrders]
  )

  const handleBulkStatusUpdate = useCallback(
    async (status: string) => {
      if (selectedOrderIds.size === 0) return
      setBulkActionLoading(true)
      try {
        await axiosInstance.post("/api/ecommerce/admin/orders/bulk-update/", {
          order_ids: Array.from(selectedOrderIds),
          status,
        })
        toast.success(
          `${selectedOrderIds.size} orders updated to ${status}`
        )
        await fetchOrders()
        setSelectedOrderIds(new Set())
      } catch {
        toast.error("Failed to update orders. Please try again.")
      } finally {
        setBulkActionLoading(false)
      }
    },
    [selectedOrderIds, fetchOrders]
  )

  const handleExportSelected = useCallback(() => {
    try {
      const selected = orders.filter((o) => selectedOrderIds.has(o.id))
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
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `orders-export-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`Exported ${selected.length} orders`)
    } catch {
      toast.error("Failed to export orders")
    }
  }, [orders, selectedOrderIds])

  const handleExportAllCSV = useCallback(async () => {
    try {
      const response = await axiosInstance.get(
        "/api/ecommerce/admin/orders/export/",
        { responseType: "blob" }
      )
      const blob = new Blob([response.data], { type: "text/csv" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `all-orders-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success("Orders exported successfully")
    } catch {
      toast.error("Failed to export orders")
    }
  }, [])

  return (
    <section className="container p-4">
      {/* Orders Table */}
      <OrdersTable
        data={orders}
        totalCount={totalCount}
        page={page}
        pageSize={pageSize}
        loading={loading}
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onSearchChange={handleSearchChange}
        onStatusFilterChange={handleStatusFilterChange}
        onSelectionChange={handleSelectionChange}
        onExportAll={handleExportAllCSV}
        t={t}
      />

      {/* Floating Bulk Actions Bar */}
      <OrdersBulkActionsBar
        selectedCount={selectedOrderIds.size}
        loading={bulkActionLoading}
        onMarkShipped={() => handleBulkStatusUpdate("shipped")}
        onMarkDelivered={() => handleBulkStatusUpdate("delivered")}
        onExportSelected={handleExportSelected}
        t={t}
      />
    </section>
  )
}
