"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { useLocale } from "next-intl"
import { bookingsAdminBookingsList } from "@/api/generated"
import { BookingList } from "@/api/generated/interfaces"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, CalendarCheck, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react"

const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  confirmed: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  in_progress: "bg-purple-100 text-purple-800 hover:bg-purple-100",
  completed: "bg-green-100 text-green-800 hover:bg-green-100",
  cancelled: "bg-red-100 text-red-800 hover:bg-red-100",
  no_show: "bg-gray-100 text-gray-800 hover:bg-gray-100",
}

const STATUS_ICONS = {
  pending: Clock,
  confirmed: CheckCircle2,
  in_progress: AlertCircle,
  completed: CheckCircle2,
  cancelled: XCircle,
  no_show: XCircle,
}

const PAYMENT_STATUS_COLORS = {
  unpaid: "bg-yellow-50 text-yellow-700 border-yellow-200",
  deposit_paid: "bg-blue-50 text-blue-700 border-blue-200",
  fully_paid: "bg-green-50 text-green-700 border-green-200",
  refunded: "bg-gray-50 text-gray-700 border-gray-200",
  partially_refunded: "bg-orange-50 text-orange-700 border-orange-200",
}

export default function BookingsListPage() {
  const t = useTranslations("bookingsBookings")
  const locale = useLocale()
  const [bookings, setBookings] = useState<BookingList[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [dateFilter, setDateFilter] = useState<string>("all")

  useEffect(() => {
    fetchBookings()
  }, [])

  const fetchBookings = async () => {
    try {
      setLoading(true)
      const response = await bookingsAdminBookingsList()
      setBookings((response.results || response) as BookingList[])
    } catch (error) {
      console.error("Failed to fetch bookings:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch =
      booking.booking_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.client.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (typeof booking.service.name === 'string' ? booking.service.name : booking.service.name.en || "").toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === "all" || booking.status === statusFilter as any

    let matchesDate = true
    if (dateFilter !== "all") {
      const bookingDate = new Date(booking.date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      switch (dateFilter) {
        case "today":
          matchesDate = bookingDate.toDateString() === today.toDateString()
          break
        case "upcoming":
          matchesDate = bookingDate >= today
          break
        case "past":
          matchesDate = bookingDate < today
          break
      }
    }

    return matchesSearch && matchesStatus && matchesDate
  })

  const stats = {
    total: bookings.length,
    pending: bookings.filter(b => b.status === "pending" as any).length,
    confirmed: bookings.filter(b => b.status === "confirmed" as any).length,
    completed: bookings.filter(b => b.status === "completed" as any).length,
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale === "ka" ? "ka-GE" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const formatTime = (timeString: string) => {
    return timeString.slice(0, 5)
  }

  const formatCurrency = (amount: string) => {
    return `₾${parseFloat(amount).toFixed(2)}`
  }

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: t("pending"),
      confirmed: t("confirmed"),
      in_progress: t("inProgress"),
      completed: t("completed"),
      cancelled: t("cancelled"),
      no_show: t("noShow"),
    }
    return statusMap[status] || status
  }

  const getPaymentStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      unpaid: t("unpaid"),
      deposit_paid: t("depositPaid"),
      fully_paid: t("fullyPaid"),
      refunded: t("refunded"),
      partially_refunded: t("partiallyRefunded"),
    }
    return statusMap[status] || status
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground mt-1">{t("subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("totalBookings")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("pending")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("confirmed")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.confirmed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("completed")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div>
              <CardTitle>{t("allBookings")}</CardTitle>
              <CardDescription>{t("bookingsFound", { count: filteredBookings.length })}</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("searchBookings")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder={t("allDates")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allDates")}</SelectItem>
                  <SelectItem value="today">{t("today")}</SelectItem>
                  <SelectItem value="upcoming">{t("upcoming")}</SelectItem>
                  <SelectItem value="past">{t("past")}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder={t("allStatus")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allStatus")}</SelectItem>
                  <SelectItem value="pending">{t("pending")}</SelectItem>
                  <SelectItem value="confirmed">{t("confirmed")}</SelectItem>
                  <SelectItem value="in_progress">{t("inProgress")}</SelectItem>
                  <SelectItem value="completed">{t("completed")}</SelectItem>
                  <SelectItem value="cancelled">{t("cancelled")}</SelectItem>
                  <SelectItem value="no_show">{t("noShow")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredBookings.length === 0 ? (
            <div className="text-center py-12">
              <CalendarCheck className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">{t("noBookingsFound")}</h3>
              <p className="text-muted-foreground mt-2">
                {searchQuery || statusFilter !== "all" || dateFilter !== "all"
                  ? t("noBookingsMatch")
                  : t("noBookingsYet")}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("bookingNumber")}</TableHead>
                    <TableHead>{t("client")}</TableHead>
                    <TableHead>{t("service")}</TableHead>
                    <TableHead>{t("dateTime")}</TableHead>
                    <TableHead>{t("staff")}</TableHead>
                    <TableHead>{t("amount")}</TableHead>
                    <TableHead>{t("payment")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                    <TableHead className="text-right">{t("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBookings.map((booking) => {
                    const StatusIcon = STATUS_ICONS[booking.status as unknown as keyof typeof STATUS_ICONS] || Clock
                    return (
                      <TableRow key={booking.id}>
                        <TableCell className="font-medium">{booking.booking_number}</TableCell>
                        <TableCell>
                          <div className="font-medium">{booking.client.full_name}</div>
                        </TableCell>
                        <TableCell>{typeof booking.service.name === 'string' ? booking.service.name : booking.service.name.en || ""}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium">{formatDate(booking.date)}</div>
                            <div className="text-muted-foreground">
                              {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{booking.staff ? `${booking.staff.user.first_name} ${booking.staff.user.last_name}` : t("unassigned")}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(booking.total_amount)}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={PAYMENT_STATUS_COLORS[booking.payment_status as unknown as keyof typeof PAYMENT_STATUS_COLORS] || ""}
                          >
                            {getPaymentStatusLabel(booking.payment_status as unknown as string)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={STATUS_COLORS[booking.status as unknown as keyof typeof STATUS_COLORS] || ""}
                          >
                            <StatusIcon className="mr-1 h-3 w-3" />
                            {getStatusLabel(booking.status as unknown as string)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/bookings/bookings/${booking.id}`}>
                            <Button variant="ghost" size="sm">{t("view")}</Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
