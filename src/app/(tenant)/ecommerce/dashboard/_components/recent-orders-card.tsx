"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { format } from "date-fns"
import {
  STATUS_COLORS,
  PAYMENT_BADGE_VARIANTS,
  PAYMENT_STATUS_ICONS,
} from "../../orders/_data/constants"

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
  t: (key: string) => string
  tOrders: (key: string) => string
}

export function RecentOrdersCard({ orders, t, tOrders }: RecentOrdersCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("recentOrders.title")}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {orders.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            {t("recentOrders.empty")}
          </div>
        ) : (
          <ScrollArea
            orientation="horizontal"
            className="w-[calc(100vw-2.25rem)] md:w-auto"
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("recentOrders.order")}</TableHead>
                  <TableHead>{t("recentOrders.customer")}</TableHead>
                  <TableHead>{t("recentOrders.date")}</TableHead>
                  <TableHead className="text-end">{t("recentOrders.amount")}</TableHead>
                  <TableHead>{t("recentOrders.status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => {
                  const status = String(order.status || "pending")
                  const paymentStatus = String(order.payment_status || "pending")
                  const PaymentIcon = PAYMENT_STATUS_ICONS[paymentStatus] || PAYMENT_STATUS_ICONS.pending
                  const paymentVariant = PAYMENT_BADGE_VARIANTS[paymentStatus] || "secondary"
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
                        {order.client_name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(order.created_at), "PP")}
                      </TableCell>
                      <TableCell className="text-end font-medium">
                        ₾{order.total_amount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant="secondary"
                            className={STATUS_COLORS[status] || ""}
                          >
                            {tOrders(`status.${status}`)}
                          </Badge>
                        </div>
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
