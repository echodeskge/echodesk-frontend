"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { EcommerceClient } from "@/api/generated/interfaces"
import { format } from "date-fns"

interface CustomerHeaderCardProps {
  client: EcommerceClient
  t: (key: string) => string
}

export function CustomerHeaderCard({ client, t }: CustomerHeaderCardProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center pt-6 pb-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted text-2xl font-semibold">
          {(client.first_name?.[0] || "").toUpperCase()}
          {(client.last_name?.[0] || "").toUpperCase()}
        </div>
        <h2 className="mt-4 text-lg font-semibold">{client.full_name}</h2>
        <p className="text-sm text-muted-foreground">{client.email}</p>
        <div className="mt-3 flex items-center gap-2">
          <Badge variant={client.is_active ? "default" : "outline"}>
            {client.is_active ? t("active") : t("inactive")}
          </Badge>
          {client.is_verified && (
            <Badge variant="secondary">{t("verified")}</Badge>
          )}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {t("joinedOn").replace(
            "{date}",
            format(new Date(client.created_at), "PP")
          )}
        </p>
      </CardContent>
    </Card>
  )
}
