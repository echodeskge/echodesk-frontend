"use client";

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
import { Switch } from "@/components/ui/switch";
import type { AttributeDefinition, Language } from "@/api/generated";
import {
  FormSection,
  FormSwitchRow,
  Segmented,
  TonePill,
  localizedText,
} from "@/app/(tenant)/ecommerce/_components/ui";
import { rhf } from "@/components/products/form-kit";
import { OptionsManager, type AttributeOption } from "./OptionsManager";

/* eslint-disable @typescript-eslint/no-explicit-any -- react-hook-form Path<T>
   cannot resolve the dynamic `name.<lang>` keys (same as before). */

export const ATTRIBUTE_FORM_TYPES = ["multiselect", "number"] as const;

interface AttributeFormSectionsProps {
  form: UseFormReturn<Partial<AttributeDefinition>>;
  languages: Language[];
  /** Edit: key and type are read-only (they cannot change after creation). */
  editing?: boolean;
  options: AttributeOption[];
  onOptionsChange: (options: AttributeOption[]) => void;
  /** Add: switching away from multi-select clears the options, as before. */
  onTypeChange?: (type: string) => void;
}

/**
 * Body of the add / edit attribute sheets: Name (one field per language),
 * Definition (key, type, unit for numbers), Options (multi-select only) and
 * Settings (required / filterable / active switches).
 */
export function AttributeFormSections({
  form,
  languages,
  editing,
  options,
  onOptionsChange,
  onTypeChange,
}: AttributeFormSectionsProps) {
  const locale = useLocale();
  const t = useTranslations("productAttributes.addAttributeSheet");
  const ta = useTranslations("productAttributes");
  const tTypes = useTranslations("productAttributes.types");
  const attributeType = String(form.watch("attribute_type"));
  const languageName = (lang: Language) =>
    localizedText(lang.name as Parameters<typeof localizedText>[0], locale) || lang.code;

  return (
    <>
      <FormSection title={t("nameEn")} hint={t("fillInAtLeastOneLanguage")}>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          {languages.map((lang) => (
            <FormField
              key={lang.code}
              control={form.control}
              name={`name.${lang.code}` as any}
              render={({ field }) => (
                <FormItem className={rhf.item}>
                  <FormLabel className={rhf.label}>{languageName(lang)}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("nameInLanguage", { lang: languageName(lang) })}
                      {...field}
                      value={(field.value as string) ?? ""}
                      className={rhf.input}
                    />
                  </FormControl>
                  <FormMessage className={rhf.message} />
                </FormItem>
              )}
            />
          ))}
        </div>
      </FormSection>

      <FormSection title={ta("sections.definition")}>
        <FormField
          control={form.control}
          name="key"
          render={({ field }) => (
            <FormItem className={rhf.item}>
              <FormLabel className={rhf.label}>
                {editing ? ta("key") : t("keyLabel")}
              </FormLabel>
              <FormControl>
                <Input
                  placeholder={t("keyPlaceholder")}
                  {...field}
                  value={field.value ?? ""}
                  disabled={editing}
                  className={`${rhf.input} font-mono ${editing ? "bg-muted" : ""}`}
                />
              </FormControl>
              <FormDescription className={rhf.help}>{editing ? t("keyCannotChange") : t("keyDescription")}</FormDescription>
              <FormMessage className={rhf.message} />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="attribute_type"
          render={({ field }) => (
            <FormItem className={rhf.item}>
              <FormLabel className={rhf.label}>{t("attributeType")}</FormLabel>
              {editing ? (
                <div className="flex min-h-[34px] items-center">
                  <TonePill tone="neutral">
                    {tTypes.has(String(field.value)) ? tTypes(String(field.value)) : String(field.value)}
                  </TonePill>
                </div>
              ) : (
                <Segmented<string>
                  size="md"
                  value={String(field.value)}
                  onChange={(value) => {
                    field.onChange(value);
                    onTypeChange?.(value);
                  }}
                  ariaLabel={t("attributeType")}
                  options={ATTRIBUTE_FORM_TYPES.map((type) => ({ value: type, label: tTypes(type) }))}
                  className="justify-self-start"
                  testId="ec-attribute-type"
                />
              )}
              {editing && <FormDescription className={rhf.help}>{t("typeCannotChange")}</FormDescription>}
              <FormMessage className={rhf.message} />
            </FormItem>
          )}
        />

        {attributeType === "number" && (
          <FormField
            control={form.control}
            name="unit"
            render={({ field }) => (
              <FormItem className={rhf.item}>
                <FormLabel className={rhf.label}>{t("unitLabel")}</FormLabel>
                <FormControl>
                  <Input placeholder={t("unitPlaceholder")} {...field} value={field.value ?? ""} className={`${rhf.input} max-w-[200px]`} />
                </FormControl>
                <FormDescription className={rhf.help}>{t("unitDescription")}</FormDescription>
                <FormMessage className={rhf.message} />
              </FormItem>
            )}
          />
        )}
      </FormSection>

      {attributeType === "multiselect" && (
        <FormSection title={t("attributeOptions")} hint={t("attributeOptionsDescription")}>
          <OptionsManager options={options} onChange={onOptionsChange} languages={languages} />
        </FormSection>
      )}

      <FormSection title={ta("sections.settings")}>
        {(
          [
            ["is_required", t("requiredLabel"), t("requiredDescription")],
            ["is_filterable", t("filterableLabel"), t("filterableDescription")],
            ["is_active", t("activeLabel"), t("activeDescription")],
          ] as const
        ).map(([name, label, help]) => (
          <FormField
            key={name}
            control={form.control}
            name={name}
            render={({ field }) => (
              <FormSwitchRow label={label} help={help} htmlFor={`ec-attribute-${name}`}>
                <Switch id={`ec-attribute-${name}`} checked={!!field.value} onCheckedChange={field.onChange} />
              </FormSwitchRow>
            )}
          />
        ))}
      </FormSection>
    </>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */
