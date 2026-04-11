"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useTranslations, useLocale } from "next-intl"
import {
  bookingsAdminBookingsRetrieve,
  bookingsAdminBookingsConfirmCreate,
  bookingsAdminBookingsCompleteCreate,
  bookingsAdminBookingsCancelCreate,
  bookingsAdminBookingsRescheduleCreate,
  bookingsAdminBookingsAssignStaffCreate,
  bookingsAdminStaffList,
} from "@/api/generated"
import { BookingDetail, BookingStaff } from "@/api/generated/interfaces"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  User,
  CreditCard,
  Star,
  AlertCircle,
  RefreshCw,
  UserPlus,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  in_progress: "bg-purple-100 text-purple-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  no_show: "bg-gray-100 text-gray-800",
}

const PAYMENT_COLORS: Record<string, string> = {
  unpaid: "bg-yellow-50 text-yellow-700 border-yellow-200",
  deposit_paid: "bg-blue-50 text-blue-700 border-blue-200",
  fully_paid: "bg-green-50 text-green-700 border-green-200",
  refunded: "bg-gray-50 text-gray-700 border-gray-200",
  partially_refunded: "bg-orange-50 text-orange-700 border-orange-200",
}

export default function BookingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const t = useTranslations("bookingsBookings")
  const locale = useLocale()
  const { toast } = useToast()
  const bookingId = Number(params.id)

  const [booking, setBooking] = useState<BookingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  // Dialog states
  const [cancelDialog, setCancelDialog] = useState(false)
  const [cancelReason, setCancelReason] = useState("")
  const [rescheduleDialog, setRescheduleDialog] = useState(false)
  const [newDate, setNewDate] = useState("")
  const [newTime, setNewTime] = useState("")
  const [staffDialog, setStaffDialog] = useState(false)
  const [staffList, setStaffList] = useState<BookingStaff[]>([])
  const [selectedStaffId, setSelectedStaffId] = useState("")

  useEffect(() => {
    fetchBooking()
  }, [bookingId])

  const fetchBooking = async () => {
    try {
      setLoading(true)
      const data = await bookingsAdminBookingsRetrieve(bookingId)
      setBooking(data as BookingDetail)
    } catch {
      toast({ title: t("error"), description: t("fetchFailed"), variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    setActionLoading(true)
    try {
      await bookingsAdminBookingsConfirmCreate(bookingId, {} as any)
      toast({ title: t("success"), description: t("bookingConfirmed") })
      fetchBooking()
    } catch {
      toast({ title: t("error"), description: t("actionFailed"), variant: "destructive" })
    } finally {
      setActionLoading(false)
    }
  }

  const handleComplete = async () => {
    setActionLoading(true)
    try {
      await bookingsAdminBookingsCompleteCreate(bookingId, {} as any)
      toast({ title: t("success"), description: t("bookingCompleted") })
      fetchBooking()
    } catch {
      toast({ title: t("error"), description: t("actionFailed"), variant: "destructive" })
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancel = async () => {
    setActionLoading(true)
    try {
      await bookingsAdminBookingsCancelCreate(bookingId, { reason: cancelReason } as any)
      toast({ title: t("success"), description: t("bookingCancelled") })
      setCancelDialog(false)
      setCancelReason("")
      fetchBooking()
    } catch {
      toast({ title: t("error"), description: t("actionFailed"), variant: "destructive" })
    } finally {
      setActionLoading(false)
    }
  }

  const handleReschedule = async () => {
    if (!newDate || !newTime) return
    setActionLoading(true)
    try {
      await bookingsAdminBookingsRescheduleCreate(bookingId, {
        date: newDate,
        start_time: newTime,
      } as any)
      toast({ title: t("success"), description: t("bookingRescheduled") })
      setRescheduleDialog(false)
      setNewDate("")
      setNewTime("")
      fetchBooking()
    } catch {
      toast({ title: t("error"), description: t("actionFailed"), variant: "destructive" })
    } finally {
      setActionLoading(false)
    }
  }

  const handleOpenStaffDialog = async () => {
    try {
      const response = await bookingsAdminStaffList()
      setStaffList((response.results || response) as BookingStaff[])
      setStaffDialog(true)
    } catch {
      toast({ title: t("error"), description: t("actionFailed"), variant: "destructive" })
    }
  }

  const handleAssignStaff = async () => {
    if (!selectedStaffId) return
    setActionLoading(true)
    try {
      await bookingsAdminBookingsAssignStaffCreate(bookingId, {
        staff_id: parseInt(selectedStaffId),
      } as any)
      toast({ title: t("success"), description: t("staffAssigned") })
      setStaffDialog(false)
      setSelectedStaffId("")
      fetchBooking()
    } catch {
      toast({ title: t("error"), description: t("actionFailed"), variant: "destructive" })
    } finally {
      setActionLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(locale === "ka" ? "ka-GE" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString(locale === "ka" ? "ka-GE" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatTime = (timeStr: string) => timeStr?.slice(0, 5) || ""

  const formatCurrency = (amount: string | undefined) => {
    if (!amount) return "₾0.00"
    return `₾${parseFloat(amount).toFixed(2)}`
  }

  const status = booking?.status as unknown as string
  const paymentStatus = booking?.payment_status as unknown as string
  const canConfirm = status === "pending"
  const canComplete = status === "confirmed" || status === "in_progress"
  const canCancel = status === "pending" || status === "confirmed"
  const canReschedule = status === "pending" || status === "confirmed"

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="h-64 bg-gray-200 rounded"></div>
              <div className="h-48 bg-gray-200 rounded"></div>
            </div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">{t("notFound")}</h3>
        <Button className="mt-4" variant="outline" onClick={() => router.push("/bookings/bookings")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("backToBookings")}
        </Button>
      </div>
    )
  }

  const serviceName = typeof booking.service.name === "string"
    ? booking.service.name
    : booking.service.name?.en || ""

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/bookings/bookings")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">#{booking.booking_number}</h1>
            <p className="text-muted-foreground">{serviceName}</p>
          </div>
          <Badge className={STATUS_COLORS[status] || ""}>
            {t(status === "in_progress" ? "inProgress" : status === "no_show" ? "noShow" : status)}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          {canConfirm && (
            <Button onClick={handleConfirm} disabled={actionLoading} size="sm">
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {t("confirmBooking")}
            </Button>
          )}
          {canComplete && (
            <Button onClick={handleComplete} disabled={actionLoading} size="sm" variant="default">
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {t("completeBooking")}
            </Button>
          )}
          {canReschedule && (
            <Button onClick={() => setRescheduleDialog(true)} disabled={actionLoading} size="sm" variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              {t("rescheduleBooking")}
            </Button>
          )}
          <Button onClick={handleOpenStaffDialog} disabled={actionLoading} size="sm" variant="outline">
            <UserPlus className="mr-2 h-4 w-4" />
            {t("assignStaff")}
          </Button>
          {canCancel && (
            <Button onClick={() => setCancelDialog(true)} disabled={actionLoading} size="sm" variant="destructive">
              <XCircle className="mr-2 h-4 w-4" />
              {t("cancelBooking")}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Booking Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {t("bookingInfo")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t("dateTime")}</p>
                  <p className="font-medium">
                    {formatDate(booking.date)}, {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("service")}</p>
                  <p className="font-medium">{serviceName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("staff")}</p>
                  <p className="font-medium">
                    {booking.staff
                      ? `${booking.staff.user.first_name} ${booking.staff.user.last_name}`
                      : t("unassigned")}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("status")}</p>
                  <Badge className={STATUS_COLORS[status] || ""}>
                    {t(status === "in_progress" ? "inProgress" : status === "no_show" ? "noShow" : status)}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Client Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {t("clientInfo")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t("client")}</p>
                  <p className="font-medium">{booking.client.full_name}</p>
                </div>
                {booking.client.email && (
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{booking.client.email}</p>
                  </div>
                )}
                {booking.client.phone_number && (
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{booking.client.phone_number}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>{t("notes")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">{t("clientNotes")}</p>
                <p className="text-sm">{booking.client_notes || t("noNotes")}</p>
              </div>
              <Separator />
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">{t("staffNotes")}</p>
                <p className="text-sm">{booking.staff_notes || t("noNotes")}</p>
              </div>
            </CardContent>
          </Card>

          {/* Rating (if completed) */}
          {(booking as any).rating && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  {t("rating")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-5 w-5 ${star <= (booking as any).rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                    />
                  ))}
                  <span className="font-medium ml-2">{(booking as any).rating}/5</span>
                </div>
                {(booking as any).review && <p className="text-sm text-muted-foreground">{(booking as any).review}</p>}
              </CardContent>
            </Card>
          )}

          {/* Cancellation Info */}
          {status === "cancelled" && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-red-700">{t("cancelledAt")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {booking.cancelled_at && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">{t("cancelledAt")}:</span>{" "}
                    {formatDateTime(booking.cancelled_at)}
                  </p>
                )}
                {booking.cancelled_by && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">{t("cancelledBy")}:</span>{" "}
                    {booking.cancelled_by as unknown as string}
                  </p>
                )}
                {booking.cancellation_reason && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">{t("cancellationReason")}:</span>{" "}
                    {booking.cancellation_reason}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Payment + Timeline */}
        <div className="space-y-6">
          {/* Payment Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                {t("paymentInfo")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("totalAmount")}</span>
                <span className="font-bold text-lg">{formatCurrency(booking.total_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("depositAmount")}</span>
                <span>{formatCurrency(booking.deposit_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("paidAmount")}</span>
                <span className="text-green-600">{formatCurrency(booking.paid_amount)}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("remainingAmount")}</span>
                <span className="font-medium">{formatCurrency(booking.remaining_amount)}</span>
              </div>
              <div className="pt-2">
                <Badge variant="outline" className={PAYMENT_COLORS[paymentStatus] || ""}>
                  {t(paymentStatus === "deposit_paid" ? "depositPaid" : paymentStatus === "fully_paid" ? "fullyPaid" : paymentStatus === "partially_refunded" ? "partiallyRefunded" : paymentStatus)}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                {t("timeline")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                  <div>
                    <p className="text-sm font-medium">{t("createdAt")}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(booking.created_at)}</p>
                  </div>
                </div>
                {booking.confirmed_at && (
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <div>
                      <p className="text-sm font-medium">{t("confirmedAt")}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(booking.confirmed_at)}</p>
                    </div>
                  </div>
                )}
                {booking.completed_at && (
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <div>
                      <p className="text-sm font-medium">{t("completedAt")}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(booking.completed_at)}</p>
                    </div>
                  </div>
                )}
                {booking.cancelled_at && (
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <div>
                      <p className="text-sm font-medium">{t("cancelledAt")}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(booking.cancelled_at)}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialog} onOpenChange={setCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("cancelBooking")}</DialogTitle>
            <DialogDescription>{t("confirmAction")}</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="reason">{t("cancelReason")}</Label>
            <Textarea
              id="reason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialog(false)}>
              {t("cancelled") === t("cancelled") ? "Close" : t("cancelled")}
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={actionLoading}>
              {t("cancelBooking")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog open={rescheduleDialog} onOpenChange={setRescheduleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("rescheduleBooking")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="newDate">{t("newDate")}</Label>
              <Input
                id="newDate"
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="newTime">{t("newTime")}</Label>
              <Input
                id="newTime"
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleReschedule} disabled={actionLoading || !newDate || !newTime}>
              {t("rescheduleBooking")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Staff Dialog */}
      <Dialog open={staffDialog} onOpenChange={setStaffDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("assignStaff")}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label>{t("selectStaff")}</Label>
            <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder={t("selectStaff")} />
              </SelectTrigger>
              <SelectContent>
                {staffList.map((s) => (
                  <SelectItem key={s.id} value={s.id.toString()}>
                    {s.user.first_name} {s.user.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStaffDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignStaff} disabled={actionLoading || !selectedStaffId}>
              {t("assignStaff")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
