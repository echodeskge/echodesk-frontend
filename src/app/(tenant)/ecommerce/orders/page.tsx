"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { apiEcommerceOrdersList } from "@/api/generated"
import { Order } from "@/api/generated/interfaces"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, Package, ShoppingCart, Clock, CheckCircle2, Truck, XCircle, CreditCard, Banknote, AlertCircle } from "lucide-react"

const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  confirmed: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  processing: "bg-purple-100 text-purple-800 hover:bg-purple-100",
  shipped: "bg-indigo-100 text-indigo-800 hover:bg-indigo-100",
  delivered: "bg-green-100 text-green-800 hover:bg-green-100",
  cancelled: "bg-red-100 text-red-800 hover:bg-red-100",
}

const STATUS_ICONS = {
  pending: Clock,
  confirmed: CheckCircle2,
  processing: Package,
  shipped: Truck,
  delivered: CheckCircle2,
  cancelled: XCircle,
}

const PAYMENT_STATUS_COLORS = {
  pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
  paid: "bg-green-50 text-green-700 border-green-200",
  failed: "bg-red-50 text-red-700 border-red-200",
  refunded: "bg-gray-50 text-gray-700 border-gray-200",
  partially_refunded: "bg-orange-50 text-orange-700 border-orange-200",
}

const PAYMENT_STATUS_ICONS = {
  pending: Clock,
  paid: CheckCircle2,
  failed: XCircle,
  refunded: AlertCircle,
  partially_refunded: AlertCircle,
}

export default function EcommerceOrdersPage() {
  const t = useTranslations("ecommerceOrders")
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [initiatingPayment, setInitiatingPayment] = useState<number | null>(null)

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const response = await apiEcommerceOrdersList()
      setOrders(response.results || response as any)
    } catch (error) {
      console.error("Failed to fetch orders:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleInitiatePayment = async (orderId: number, paymentMethod: string = "card") => {
    try {
      setInitiatingPayment(orderId)

      // TODO: Replace with actual API call
      // const response = await apiEcommerceOrdersInitiatePaymentCreate(orderId, {
      //   payment_method: paymentMethod,
      //   return_url_success: `${window.location.origin}/ecommerce/orders/payment/success`,
      //   return_url_fail: `${window.location.origin}/ecommerce/orders/payment/failed`
      // })

      // if (response.payment_url) {
      //   // Redirect to BOG payment page
      //   window.location.href = response.payment_url
      // }

      // Simulated for now - alert user
      alert("Payment API integration pending. This will redirect to BOG payment page when connected.")
      setInitiatingPayment(null)
    } catch (error) {
      console.error("Failed to initiate payment:", error)
      alert("Failed to initiate payment. Please try again.")
      setInitiatingPayment(null)
    }
  }

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.client_details.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === "all" || String(order.status) === statusFilter

    return matchesSearch && matchesStatus
  })

  const stats = {
    total: orders.length,
    pending: orders.filter(o => String(o.status) === "pending").length,
    processing: orders.filter(o => String(o.status) === "processing" || String(o.status) === "confirmed").length,
    completed: orders.filter(o => String(o.status) === "delivered").length,
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatCurrency = (amount: string) => {
    return `₾${parseFloat(amount).toFixed(2)}`
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
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground mt-1">
          {t("subtitle")}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("stats.total")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("stats.pending")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("stats.processing")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.processing}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("stats.completed")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div>
              <CardTitle>{t("ordersTitle")}</CardTitle>
              <CardDescription>
                {t("ordersFound", { count: filteredOrders.length })}
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder={t("filterByStatus")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("status.all")}</SelectItem>
                  <SelectItem value="pending">{t("status.pending")}</SelectItem>
                  <SelectItem value="confirmed">{t("status.confirmed")}</SelectItem>
                  <SelectItem value="processing">{t("status.processing")}</SelectItem>
                  <SelectItem value="shipped">{t("status.shipped")}</SelectItem>
                  <SelectItem value="delivered">{t("status.delivered")}</SelectItem>
                  <SelectItem value="cancelled">{t("status.cancelled")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">{t("noOrders")}</h3>
              <p className="text-muted-foreground mt-2">
                {searchQuery || statusFilter !== "all"
                  ? t("noOrdersFiltered")
                  : t("noOrdersYet")}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("table.orderNumber")}</TableHead>
                    <TableHead>{t("table.customer")}</TableHead>
                    <TableHead>{t("table.items")}</TableHead>
                    <TableHead>{t("table.total")}</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>{t("table.status")}</TableHead>
                    <TableHead>{t("table.date")}</TableHead>
                    <TableHead className="text-right">{t("table.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => {
                    const StatusIcon = STATUS_ICONS[String(order.status) as keyof typeof STATUS_ICONS] || Clock
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">
                          {order.order_number}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{order.client_details}</div>
                            {order.delivery_address && (
                              <div className="text-sm text-muted-foreground">
                                {order.delivery_address.city}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{t("table.itemsCount", { count: order.total_items })}</TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(order.total_amount)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={STATUS_COLORS[String(order.status) as keyof typeof STATUS_COLORS] || ""}
                          >
                            <StatusIcon className="mr-1 h-3 w-3" />
                            {t(`status.${String(order.status)}`)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(order.created_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">
                            {t("viewDetails")}
                          </Button>
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
