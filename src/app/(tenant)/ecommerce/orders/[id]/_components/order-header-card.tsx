"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  STATUS_COLORS,
  STATUS_ICONS,
  PAYMENT_BADGE_VARIANTS,
  PAYMENT_STATUS_ICONS,
} from "../../_data/constants"
import { formatDate } from "../../_lib/utils"
import { OrderDetail } from "../../_types"

interface OrderHeaderCardProps {
  order: OrderDetail
  updatingStatus: boolean
  onStatusChange: (status: string) => void
  t: (key: string) => string
}

export function OrderHeaderCard({
  order,
  updatingStatus,
  onStatusChange,
  t,
}: OrderHeaderCardProps) {
  const status = String(order.status || "pending")
  const paymentStatus = String(order.payment_status || "pending")
  const StatusIcon = STATUS_ICONS[status] || STATUS_ICONS.pending
  const paymentVariant = PAYMENT_BADGE_VARIANTS[paymentStatus] || "secondary"
  const PaymentIcon = PAYMENT_STATUS_ICONS[paymentStatus] || PAYMENT_STATUS_ICONS.pending

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>#{order.order_number}</CardTitle>
          <span className="text-sm text-muted-foreground">
            {formatDate(order.created_at)}
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-2">
        <Badge variant={paymentVariant}>
          <PaymentIcon className="me-1.5 h-3.5 w-3.5" />
          {t(`paymentStatus.${paymentStatus}`)}
        </Badge>
        <Badge variant="secondary" className={STATUS_COLORS[status] || ""}>
          <StatusIcon className="me-1.5 h-3.5 w-3.5" />
          {t(`status.${status}`)}
        </Badge>
        <div className="ml-auto">
          <Select
            value={status}
            onValueChange={onStatusChange}
            disabled={updatingStatus}
          >
            <SelectTrigger className="h-8 w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[
                "pending",
                "confirmed",
                "processing",
                "shipped",
                "delivered",
                "cancelled",
              ].map((s) => (
                <SelectItem key={s} value={s}>
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        {
                          pending: "bg-yellow-500",
                          confirmed: "bg-blue-500",
                          processing: "bg-purple-500",
                          shipped: "bg-indigo-500",
                          delivered: "bg-green-500",
                          cancelled: "bg-red-500",
                        }[s]
                      }`}
                    />
                    {t(`status.${s}`)}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  )
}
