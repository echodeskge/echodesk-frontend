"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Plus, Pencil, Trash2, X, Check } from "lucide-react";
import {
  ecommerceAdminVariantsList,
  ecommerceAdminVariantsCreate,
  ecommerceAdminVariantsPartialUpdate,
  ecommerceAdminVariantsDestroy,
} from "@/api/generated/api";
import type {
  ProductVariant,
  ProductVariantRequest,
  ProductVariantAdminRequest,
  PatchedProductVariantAdminRequest,
} from "@/api/generated/interfaces";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import LoadingSpinner from "@/components/LoadingSpinner";
import { getApiErrorMessage } from "@/lib/utils";

interface VariantManagerProps {
  productId: number;
}

/**
 * VariantCreateRequest extends ProductVariantRequest with a `product` field.
 * The generated interface is missing this field because the backend serializer
 * does not explicitly list it, but DRF's ModelSerializer will accept it if it
 * corresponds to a model FK. We include it here to associate variants with products.
 */
type VariantCreatePayload = ProductVariantRequest & { product: number };

export function VariantManager({ productId }: VariantManagerProps) {
  const t = useTranslations("products.variants");
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingVariantId, setEditingVariantId] = useState<number | null>(null);
  const [deleteVariantId, setDeleteVariantId] = useState<number | null>(null);

  // Fetch variants for this product
  const {
    data: variantsData,
    isLoading,
  } = useQuery({
    queryKey: ["product-variants", productId],
    queryFn: () =>
      ecommerceAdminVariantsList(
        undefined, // isActive
        "sort_order", // ordering
        undefined, // page
        undefined, // pageSize
        productId, // product filter
      ),
    enabled: !!productId,
  });

  const variants = variantsData?.results ?? [];

  // Create mutation
  const createVariant = useMutation({
    mutationFn: (data: VariantCreatePayload) =>
      ecommerceAdminVariantsCreate(data as unknown as ProductVariantAdminRequest),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-variants", productId] });
      toast.success(t("created"));
      setShowAddForm(false);
    },
    onError: (error: Error) => {
      toast.error(getApiErrorMessage(error, t("createFailed")));
    },
  });

  // Update mutation
  const updateVariant = useMutation({
    mutationFn: ({ id, data }: { id: number; data: PatchedProductVariantAdminRequest }) =>
      ecommerceAdminVariantsPartialUpdate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-variants", productId] });
      toast.success(t("updated"));
      setEditingVariantId(null);
    },
    onError: (error: Error) => {
      toast.error(getApiErrorMessage(error, t("updateFailed")));
    },
  });

  // Delete mutation
  const deleteVariant = useMutation({
    mutationFn: (id: number) => ecommerceAdminVariantsDestroy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-variants", productId] });
      toast.success(t("deleted"));
      setDeleteVariantId(null);
    },
    onError: (error: Error) => {
      toast.error(getApiErrorMessage(error, t("deleteFailed")));
    },
  });

  const handleToggleActive = (variant: ProductVariant) => {
    updateVariant.mutate({
      id: variant.id,
      data: { is_active: !variant.is_active },
    });
  };

  const handleConfirmDelete = () => {
    if (deleteVariantId !== null) {
      deleteVariant.mutate(deleteVariantId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{t("title", { count: variants.length })}</h3>
        {!showAddForm && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAddForm(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            {t("add")}
          </Button>
        )}
      </div>

      {/* Add Variant Form */}
      {showAddForm && (
        <VariantForm
          onSubmit={(data) => {
            createVariant.mutate({ ...data, product: productId });
          }}
          onCancel={() => setShowAddForm(false)}
          isPending={createVariant.isPending}
        />
      )}

      {/* Variants List */}
      {variants.length === 0 && !showAddForm && (
        <p className="text-sm text-muted-foreground py-2">
          {t("empty")}
        </p>
      )}

      <div className="space-y-2">
        {variants.map((variant) =>
          editingVariantId === variant.id ? (
            <VariantForm
              key={variant.id}
              initialData={variant}
              onSubmit={(data) => {
                updateVariant.mutate({ id: variant.id, data });
              }}
              onCancel={() => setEditingVariantId(null)}
              isPending={updateVariant.isPending}
            />
          ) : (
            <div
              key={variant.id}
              className="flex items-center gap-3 rounded-md border p-3 text-sm"
            >
              <div className="flex-1 min-w-0 grid grid-cols-4 gap-2 items-center">
                <span className="font-mono text-xs truncate" title={variant.sku}>
                  {variant.sku}
                </span>
                <span className="truncate">
                  {typeof variant.name === "object" && variant.name !== null
                    ? variant.name.en || variant.name.ka || Object.values(variant.name)[0] || "--"
                    : variant.name || "--"}
                </span>
                <span className="text-right">
                  {variant.price ? `${variant.price} ₾` : t("basePrice")}
                </span>
                <span className="text-right text-muted-foreground">
                  {t("qty", { count: variant.quantity ?? 0 })}
                </span>
              </div>
              <Switch
                checked={variant.is_active !== false}
                onCheckedChange={() => handleToggleActive(variant)}
                aria-label={t("toggleActive")}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setEditingVariantId(variant.id)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={() => setDeleteVariantId(variant.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ),
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteVariantId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteVariantId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteVariant.isPending ? t("deleting") : t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Inline Variant Form ──────────────────────────────────────────────────────

interface VariantFormProps {
  initialData?: ProductVariant;
  onSubmit: (data: ProductVariantRequest) => void;
  onCancel: () => void;
  isPending: boolean;
}

function VariantForm({ initialData, onSubmit, onCancel, isPending }: VariantFormProps) {
  const t = useTranslations("products.variants");
  const form = useForm<ProductVariantRequest>({
    defaultValues: {
      sku: initialData?.sku ?? "",
      name: initialData?.name ?? { en: "", ka: "" },
      price: initialData?.price ?? "",
      quantity: initialData?.quantity ?? 0,
      is_active: initialData?.is_active !== false,
    },
  });

  const handleFormSubmit = (data: ProductVariantRequest) => {
    onSubmit({
      ...data,
      sku: (data.sku || "").trim(),
      // An empty price means "use the product's price" — the API wants null,
      // not an empty string.
      price: data.price === "" || data.price == null ? null : data.price,
    } as ProductVariantRequest);
  };

  const submit = form.handleSubmit(handleFormSubmit);

  return (
    <div className="rounded-md border p-4 bg-muted/30">
      <Form {...form}>
        {/* Not a <form>: this sits inside the product's own form, and a form
            nested in a form submits the outer one (the page reloaded with the
            variant fields in the URL). Enter in a field saves the variant. */}
        <div
          role="group"
          className="space-y-3"
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.target as HTMLElement).tagName === "INPUT") {
              event.preventDefault();
              event.stopPropagation();
              submit();
            }
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="sku"
              rules={{ validate: (value) => !!String(value || "").trim() || t("skuRequired") }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">{t("sku")} *</FormLabel>
                  <FormControl>
                    <Input placeholder="VARIANT-SKU" {...field} className="h-8 text-sm" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Name field - using 'en' as the primary entry */}
            <FormField
              control={form.control}
              name={"name" as keyof ProductVariantRequest}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">{t("name")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("namePlaceholder")}
                      value={
                        typeof field.value === "object" && field.value !== null
                          ? (field.value as Record<string, string>).en || ""
                          : String(field.value || "")
                      }
                      onChange={(e) => {
                        const current =
                          typeof field.value === "object" && field.value !== null
                            ? (field.value as Record<string, string>)
                            : {};
                        field.onChange({ ...current, en: e.target.value, ka: e.target.value });
                      }}
                      className="h-8 text-sm"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">{t("price")}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                      className="h-8 text-sm"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">{t("quantity")}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      className="h-8 text-sm"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancel}
              disabled={isPending}
            >
              <X className="h-4 w-4 mr-1" />
              {t("cancel")}
            </Button>
            <Button type="button" size="sm" disabled={isPending} onClick={() => submit()}>
              <Check className="h-4 w-4 mr-1" />
              {isPending ? t("saving") : initialData ? t("update") : t("addShort")}
            </Button>
          </div>
        </div>
      </Form>
    </div>
  );
}
