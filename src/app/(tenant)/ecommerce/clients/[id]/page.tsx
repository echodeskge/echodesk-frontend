"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import {
  ecommerceAdminClientsRetrieve,
  ecommerceAdminOrdersList,
} from "@/api/generated"
import type {
  EcommerceClient,
  OrderList,
} from "@/api/generated/interfaces"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  DetailLayout,
  EcErrorState,
  EcPage,
  EcommerceHeaderBridge,
  StatGrid,
  rdButton,
} from "../../_components/ui"
import { CustomerDetails } from "./_components/customer-details"
import { CustomerNotFound } from "./_components/customer-not-found"

function isNotFound(error: unknown): boolean {
  return (error as { response?: { status?: number } } | null)?.response?.status === 404
}

export default function ClientDetailPage() {
  const params = useParams()
  const locale = useLocale()
  const t = useTranslations("clientDetail")

  const [client, setClient] = useState<EcommerceClient | null>(null)
  const [orders, setOrders] = useState<OrderList[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [ordersError, setOrdersError] = useState<unknown>(null)

  const fetchClient = useCallback(async (id: number) => {
    try {
      setLoading(true)
      setError(null)
      const response = await ecommerceAdminClientsRetrieve(id)
      setClient(response)
    } catch (err) {
      setError(err)
      toast.error(t("errors.loadFailed"))
    } finally {
      setLoading(false)
    }
  }, [t])

  const fetchOrders = useCallback(async (clientId: number) => {
    try {
      setOrdersLoading(true)
      setOrdersError(null)
      const response = await ecommerceAdminOrdersList(
        clientId,
        undefined, // createdAfter
        undefined, // createdBefore
        undefined, // hasTracking
        undefined, // ordering
        1,
        100
      )
      setOrders(response.results || [])
    } catch (err) {
      // No toast (as before); the orders card shows the error with a retry.
      setOrdersError(err)
    } finally {
      setOrdersLoading(false)
    }
  }, [])

  const id = params.id ? Number(params.id) : null

  useEffect(() => {
    if (id !== null) {
      fetchClient(id)
      fetchOrders(id)
    }
  }, [id, fetchClient, fetchOrders])

  const totalSpent = orders.reduce(
    (sum, order) => sum + parseFloat(order.total_amount || "0"),
    0
  )

  if (loading) {
    return (
      <DetailLayout
        testId="client-detail-loading"
        header={<Skeleton className="h-[58px] w-full rounded-lg" />}
        main={
          <>
            <StatGrid loading items={["a", "b", "c"].map((key) => ({ key, label: "", value: null }))} />
            <Skeleton className="h-48 w-full rounded-lg" />
          </>
        }
        rail={<Skeleton className="h-56 w-full rounded-lg" />}
      />
    )
  }

  if (!client) {
    return (
      <EcPage width="wide">
        {error && !isNotFound(error) ? (
          <>
            <EcErrorState error={error} onRetry={id !== null ? () => fetchClient(id) : undefined} />
            <Link href="/ecommerce/clients" className={cn(rdButton.outlineSm, "self-center")}>
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
              {t("backToClients")}
            </Link>
          </>
        ) : (
          <CustomerNotFound t={t} />
        )}
      </EcPage>
    )
  }

  return (
    <>
      <EcommerceHeaderBridge breadcrumb={client.full_name || client.email} />
      <CustomerDetails
        client={client}
        orders={orders}
        ordersLoading={ordersLoading}
        ordersError={ordersError}
        onRetryOrders={id !== null ? () => fetchOrders(id) : undefined}
        totalSpent={totalSpent}
        locale={locale}
        t={t}
      />
    </>
  )
}
