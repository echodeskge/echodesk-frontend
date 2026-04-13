"use client"

import { User, Mail, Phone, MapPin } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { OrderDetail } from "../../_types"

interface OrderCustomerCardProps {
  order: OrderDetail
  t: (key: string) => string
}

export function OrderCustomerCard({ order, t }: OrderCustomerCardProps) {
  const client = order.client_details
  const address = order.delivery_address

  const addressParts = [
    address?.address,
    address?.city,
  ].filter(Boolean).join(", ")

  const items = [
    { icon: User, label: t("detail.name"), value: client?.full_name || "Unknown" },
    { icon: Mail, label: t("detail.email"), value: client?.email },
    { icon: Phone, label: t("detail.phone"), value: client?.phone_number },
    { icon: MapPin, label: t("detail.deliveryAddress"), value: addressParts || undefined },
  ].filter((item) => item.value)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("detail.customer")}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-start gap-3">
            <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-sm">{item.value}</p>
            </div>
          </div>
        ))}
        {address?.extra_instructions && (
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground opacity-0" />
            <p className="text-xs italic text-muted-foreground">
              {address.extra_instructions}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
