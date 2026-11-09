"use client";

import { useTranslations } from "next-intl";
import type { UseFormReturn } from "react-hook-form";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { rhf } from "./form-kit";

export interface ProductDimensions {
  length?: number | string | null;
  width?: number | string | null;
  height?: number | string | null;
  unit?: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any -- RHF Path<T> can't express the
   dynamic `description.<lang>` / `dimensions.<side>` keys, same as the other product fields */
type AnyForm = UseFormReturn<any>;

/** Full product description in the selected language (TBC needs it for merchant approval). */
export function DescriptionField({ form, language }: { form: AnyForm; language: string }) {
  const t = useTranslations("products");
  return (
    <FormField
      key={`description-${language}`}
      control={form.control}
      name={`description.${language}` as any}
      render={({ field }) => (
        <FormItem className={rhf.item}>
          <FormLabel className={rhf.label}>{t("fullDescription")}</FormLabel>
          <FormControl>
            <Textarea
              placeholder={t("fullDescriptionPlaceholder")}
              rows={6}
              {...field}
              value={field.value || ""}
              className="min-h-[120px] text-[13px]"
            />
          </FormControl>
          <FormDescription className={rhf.help}>{t("fullDescriptionHint")}</FormDescription>
          <FormMessage className={rhf.message} />
        </FormItem>
      )}
    />
  );
}

/**
 * Weight and parcel size, which the courier quote is priced on. The section
 * title and hint (`shipping.title` / `shipping.hint`) are the caller's
 * `FormSection`; this renders the four fields (two per row on phones).
 */
export function ShippingFields({ form }: { form: AnyForm }) {
  const t = useTranslations("products");
  return (
    <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-4">
      <FormField
        control={form.control}
        name={"weight" as any}
        render={({ field }) => (
          <FormItem className={rhf.item}>
            <FormLabel className={rhf.label}>{t("shipping.weightKg")}</FormLabel>
            <FormControl>
              <Input type="number" step="0.01" min="0" placeholder="0.50" {...field} value={field.value ?? ""} className={`${rhf.input} tabular-nums`} />
            </FormControl>
            <FormMessage className={rhf.message} />
          </FormItem>
        )}
      />
      {(["length", "width", "height"] as const).map((side) => (
        <FormField
          key={side}
          control={form.control}
          name={`dimensions.${side}` as any}
          render={({ field }) => (
            <FormItem className={rhf.item}>
              <FormLabel className={rhf.label}>{t(`shipping.${side}Cm`)}</FormLabel>
              <FormControl>
                <Input type="number" step="0.1" min="0" placeholder="0" {...field} value={field.value ?? ""} className={`${rhf.input} tabular-nums`} />
              </FormControl>
              <FormMessage className={rhf.message} />
            </FormItem>
          )}
        />
      ))}
    </div>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Empty weight → null; dimensions → numbers in cm, or {} when nothing was entered. */
export function normalizeShipping<T extends { weight?: string | null; dimensions?: ProductDimensions | null }>(data: T): T {
  const weight = data.weight === "" || data.weight == null ? null : String(data.weight);
  const dims = data.dimensions || {};
  const sides: Record<string, number> = {};
  for (const side of ["length", "width", "height"] as const) {
    const raw = dims[side];
    const value = raw === "" || raw == null ? NaN : Number(raw);
    if (!Number.isNaN(value) && value > 0) sides[side] = value;
  }
  return { ...data, weight, dimensions: Object.keys(sides).length ? { ...sides, unit: "cm" } : {} };
}
