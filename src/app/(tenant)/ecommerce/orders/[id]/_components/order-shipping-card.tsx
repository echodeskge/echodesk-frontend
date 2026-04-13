"use client"

import { MapPin, Truck } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { OrderDetail } from "../../_types"

interface OrderShippingCardProps {
  order: OrderDetail
  t: (key: string) => string
}

export function OrderShippingCard({ order, t }: OrderShippingCardProps) {
  const address = order.delivery_address
  const shipping = order.shipping_method_details
  const hasTracking = order.tracking_number || order.courier_provider

  if (!address && !shipping && !hasTracking) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          {t("detail.deliveryAddress")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {address && (
          <div className="space-y-1">
            {address.label && (
              <p className="font-medium">{address.label}</p>
            )}
            <p className="text-sm">{address.address}</p>
            <p className="text-sm">{address.city}</p>
            {address.extra_instructions && (
              <p className="text-sm text-muted-foreground italic mt-2">
                {address.extra_instructions}
              </p>
            )}
          </div>
        )}

        {shipping && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {t("detail.shippingMethod")}
                </span>
              </div>
              <p className="text-sm">
                {typeof shipping.name === "object"
                  ? shipping.name.en || shipping.name.ka || "Shipping"
                  : shipping.name}
              </p>
              {shipping.estimated_days && (
                <p className="text-sm text-muted-foreground">
                  {t("detail.estimatedDays").replace(
                    "{days}",
                    String(shipping.estimated_days)
                  )}
                </p>
              )}
            </div>
          </>
        )}

        {hasTracking && (
          <>
            <Separator />
            <div className="space-y-2">
              <span className="text-sm font-medium">
                {t("detail.tracking")}
              </span>
              {order.tracking_number && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    {t("detail.tracking")}
                  </span>
                  <span className="text-sm font-mono">
                    {order.tracking_number}
                  </span>
                </div>
              )}
              {order.courier_provider && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    {t("detail.courierProvider")}
                  </span>
                  <span className="text-sm">{order.courier_provider}</span>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
