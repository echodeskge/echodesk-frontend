"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useLocale, useTranslations } from "next-intl";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { useUpdateAttribute } from "@/hooks/useAttributes";
import { useLanguages } from "@/hooks/useLanguages";
import { OptionsManager, type AttributeOption } from "./OptionsManager";
import type { AttributeDefinition, Language } from "@/api/generated";
import type { Locale } from "@/lib/i18n";

interface EditAttributeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attribute: AttributeDefinition | null;
}

export function EditAttributeSheet({
  open,
  onOpenChange,
  attribute,
}: EditAttributeSheetProps) {
  const locale = useLocale() as Locale;
  const t = useTranslations("productAttributes.addAttributeSheet");
  const tCommon = useTranslations("common");
  const tTypes = useTranslations("productAttributes.types");
  const updateAttribute = useUpdateAttribute();

  // Fetch active languages
  const { data: languagesData, isLoading: languagesLoading } = useLanguages({
    ordering: "sort_order,code",
  });

  const activeLanguages = languagesData?.results || [];

  // Options state (for multiselect type)
  const [options, setOptions] = useState<AttributeOption[]>([]);

  const form = useForm<Partial<AttributeDefinition>>({
    defaultValues: {
      name: {},
      key: "",
      attribute_type: "multiselect" as any,
      unit: "",
      is_required: false,
      is_filterable: true,
      is_active: true,
      sort_order: 0,
      options: [],
    },
  });

  const attributeType = form.watch("attribute_type");

  // Load attribute data when sheet opens
  useEffect(() => {
    if (open && attribute && activeLanguages.length > 0) {
      // Set form values
      form.reset({
        name: attribute.name || {},
        key: attribute.key,
        attribute_type: attribute.attribute_type as any,
        unit: attribute.unit || "",
        is_required: attribute.is_required,
        is_filterable: attribute.is_filterable,
        is_active: attribute.is_active,
        sort_order: attribute.sort_order,
      });

      // Set options if they exist
      if (attribute.options && Array.isArray(attribute.options)) {
        setOptions(attribute.options as AttributeOption[]);
      } else {
        setOptions([]);
      }
    }
  }, [open, attribute, activeLanguages.length]);

  // Helper to get language name
  const getLanguageName = (lang: Language) => {
    if (typeof lang.name === "object" && lang.name !== null) {
      return (lang.name as any)[locale] || (lang.name as any).en || lang.code;
    }
    return lang.name || lang.code;
  };

  const onSubmit = async (data: Partial<AttributeDefinition>) => {
    if (!attribute?.id) return;

    try {
      // Auto-fill name: Find first filled language and fill the rest
      const nameData = data.name as Record<string, string>;
      if (nameData && typeof nameData === "object") {
        // Find first non-empty value
        let firstFilledValue = "";
        for (const langCode of Object.keys(nameData)) {
          if (nameData[langCode]?.trim()) {
            firstFilledValue = nameData[langCode];
            break;
          }
        }

        // Validate: At least one language must be filled for name
        if (!firstFilledValue) {
          alert("Please fill at least one language for the attribute name");
          return;
        }

        // Fill empty languages with first filled value
        activeLanguages.forEach((lang) => {
          if (!nameData[lang.code]?.trim()) {
            nameData[lang.code] = firstFilledValue;
          }
        });
      }

      // Add options if attribute type is multiselect
      if (String(attributeType) === "multiselect" && options.length > 0) {
        // Validate options: each must have value and at least one language
        const invalidOptions = options.filter((opt) => {
          if (!opt.value?.trim()) return true;
          return !activeLanguages.some((lang) => opt[lang.code]?.trim());
        });

        if (invalidOptions.length > 0) {
          alert(
            "Please ensure all options have a value and at least one language label"
          );
          return;
        }

        data.options = options as any;
      } else if (String(attributeType) === "multiselect") {
        // Require at least one option for multiselect type
        alert("Please add at least one option for multiselect type");
        return;
      } else {
        // For non-multiselect types, ensure options is empty array
        data.options = [];
      }

      await updateAttribute.mutateAsync({
        id: attribute.id,
        data: data as any,
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error("Failed to update attribute:", error);
      alert(error.message || "Failed to update attribute");
    }
  };

  // Show loading state while fetching languages
  if (languagesLoading || activeLanguages.length === 0) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="p-0 w-full sm:max-w-lg" side="right">
          <div className="flex items-center justify-center h-full">
            <div className="text-sm text-muted-foreground">{tCommon("loading")}</div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  if (!attribute) {
    return null;
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="p-0 w-full sm:max-w-lg" side="right">
        <ScrollArea className="h-full">
          <div className="p-6">
            <SheetHeader>
              <SheetTitle>{t("editTitle")}</SheetTitle>
              <SheetDescription>
                {t("editDescription")}
              </SheetDescription>
            </SheetHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 mt-6">
                {/* Attribute Name - All Languages */}
                <div className="space-y-3">
                  <FormLabel className="text-base font-semibold">{t("nameEn")}</FormLabel>
                  <FormDescription>
                    {t("fillInAtLeastOneLanguage")}
                  </FormDescription>

                  {activeLanguages.map((lang) => (
                    <FormField
                      key={lang.code}
                      control={form.control}
                      name={`name.${lang.code}` as any}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm text-muted-foreground">
                            {getLanguageName(lang)} ({lang.code.toUpperCase()})
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder={t("nameInLanguage", { lang: lang.code })}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>

                {/* Key - Read-only for editing */}
                <FormField
                  control={form.control}
                  name="key"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("keyLabel")}</FormLabel>
                      <FormControl>
                        <Input {...field} disabled className="bg-muted" />
                      </FormControl>
                      <FormDescription>
                        {t("keyCannotChange")}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Attribute Type - Read-only for editing */}
                <FormField
                  control={form.control}
                  name="attribute_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("attributeType")}</FormLabel>
                      <Select value={String(field.value)} disabled>
                        <FormControl>
                          <SelectTrigger className="bg-muted">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="multiselect">
                            {tTypes("multiselect")}
                          </SelectItem>
                          <SelectItem value="number">{tTypes("number")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {t("typeCannotChange")}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Options Manager (for multiselect type) */}
                {String(attributeType) === "multiselect" && (
                  <div className="border rounded-lg p-4 bg-muted/30">
                    <OptionsManager
                      options={options}
                      onChange={setOptions}
                      languages={activeLanguages}
                    />
                  </div>
                )}

                {/* Unit (for number type) */}
                {String(attributeType) === "number" && (
                  <FormField
                    control={form.control}
                    name="unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("unitLabel")}</FormLabel>
                        <FormControl>
                          <Input placeholder={t("unitPlaceholder")} {...field} />
                        </FormControl>
                        <FormDescription>{t("unitDescription")}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Checkboxes */}
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="is_required"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>{t("requiredLabel")}</FormLabel>
                          <FormDescription>
                            {t("requiredDescription")}
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="is_filterable"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>{t("filterableLabel")}</FormLabel>
                          <FormDescription>
                            {t("filterableDescription")}
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>{t("activeLabel")}</FormLabel>
                          <FormDescription>
                            {t("activeDescription")}
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                <SheetFooter className="mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                  >
                    {tCommon("cancel")}
                  </Button>
                  <Button type="submit" disabled={updateAttribute.isPending}>
                    {updateAttribute.isPending ? t("saving") : t("saveChanges")}
                  </Button>
                </SheetFooter>
              </form>
            </Form>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
