"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { useQueryClient } from "@tanstack/react-query"
import {
  ecommerceAdminOrdersRetrieve,
  ecommerceAdminOrdersRefundCreate,
} from "@/api/generated"
import axiosInstance from "@/api/axios"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Archive, Loader2, RotateCcw } from "lucide-react"
import { useMyAccess } from "@/hooks/useMyAccess"
import { getApiErrorMessage } from "@/lib/utils"
import { OrderDetail } from "../_types"
import { OrderDetails } from "./_components/order-details"
import { OrderNotFound } from "./_components/order-not-found"
import { DetailLayout, EcBanner, EcommerceHeaderBridge, formatEcDateTime, rdButton } from "../../_components/ui"

export default function OrderDetailPage() {
  const params = useParams()
  const t = useTranslations("ecommerceOrders")
  const locale = useLocale()
  const queryClient = useQueryClient()
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [refunding, setRefunding] = useState(false)
  const [restoring, setRestoring] = useState(false)
  // Refund, mark-paid and cancelling a paid order need e-commerce manager rights;
  // restoring a cleaned order needs the store admin.
  const { isEcommerceManager, isStoreAdmin } = useMyAccess()

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

  /** Un-hides a cleaned order; the dashboard numbers include it again. */
  const handleRestore = useCallback(async () => {
    if (!order) return
    try {
      setRestoring(true)
      await axiosInstance.post(`/api/ecommerce/admin/orders/${order.id}/restore/`)
      toast.success(t("cleaned.toast.restoredOne"))
      await Promise.all([fetchOrder(order.id), queryClient.invalidateQueries({ queryKey: ["ecommerce-analytics"] })])
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("cleaned.toast.restoreFailed")))
    } finally {
      setRestoring(false)
    }
  }, [order, t, fetchOrder, queryClient])

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

  const isCleaned = Boolean(order.is_deleted)
  const cleanedBanner = isCleaned ? (
    <div data-testid="ec-order-cleaned-banner">
      <EcBanner
        tone="warning"
        icon={<Archive className="h-4 w-4" aria-hidden />}
        action={
          isStoreAdmin ? (
            <button
              type="button"
              className={rdButton.outlineSm}
              disabled={restoring}
              onClick={handleRestore}
              data-testid="ec-order-restore"
            >
              {restoring ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <RotateCcw className="h-3.5 w-3.5" aria-hidden />}
              {t("cleaned.restore")}
            </button>
          ) : undefined
        }
      >
        {order.deleted_by_name
          ? t("cleaned.detailBanner", { name: order.deleted_by_name, date: formatEcDateTime(order.deleted_at, locale) })
          : t("cleaned.detailBannerNoName", { date: formatEcDateTime(order.deleted_at, locale) })}
      </EcBanner>
    </div>
  ) : undefined

  return (
    <>
      <EcommerceHeaderBridge breadcrumb={`#${order.order_number}`} />
      <OrderDetails
        order={order}
        updatingStatus={updatingStatus}
        refunding={refunding}
        isManager={isEcommerceManager}
        locked={isCleaned}
        banner={cleanedBanner}
        onStatusChange={handleStatusChange}
        onMarkPaid={handleMarkPaid}
        onRefund={handleRefund}
        t={t}
      />
    </>
  )
}
