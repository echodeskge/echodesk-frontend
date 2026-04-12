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
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Plus, Package, Edit, Eye, Star, AlertTriangle, Truck, CheckCircle2 } from "lucide-react";
import { useProducts, useProduct } from "@/hooks/useProducts";
import { AddProductSheet } from "@/components/products/AddProductSheet";
import { EditProductSheet } from "@/components/products/EditProductSheet";
import { PaginationControls } from "@/components/ui/pagination";
import { toast } from "sonner";
import axiosInstance from "@/api/axios";
import type { Locale } from "@/lib/i18n";

const PAGE_SIZE = 20;

export default function ProductsPage() {
  const locale = useLocale() as Locale;
  const t = useTranslations("products");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isEditProductOpen, setIsEditProductOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<number>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Fetch products with filters
  const { data: productsData, isLoading, error, refetch } = useProducts({
    search: searchQuery || undefined,
    status: (statusFilter || undefined) as 'active' | 'draft' | 'inactive' | 'out_of_stock' | undefined,
    low_stock: lowStockOnly || undefined,
    page: currentPage,
  });

  // Reset to page 1 when filters change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleLowStockToggle = () => {
    setLowStockOnly((prev) => !prev);
    setCurrentPage(1);
  };

  // Fetch selected product details
  const { data: selectedProduct } = useProduct(selectedProductId!);

  const products = productsData?.results || [];
  const totalCount = productsData?.count || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Calculate stats
  const activeCount = products.filter((p) => String(p.status) === "active").length;
  const lowStockCount = products.filter((p) => p.is_low_stock).length;
  const outOfStockCount = products.filter((p) => !p.is_in_stock).length;

  // Get multilanguage name
  const getProductName = (product: { name?: unknown }) => {
    const name = product.name;
    if (typeof name === "object" && name !== null) {
      const nameObj = name as Record<string, string>;
      return nameObj[locale] || nameObj.en || "Unnamed Product";
    }
    if (typeof name === "string") return name;
    return "Unnamed Product";
  };

  // Handle product edit
  const handleEditProduct = (productId: number) => {
    setSelectedProductId(productId);
    setIsEditProductOpen(true);
  };

  // Selection helpers
  const toggleProductSelection = (productId: number) => {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedProductIds.size === products.length) {
      setSelectedProductIds(new Set());
    } else {
      setSelectedProductIds(new Set(products.map((p) => p.id)));
    }
  };

  // Bulk status change
  const handleBulkStatusChange = async (newStatus: string) => {
    if (selectedProductIds.size === 0) return;
    setBulkActionLoading(true);
    try {
      await axiosInstance.post("/api/ecommerce/admin/products/bulk-update/", {
        product_ids: Array.from(selectedProductIds),
        status: newStatus,
      });
      toast.success(`${selectedProductIds.size} products updated to ${newStatus}`);
      setSelectedProductIds(new Set());
      refetch();
    } catch (error) {
      console.error("Bulk status change failed:", error);
      toast.error("Failed to update products. Please try again.");
    } finally {
      setBulkActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>

        {/* Search skeleton */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-28" />
            </div>
          </CardContent>
        </Card>

        {/* Product grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="aspect-square w-full" />
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-16" />
                </div>
                <Skeleton className="h-3 w-20 mt-1" />
              </CardHeader>
              <CardContent className="pt-0">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-4 w-20 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Stats skeleton */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="text-center">
                  <Skeleton className="h-9 w-12 mx-auto" />
                  <Skeleton className="h-4 w-20 mx-auto mt-1" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
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
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="px-4 py-2 border rounded-md"
            >
              <option value="">{t("allStatus")}</option>
              <option value="active">{t("active")}</option>
              <option value="draft">{t("draft")}</option>
              <option value="inactive">{t("inactive")}</option>
              <option value="out_of_stock">{t("outOfStock")}</option>
            </select>
            <Button
              variant={lowStockOnly ? "default" : "outline"}
              onClick={handleLowStockToggle}
              className="gap-2"
            >
              <AlertTriangle className="h-4 w-4" />
              {t("lowStock")}
              {lowStockCount > 0 && !lowStockOnly && (
                <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">
                  {lowStockCount}
                </Badge>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bulk selection header */}
      {products.length > 0 && (
        <div className="flex items-center gap-3">
          <Checkbox
            checked={products.length > 0 && selectedProductIds.size === products.length}
            onCheckedChange={toggleSelectAll}
            aria-label="Select all products"
          />
          <span className="text-sm text-muted-foreground">
            {selectedProductIds.size > 0
              ? `${selectedProductIds.size} selected`
              : "Select all"}
          </span>
        </div>
      )}

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
            <Card
              key={product.id}
              className={`overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group relative ${
                selectedProductIds.has(product.id) ? "ring-2 ring-primary" : ""
              }`}
            >
              {/* Selection checkbox */}
              <div className="absolute top-2 left-2 z-10" onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selectedProductIds.has(product.id)}
                  onCheckedChange={() => toggleProductSelection(product.id)}
                  aria-label={`Select ${getProductName(product)}`}
                  className="bg-white/80 border-gray-300"
                />
              </div>
              <div
                className="aspect-square bg-gray-100 relative"
                onClick={() => handleEditProduct(product.id)}
              >
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
                  <Badge className="absolute top-10 left-2 bg-gray-500">
                    {t("outOfStock")}
                  </Badge>
                )}
                {product.is_low_stock && product.is_in_stock && (
                  <Badge className="absolute top-10 left-2 bg-orange-500">
                    {t("lowStock")}
                  </Badge>
                )}
                {product.is_featured && (
                  <div className="absolute bottom-2 right-2 bg-amber-500 text-white rounded-full p-1.5">
                    <Star className="h-4 w-4 fill-current" />
                  </div>
                )}
                {/* Edit overlay on hover */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button
                    size="icon"
                    variant="secondary"
                    className="rounded-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditProduct(product.id);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardHeader
                className="pb-3"
                onClick={() => handleEditProduct(product.id)}
              >
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
              <CardContent
                className="pt-0"
                onClick={() => handleEditProduct(product.id)}
              >
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

      {/* Pagination */}
      {products.length > 0 && totalPages > 1 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
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

      {/* Floating Action Bar for Bulk Operations */}
      {selectedProductIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 transform">
          <div className="flex items-center gap-3 rounded-lg border bg-background px-6 py-3 shadow-lg">
            <span className="text-sm font-medium">
              {selectedProductIds.size} products selected
            </span>
            <Select
              onValueChange={(value) => handleBulkStatusChange(value)}
              disabled={bulkActionLoading}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Change status..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">{t("active")}</SelectItem>
                <SelectItem value="draft">{t("draft")}</SelectItem>
                <SelectItem value="inactive">{t("inactive")}</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedProductIds(new Set())}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Add Product Sheet */}
      <AddProductSheet open={isAddProductOpen} onOpenChange={setIsAddProductOpen} />

      {/* Edit Product Sheet */}
      <EditProductSheet
        open={isEditProductOpen}
        onOpenChange={setIsEditProductOpen}
        product={selectedProduct || null}
      />
    </div>
  );
}
