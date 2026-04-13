"use client"

import { Phone, MapPin, Mail, Calendar } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EcommerceClient } from "@/api/generated/interfaces"
import { format } from "date-fns"

interface CustomerInfoCardProps {
  client: EcommerceClient
  t: (key: string) => string
}

export function CustomerInfoCard({ client, t }: CustomerInfoCardProps) {
  const defaultAddress = client.addresses?.find((a) => a.is_default) || client.addresses?.[0]
  const addressText = defaultAddress
    ? [defaultAddress.address, defaultAddress.city].filter(Boolean).join(", ")
    : undefined

  const items = [
    { icon: Phone, label: t("fields.phone"), value: client.phone_number },
    { icon: Mail, label: t("fields.email"), value: client.email },
    { icon: MapPin, label: t("fields.address"), value: addressText },
    {
      icon: Calendar,
      label: t("fields.dateOfBirth"),
      value: client.date_of_birth
        ? format(new Date(client.date_of_birth), "PP")
        : undefined,
    },
  ].filter((item) => item.value)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("information")}</CardTitle>
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
      </CardContent>
    </Card>
  )
}
