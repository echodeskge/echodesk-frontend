"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Package } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import LoadingSpinner from "@/components/LoadingSpinner";
import { AddProductSheet } from "@/components/products/AddProductSheet";
import type { Locale } from "@/lib/i18n";

export default function ProductsPage() {
  const locale = useLocale() as Locale;
  const t = useTranslations("products");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);

  // Fetch products with filters
  const { data: productsData, isLoading, error } = useProducts({
    search: searchQuery || undefined,
    status: statusFilter as any || undefined,
    page: 1,
  });

  const products = productsData?.results || [];
  const totalCount = productsData?.count || 0;

  // Calculate stats
  const activeCount = products.filter((p) => String(p.status) === "active").length;
  const lowStockCount = products.filter((p) => p.is_low_stock).length;
  const outOfStockCount = products.filter((p) => !p.is_in_stock).length;

  // Get multilanguage name
  const getProductName = (product: any) => {
    if (typeof product.name === "object" && product.name !== null) {
      return product.name[locale] || product.name.en || "Unnamed Product";
    }
    return product.name || "Unnamed Product";
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground mt-1">
            {t("subtitle")}
          </p>
        </div>
        <Button className="gap-2" onClick={() => setIsAddProductOpen(true)}>
          <Plus className="h-4 w-4" />
          {t("addProduct")}
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border rounded-md"
            >
              <option value="">{t("allStatus")}</option>
              <option value="active">{t("active")}</option>
              <option value="draft">{t("draft")}</option>
              <option value="inactive">{t("inactive")}</option>
              <option value="out_of_stock">{t("outOfStock")}</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Products Grid */}
      {products.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-primary/10 p-6 mb-4">
              <Package className="h-12 w-12 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">{t("noProductsYet")}</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              {t("noProductsDescription")}
            </p>
            <Button className="gap-2" onClick={() => setIsAddProductOpen(true)}>
              <Plus className="h-4 w-4" />
              {t("createFirstProduct")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-square bg-gray-100 relative">
                {product.image ? (
                  <img
                    src={product.image}
                    alt={getProductName(product)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="h-16 w-16 text-gray-300" />
                  </div>
                )}
                {product.discount_percentage > 0 && (
                  <Badge className="absolute top-2 right-2 bg-red-500">
                    -{product.discount_percentage}%
                  </Badge>
                )}
                {!product.is_in_stock && (
                  <Badge className="absolute top-2 left-2 bg-gray-500">
                    {t("outOfStock")}
                  </Badge>
                )}
                {product.is_low_stock && product.is_in_stock && (
                  <Badge className="absolute top-2 left-2 bg-orange-500">
                    {t("lowStock")}
                  </Badge>
                )}
              </div>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base line-clamp-2">
                    {getProductName(product)}
                  </CardTitle>
                  <Badge
                    variant={String(product.status) === "active" ? "default" : "secondary"}
                  >
                    {String(product.status)}
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  {t("sku")}: {product.sku}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">
                      ₾{parseFloat(product.price).toFixed(2)}
                    </span>
                    {product.compare_at_price && (
                      <span className="text-sm text-muted-foreground line-through">
                        ₾{parseFloat(product.compare_at_price).toFixed(2)}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t("stock")}: {product.quantity} {t("units")}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Stats Footer */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold">{totalCount}</div>
              <div className="text-sm text-muted-foreground">
                {t("totalProducts")}
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">{activeCount}</div>
              <div className="text-sm text-muted-foreground">{t("active")}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">{lowStockCount}</div>
              <div className="text-sm text-muted-foreground">{t("lowStock")}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">{outOfStockCount}</div>
              <div className="text-sm text-muted-foreground">{t("outOfStock")}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Product Sheet */}
      <AddProductSheet open={isAddProductOpen} onOpenChange={setIsAddProductOpen} />
    </div>
  );
}
