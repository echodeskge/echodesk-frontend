"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ShoppingCart } from "lucide-react"
import type { OrderList } from "@/api/generated/interfaces"
import {
  EcEmptyState,
  EcTable,
  IdText,
  InfoCard,
  MoneyCell,
  OrderStatusPill,
  PaymentStatusPill,
  formatEcDate,
  type EcColumn,
} from "@/app/(tenant)/ecommerce/_components/ui"

interface CustomerOrdersCardProps {
  orders: OrderList[]
  loading: boolean
  error?: unknown
  onRetry?: () => void
  locale: string
  t: (key: string, values?: Record<string, string>) => string
}

/** The client's orders: number, date, total, status, payment. Rows open the order. */
export function CustomerOrdersCard({ orders, loading, error, onRetry, locale, t }: CustomerOrdersCardProps) {
  const router = useRouter()
  const columns: EcColumn<OrderList>[] = [
    {
      id: "number",
      header: t("ordersTable.orderNumber"),
      width: "minmax(0,1.3fr)",
      mobile: "title",
      cell: (o) => (
        <Link
          href={`/ecommerce/orders/${o.id}`}
          className="min-w-0 truncate font-medium text-primary hover:underline"
          aria-label={t("openOrder", { number: `#${o.order_number}` })}
        >
          <IdText className="text-[13px]">#{o.order_number}</IdText>
        </Link>
      ),
    },
    {
      id: "date",
      header: t("ordersTable.date"),
      width: "100px",
      mobile: "meta",
      muted: true,
      cell: (o) => <span className="tabular-nums">{formatEcDate(o.created_at, locale)}</span>,
    },
    {
      id: "total",
      header: t("ordersTable.total"),
      width: "110px",
      align: "end",
      mobile: "meta",
      cell: (o) => <MoneyCell value={o.total_amount} className="font-medium" />,
    },
    {
      id: "status",
      header: t("ordersTable.status"),
      width: "120px",
      mobile: "end",
      cell: (o) => <OrderStatusPill status={o.status} />,
    },
    {
      id: "payment",
      header: t("ordersTable.paymentStatus"),
      width: "150px",
      mobile: "meta",
      cell: (o) => <PaymentStatusPill status={o.payment_status} />,
    },
  ]
  return (
    <InfoCard title={t("orderHistory")} icon={<ShoppingCart />} flush testId="client-orders-card">
      <EcTable
        ariaLabel={t("orderHistory")}
        variant="flush"
        columns={columns}
        rows={orders}
        rowKey={(o) => o.id}
        loading={loading}
        error={error}
        onRetry={onRetry}
        skeletonRows={3}
        onRowClick={(o) => router.push(`/ecommerce/orders/${o.id}`)}
        empty={<EcEmptyState icon={ShoppingCart} title={t("noOrders")} className="py-8" />}
      />
    </InfoCard>
  )
}
