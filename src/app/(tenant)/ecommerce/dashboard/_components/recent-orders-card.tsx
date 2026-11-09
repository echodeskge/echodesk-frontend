"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useLocale } from "next-intl"
import { Receipt, ShoppingCart } from "lucide-react"
import {
  EcEmptyState,
  EcTable,
  IdText,
  InfoCard,
  MoneyCell,
  OrderStatusPill,
  formatEcDate,
  type EcColumn,
} from "../../_components/ui"
import type { Translator } from "../_lib/labels"

interface RecentOrder {
  id: number
  order_number: string
  status: string
  payment_status: string
  total_amount: number
  created_at: string
  client_name: string
}

interface RecentOrdersCardProps {
  orders: RecentOrder[]
  t: Translator
}

/** The latest orders; a row opens the order. */
export function RecentOrdersCard({ orders, t }: RecentOrdersCardProps) {
  const locale = useLocale()
  const router = useRouter()
  const columns: EcColumn<RecentOrder>[] = [
    {
      id: "order",
      header: t("recentOrders.order"),
      width: "150px",
      mobile: "title",
      cell: (o) => (
        <Link href={`/ecommerce/orders/${o.id}`} className="min-w-0 truncate hover:underline">
          <IdText className="font-medium">#{o.order_number}</IdText>
        </Link>
      ),
    },
    {
      id: "customer",
      header: t("recentOrders.customer"),
      width: "minmax(0,1fr)",
      mobile: "meta",
      cell: (o) => <span className="truncate">{o.client_name || "—"}</span>,
    },
    {
      id: "date",
      header: t("recentOrders.date"),
      width: "96px",
      mobile: "meta",
      muted: true,
      className: "tabular-nums",
      cell: (o) => formatEcDate(o.created_at, locale),
    },
    {
      id: "amount",
      header: t("recentOrders.amount"),
      width: "100px",
      align: "end",
      mobile: "meta",
      cell: (o) => <MoneyCell value={o.total_amount} className="font-medium" />,
    },
    {
      id: "status",
      header: t("recentOrders.status"),
      width: "120px",
      mobile: "end",
      cell: (o) => <OrderStatusPill status={o.status} />,
    },
  ]

  return (
    <InfoCard title={t("recentOrders.title")} icon={<Receipt />} flush testId="ec-dash-recent-orders">
      <EcTable
        variant="flush"
        columns={columns}
        rows={orders}
        rowKey={(o) => o.id}
        onRowClick={(o) => router.push(`/ecommerce/orders/${o.id}`)}
        ariaLabel={t("recentOrders.title")}
        empty={<EcEmptyState icon={ShoppingCart} title={t("recentOrders.empty")} className="py-8" />}
        testId="ec-dash-recent-orders-table"
      />
    </InfoCard>
  )
}
