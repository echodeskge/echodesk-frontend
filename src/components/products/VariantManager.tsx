"use client";

import { useEffect, useState } from "react";
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
import { cn, getApiErrorMessage } from "@/lib/utils";
import {
  EcLoading,
  FormSection,
  IdText,
  MoneyCell,
  ProductThumb,
  Segmented,
  localizedText,
  rdButton,
} from "@/app/(tenant)/ecommerce/_components/ui";
import { rhf } from "./form-kit";

type Localized = Parameters<typeof localizedText>[0];

/**
 * One variant in the list (bordered rows, design 40px rows): 24px thumb,
 * name + option values + mono SKU, price (or "product price") and quantity,
 * then the row controls (active switch, edit, delete) passed by the caller.
 */
function VariantRow({
  image,
  name,
  options,
  sku,
  price,
  compareAt,
  quantity,
  inactive,
  children,
}: {
  image?: string | null;
  name: string;
  options: string;
  sku: string;
  price?: string | null;
  compareAt?: string | null;
  quantity: number;
  inactive?: boolean;
  children: React.ReactNode;
}) {
  const t = useTranslations("products.variants");
  return (
    <div
      className={cn("flex min-h-10 min-w-0 items-center gap-2.5 px-3 py-2 text-[13px]", inactive && "text-muted-foreground")}
      data-testid="ec-variant-row"
    >
      <ProductThumb src={image} alt="" size={24} className={cn(inactive && "opacity-60")} />
      {/* Name, options and SKU stack so long Georgian names and SKUs wrap
          instead of being cut to "SATIN_…". */}
      <div className="min-w-0 flex-1">
        <p className="break-words font-medium leading-5">{name}</p>
        {options && <p className="break-words text-xs leading-4 text-muted-foreground">{options}</p>}
        <IdText className="block whitespace-normal break-all text-[11px] text-muted-foreground" title={sku}>
          {sku}
        </IdText>
      </div>
      <div className="flex-none text-end leading-5">
        {price ? (
          <MoneyCell value={price} compare={compareAt} />
        ) : (
          <span className="text-xs text-muted-foreground">{t("basePrice")}</span>
        )}
        <p className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">{t("qty", { count: quantity })}</p>
      </div>
      <div className="flex flex-none items-center gap-0.5">{children}</div>
    </div>
  );
}

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
  const locale = useLocale();
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

  const addButton = !showAddForm && (
    <button type="button" className={rdButton.outlineSm} onClick={() => setShowAddForm(true)} data-testid="ec-variant-add">
      <Plus className="h-3.5 w-3.5" aria-hidden />
      {t("add")}
    </button>
  );

  return (
    <FormSection title={t("title", { count: variants.length })} actions={isLoading ? null : addButton}>
      {isLoading && <EcLoading className="py-4" />}

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
      {!isLoading && variants.length === 0 && !showAddForm && (
        <p className="rounded-lg border border-dashed px-3 py-3 text-xs text-muted-foreground">{t("empty")}</p>
      )}

      {variants.length > 0 && (
        <div className="divide-y overflow-hidden rounded-lg border">
          {variants.map((variant) =>
            editingVariantId === variant.id ? (
              <div key={variant.id} className="p-2">
                <VariantForm
                  initialData={variant}
                  onSubmit={(data) => {
                    updateVariant.mutate({ id: variant.id, data });
                  }}
                  onCancel={() => setEditingVariantId(null)}
                  isPending={updateVariant.isPending}
                />
              </div>
            ) : (
              <VariantRow
                key={variant.id}
                image={variant.image}
                name={localizedText(variant.name as Localized, locale) || "--"}
                options={(variant.attribute_values ?? [])
                  .map(
                    (av) =>
                      `${localizedText(av.attribute.name as Localized, locale) || av.attribute.key}: ${String(av.value_json ?? "")}`,
                  )
                  .join(" · ")}
                sku={variant.sku}
                price={variant.price}
                compareAt={variant.compare_at_price}
                quantity={variant.quantity ?? 0}
                inactive={variant.is_active === false}
              >
                <Switch
                  checked={variant.is_active !== false}
                  onCheckedChange={() => handleToggleActive(variant)}
                  aria-label={t("toggleActive")}
                  className="me-1"
                />
                <button
                  type="button"
                  className={rdButton.ghostIconSm}
                  onClick={() => setEditingVariantId(variant.id)}
                  aria-label={t("edit")}
                  title={t("edit")}
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden />
                </button>
                <button
                  type="button"
                  className={cn(rdButton.ghostIconSm, "hover:text-destructive")}
                  onClick={() => setDeleteVariantId(variant.id)}
                  aria-label={t("delete")}
                  title={t("delete")}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </button>
              </VariantRow>
            ),
          )}
        </div>
      )}

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
    </FormSection>
  );
}

