"use client"

import { CreditCard, RotateCcw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PAYMENT_STATUS_COLORS } from "../../_data/constants"
import { OrderDetail } from "../../_types"

interface OrderPaymentCardProps {
  order: OrderDetail
  refunding: boolean
  onMarkPaid: () => void
  onRefund: () => void
  t: (key: string) => string
}

export function OrderPaymentCard({
  order,
  refunding,
  onMarkPaid,
  onRefund,
  t,
}: OrderPaymentCardProps) {
  const paymentStatus = String(order.payment_status || "pending")
  const canMarkPaid = paymentStatus !== "paid"
  const canRefund =
    String(order.status) !== "refunded" && String(order.status) !== "cancelled"

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          {t("detail.payment")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">
            {t("detail.method")}
          </span>
          <span className="text-sm font-medium">
            {t(`detail.paymentMethod.${order.payment_method || "unknown"}`)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">
            {t("table.status")}
          </span>
          <Badge
            variant="outline"
            className={PAYMENT_STATUS_COLORS[paymentStatus] || ""}
          >
            {paymentStatus.replace("_", " ")}
          </Badge>
        </div>
        {order.bog_order_id && (
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">
              {t("detail.bogOrderId")}
            </span>
            <span className="text-sm font-mono">
              {order.bog_order_id.slice(0, 8)}...
            </span>
          </div>
        )}
        {canMarkPaid && (
          <Button
            className="w-full mt-2"
            variant="default"
            size="sm"
            onClick={onMarkPaid}
          >
            <CreditCard className="h-4 w-4 mr-2" />
            {t("detail.markAsPaid")}
          </Button>
        )}
        {canRefund && (
          <Button
            className="w-full mt-2"
            variant="destructive"
            size="sm"
            disabled={refunding}
            onClick={onRefund}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            {refunding ? t("refund.processing") : t("refund.button")}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
