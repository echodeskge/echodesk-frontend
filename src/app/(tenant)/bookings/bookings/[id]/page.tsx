"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { CalendarX, ChevronLeft } from "lucide-react"
import type { BookingCancelResponse, BookingDetail, MethodEnum } from "@/api/generated/interfaces"
import { Skeleton } from "@/components/ui/skeleton"
import { useMyAccess } from "@/hooks/useMyAccess"
import { getApiErrorMessage } from "@/lib/utils"
import {
  assignBookingStaff,
  cancelBooking,
  checkBookingPaymentStatus,
  checkInBooking,
  completeBooking,
  confirmBooking,
  fetchBooking,
  markNoShow,
  recordBookingPayment,
  rescheduleBooking,
  updateBooking,
} from "../../_lib/bookings-api"
import { handlerUserId, needsForce } from "../../_lib/booking-status"
import { BookingsEmptyState, BookingsErrorState, BookingsHeaderBridge, BookingsPage, DetailColumns, bkgButton, humanize } from "../../_components/ui"
import { BookingHeader, type BookingAction } from "./_components/booking-header"
import { BookingInfoCard, CancellationCard, ClientInfoCard, RatingCard } from "./_components/info-cards"
import { NotesCard } from "./_components/notes-card"
import { PaymentCard } from "./_components/payment-card"
import { TimelineCard } from "./_components/timeline-card"
import { AssignStaffDialog, CancelDialog, ForceDialog, RecordPaymentDialog, RescheduleDialog } from "./_components/dialogs"

type Dialog = "cancel" | "reschedule" | "assignStaff" | "payment" | null

