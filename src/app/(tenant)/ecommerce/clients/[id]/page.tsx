"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ecommerceAdminClientsRetrieve,
  ecommerceAdminOrdersList,
} from "@/api/generated";
import type {
  EcommerceClient,
  OrderList,
  PaginatedOrderListList,
} from "@/api/generated/interfaces";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  CheckCircle,
  XCircle,
  ShoppingCart,
  DollarSign,
  Clock,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import Link from "next/link";

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations("clientDetail");

  const [client, setClient] = useState<EcommerceClient | null>(null);
  const [orders, setOrders] = useState<OrderList[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchClient(Number(params.id));
      fetchOrders(Number(params.id));
    }
  }, [params.id]);

  const fetchClient = async (id: number) => {
    try {
      setLoading(true);
      const response = await ecommerceAdminClientsRetrieve(id);
      setClient(response);
    } catch (error) {
      toast.error(t("errors.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async (clientId: number) => {
    try {
      setOrdersLoading(true);
      const response: PaginatedOrderListList =
        await ecommerceAdminOrdersList(clientId);
      setOrders(response.results || []);
    } catch (error) {
      // Error shown via toast in fetchClient
    } finally {
      setOrdersLoading(false);
    }
  };

  const formatCurrency = (amount: string) => {
    return `\u20BE${parseFloat(amount).toFixed(2)}`;
  };

  const totalSpent = orders.reduce(
    (sum, order) => sum + parseFloat(order.total_amount || "0"),
    0
  );

  const lastOrderDate =
    orders.length > 0
      ? orders.sort(
          (a, b) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
        )[0]?.created_at
      : null;

  const STATUS_COLORS: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-blue-100 text-blue-800",
    processing: "bg-purple-100 text-purple-800",
    shipped: "bg-indigo-100 text-indigo-800",
    delivered: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
    refunded: "bg-gray-100 text-gray-800",
  };

  const PAYMENT_STATUS_COLORS: Record<string, string> = {
    pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
    paid: "bg-green-50 text-green-700 border-green-200",
    failed: "bg-red-50 text-red-700 border-red-200",
    refunded: "bg-gray-50 text-gray-700 border-gray-200",
    partially_refunded: "bg-orange-50 text-orange-700 border-orange-200",
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-20" />
          <div>
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </CardContent>
            </Card>
          </div>
          <div>
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <User className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">{t("notFound")}</h3>
            <p className="text-muted-foreground mt-2">
              {t("notFoundDescription")}
            </p>
            <Button
              onClick={() => router.push("/ecommerce/clients")}
              className="mt-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("backToClients")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/ecommerce/clients")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("back")}
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{client.full_name}</h1>
              {client.is_verified ? (
                <Badge variant="default" className="bg-blue-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {t("verified")}
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <XCircle className="h-3 w-3 mr-1" />
                  {t("unverified")}
                </Badge>
              )}
              {client.is_active ? (
                <Badge variant="default" className="bg-green-600">
                  {t("active")}
                </Badge>
              ) : (
                <Badge variant="secondary">{t("inactive")}</Badge>
              )}
            </div>
            <div className="flex items-center gap-4 mt-1 text-muted-foreground">
              <div className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {client.email}
              </div>
              {client.phone_number && (
                <div className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {client.phone_number}
                </div>
              )}
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {t("joinedOn", {
                  date: format(new Date(client.created_at), "MMM dd, yyyy"),
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("stats.totalOrders")}
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {ordersLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                orders.length
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("stats.totalSpent")}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {ordersLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                formatCurrency(totalSpent.toString())
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("stats.lastOrder")}
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {ordersLoading ? (
                <Skeleton className="h-8 w-28" />
              ) : lastOrderDate ? (
                format(new Date(lastOrderDate), "MMM dd, yyyy")
              ) : (
                <span className="text-muted-foreground text-base">
                  {t("stats.noOrders")}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order History */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                {t("orderHistory")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ordersLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t("noOrders")}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("ordersTable.orderNumber")}</TableHead>
                      <TableHead>{t("ordersTable.total")}</TableHead>
                      <TableHead>{t("ordersTable.status")}</TableHead>
                      <TableHead>{t("ordersTable.paymentStatus")}</TableHead>
                      <TableHead>{t("ordersTable.date")}</TableHead>
                      <TableHead>{t("ordersTable.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">
                          {order.order_number}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(order.total_amount)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              STATUS_COLORS[
                                String(order.status)
                              ] || ""
                            }
                          >
                            {String(order.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              PAYMENT_STATUS_COLORS[
                                String(order.payment_status)
                              ] || ""
                            }
                          >
                            {String(order.payment_status)
                              .replace("_", " ")
                              .toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(
                            new Date(order.created_at),
                            "MMM dd, yyyy"
                          )}
                        </TableCell>
                        <TableCell>
                          <Link href={`/ecommerce/orders/${order.id}`}>
                            <Button variant="ghost" size="sm">
                              {t("viewOrder")}
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Addresses */}
        <div className="space-y-6">
          {/* Client Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {t("clientInfo")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  {t("fields.firstName")}
                </span>
                <span className="text-sm font-medium">
                  {client.first_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  {t("fields.lastName")}
                </span>
                <span className="text-sm font-medium">
                  {client.last_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  {t("fields.email")}
                </span>
                <span className="text-sm font-medium">{client.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  {t("fields.phone")}
                </span>
                <span className="text-sm font-medium">
                  {client.phone_number || "-"}
                </span>
              </div>
              {client.date_of_birth && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    {t("fields.dateOfBirth")}
                  </span>
                  <span className="text-sm font-medium">
                    {format(
                      new Date(client.date_of_birth),
                      "MMM dd, yyyy"
                    )}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  {t("fields.lastLogin")}
                </span>
                <span className="text-sm font-medium">
                  {client.last_login
                    ? format(
                        new Date(client.last_login),
                        "MMM dd, yyyy HH:mm"
                      )
                    : "-"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Addresses */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                {t("addresses")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {client.addresses && client.addresses.length > 0 ? (
                <div className="space-y-4">
                  {client.addresses.map((address) => (
                    <div
                      key={address.id}
                      className="border rounded-lg p-3 space-y-1"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {address.label}
                        </span>
                        {address.is_default && (
                          <Badge variant="secondary" className="text-xs">
                            {t("defaultAddress")}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {address.address}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {address.city}
                      </p>
                      {address.extra_instructions && (
                        <p className="text-sm text-muted-foreground italic">
                          {address.extra_instructions}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-4 text-muted-foreground">
                  {t("noAddresses")}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
