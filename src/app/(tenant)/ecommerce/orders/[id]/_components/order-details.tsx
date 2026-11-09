"use client"

import { useState } from "react"
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
import { DetailLayout } from "../../../_components/ui"
import { OrderDetail } from "../../_types"
import { OrderHeaderCard } from "./order-header-card"
import { OrderItemsCard } from "./order-items-card"
import { OrderNotesCard } from "./order-notes-card"
import { OrderCustomerCard } from "./order-customer-card"
import { OrderShippingCard } from "./order-shipping-card"
import { OrderPaymentCard } from "./order-payment-card"
import { OrderTimelineCard } from "./order-timeline-card"

interface OrderDetailsProps {
  order: OrderDetail
  updatingStatus: boolean
  refunding: boolean
  /** E-commerce manager: may refund, mark paid and cancel paid orders. */
  isManager: boolean
  onStatusChange: (status: string) => Promise<void>
  onMarkPaid: () => Promise<void>
  onRefund: () => Promise<void>
  t: ((key: string, values?: Record<string, string | number>) => string) & { has?: (key: string) => boolean }
}

export function OrderDetails({
  order,
  updatingStatus,
  refunding,
  isManager,
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

  const pendingLabel = pendingStatus ? (t.has?.(`status.${pendingStatus}`) === false ? pendingStatus : t(`status.${pendingStatus}`)) : ""

  return (
    <>
      <DetailLayout
        testId="ec-order-detail"
        header={
          <OrderHeaderCard
            order={order}
            updatingStatus={updatingStatus}
            isManager={isManager}
            onStatusChange={handleStatusChangeRequest}
            t={t}
          />
        }
        main={
          <>
            <OrderItemsCard order={order} t={t} />
            <OrderNotesCard order={order} t={t} />
          </>
        }
        rail={
          <>
            <OrderCustomerCard order={order} t={t} />
            <OrderShippingCard order={order} t={t} />
            <OrderPaymentCard
              order={order}
              refunding={refunding}
              isManager={isManager}
              onMarkPaid={onMarkPaid}
              onRefund={handleRefundRequest}
              t={t}
            />
            <OrderTimelineCard order={order} t={t} />
          </>
        }
      />

      {/* Status Change Confirmation Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("detail.confirmStatusChange")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("detail.confirmStatusDescription", { status: pendingLabel })}
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
    </>
  )
}
