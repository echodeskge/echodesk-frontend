"use client"

import { FileText } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { OrderDetail } from "../../_types"

interface OrderNotesCardProps {
  order: OrderDetail
  t: (key: string) => string
}

export function OrderNotesCard({ order, t }: OrderNotesCardProps) {
  if (!order.notes && !order.admin_notes) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {t("detail.notes")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {order.notes && (
          <div>
            <h4 className="font-medium mb-2">{t("detail.customerNotes")}</h4>
            <p className="text-muted-foreground">{order.notes}</p>
          </div>
        )}
        {order.admin_notes && (
          <div>
            <h4 className="font-medium mb-2">{t("detail.adminNotes")}</h4>
            <p className="text-muted-foreground">{order.admin_notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
