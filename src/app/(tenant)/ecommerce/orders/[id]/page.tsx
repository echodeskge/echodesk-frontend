"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import { useTranslations } from "next-intl"
import {
  ecommerceAdminOrdersRetrieve,
  ecommerceAdminOrdersRefundCreate,
} from "@/api/generated"
import axiosInstance from "@/api/axios"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { OrderDetail } from "../_types"
import { OrderDetails } from "./_components/order-details"
import { OrderNotFound } from "./_components/order-not-found"

export default function OrderDetailPage() {
  const params = useParams()
  const t = useTranslations("ecommerceOrders")
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [refunding, setRefunding] = useState(false)

  const fetchOrder = useCallback(async (id: number) => {
    try {
      setLoading(true)
      const response = await ecommerceAdminOrdersRetrieve(id)
      setOrder(response as unknown as OrderDetail)
    } catch {
      toast.error("Failed to load order details")
    } finally {
      setLoading(false)
    }
  }, [])

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
        toast.success(`Order status updated to ${newStatus}`)
      } catch {
        toast.error("Failed to update order status")
      } finally {
        setUpdatingStatus(false)
      }
    },
    [order]
  )

  const handleMarkPaid = useCallback(async () => {
    if (!order) return
    try {
      await axiosInstance.post(
        `/api/ecommerce/admin/orders/${order.id}/mark-paid/`
      )
      toast.success("Order marked as paid")
      fetchOrder(order.id)
    } catch {
      toast.error("Failed to mark as paid")
    }
  }, [order, fetchOrder])

  const handleRefund = useCallback(async () => {
    if (!order) return
    try {
      setRefunding(true)
      const response = await ecommerceAdminOrdersRefundCreate(order.id)
      setOrder(response as unknown as OrderDetail)
      toast.success(t("refund.success"))
    } catch {
      toast.error(t("refund.error"))
    } finally {
      setRefunding(false)
    }
  }, [order, t])

  if (loading) {
    return (
      <section className="container space-y-4 p-4">
        <Skeleton className="h-8 w-32" />
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-4 md:col-span-2">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </CardContent>
            </Card>
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (!order) {
    return <OrderNotFound t={t} />
  }

  return (
    <section className="container p-4">
      <OrderDetails
        order={order}
        updatingStatus={updatingStatus}
        refunding={refunding}
        onStatusChange={handleStatusChange}
        onMarkPaid={handleMarkPaid}
        onRefund={handleRefund}
        t={t}
      />
    </section>
  )
}