// ─── Variants staged on the create form ───────────────────────────────────────

/** A variant typed on the "add product" form, created once the product exists. */
export type StagedVariant = ProductVariantRequest;

/**
 * Create the staged variants for a just-created product, in order. Returns
 * the ones the API refused (e.g. a duplicate SKU) so the caller can report
 * them; the product itself is already saved at this point.
 */
export async function createStagedVariants(
  productId: number,
  variants: StagedVariant[],
): Promise<{ failed: { variant: StagedVariant; error: unknown }[] }> {
  const failed: { variant: StagedVariant; error: unknown }[] = [];
  for (const [index, variant] of variants.entries()) {
    try {
      const payload: VariantCreatePayload = { ...variant, sort_order: variant.sort_order ?? index, product: productId };
      await ecommerceAdminVariantsCreate(payload as unknown as ProductVariantAdminRequest);
    } catch (error) {
      failed.push({ variant, error });
    }
  }
  return { failed };
}

/** The staged request shape, read back into the form's `initialData`. */
function stagedAsVariant(variant: StagedVariant): ProductVariant {
  return {
    ...variant,
    attribute_values: (variant.attributes ?? []).map((a) => ({
      attribute: { id: a.attribute_id },
      value_json: a.value_json,
    })),
  } as unknown as ProductVariant;
}

interface StagedVariantManagerProps {
  value: StagedVariant[];
  onChange: (variants: StagedVariant[]) => void;
  /** Whether a variant form is open with changes not yet added to the list. */
  onEditingChange?: (editing: boolean) => void;
}

/**
 * Variant editor for a product that hasn't been saved yet: same form as
 * VariantManager, but the variants live in local state and the create form
 * posts them right after the product is created.
 */
