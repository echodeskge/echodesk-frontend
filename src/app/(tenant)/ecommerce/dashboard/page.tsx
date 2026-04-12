"use client";

import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import axiosInstance from "@/api/axios";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DollarSign,
  TrendingUp,
  ShoppingCart,
  Package,
  Loader2,
} from "lucide-react";

interface AnalyticsData {
  revenue: {
    today: number;
    week: number;
    month: number;
    total: number;
  };
  orders: {
    today: number;
    week: number;
    month: number;
    total: number;
  };
  top_products: Array<{
    product__name: Record<string, string> | string;
    sold: number;
    revenue: number;
  }>;
  order_status_breakdown: Record<string, number>;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  processing: "bg-purple-100 text-purple-800",
  shipped: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function EcommerceDashboardPage() {
  const t = useTranslations("ecommerceAnalytics");

  const {
    data: analytics,
    isLoading,
    isError,
  } = useQuery<AnalyticsData>({
    queryKey: ["ecommerce-analytics"],
    queryFn: () =>
      axiosInstance
        .get("/api/ecommerce/admin/orders/analytics/")
        .then((r) => r.data),
    staleTime: 60 * 1000,
  });

  const formatCurrency = (amount: number) => {
    return `₾${amount.toFixed(2)}`;
  };

  const getLocalizedName = (
    name: Record<string, string> | string
  ): string => {
    if (typeof name === "string") return name;
    if (typeof name === "object" && name !== null) {
      return name.en || Object.values(name)[0] || "";
    }
    return "";
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (isError || !analytics) {
    return (
      <div className="p-6">
        <div className="text-center py-24">
          <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
          <p className="mt-4 text-muted-foreground">
            {t("errorLoading")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground mt-1">{t("subtitle")}</p>
      </div>

      {/* Revenue Cards */}
      <div>
        <h2 className="text-lg font-semibold mb-3">{t("revenue.title")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("revenue.today")}
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(analytics.revenue.today)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("revenue.week")}
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(analytics.revenue.week)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("revenue.month")}
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(analytics.revenue.month)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("revenue.total")}
              </CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(analytics.revenue.total)}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Order Count Cards */}
      <div>
        <h2 className="text-lg font-semibold mb-3">{t("orderCounts.title")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("orderCounts.today")}
              </CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.orders.today}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("orderCounts.week")}
              </CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.orders.week}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("orderCounts.month")}
              </CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.orders.month}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("orderCounts.total")}
              </CardTitle>
              <Package className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {analytics.orders.total}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Products */}
        <Card>
          <CardHeader>
            <CardTitle>{t("topProducts.title")}</CardTitle>
            <CardDescription>{t("topProducts.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.top_products.length === 0 ? (
              <div className="text-center py-8">
                <Package className="mx-auto h-10 w-10 text-muted-foreground opacity-50" />
                <p className="mt-2 text-sm text-muted-foreground">
                  {t("topProducts.empty")}
                </p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("topProducts.product")}</TableHead>
                      <TableHead className="text-right">
                        {t("topProducts.sold")}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("topProducts.revenue")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analytics.top_products.map((product, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {getLocalizedName(product.product__name)}
                        </TableCell>
                        <TableCell className="text-right">
                          {product.sold}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(product.revenue)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>{t("statusBreakdown.title")}</CardTitle>
            <CardDescription>
              {t("statusBreakdown.subtitle")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(analytics.order_status_breakdown).length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="mx-auto h-10 w-10 text-muted-foreground opacity-50" />
                <p className="mt-2 text-sm text-muted-foreground">
                  {t("statusBreakdown.empty")}
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                {Object.entries(analytics.order_status_breakdown).map(
                  ([status, count]) => (
                    <div
                      key={status}
                      className="flex items-center gap-2 rounded-lg border p-3"
                    >
                      <Badge
                        variant="secondary"
                        className={STATUS_COLORS[status] || ""}
                      >
                        {(() => {
                          try {
                            return t(`statusLabels.${status}`);
                          } catch {
                            return status.charAt(0).toUpperCase() + status.slice(1);
                          }
                        })()}
                      </Badge>
                      <span className="text-lg font-semibold">{count}</span>
                    </div>
                  )
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
