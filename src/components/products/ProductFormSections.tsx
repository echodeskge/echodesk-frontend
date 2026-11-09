"use client";

import type { ReactNode } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useLocale, useTranslations } from "next-intl";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import type { Language } from "@/api/generated";
import { ImageGalleryPicker } from "@/components/ImageGalleryPicker";
import {
  FormSection,
  FormSwitchRow,
  Segmented,
  localizedText,
} from "@/app/(tenant)/ecommerce/_components/ui";
import { DescriptionField, ShippingFields } from "./ProductExtraFields";
import { AttributeSelector, type AttributeValue } from "./AttributeSelector";
import { FormGrid3, MoneyInput, rhf } from "./form-kit";

/* eslint-disable @typescript-eslint/no-explicit-any -- react-hook-form Path<T>
   cannot resolve dynamic object keys like `name.${lang}` on a Record field
   (the same limitation the product sheets always worked around). */
type AnyForm = UseFormReturn<any>;

export const PRODUCT_FORM_STATUSES = ["draft", "active", "inactive", "out_of_stock"] as const;
const STATUS_LABEL: Record<(typeof PRODUCT_FORM_STATUSES)[number], string> = {
  draft: "statusDraft",
  active: "statusActive",
  inactive: "statusInactive",
  out_of_stock: "statusOutOfStock",
};

/** A language's name in the UI language ("Georgian"), then English, then its code. */
export function languageLabel(lang: Pick<Language, "name" | "code">, locale: string): string {
  return localizedText(lang.name as Parameters<typeof localizedText>[0], locale) || lang.code;
}

interface ProductFormSectionsProps {
  form: AnyForm;
  languages: Language[];
  language: string;
  onLanguageChange: (code: string) => void;
  /** The SKU was typed by hand (stops the add form from generating it from the name). */
  onSkuEdited: () => void;
  /** Add form only: "Auto-generated from name" under the SKU, "fill at least one language". */
  creating?: boolean;
  attributes: AttributeValue[];
  onAttributesChange: (attributes: AttributeValue[]) => void;
  /** The variants block (live `VariantManager` on edit, staged list on add). */
  variants: ReactNode;
}

/**
 * The body of the add / edit product sheets, in form-card sections:
 * Basics (edit language, name, SKU, descriptions), Pricing, Inventory,
 * Images, Attributes, Variants, Shipping, Status. Same fields, names and
 * defaults as before; only the layout changed.
 */