export function StagedVariantManager({ value, onChange, onEditingChange }: StagedVariantManagerProps) {
  const t = useTranslations("products.variants");
  const locale = useLocale();
  const { data: attributesData } = useAttributes({} as never);
  const attributes: AttributeDefinition[] = attributesData?.results ?? [];
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Lets the product form refuse to save while a variant is still being typed
  // (it would be dropped without a word otherwise).
  const editing = showAddForm || editingIndex !== null;
  useEffect(() => {
    onEditingChange?.(editing);
  }, [editing, onEditingChange]);
  useEffect(() => () => onEditingChange?.(false), [onEditingChange]);

  const attributeName = (id: number) => {
    const definition = attributes.find((a) => a.id === id);
    const name = definition?.name as Record<string, string> | string | undefined;
    if (typeof name === "object" && name !== null) return name[locale] || name.en || definition?.key || "";
    return name || definition?.key || "";
  };

  return (
    <FormSection
      title={t("title", { count: value.length })}
      actions={
        !showAddForm && (
          <button type="button" className={rdButton.outlineSm} onClick={() => setShowAddForm(true)} data-testid="ec-variant-add">
            <Plus className="h-3.5 w-3.5" aria-hidden />
            {t("add")}
          </button>
        )
      }
    >
      {showAddForm && (
        <VariantForm
          onSubmit={(data) => {
            onChange([...value, data]);
            setShowAddForm(false);
          }}
          onCancel={() => setShowAddForm(false)}
          isPending={false}
        />
      )}

      {value.length === 0 && !showAddForm && (
        <p className="rounded-lg border border-dashed px-3 py-3 text-xs text-muted-foreground">{t("stagedEmpty")}</p>
      )}

      {value.length > 0 && (
        <div className="divide-y overflow-hidden rounded-lg border">
          {value.map((variant, index) =>
            editingIndex === index ? (
              <div key={index} className="p-2">
                <VariantForm
                  initialData={stagedAsVariant(variant)}
                  onSubmit={(data) => {
                    onChange(value.map((v, i) => (i === index ? data : v)));
                    setEditingIndex(null);
                  }}
                  onCancel={() => setEditingIndex(null)}
                  isPending={false}
                />
              </div>
            ) : (
              <VariantRow
                key={index}
                image={variant.image}
                name={localizedText(variant.name as Localized, locale) || "--"}
                options={(variant.attributes ?? [])
                  .map((a) => `${attributeName(a.attribute_id)}: ${String(a.value_json ?? "")}`)
                  .join(" · ")}
                sku={variant.sku}
                price={variant.price}
                quantity={variant.quantity ?? 0}
              >
                <button
                  type="button"
                  className={rdButton.ghostIconSm}
                  onClick={() => setEditingIndex(index)}
                  aria-label={t("edit")}
                  title={t("edit")}
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden />
                </button>
                <button
                  type="button"
                  className={cn(rdButton.ghostIconSm, "hover:text-destructive")}
                  onClick={() => onChange(value.filter((_, i) => i !== index))}
                  aria-label={t("delete")}
                  title={t("delete")}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </button>
              </VariantRow>
            ),
          )}
        </div>
      )}
    </FormSection>
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
  const languageName = (code: string) => {
    const lang = languages.find((l) => l.code === code);
    return (lang && localizedText(lang.name as Localized, locale)) || code.toUpperCase();
  };
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
    <div className="rounded-lg border bg-muted/40 p-3" data-testid="ec-variant-form">
      <Form {...form}>
        {/* Not a <form>: this sits inside the product's own form, and a form
            nested in a form submits the outer one (the page reloaded with the
            variant fields in the URL). Enter in a field saves the variant. */}
        <div
          role="group"
          aria-label={initialData ? t("edit") : t("add")}
          className="flex min-w-0 flex-col gap-3"
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.target as HTMLElement).tagName === "INPUT") {
              event.preventDefault();
              event.stopPropagation();
              submit();
            }
          }}
        >
          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="sku"
              rules={{ validate: (value) => !!String(value || "").trim() || t("skuRequired") }}
              render={({ field }) => (
                <FormItem className={rhf.item}>
                  <FormLabel className={rhf.label}>
                    {t("sku")}
                    <span aria-hidden className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="VARIANT-SKU" {...field} className={cn(rhf.input, "bg-background font-mono")} />
                  </FormControl>
                  <FormMessage className={rhf.message} />
                </FormItem>
              )}
            />
            {/* Name in the selected language; other languages are filled on save if left empty */}
            <FormField
              control={form.control}
              name={"name" as keyof ProductVariantRequest}
              render={({ field }) => (
                <FormItem className={rhf.item}>
                  <FormLabel className={rhf.label}>{t("name")}</FormLabel>
                  <FormControl>
                    <Input
                      key={language}
                      placeholder={t("namePlaceholder")}
                      value={localized(field.value, language)}
                      onChange={(e) => {
                        const current = typeof field.value === "object" && field.value !== null ? (field.value as Record<string, string>) : {};
                        field.onChange({ ...current, [language]: e.target.value });
                      }}
                      className={cn(rhf.input, "bg-background")}
                    />
                  </FormControl>
                  {languageCodes.length > 1 && (
                    <Segmented<string>
                      value={language}
                      onChange={setLanguage}
                      ariaLabel={t("nameLanguage")}
                      options={languageCodes.map((code) => ({
                        value: code,
                        label: languageName(code),
                      }))}
                      className="justify-self-start"
                    />
                  )}
                  <FormMessage className={rhf.message} />
                </FormItem>
              )}
            />
          </div>
          <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem className={rhf.item}>
                  <FormLabel className={rhf.label}>{t("price")}</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder={t("basePrice")} {...field} value={field.value ?? ""} className={cn(rhf.input, "bg-background tabular-nums")} />
                  </FormControl>
                  <FormMessage className={rhf.message} />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="compare_at_price"
              render={({ field }) => (
                <FormItem className={rhf.item}>
                  <FormLabel className={rhf.label}>{t("compareAtPrice")}</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="—" {...field} value={field.value ?? ""} className={cn(rhf.input, "bg-background tabular-nums")} />
                  </FormControl>
                  <FormMessage className={rhf.message} />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem className={rhf.item}>
                  <FormLabel className={rhf.label}>{t("quantity")}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      className={cn(rhf.input, "bg-background tabular-nums")}
                    />
                  </FormControl>
                  <FormMessage className={rhf.message} />
                </FormItem>
              )}
            />
          </div>

          {/* Which option this variant is (colour, size…), so the shop can label it */}
          <div className="flex min-w-0 flex-col gap-2">
            <p className={rhf.label}>{t("attributes")}</p>
            {attributes.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t("noAttributes")}</p>
            ) : (
              <>
                {attributeRows.map((row, index) => {
                  const definition = attributes.find((a) => a.id === row.attribute_id);
                  const options: unknown[] = Array.isArray(definition?.options) ? definition.options : [];
                  return (
                    <div key={index} className="flex min-w-0 items-center gap-2">
                      <Select
                        value={row.attribute_id ? String(row.attribute_id) : ""}
                        onValueChange={(value) => updateRow(index, { attribute_id: Number(value), value: "" })}
                      >
                        <SelectTrigger className={cn(rhf.input, "w-[40%] min-w-0 bg-background sm:w-[180px]")} aria-label={t("selectAttribute")}>
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
                          <SelectTrigger className={cn(rhf.input, "min-w-0 flex-1 bg-background")} aria-label={t("selectValue")}>
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
                          className={cn(rhf.input, "min-w-0 flex-1 bg-background")}
                          placeholder={t("valuePlaceholder")}
                          aria-label={t("selectValue")}
                          value={row.value}
                          onChange={(e) => updateRow(index, { value: e.target.value })}
                        />
                      )}
                      <button
                        type="button"
                        className={cn(rdButton.ghostIconSm, "hover:text-destructive")}
                        onClick={() => setAttributeRows((rows) => rows.filter((_, i) => i !== index))}
                        aria-label={t("removeAttribute")}
                        title={t("removeAttribute")}
                      >
                        <X className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </div>
                  );
                })}
                {attributeRows.length < attributes.length && (
                  <button
                    type="button"
                    className={cn(rdButton.outlineSm, "self-start")}
                    onClick={() => setAttributeRows((rows) => [...rows, { attribute_id: null, value: "" }])}
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden />
                    {t("addAttribute")}
                  </button>
                )}
              </>
            )}
          </div>

          {/* Photo shown when this variant is picked */}
          <FormField
            control={form.control}
            name="image"
            render={({ field }) => (
              <FormItem className={rhf.item}>
                <FormLabel className={rhf.label}>{t("image")}</FormLabel>
                <FormControl>
                  <ImageGalleryPicker value={field.value || ""} onChange={(value) => field.onChange(value.split(",")[0]?.trim() || "")} />
                </FormControl>
                <p className="text-xs leading-4 text-muted-foreground">{t("imageHint")}</p>
                <FormMessage className={rhf.message} />
              </FormItem>
            )}
          />

          <div className="flex items-center justify-end gap-2 border-t pt-3">
            <button type="button" className={rdButton.outlineSm} onClick={onCancel} disabled={isPending}>
              {t("cancel")}
            </button>
            <button type="button" className={rdButton.primarySm} disabled={isPending} onClick={() => submit()} data-testid="ec-variant-save">
              <Check className="h-3.5 w-3.5" aria-hidden />
              {isPending ? t("saving") : initialData ? t("update") : t("addShort")}
            </button>
          </div>
        </div>
      </Form>
    </div>
  );
}
