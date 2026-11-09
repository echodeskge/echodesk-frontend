"use client";

import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Form } from "@/components/ui/form";
import { useCreateProduct } from "@/hooks/useProducts";
import { useLanguages } from "@/hooks/useLanguages";
import type { ProductCreateUpdate, ProductCreateUpdateRequest } from "@/api/generated";
import { normalizeShipping } from "@/components/products/ProductExtraFields";
import { type AttributeValue } from "./AttributeSelector";
import { StagedVariantManager, createStagedVariants, type StagedVariant } from "./VariantManager";
import { ProductFormSections } from "./ProductFormSections";
import { EcLoading, FormSheet } from "@/app/(tenant)/ecommerce/_components/ui";
import { getApiErrorMessage } from "@/lib/utils";

/**
 * The generated Status711enum is typed as `{ [key: string]: any }` (an object)
 * instead of a proper string union, because the OpenAPI generator cannot resolve
 * the Django enum. We cast status string literals through `Status711enum` using
 * this helper to avoid bare `as any`.
 */
import type { Status956enum } from "@/api/generated/interfaces";
const asStatus = (v: string) => v as unknown as Status956enum;

interface AddProductSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddProductSheet({ open, onOpenChange }: AddProductSheetProps) {
  const t = useTranslations("products.addProductSheet");
  const tCommon = useTranslations("common");
  const createProduct = useCreateProduct();

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

  // Variants typed before the product exists; created right after it is saved
  const [stagedVariants, setStagedVariants] = useState<StagedVariant[]>([]);
  const [variantFormOpen, setVariantFormOpen] = useState(false);

  // Build initial default values with dynamic languages
  const buildDefaultValues = (): Partial<ProductCreateUpdate> => {
    const nameObj: Record<string, string> = {};
    const descObj: Record<string, string> = {};
    const shortDescObj: Record<string, string> = {};

    activeLanguages.forEach((lang) => {
      nameObj[lang.code] = "";
      descObj[lang.code] = "";
      shortDescObj[lang.code] = "";
    });

    return {
      name: nameObj,
      description: descObj,
      short_description: shortDescObj,
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
      weight: "",
      dimensions: {},
    };
  };

  const form = useForm<Partial<ProductCreateUpdate>>({
    defaultValues: buildDefaultValues(),
  });

  // Reset form when languages change or sheet opens
  useEffect(() => {
    if (open && activeLanguages.length > 0) {
      form.reset(buildDefaultValues());
      setSkuManuallyEdited(false);
      setAttributes([]);
      setStagedVariants([]);
      // Reset to 'ka' or first available language
      const kaLang = activeLanguages.find(l => l.code === 'ka');
      setSelectedLanguage(kaLang ? 'ka' : activeLanguages[0]?.code || 'ka');
    }
  }, [open, activeLanguages.length]);

  // Watch the selected language's name field to auto-generate SKU and slug
  // `as any`: RHF Path<T> cannot resolve dynamic object keys on Record fields
  const selectedLangName = form.watch(`name.${selectedLanguage}` as any);

  // Auto-generate SKU from selected language name
  useEffect(() => {
    if (selectedLangName && open && selectedLanguage) {
      // Auto-generate SKU (uppercase with underscores, Latin chars only)
      if (!skuManuallyEdited) {
        const generatedSku = selectedLangName
          .toUpperCase()
          .replace(/[^A-Z0-9]+/g, "_")
          .replace(/(^_|_$)/g, "");
        if (generatedSku) {
          form.setValue("sku", generatedSku);
        }
      }
    }
  }, [selectedLangName, open, skuManuallyEdited, form, selectedLanguage]);

  const onSubmit = async (data: Partial<ProductCreateUpdate>) => {
    if (variantFormOpen) {
      toast.error(t("finishVariantFirst"));
      return;
    }
    try {
      // At least one language must be filled for the name. Checked before
      // anything else: a toast alone inside the loop below did not stop the save.
      const names = (data.name ?? {}) as Record<string, string>;
      if (!Object.values(names).some((value) => typeof value === "string" && value.trim())) {
        toast.error(t("nameRequired"));
        return;
      }

      // Auto-fill logic: Find first filled language for each field
      const fields = ['name', 'description', 'short_description'] as const;

      fields.forEach((fieldName) => {
        const fieldData = data[fieldName] as Record<string, string>;
        if (!fieldData || typeof fieldData !== 'object') return;

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
      const productData: Partial<ProductCreateUpdateRequest> & Pick<ProductCreateUpdate, never> = {
        ...normalizeShipping(data),
        attributes: attributes.length > 0 ? attributes : undefined,
      };

      const created = await createProduct.mutateAsync(productData as ProductCreateUpdate);

      if (stagedVariants.length > 0 && created?.id) {
        const { failed } = await createStagedVariants(created.id, stagedVariants);
        if (failed.length > 0) {
          // The product is saved; say which variants still need adding from
          // the product's edit form.
          toast.error(
            t("variantsFailed", {
              count: failed.length,
              skus: failed.map((f) => f.variant.sku).join(", "),
            }),
            { description: getApiErrorMessage(failed[0].error), duration: 15000 },
          );
        }
      }

      toast.success(t("created"));
      form.reset(buildDefaultValues());
      setAttributes([]);
      setStagedVariants([]);
      onOpenChange(false);
    } catch (error: unknown) {
      console.error("Failed to create product:", error);
      toast.error(getApiErrorMessage(error, t("createFailed")));
    }
  };

  // Loading languages: the sheet opens with a spinner, as before.
  if (languagesLoading || activeLanguages.length === 0) {
    return (
      <FormSheet open={open} onOpenChange={onOpenChange} title={t("title")} description={t("description")} size="xl" testId="ec-product-add-sheet">
        <EcLoading className="py-16" />
      </FormSheet>
    );
  }

  return (
    <Form {...form}>
      <FormSheet
        open={open}
        onOpenChange={onOpenChange}
        title={t("title")}
        description={t("description")}
        size="xl"
        testId="ec-product-add-sheet"
        onSubmit={() => void form.handleSubmit(onSubmit)()}
        submitting={createProduct.isPending}
        submitLabel={createProduct.isPending ? t("creating") : t("createProduct")}
        cancelLabel={tCommon("cancel")}
      >
        <ProductFormSections
          form={form}
          languages={activeLanguages}
          language={selectedLanguage}
          onLanguageChange={setSelectedLanguage}
          onSkuEdited={() => setSkuManuallyEdited(true)}
          creating
          attributes={attributes}
          onAttributesChange={setAttributes}
          variants={
            /* Variants (saved together with the product) */
            <StagedVariantManager
              value={stagedVariants}
              onChange={setStagedVariants}
              onEditingChange={setVariantFormOpen}
            />
          }
        />
      </FormSheet>
    </Form>
  );
}