export default function BookingDetailPage() {
  const params = useParams()
  const id = Number(params.id)
  const t = useTranslations("bookingsDetail")
  const tUi = useTranslations("bookingsUi")
  const { isBookingAdmin, userId } = useMyAccess()

  const [booking, setBooking] = useState<BookingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [busy, setBusy] = useState<BookingAction | null>(null)
  const [dialog, setDialog] = useState<Dialog>(null)
  const [forceAction, setForceAction] = useState<"confirm" | "checkIn" | null>(null)
  const [cancelResult, setCancelResult] = useState<BookingCancelResponse | null>(null)
  const [savingNotes, setSavingNotes] = useState(false)
  const [savingPrice, setSavingPrice] = useState(false)
  const [checking, setChecking] = useState(false)

  const load = useCallback(async () => {
    if (!Number.isFinite(id)) return
    setLoading(true)
    setLoadError(null)
    try {
      setBooking(await fetchBooking(id))
    } catch (e) {
      setLoadError(e)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  /** Runs a status action; a payment-gated refusal opens the force prompt instead of a toast. */
  const run = useCallback(
    async (action: BookingAction, call: () => Promise<BookingDetail | BookingCancelResponse>, successKey: string) => {
      setBusy(action)
      try {
        const result = await call()
        setBooking(result)
        toast.success(t(`toast.${successKey}`))
        return true
      } catch (e) {
        if ((action === "confirm" || action === "checkIn") && needsForce(e)) {
          setForceAction(action)
        } else {
          toast.error(getApiErrorMessage(e, t("toast.actionFailed")))
        }
        return false
      } finally {
        setBusy(null)
      }
    },
    [t]
  )

  const onAction = useCallback(
    (action: BookingAction) => {
      switch (action) {
        case "confirm":
          return run("confirm", () => confirmBooking(id), "confirmed")
        case "checkIn":
          return run("checkIn", () => checkInBooking(id), "checkedIn")
        case "complete":
          return run("complete", () => completeBooking(id), "completed")
        case "noShow":
          return run("noShow", () => markNoShow(id), "noShow")
        case "reschedule":
        case "assignStaff":
        case "cancel":
          setDialog(action)
          return
      }
    },
    [id, run]
  )

  const onForce = useCallback(async () => {
    const action = forceAction
    setForceAction(null)
    if (action === "confirm") await run("confirm", () => confirmBooking(id, true), "confirmed")
    else if (action === "checkIn") await run("checkIn", () => checkInBooking(id, true), "checkedIn")
  }, [forceAction, id, run])

  const onCancel = useCallback(
    async (reason: string) => {
      setBusy("cancel")
      try {
        const result = await cancelBooking(id, reason)
        setBooking(result)
        setCancelResult(result)
        setDialog(null)
        toast.success(t("toast.cancelled"))
        const refund = Number(result.refund?.amount ?? 0)
        if (refund > 0 && result.refund?.status !== "no_refund" && result.refund?.status !== "error") {
          toast.info(t("toast.refundStarted", { amount: `₾${refund.toFixed(2)}` }))
        }
        // Cash taken at the desk is never refunded online; the backend says how much to hand back.
        const manualDue = Number(result.manual_refund_due ?? 0)
        if (manualDue > 0) toast.warning(t("toast.manualRefundDue", { amount: `₾${manualDue.toFixed(2)}` }))
      } catch (e) {
        toast.error(getApiErrorMessage(e, t("toast.actionFailed")))
      } finally {
        setBusy(null)
      }
    },
    [id, t]
  )

  const onReschedule = useCallback(
    async (date: string, startTime: string) => {
      if (await run("reschedule", () => rescheduleBooking(id, date, startTime), "rescheduled")) setDialog(null)
    },
    [id, run]
  )

  const onAssign = useCallback(
    async (staffId: number) => {
      if (await run("assignStaff", () => assignBookingStaff(id, staffId), "staffAssigned")) setDialog(null)
    },
    [id, run]
  )

  const onRecordPayment = useCallback(
    async (p: { amount: string; method: MethodEnum; note: string }) => {
      setBusy("cancel")
      try {
        setBooking(await recordBookingPayment(id, p))
        setDialog(null)
        toast.success(t("toast.paymentRecorded"))
      } catch (e) {
        toast.error(getApiErrorMessage(e, t("toast.actionFailed")))
      } finally {
        setBusy(null)
      }
    },
    [id, t]
  )

  const onSaveNotes = useCallback(
    async (notes: { client_notes: string; staff_notes: string }) => {
      setSavingNotes(true)
      try {
        setBooking(await updateBooking(id, notes))
        toast.success(t("notes.saved"))
        return true
      } catch (e) {
        toast.error(getApiErrorMessage(e, t("notes.saveFailed")))
        return false
      } finally {
        setSavingNotes(false)
      }
    },
    [id, t]
  )

  const onSavePrice = useCallback(
    async (price: string) => {
      setSavingPrice(true)
      try {
        setBooking(await updateBooking(id, { total_amount: price }))
        toast.success(t("payment.priceSaved"))
        return true
      } catch (e) {
        toast.error(getApiErrorMessage(e, t("payment.priceFailed")))
        return false
      } finally {
        setSavingPrice(false)
      }
    },
    [id, t]
  )

  const onCheckStatus = useCallback(async () => {
    setChecking(true)
    try {
      const result = await checkBookingPaymentStatus(id)
      const status = String(result.payment_status ?? result.status ?? "")
      toast.info(t("payment.paymentStatusChecked", { status: tUi.has(`paymentStatus.${status}`) ? tUi(`paymentStatus.${status}`) : humanize(status) }))
      await load()
    } catch (e) {
      toast.error(getApiErrorMessage(e, t("payment.checkFailed")))
    } finally {
      setChecking(false)
    }
  }, [id, t, tUi, load])

  const cardSkeleton = (key: number, h: string) => (
    <div key={key} className="rounded-[10px] border bg-card">
      <div className="flex h-11 items-center border-b px-4">
        <Skeleton className="h-3 w-28" />
      </div>
      <div className="p-4">
        <Skeleton className={`w-full ${h}`} />
      </div>
    </div>
  )

  if (loading && !booking) {
    return (
      <BookingsPage testId="bkg-booking-loading">
        <div aria-busy className="flex max-w-[1200px] flex-col gap-4">
          <Skeleton className="h-14 w-full rounded-lg" />
          <DetailColumns main={[0, 1, 2].map((i) => cardSkeleton(i, "h-24"))} rail={[3, 4].map((i) => cardSkeleton(i, "h-16"))} />
        </div>
      </BookingsPage>
    )
  }

  if (!booking) {
    const notFound = (loadError as { response?: { status?: number } } | null)?.response?.status === 404
    return (
      <BookingsPage testId="bkg-booking-missing">
        <BookingsHeaderBridge breadcrumb={`#${params.id ?? ""}`} />
        {notFound || !loadError ? (
          <BookingsEmptyState
            icon={CalendarX}
            title={t("notFound")}
            description={t("notFoundHint")}
            action={
              <Link href="/bookings/bookings" className={bkgButton.outlineSm}>
                <ChevronLeft className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden />
                {t("backToBookings")}
              </Link>
            }
            testId="bkg-booking-not-found"
          />
        ) : (
          <BookingsErrorState error={loadError} onRetry={load} title={t("loadFailed")} />
        )}
      </BookingsPage>
    )
  }

  const canEditNotes = isBookingAdmin || (userId !== undefined && handlerUserId(booking) === userId)

  return (
    <BookingsPage testId="bkg-booking-detail">
      <BookingsHeaderBridge breadcrumb={`#${booking.booking_number}`} />
      <div className="flex w-full max-w-[1200px] min-w-0 flex-col gap-4">
        <BookingHeader booking={booking} busy={busy} onAction={onAction} t={t} />
        <DetailColumns
          main={
            <>
              <BookingInfoCard booking={booking} t={t} />
              <ClientInfoCard booking={booking} t={t} />
              <NotesCard booking={booking} canEdit={canEditNotes} saving={savingNotes} onSave={onSaveNotes} t={t} />
              <RatingCard booking={booking} t={t} />
              <CancellationCard booking={booking} cancelResult={cancelResult} t={t} />
            </>
          }
          rail={
            <>
              <PaymentCard
                booking={booking}
                isAdmin={isBookingAdmin}
                checking={checking}
                savingPrice={savingPrice}
                onRecordPayment={() => setDialog("payment")}
                onCheckStatus={onCheckStatus}
                onSavePrice={onSavePrice}
                t={t}
              />
              <TimelineCard booking={booking} t={t} />
            </>
          }
        />
      </div>

      <ForceDialog open={forceAction !== null} onOpenChange={(o) => !o && setForceAction(null)} onConfirm={onForce} submitting={busy !== null} t={t} />
      <CancelDialog open={dialog === "cancel"} onOpenChange={(o) => !o && setDialog(null)} onSubmit={onCancel} submitting={busy === "cancel"} t={t} />
      <RescheduleDialog open={dialog === "reschedule"} onOpenChange={(o) => !o && setDialog(null)} booking={booking} onSubmit={onReschedule} submitting={busy === "reschedule"} t={t} />
      <AssignStaffDialog open={dialog === "assignStaff"} onOpenChange={(o) => !o && setDialog(null)} booking={booking} onSubmit={onAssign} submitting={busy === "assignStaff"} t={t} />
      <RecordPaymentDialog open={dialog === "payment"} onOpenChange={(o) => !o && setDialog(null)} booking={booking} onSubmit={onRecordPayment} submitting={busy === "cancel"} t={t} />
    </BookingsPage>
  )
}
