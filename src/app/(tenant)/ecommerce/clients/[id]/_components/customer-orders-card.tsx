"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { OrderList } from "@/api/generated/interfaces"
import { format } from "date-fns"
import {
  STATUS_COLORS,
  PAYMENT_BADGE_VARIANTS,
  PAYMENT_STATUS_ICONS,
} from "../../../orders/_data/constants"

interface CustomerOrdersCardProps {
  orders: OrderList[]
  loading: boolean
  t: (key: string) => string
  tOrders: (key: string) => string
}

export function CustomerOrdersCard({
  orders,
  loading,
  t,
  tOrders,
}: CustomerOrdersCardProps) {
  const formatCurrency = (amount: string) => `₾${parseFloat(amount).toFixed(2)}`

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("orderHistory")}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="space-y-0">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border-b px-4 py-3">
                <Skeleton className="h-5 w-full" />
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {t("noOrders")}
          </div>
        ) : (
          <ScrollArea
            orientation="horizontal"
            className="w-[calc(100vw-2.25rem)] md:w-auto"
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("ordersTable.orderNumber")}</TableHead>
                  <TableHead>{t("ordersTable.date")}</TableHead>
                  <TableHead className="text-end">
                    {t("ordersTable.total")}
                  </TableHead>
                  <TableHead>{t("ordersTable.status")}</TableHead>
                  <TableHead>{t("ordersTable.paymentStatus")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => {
                  const status = String(order.status || "pending")
                  const paymentStatus = String(order.payment_status || "pending")
                  const paymentVariant =
                    PAYMENT_BADGE_VARIANTS[paymentStatus] || "secondary"
                  const PaymentIcon =
                    PAYMENT_STATUS_ICONS[paymentStatus] ||
                    PAYMENT_STATUS_ICONS.pending
                  return (
                    <TableRow
                      key={order.id}
                      className="cursor-pointer"
                      onClick={() => {}}
                    >
                      <TableCell>
                        <Link
                          href={`/ecommerce/orders/${order.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          #{order.order_number}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(order.created_at), "PP")}
                      </TableCell>
                      <TableCell className="text-end font-medium">
                        {formatCurrency(order.total_amount)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={STATUS_COLORS[status] || ""}
                        >
                          {tOrders(`status.${status}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={paymentVariant}>
                          <PaymentIcon className="mr-1 h-3 w-3" />
                          {tOrders(`paymentStatus.${paymentStatus}`)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
