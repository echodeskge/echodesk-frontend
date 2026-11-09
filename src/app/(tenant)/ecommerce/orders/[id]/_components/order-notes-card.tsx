"use client"

import { FileText } from "lucide-react"
import { InfoCard } from "../../../_components/ui"
import { OrderDetail } from "../../_types"

interface OrderNotesCardProps {
  order: OrderDetail
  t: (key: string) => string
}

/** Customer and admin notes (hidden when there are none). */
export function OrderNotesCard({ order, t }: OrderNotesCardProps) {
  if (!order.notes && !order.admin_notes) return null

  return (
    <InfoCard title={t("detail.notes")} icon={<FileText />} testId="ec-order-notes">
      <div className="flex flex-col gap-3 py-1">
        {order.notes && (
          <div className="flex flex-col gap-1">
            <h3 className="text-xs font-medium text-muted-foreground">{t("detail.customerNotes")}</h3>
            <p className="whitespace-pre-wrap text-[13px] [overflow-wrap:anywhere]">{order.notes}</p>
          </div>
        )}
        {order.admin_notes && (
          <div className="flex flex-col gap-1">
            <h3 className="text-xs font-medium text-muted-foreground">{t("detail.adminNotes")}</h3>
            <p className="whitespace-pre-wrap text-[13px] [overflow-wrap:anywhere]">{order.admin_notes}</p>
          </div>
        )}
      </div>
    </InfoCard>
  )
}