export function ProductFormSections({
  form,
  languages,
  language,
  onLanguageChange,
  onSkuEdited,
  creating,
  attributes,
  onAttributesChange,
  variants,
}: ProductFormSectionsProps) {
  const locale = useLocale();
  const t = useTranslations("products.addProductSheet");
  const tp = useTranslations("products");

  return (
    <>
      <FormSection title={tp("sections.basics")}>
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className={rhf.label}>
            {t("language")}
          </span>
          <Segmented<string>
            value={language}
            onChange={onLanguageChange}
            ariaLabel={t("language")}
            options={languages.map((lang) => ({ value: lang.code, label: languageLabel(lang, locale) }))}
            className="self-start"
            testId="ec-product-language"
          />
          {creating && <span className="text-xs leading-4 text-muted-foreground">{t("fillAtLeastOneLanguage")}</span>}
        </div>

        <FormField
          key={`name-${language}`}
          control={form.control}
          name={`name.${language}` as any}
          render={({ field }) => (
            <FormItem className={rhf.item}>
              <FormLabel className={rhf.label}>
                {t("productName")}
                <span aria-hidden className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input placeholder={t("namePlaceholder")} {...field} value={field.value ?? ""} className={rhf.input} />
              </FormControl>
              <FormMessage className={rhf.message} />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="sku"
          render={({ field }) => (
            <FormItem className={rhf.item}>
              <FormLabel className={rhf.label}>{t("sku")}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t("skuPlaceholder")}
                  {...field}
                  value={field.value ?? ""}
                  onChange={(e) => {
                    field.onChange(e);
                    onSkuEdited();
                  }}
                  className={`${rhf.input} font-mono`}
                />
              </FormControl>
              {creating && <FormDescription className={rhf.help}>{t("skuDescription")}</FormDescription>}
              <FormMessage className={rhf.message} />
            </FormItem>
          )}
        />

        <FormField
          key={`short_description-${language}`}
          control={form.control}
          name={`short_description.${language}` as any}
          render={({ field }) => (
            <FormItem className={rhf.item}>
              <FormLabel className={rhf.label}>{t("shortDescription")}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t("shortDescPlaceholder")}
                  rows={2}
                  {...field}
                  value={field.value ?? ""}
                  className={`${rhf.textarea} resize-none`}
                />
              </FormControl>
              <FormMessage className={rhf.message} />
            </FormItem>
          )}
        />

        <DescriptionField form={form} language={language} />
      </FormSection>

      <FormSection title={tp("sections.pricing")}>
        <FormGrid3>
          {(
            [
              ["price", tp("price")],
              ["compare_at_price", t("oldPrice")],
              ["cost_price", t("costPrice")],
            ] as const
          ).map(([name, label]) => (
            <FormField
              key={name}
              control={form.control}
              name={name}
              render={({ field }) => (
                <FormItem className={rhf.item}>
                  <FormLabel className={rhf.label}>{label}</FormLabel>
                  <MoneyInput placeholder={t("pricePlaceholder")} {...field} value={field.value ?? ""} />
                  <FormMessage className={rhf.message} />
                </FormItem>
              )}
            />
          ))}
        </FormGrid3>
      </FormSection>

      <FormSection title={tp("sections.inventory")}>
        <div className="grid min-w-0 grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem className={rhf.item}>
                <FormLabel className={rhf.label}>{t("quantity")}</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="0" {...field} value={field.value ?? ""} className={`${rhf.input} tabular-nums`} />
                </FormControl>
                <FormMessage className={rhf.message} />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="low_stock_threshold"
            render={({ field }) => (
              <FormItem className={rhf.item}>
                <FormLabel className={rhf.label}>{t("lowStockThreshold")}</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="10" {...field} value={field.value ?? ""} className={`${rhf.input} tabular-nums`} />
                </FormControl>
                <FormMessage className={rhf.message} />
              </FormItem>
            )}
          />
        </div>
      </FormSection>

      <FormSection title={t("productImages")}>
        <FormField
          control={form.control}
          name="image"
          render={({ field }) => (
            <FormItem className={rhf.item}>
              <FormLabel className="sr-only">{t("productImages")}</FormLabel>
              <FormControl>
                <ImageGalleryPicker value={field.value || ""} onChange={field.onChange} />
              </FormControl>
              <FormMessage className={rhf.message} />
            </FormItem>
          )}
        />
      </FormSection>

      <FormSection title={tp("attributeSelector.title")} hint={tp("attributeSelector.hint")}>
        <AttributeSelector value={attributes} onChange={onAttributesChange} />
      </FormSection>

      {variants}

      <FormSection title={tp("shipping.title")} hint={tp("shipping.hint")}>
        <ShippingFields form={form} />
      </FormSection>

      <FormSection title={tp("sections.visibility")}>
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem className={rhf.item}>
              <FormLabel className="sr-only">{t("status")}</FormLabel>
              <Segmented<string>
                size="md"
                value={String(field.value ?? "draft")}
                onChange={field.onChange}
                ariaLabel={t("status")}
                options={PRODUCT_FORM_STATUSES.map((s) => ({ value: s, label: t(STATUS_LABEL[s]) }))}
                className="justify-self-start"
                testId="ec-product-status"
              />
              <FormMessage className={rhf.message} />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="is_featured"
          render={({ field }) => (
            <FormSwitchRow label={t("featuredProduct")} help={t("featuredProductDescription")} htmlFor="ec-product-featured">
              <Switch id="ec-product-featured" checked={!!field.value} onCheckedChange={field.onChange} />
            </FormSwitchRow>
          )}
        />
      </FormSection>
    </>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */
