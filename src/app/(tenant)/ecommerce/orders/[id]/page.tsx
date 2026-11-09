"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import { useTranslations } from "next-intl"
import {
  ecommerceAdminOrdersRetrieve,
  ecommerceAdminOrdersRefundCreate,
} from "@/api/generated"
import axiosInstance from "@/api/axios"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { useMyAccess } from "@/hooks/useMyAccess"
import { getApiErrorMessage } from "@/lib/utils"
import { OrderDetail } from "../_types"
import { OrderDetails } from "./_components/order-details"
import { OrderNotFound } from "./_components/order-not-found"
import { DetailLayout, EcommerceHeaderBridge } from "../../_components/ui"

export default function OrderDetailPage() {
  const params = useParams()
  const t = useTranslations("ecommerceOrders")
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [refunding, setRefunding] = useState(false)
  // Refund, mark-paid and cancelling a paid order need e-commerce manager rights.
  const { isEcommerceManager } = useMyAccess()

  const fetchOrder = useCallback(async (id: number) => {
    try {
      setLoading(true)
      setLoadError(null)
      const response = await ecommerceAdminOrdersRetrieve(id)
      setOrder(response as unknown as OrderDetail)
    } catch (error) {
      setLoadError(error)
      toast.error(t("detailToast.loadFailed"))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    if (params.id) {
      fetchOrder(Number(params.id))
    }
  }, [params.id, fetchOrder])

  const handleStatusChange = useCallback(
    async (newStatus: string) => {
      if (!order) return
      try {
        setUpdatingStatus(true)
        const response = await axiosInstance.post(
          `/api/ecommerce/admin/orders/${order.id}/update_status/`,
          { status: newStatus }
        )
        setOrder(response.data as unknown as OrderDetail)
        toast.success(
          t("detailToast.statusUpdated", {
            status: t.has(`status.${newStatus}`) ? t(`status.${newStatus}`) : newStatus,
          })
        )
      } catch (error) {
        toast.error(getApiErrorMessage(error, t("detailToast.statusFailed")))
      } finally {
        setUpdatingStatus(false)
      }
    },
    [order, t]
  )

  const handleMarkPaid = useCallback(async () => {
    if (!order) return
    try {
      await axiosInstance.post(
        `/api/ecommerce/admin/orders/${order.id}/mark-paid/`
      )
      toast.success(t("detailToast.markedPaid"))
      fetchOrder(order.id)
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("detailToast.markPaidFailed")))
    }
  }, [order, fetchOrder, t])

  const handleRefund = useCallback(async () => {
    if (!order) return
    try {
      setRefunding(true)
      // The refund endpoint answers {status}, not the order: reload the order
      // instead of replacing it (that left it without dates and crashed the page).
      await ecommerceAdminOrdersRefundCreate(order.id)
      toast.success(t("refund.success"))
      await fetchOrder(order.id)
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("refund.error")))
    } finally {
      setRefunding(false)
    }
  }, [order, t, fetchOrder])

  const cardSkeleton = (key: number, h: string) => (
    <div key={key} className="rounded-lg border bg-card">
      <div className="flex h-11 items-center border-b px-4">
        <Skeleton className="h-3 w-28" />
      </div>
      <div className="p-4">
        <Skeleton className={`w-full ${h}`} />
      </div>
    </div>
  )

  // Keep the page on screen while it reloads after mark-paid / refund.
  if (loading && !order) {
    return (
      <div aria-busy data-testid="ec-order-loading">
        <DetailLayout
          header={<Skeleton className="h-[58px] w-full rounded-lg" />}
          main={cardSkeleton(0, "h-40")}
          rail={[1, 2, 3].map((i) => cardSkeleton(i, "h-16"))}
        />
      </div>
    )
  }

  if (!order) {
    const notFound = (loadError as { response?: { status?: number } } | null)?.response?.status === 404
    return (
      <OrderNotFound
        t={t}
        error={loadError && !notFound ? loadError : undefined}
        onRetry={params.id ? () => fetchOrder(Number(params.id)) : undefined}
      />
    )
  }

  return (
    <>
      <EcommerceHeaderBridge breadcrumb={`#${order.order_number}`} />
      <OrderDetails
        order={order}
        updatingStatus={updatingStatus}
        refunding={refunding}
        isManager={isEcommerceManager}
        onStatusChange={handleStatusChange}
        onMarkPaid={handleMarkPaid}
        onRefund={handleRefund}
        t={t}
      />
    </>
  )
}
