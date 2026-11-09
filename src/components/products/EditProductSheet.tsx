"use client";

import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/utils";
import { Form } from "@/components/ui/form";
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
import { useUpdateProduct, useDeleteProduct } from "@/hooks/useProducts";
import { useLanguages } from "@/hooks/useLanguages";
import type { ProductDetail, ProductCreateUpdateRequest } from "@/api/generated";
import { normalizeShipping } from "@/components/products/ProductExtraFields";
import { type AttributeValue } from "./AttributeSelector";
import { VariantManager } from "./VariantManager";
import { ProductFormSections } from "./ProductFormSections";
import { Trash2 } from "lucide-react";
import { EcLoading, FormSheet, rdButton } from "@/app/(tenant)/ecommerce/_components/ui";

/**
 * Status956enum is the generated union for ProductCreateUpdateRequest.status
 * (draft/published/…). The form state is Partial<ProductCreateUpdateRequest>,
 * so string literals from UI handlers are funneled through this cast instead
 * of bare `as any`.
 */
import type { Status956enum } from "@/api/generated/interfaces";
const asStatus = (v: string) => v as unknown as Status956enum;

interface EditProductSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductDetail | null;
}

export function EditProductSheet({
  open,
  onOpenChange,
  product,
}: EditProductSheetProps) {
  const t = useTranslations("products.addProductSheet");
  const tCommon = useTranslations("common");
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  // Fetch active languages
  const { data: languagesData, isLoading: languagesLoading } = useLanguages({
    ordering: "sort_order,code",
  });

  const activeLanguages = languagesData?.results || [];

  // Track if user has manually edited SKU
  const [skuManuallyEdited, setSkuManuallyEdited] = useState(false);

  // Selected language for form fields (default to 'ka')
  const [selectedLanguage, setSelectedLanguage] = useState<string>("ka");

  // Product attributes
  const [attributes, setAttributes] = useState<AttributeValue[]>([]);

  // Delete confirmation dialog state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const form = useForm<Partial<ProductCreateUpdateRequest>>({
    defaultValues: {
      name: {},
      description: {},
      short_description: {},
      sku: "",
      slug: "",
      price: "0.00",
      compare_at_price: "",
      cost_price: "",
      image: "",
      quantity: 0,
      low_stock_threshold: 10,
      status: asStatus("draft"),
      is_featured: false,
      track_inventory: true,
    },
  });

  // Load product data when sheet opens
  useEffect(() => {
    if (open && product && activeLanguages.length > 0) {
      // Reset manual edit flags
      setSkuManuallyEdited(true); // Already has values, don't auto-generate

      // Backend stores the primary image URL in `Product.image` and any
      // additional uploads as `ProductImage` rows. The picker is a flat
      // comma-separated string, so rebuild it here. On submit the
      // backend re-splits the string and re-syncs the rows.
      const imageUrls: string[] = [];
      const splitLegacy = (raw: string | null | undefined) =>
        (raw || "")
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s.startsWith("http://") || s.startsWith("https://"));
      for (const url of splitLegacy(product.image)) {
        if (!imageUrls.includes(url)) imageUrls.push(url);
      }
      const sortedExtras = [...(product.images || [])].sort(
        (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
      );
      for (const row of sortedExtras) {
        for (const url of splitLegacy(row.image)) {
          if (!imageUrls.includes(url)) imageUrls.push(url);
        }
      }
      const mergedImageString = imageUrls.join(", ");

      // Set form values
      form.reset({
        name: product.name || {},
        description: product.description || {},
        short_description: product.short_description || {},
        sku: product.sku,
        slug: product.slug,
        price: product.price,
        compare_at_price: product.compare_at_price || "",
        cost_price: product.cost_price || "",
        image: mergedImageString,
        quantity: product.quantity || 0,
        low_stock_threshold: product.low_stock_threshold || 10,
        status: product.status,
        is_featured: product.is_featured || false,
        track_inventory: product.track_inventory !== false,
        weight: product.weight ?? "",
        dimensions: product.dimensions || {},
      });

      // Convert attribute_values to AttributeValue format
      if (product.attribute_values && product.attribute_values.length > 0) {
        const convertedAttributes: AttributeValue[] = product.attribute_values.map((av) => {
          const attr: AttributeValue = {
            attribute_id: av.attribute.id,
          };

          // Map based on attribute type
          const attrType = String(av.attribute.attribute_type);
          if (attrType === "text" || attrType === "select" || attrType === "color") {
            attr.value_text = av.value_text || "";
          } else if (attrType === "number") {
            attr.value_number = av.value_number || "";
          } else if (attrType === "boolean") {
            attr.value_boolean = av.value_boolean || false;
          } else if (attrType === "date") {
            attr.value_date = av.value_date || "";
          } else if (attrType === "multiselect") {
            attr.value_json = av.value_json || [];
          }

          return attr;
        });

        setAttributes(convertedAttributes);
      } else {
        setAttributes([]);
      }

      // Reset to 'ka' or first available language
      const kaLang = activeLanguages.find((l) => l.code === "ka");
      setSelectedLanguage(kaLang ? "ka" : activeLanguages[0]?.code || "ka");
    }
  }, [open, product, activeLanguages.length]);

  const onSubmit = async (data: Partial<ProductCreateUpdateRequest>) => {
    if (!product?.id) return;

    try {
      // At least one language must be filled for the name. Checked before
      // anything else: a toast alone inside the loop below did not stop the save.
      const names = (data.name ?? {}) as Record<string, string>;
      if (!Object.values(names).some((value) => typeof value === "string" && value.trim())) {
        toast.error(t("nameRequired"));
        return;
      }

      // Auto-fill logic: Find first filled language for each field
      const fields = ["name", "description", "short_description"] as const;

      fields.forEach((fieldName) => {
        const fieldData = data[fieldName] as Record<string, string>;
        if (!fieldData || typeof fieldData !== "object") return;

        // Find first non-empty value
        let firstFilledValue = "";
        for (const langCode of Object.keys(fieldData)) {
          if (fieldData[langCode]?.trim()) {
            firstFilledValue = fieldData[langCode];
            break;
          }
        }

        // Fill empty languages with first filled value
        if (firstFilledValue) {
          activeLanguages.forEach((lang) => {
            if (!fieldData[lang.code]?.trim()) {
              fieldData[lang.code] = firstFilledValue;
            }
          });
        }
      });

      // Prepare product data with attributes
      const productData: Partial<ProductCreateUpdateRequest> = {
        ...normalizeShipping(data),
        attributes: attributes.length > 0 ? attributes : undefined,
      };

      await updateProduct.mutateAsync({
        id: product.id,
        data: productData as ProductCreateUpdateRequest,
      });

      toast.success(t("updated"));
      onOpenChange(false);
    } catch (error: unknown) {
      console.error("Failed to update product:", error);
      // The API's reason (e.g. "sku: product with this sku already exists"),
      // not axios' "Request failed with status code 400".
      toast.error(getApiErrorMessage(error, t("updateFailed")));
    }
  };

  const handleDelete = async () => {
    if (!product?.id) return;

    const productId = product.id;
    try {
      await deleteProduct.mutateAsync(productId);
      toast.success(t("deleted"));
      onOpenChange(false);
    } catch (error: unknown) {
      console.error("Failed to delete product:", error);
      const response = (error as { response?: { status?: number; data?: { orders?: string[] } } })?.response;
      if (response?.status === 409) {
        // Still in orders that aren't finished yet: say which, and offer to
        // hide the product from the shop instead.
        setDeleteConfirmOpen(false);
        const orders = response.data?.orders ?? [];
        toast.error(
          orders.length > 0
            ? t("deleteBlockedByOrders", { orders: orders.join(", ") })
            : t("deleteBlocked"),
          {
            duration: 15000,
            action: {
              label: t("deactivateInstead"),
              onClick: async () => {
                try {
                  await updateProduct.mutateAsync({
                    id: productId,
                    data: { status: asStatus("inactive") },
                  });
                  toast.success(t("deactivated"));
                  onOpenChange(false);
                } catch (deactivateError: unknown) {
                  toast.error(getApiErrorMessage(deactivateError, t("deactivateFailed")));
                }
              },
            },
          },
        );
        return;
      }
      toast.error(getApiErrorMessage(error, t("deleteFailed")));
    }
  };

  // Loading languages: the sheet opens with a spinner, as before.
  if (languagesLoading || activeLanguages.length === 0) {
    return (
      <FormSheet open={open} onOpenChange={onOpenChange} title={t("editTitle")} description={t("editDescription")} size="xl" testId="ec-product-edit-sheet">
        <EcLoading className="py-16" />
      </FormSheet>
    );
  }

  if (!product) {
    return null;
  }

  return (
    <>
      <Form {...form}>
        <FormSheet
          open={open}
          onOpenChange={onOpenChange}
          title={t("editTitle")}
          description={t("editDescription")}
          size="xl"
          testId="ec-product-edit-sheet"
          onSubmit={() => void form.handleSubmit(onSubmit)()}
          submitting={updateProduct.isPending}
          submitLabel={updateProduct.isPending ? t("saving") : t("saveChanges")}
          cancelLabel={tCommon("cancel")}
          extraFooter={
            <button
              type="button"
              className={rdButton.dangerSm}
              onClick={() => setDeleteConfirmOpen(true)}
              disabled={deleteProduct.isPending}
              data-testid="ec-product-delete"
              aria-label={t("deleteProduct")}
              title={t("deleteProduct")}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              {/* Icon only on phones, so Cancel + Save fit on one footer line. */}
              <span className="hidden sm:inline">{deleteProduct.isPending ? t("deleting") : t("deleteProduct")}</span>
            </button>
          }
        >
          <ProductFormSections
            form={form}
            languages={activeLanguages}
            language={selectedLanguage}
            onLanguageChange={setSelectedLanguage}
            onSkuEdited={() => setSkuManuallyEdited(true)}
            attributes={attributes}
            onAttributesChange={setAttributes}
            variants={<VariantManager productId={product.id} />}
          />
        </FormSheet>
      </Form>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteProduct")}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteConfirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteProduct.isPending ? t("deleting") : t("deleteProduct")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
