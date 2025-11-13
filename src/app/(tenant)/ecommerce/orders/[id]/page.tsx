"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { ecommerceAdminOrdersRetrieve } from "@/api/generated"
import { Order as GeneratedOrder } from "@/api/generated/interfaces"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, Package, User, MapPin, CreditCard, Calendar, FileText } from "lucide-react"
import { toast } from "sonner"

// Extend Order type to properly type client_details
interface Order extends Omit<GeneratedOrder, 'client_details'> {
  client_details: {
    id: number
    full_name: string
    email: string
    phone_number?: string
  }
}

const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  confirmed: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  processing: "bg-purple-100 text-purple-800 hover:bg-purple-100",
  shipped: "bg-indigo-100 text-indigo-800 hover:bg-indigo-100",
  delivered: "bg-green-100 text-green-800 hover:bg-green-100",
  cancelled: "bg-red-100 text-red-800 hover:bg-red-100",
}

const PAYMENT_STATUS_COLORS = {
  pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
  paid: "bg-green-50 text-green-700 border-green-200",
  failed: "bg-red-50 text-red-700 border-red-200",
  refunded: "bg-gray-50 text-gray-700 border-gray-200",
  partially_refunded: "bg-orange-50 text-orange-700 border-orange-200",
}

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const t = useTranslations("ecommerceOrders")
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  useEffect(() => {
    if (params.id) {
      fetchOrder(Number(params.id))
    }
  }, [params.id])

  const fetchOrder = async (id: number) => {
    try {
      setLoading(true)
      const response = await ecommerceAdminOrdersRetrieve(id)
      setOrder(response as unknown as Order)
    } catch (error) {
      console.error("Failed to fetch order:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatCurrency = (amount: string) => {
    return `₾${parseFloat(amount).toFixed(2)}`
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!order) return

    try {
      setUpdatingStatus(true)
      const response = await fetch(`/api/ecommerce/orders/${order.id}/update_status/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error('Failed to update status')
      }

      const updatedOrder = await response.json()
      setOrder(updatedOrder as unknown as Order)
      toast.success(`Order status updated to ${newStatus}`)
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Failed to update order status')
    } finally {
      setUpdatingStatus(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">Order not found</h3>
            <p className="text-muted-foreground mt-2">
              The order you're looking for doesn't exist or has been deleted.
            </p>
            <Button onClick={() => router.push("/ecommerce/orders")} className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Orders
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/ecommerce/orders")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{order.order_number}</h1>
            <p className="text-muted-foreground mt-1">
              Placed on {formatDate(order.created_at)}
            </p>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Order Status</label>
            <Select
              value={String(order.status)}
              onValueChange={handleStatusChange}
              disabled={updatingStatus}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-yellow-500"></span>
                    {t("status.pending")}
                  </div>
                </SelectItem>
                <SelectItem value="confirmed">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                    {t("status.confirmed")}
                  </div>
                </SelectItem>
                <SelectItem value="processing">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-purple-500"></span>
                    {t("status.processing")}
                  </div>
                </SelectItem>
                <SelectItem value="shipped">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
                    {t("status.shipped")}
                  </div>
                </SelectItem>
                <SelectItem value="delivered">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-green-500"></span>
                    {t("status.delivered")}
                  </div>
                </SelectItem>
                <SelectItem value="cancelled">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-red-500"></span>
                    {t("status.cancelled")}
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Payment Status</label>
            <Badge
              variant="outline"
              className={PAYMENT_STATUS_COLORS[String(order.payment_status) as keyof typeof PAYMENT_STATUS_COLORS] || ""}
            >
              {String(order.payment_status).replace("_", " ").toUpperCase()}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Order Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-center">Quantity</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {typeof item.product_name === "object"
                              ? item.product_name.en || item.product_name.ka || "Product"
                              : item.product_name}
                          </div>
                          {item.variant && (
                            <div className="text-sm text-muted-foreground">
                              Variant ID: {item.variant}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.subtotal)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Separator className="my-4" />
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">Total</span>
                <span className="text-2xl font-bold">{formatCurrency(order.total_amount)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {(order.notes || order.admin_notes) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {order.notes && (
                  <div>
                    <h4 className="font-medium mb-2">Customer Notes</h4>
                    <p className="text-muted-foreground">{order.notes}</p>
                  </div>
                )}
                {order.admin_notes && (
                  <div>
                    <h4 className="font-medium mb-2">Admin Notes</h4>
                    <p className="text-muted-foreground">{order.admin_notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="font-medium">{order.client_details.full_name}</p>
                <p className="text-sm text-muted-foreground">{order.client_details.email}</p>
                {order.client_details.phone_number && (
                  <p className="text-sm text-muted-foreground">{order.client_details.phone_number}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Delivery Address */}
          {order.delivery_address && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Delivery Address
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {order.delivery_address.label && (
                  <p className="font-medium">{order.delivery_address.label}</p>
                )}
                <p className="text-sm">{order.delivery_address.address}</p>
                <p className="text-sm">{order.delivery_address.city}</p>
                {order.delivery_address.extra_instructions && (
                  <p className="text-sm text-muted-foreground italic mt-2">
                    {order.delivery_address.extra_instructions}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Payment Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Method</span>
                <span className="text-sm font-medium capitalize">{order.payment_method || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge
                  variant="outline"
                  className={PAYMENT_STATUS_COLORS[String(order.payment_status) as keyof typeof PAYMENT_STATUS_COLORS] || ""}
                >
                  {String(order.payment_status).replace("_", " ")}
                </Badge>
              </div>
              {order.bog_order_id && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">BOG Order ID</span>
                  <span className="text-sm font-mono">{order.bog_order_id.slice(0, 8)}...</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium">Created</p>
                <p className="text-sm text-muted-foreground">{formatDate(order.created_at)}</p>
              </div>
              {order.confirmed_at && (
                <div>
                  <p className="text-sm font-medium">Confirmed</p>
                  <p className="text-sm text-muted-foreground">{formatDate(order.confirmed_at)}</p>
                </div>
              )}
              {order.paid_at && (
                <div>
                  <p className="text-sm font-medium">Paid</p>
                  <p className="text-sm text-muted-foreground">{formatDate(order.paid_at)}</p>
                </div>
              )}
              {order.shipped_at && (
                <div>
                  <p className="text-sm font-medium">Shipped</p>
                  <p className="text-sm text-muted-foreground">{formatDate(order.shipped_at)}</p>
                </div>
              )}
              {order.delivered_at && (
                <div>
                  <p className="text-sm font-medium">Delivered</p>
                  <p className="text-sm text-muted-foreground">{formatDate(order.delivered_at)}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
