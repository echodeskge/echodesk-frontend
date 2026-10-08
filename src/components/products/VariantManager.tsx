"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";
import { Plus, Pencil, Trash2, X, Check } from "lucide-react";
import {
  ecommerceAdminVariantsList,
  ecommerceAdminVariantsCreate,
  ecommerceAdminVariantsPartialUpdate,
  ecommerceAdminVariantsDestroy,
} from "@/api/generated/api";
import type {
  AttributeDefinition,
  Language,
  ProductVariant,
  ProductVariantRequest,
  ProductVariantAdminRequest,
  PatchedProductVariantAdminRequest,
} from "@/api/generated/interfaces";
import { ImageGalleryPicker } from "@/components/ImageGalleryPicker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAttributes } from "@/hooks/useAttributes";
import { useLanguages } from "@/hooks/useLanguages";
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
import { cn, getApiErrorMessage } from "@/lib/utils";

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
              {variant.image ? (
                // eslint-disable-next-line @next/next/no-img-element -- arbitrary external URL
                <img src={variant.image} alt="" className="h-9 w-9 flex-none rounded object-cover" />
              ) : (
                <div className="h-9 w-9 flex-none rounded bg-muted" />
              )}
              <div className="flex-1 min-w-0 grid grid-cols-4 gap-2 items-center">
                <span className="font-mono text-xs truncate" title={variant.sku}>
                  {variant.sku}
                </span>
                <span className="min-w-0">
                  <span className="block truncate">
                    {typeof variant.name === "object" && variant.name !== null
                      ? variant.name.ka || variant.name.en || Object.values(variant.name)[0] || "--"
                      : variant.name || "--"}
                  </span>
                  {variant.attribute_values?.length > 0 && (
                    <span className="block truncate text-xs text-muted-foreground">
                      {variant.attribute_values
                        .map((av) => `${typeof av.attribute.name === "object" && av.attribute.name ? av.attribute.name.ka || av.attribute.name.en : av.attribute.key}: ${String(av.value_json ?? "")}`)
                        .join(" · ")}
                    </span>
                  )}
                </span>
                <span className="text-right">
                  {variant.price ? `${variant.price} ₾` : t("basePrice")}
                  {variant.compare_at_price && (
                    <span className="ml-1 text-xs text-muted-foreground line-through">{variant.compare_at_price} ₾</span>
                  )}
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

type VariantAttributeRow = { attribute_id: number | null; value: string };

