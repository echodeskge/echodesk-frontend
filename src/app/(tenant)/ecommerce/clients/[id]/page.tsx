"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import { useTranslations } from "next-intl"
import {
  ecommerceAdminClientsRetrieve,
  ecommerceAdminOrdersList,
} from "@/api/generated"
import type {
  EcommerceClient,
  OrderList,
} from "@/api/generated/interfaces"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { CustomerDetails } from "./_components/customer-details"
import { CustomerNotFound } from "./_components/customer-not-found"

export default function ClientDetailPage() {
  const params = useParams()
  const t = useTranslations("clientDetail")
  const tOrders = useTranslations("ecommerceOrders")

  const [client, setClient] = useState<EcommerceClient | null>(null)
  const [orders, setOrders] = useState<OrderList[]>([])
  const [loading, setLoading] = useState(true)
  const [ordersLoading, setOrdersLoading] = useState(true)

  const fetchClient = useCallback(async (id: number) => {
    try {
      setLoading(true)
      const response = await ecommerceAdminClientsRetrieve(id)
      setClient(response)
    } catch {
      toast.error(t("errors.loadFailed"))
    } finally {
      setLoading(false)
    }
  }, [t])

  const fetchOrders = useCallback(async (clientId: number) => {
    try {
      setOrdersLoading(true)
      const response = await ecommerceAdminOrdersList(
        clientId,
        undefined,
        1,
        100
      )
      setOrders(response.results || [])
    } catch {
      // Silently fail - orders section will show empty
    } finally {
      setOrdersLoading(false)
    }
  }, [])

  useEffect(() => {
    if (params.id) {
      const id = Number(params.id)
      fetchClient(id)
      fetchOrders(id)
    }
  }, [params.id, fetchClient, fetchOrders])

  const totalSpent = orders.reduce(
    (sum, order) => sum + parseFloat(order.total_amount || "0"),
    0
  )

  if (loading) {
    return (
      <section className="container space-y-4 p-4">
        <Skeleton className="h-8 w-32" />
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-4">
            <Card>
              <CardContent className="flex flex-col items-center pt-6 pb-6">
                <Skeleton className="h-20 w-20 rounded-full" />
                <Skeleton className="mt-4 h-6 w-32" />
                <Skeleton className="mt-2 h-4 w-48" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          </div>
          <div className="space-y-4 md:col-span-2">
            <div className="grid gap-4 md:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-16" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="mb-3 h-12 w-full" />
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    )
  }

  if (!client) {
    return (
      <section className="container p-4">
        <CustomerNotFound t={t} />
      </section>
    )
  }

  return (
    <section className="container p-4">
      <CustomerDetails
        client={client}
        orders={orders}
        ordersLoading={ordersLoading}
        totalSpent={totalSpent}
        t={t}
        tOrders={tOrders}
      />
    </section>
  )
}
