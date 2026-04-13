"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { OrderDetail } from "../../_types"
import { OrderHeaderCard } from "./order-header-card"
import { OrderItemsCard } from "./order-items-card"
import { OrderNotesCard } from "./order-notes-card"
import { OrderCustomerCard } from "./order-customer-card"
import { OrderPaymentCard } from "./order-payment-card"
import { OrderTimelineCard } from "./order-timeline-card"

interface OrderDetailsProps {
  order: OrderDetail
  updatingStatus: boolean
  refunding: boolean
  onStatusChange: (status: string) => Promise<void>
  onMarkPaid: () => Promise<void>
  onRefund: () => Promise<void>
  t: (key: string) => string
}

export function OrderDetails({
  order,
  updatingStatus,
  refunding,
  onStatusChange,
  onMarkPaid,
  onRefund,
  t,
}: OrderDetailsProps) {
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<string | null>(null)
  const [refundDialogOpen, setRefundDialogOpen] = useState(false)

  const handleStatusChangeRequest = (newStatus: string) => {
    setPendingStatus(newStatus)
    setConfirmDialogOpen(true)
  }

  const handleConfirmStatusChange = async () => {
    if (!pendingStatus) return
    setConfirmDialogOpen(false)
    await onStatusChange(pendingStatus)
    setPendingStatus(null)
  }

  const handleRefundRequest = () => {
    setRefundDialogOpen(true)
  }

  const handleConfirmRefund = async () => {
    setRefundDialogOpen(false)
    await onRefund()
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/ecommerce/orders">
          <ChevronLeft className="me-1 h-4 w-4" />
          {t("detail.backToOrders")}
        </Link>
      </Button>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-4 md:col-span-2">
          <OrderHeaderCard
            order={order}
            updatingStatus={updatingStatus}
            onStatusChange={handleStatusChangeRequest}
            t={t}
          />
          <OrderItemsCard order={order} t={t} />
          <OrderNotesCard order={order} t={t} />
        </div>
        <div className="space-y-4">
          <OrderCustomerCard order={order} t={t} />
          <OrderPaymentCard
            order={order}
            refunding={refunding}
            onMarkPaid={onMarkPaid}
            onRefund={handleRefundRequest}
            t={t}
          />
          <OrderTimelineCard order={order} t={t} />
        </div>
      </div>

      {/* Status Change Confirmation Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("detail.confirmStatusChange")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("detail.confirmStatusDescription").replace(
                "{status}",
                pendingStatus || ""
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingStatus(null)}>
              {t("detail.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmStatusChange}>
              {t("detail.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Refund Confirmation Dialog */}
      <AlertDialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("refund.confirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("refund.confirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("refund.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRefund}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("refund.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