function VariantForm({ initialData, onSubmit, onCancel, isPending }: VariantFormProps) {
  const t = useTranslations("products.variants");
  const locale = useLocale();
  const { data: languagesData } = useLanguages({ is_active: true } as never);
  const languages: Language[] = languagesData?.results ?? [];
  const languageCodes = languages.length ? languages.map((l) => l.code) : ["ka", "en"];
  const [language, setLanguage] = useState(languageCodes.includes("ka") ? "ka" : languageCodes[0]);
  const { data: attributesData } = useAttributes({} as never);
  const attributes: AttributeDefinition[] = (attributesData?.results ?? []).filter((a) => a.is_active !== false);
  const [attributeRows, setAttributeRows] = useState<VariantAttributeRow[]>(
    (initialData?.attribute_values ?? []).map((av) => ({
      attribute_id: av.attribute.id,
      value: av.value_json == null ? "" : String(av.value_json),
    })),
  );

  const form = useForm<ProductVariantRequest>({
    defaultValues: {
      sku: initialData?.sku ?? "",
      name: initialData?.name ?? {},
      price: initialData?.price ?? "",
      compare_at_price: initialData?.compare_at_price ?? "",
      quantity: initialData?.quantity ?? 0,
      image: initialData?.image ?? "",
      is_active: initialData?.is_active !== false,
    },
  });

  const localized = (value: unknown, code: string) =>
    typeof value === "object" && value !== null ? (value as Record<string, string>)[code] || "" : "";
  const nameOf = (value: unknown) =>
    typeof value === "object" && value !== null
      ? (value as Record<string, string>)[locale] || (value as Record<string, string>).en || Object.values(value as Record<string, string>)[0] || ""
      : String(value || "");
  const optionLabel = (option: unknown): string => {
    if (typeof option === "object" && option !== null) {
      const o = option as Record<string, unknown>;
      const label = o.label;
      if (typeof label === "object" && label !== null) return (label as Record<string, string>)[locale] || (label as Record<string, string>).en || String(o.value ?? "");
      return String(o[locale] || o.en || label || o.value || "");
    }
    return String(option ?? "");
  };
  const optionValue = (option: unknown): string =>
    typeof option === "object" && option !== null ? String((option as Record<string, unknown>).value ?? "") : String(option ?? "");

  const handleFormSubmit = (data: ProductVariantRequest) => {
    // Fill the languages left empty with the first one typed, as products do
    const name = { ...(typeof data.name === "object" && data.name !== null ? (data.name as Record<string, string>) : {}) };
    const first = languageCodes.map((code) => name[code]?.trim()).find(Boolean) || "";
    languageCodes.forEach((code) => {
      if (!name[code]?.trim()) name[code] = first;
    });
    const money = (value: unknown) => (value === "" || value == null ? null : String(value));
    onSubmit({
      ...data,
      sku: (data.sku || "").trim(),
      name,
      // An empty price means "use the product's price" — the API wants null,
      // not an empty string.
      price: money(data.price),
      compare_at_price: money(data.compare_at_price),
      image: (data.image || "").split(",")[0]?.trim() || null,
      attributes: attributeRows
        .filter((row) => row.attribute_id && row.value.trim())
        .map((row) => ({ attribute_id: row.attribute_id as number, value_json: row.value.trim() })),
    } as unknown as ProductVariantRequest);
  };

  const submit = form.handleSubmit(handleFormSubmit);

  const usedAttributeIds = new Set(attributeRows.map((row) => row.attribute_id));
  const updateRow = (index: number, patch: Partial<VariantAttributeRow>) =>
    setAttributeRows((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));

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
            {/* Name in the selected language; other languages are filled on save if left empty */}
            <FormField
              control={form.control}
              name={"name" as keyof ProductVariantRequest}
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between gap-2">
                    <FormLabel className="text-xs">{t("name")}</FormLabel>
                    <div className="flex gap-1">
                      {languageCodes.map((code) => (
                        <button
                          key={code}
                          type="button"
                          onClick={() => setLanguage(code)}
                          className={cn(
                            "rounded px-1.5 py-0.5 text-[10px] font-medium uppercase",
                            code === language ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent",
                            code !== language && !localized(field.value, code).trim() && "opacity-60",
                          )}
                          title={code}
                        >
                          {code}
                        </button>
                      ))}
                    </div>
                  </div>
                  <FormControl>
                    <Input
                      key={language}
                      placeholder={t("namePlaceholder")}
                      value={localized(field.value, language)}
                      onChange={(e) => {
                        const current = typeof field.value === "object" && field.value !== null ? (field.value as Record<string, string>) : {};
                        field.onChange({ ...current, [language]: e.target.value });
                      }}
                      className="h-8 text-sm"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">{t("price")}</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder={t("basePrice")} {...field} value={field.value ?? ""} className="h-8 text-sm" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="compare_at_price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">{t("compareAtPrice")}</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="—" {...field} value={field.value ?? ""} className="h-8 text-sm" />
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

          {/* Which option this variant is (colour, size…), so the shop can label it */}
          <div className="space-y-2">
            <p className="text-xs font-medium">{t("attributes")}</p>
            {attributes.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t("noAttributes")}</p>
            ) : (
              <>
                {attributeRows.map((row, index) => {
                  const definition = attributes.find((a) => a.id === row.attribute_id);
                  const options: unknown[] = Array.isArray(definition?.options) ? definition.options : [];
                  return (
                    <div key={index} className="flex items-center gap-2">
                      <Select
                        value={row.attribute_id ? String(row.attribute_id) : ""}
                        onValueChange={(value) => updateRow(index, { attribute_id: Number(value), value: "" })}
                      >
                        <SelectTrigger className="h-8 w-[160px] text-sm">
                          <SelectValue placeholder={t("selectAttribute")} />
                        </SelectTrigger>
                        <SelectContent>
                          {attributes
                            .filter((a) => a.id === row.attribute_id || !usedAttributeIds.has(a.id))
                            .map((a) => (
                              <SelectItem key={a.id} value={String(a.id)}>
                                {nameOf(a.name)}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      {options.length > 0 ? (
                        <Select value={row.value} onValueChange={(value) => updateRow(index, { value })}>
                          <SelectTrigger className="h-8 flex-1 text-sm">
                            <SelectValue placeholder={t("selectValue")} />
                          </SelectTrigger>
                          <SelectContent>
                            {options.map((option, i) => (
                              <SelectItem key={i} value={optionValue(option) || String(i)}>
                                {optionLabel(option)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          className="h-8 flex-1 text-sm"
                          placeholder={t("valuePlaceholder")}
                          value={row.value}
                          onChange={(e) => updateRow(index, { value: e.target.value })}
                        />
                      )}
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setAttributeRows((rows) => rows.filter((_, i) => i !== index))} aria-label={t("removeAttribute")}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
                {attributeRows.length < attributes.length && (
                  <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => setAttributeRows((rows) => [...rows, { attribute_id: null, value: "" }])}>
                    <Plus className="mr-1 h-3 w-3" />
                    {t("addAttribute")}
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Photo shown when this variant is picked */}
          <FormField
            control={form.control}
            name="image"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">{t("image")}</FormLabel>
                <FormControl>
                  <ImageGalleryPicker value={field.value || ""} onChange={(value) => field.onChange(value.split(",")[0]?.trim() || "")} />
                </FormControl>
                <p className="text-xs text-muted-foreground">{t("imageHint")}</p>
                <FormMessage />
              </FormItem>
            )}
          />

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
