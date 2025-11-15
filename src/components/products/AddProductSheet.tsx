"use client";

import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { useCreateProduct } from "@/hooks/useProducts";
import { useLanguages } from "@/hooks/useLanguages";
import type { ProductCreateUpdate, ProductCreateUpdateRequest, Language } from "@/api/generated";
import type { Locale } from "@/lib/i18n";
import { ImageGalleryPicker } from "@/components/ImageGalleryPicker";
import LoadingSpinner from "@/components/LoadingSpinner";
import { AttributeSelector, type AttributeValue } from "./AttributeSelector";

interface AddProductSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddProductSheet({ open, onOpenChange }: AddProductSheetProps) {
  const locale = useLocale() as Locale;
  const t = useTranslations("products.addProductSheet");
  const tCommon = useTranslations("common");
  const createProduct = useCreateProduct();

  // Fetch active languages
  const { data: languagesData, isLoading: languagesLoading } = useLanguages({
    ordering: "sort_order,code",
  });

  const activeLanguages = languagesData?.results || [];

  // Track if user has manually edited SKU or slug
  const [skuManuallyEdited, setSkuManuallyEdited] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  // Selected language for form fields (default to 'ka')
  const [selectedLanguage, setSelectedLanguage] = useState<string>("ka");

  // Product attributes
  const [attributes, setAttributes] = useState<AttributeValue[]>([]);

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
      status: "draft" as any,
      is_featured: false,
      track_inventory: true,
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
      setSlugManuallyEdited(false);
      setAttributes([]);
      // Reset to 'ka' or first available language
      const kaLang = activeLanguages.find(l => l.code === 'ka');
      setSelectedLanguage(kaLang ? 'ka' : activeLanguages[0]?.code || 'ka');
    }
  }, [open, activeLanguages.length]);

  // Watch the selected language's name field to auto-generate SKU and slug
  const selectedLangName = form.watch(`name.${selectedLanguage}` as any);

  // Auto-generate SKU and slug from selected language name
  useEffect(() => {
    if (selectedLangName && open && selectedLanguage) {
      // Auto-generate SKU (uppercase with underscores)
      if (!skuManuallyEdited) {
        const generatedSku = selectedLangName
          .toUpperCase()
          .replace(/[^A-Z0-9]+/g, "_")
          .replace(/(^_|_$)/g, "");
        form.setValue("sku", generatedSku);
      }

      // Auto-generate slug (lowercase with dashes)
      if (!slugManuallyEdited) {
        const generatedSlug = selectedLangName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");
        form.setValue("slug", generatedSlug);
      }
    }
  }, [selectedLangName, open, skuManuallyEdited, slugManuallyEdited, form, selectedLanguage]);

  // Helper to get language name
  const getLanguageName = (lang: Language) => {
    if (typeof lang.name === "object" && lang.name !== null) {
      return lang.name[locale] || lang.name.en || lang.code;
    }
    return lang.name || lang.code;
  };

  const onSubmit = async (data: Partial<ProductCreateUpdate>) => {
    try {
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

        // Validate: At least one language must be filled for name
        if (fieldName === 'name' && !firstFilledValue) {
          alert("Please fill at least one language for the product name");
          return;
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
      const productData: any = {
        ...data,
        attributes: attributes.length > 0 ? attributes : undefined,
      };

      await createProduct.mutateAsync(productData);

      form.reset(buildDefaultValues());
      setAttributes([]);
      onOpenChange(false);
    } catch (error: any) {
      console.error("Failed to create product:", error);
      alert(error.message || "Failed to create product");
    }
  };

  // Show loading state while fetching languages
  if (languagesLoading || activeLanguages.length === 0) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="p-0 w-full sm:max-w-lg" side="right">
          <div className="flex items-center justify-center h-full">
            <LoadingSpinner />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="p-0 w-full sm:max-w-lg" side="right">
        <ScrollArea className="h-full">
          <div className="p-6">
            <SheetHeader>
              <SheetTitle>{t("title")}</SheetTitle>
              <SheetDescription>
                {t("description")}
              </SheetDescription>
            </SheetHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 mt-6">
                {/* Language Selector */}
                <div className="flex items-center gap-2">
                  <FormLabel className="text-sm font-medium">Language:</FormLabel>
                  <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {activeLanguages.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {getLanguageName(lang)} ({lang.code.toUpperCase()})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-xs ml-auto">
                    Fill at least one language
                  </FormDescription>
                </div>

                {/* Product Name - Selected Language */}
                <FormField
                  key={`name-${selectedLanguage}`}
                  control={form.control}
                  name={`name.${selectedLanguage}` as any}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Name *</FormLabel>
                      <FormControl>
                        <Input placeholder={t("namePlaceholder")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* SKU and Slug */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="sku"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SKU</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="PROD-001"
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              setSkuManuallyEdited(true);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("slug")}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t("slugPlaceholder")}
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              setSlugManuallyEdited(true);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Short Description - Selected Language */}
                <FormField
                  key={`short_description-${selectedLanguage}`}
                  control={form.control}
                  name={`short_description.${selectedLanguage}` as any}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Short Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={t("shortDescPlaceholder")}
                          className="resize-none"
                          rows={2}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Pricing */}
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("priceLari")}</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder={t("pricePlaceholder")} {...field} />
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
                        <FormLabel>{t("comparePrice")}</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder={t("pricePlaceholder")} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cost_price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("costPrice")}</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder={t("pricePlaceholder")} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Inventory */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="low_stock_threshold"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Low Stock Threshold</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="10" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Product Images */}
                <FormField
                  control={form.control}
                  name="image"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("productImages")}</FormLabel>
                      <FormControl>
                        <ImageGalleryPicker
                          value={field.value || ""}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Product Attributes */}
                <div className="border-t pt-4 mt-4">
                  <AttributeSelector
                    value={attributes}
                    onChange={setAttributes}
                  />
                </div>

                {/* Status */}
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={String(field.value)}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Featured Product */}
                <FormField
                  control={form.control}
                  name="is_featured"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Featured Product</FormLabel>
                        <FormDescription>
                          Display this product in the featured products section on the homepage
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <SheetFooter className="mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                  >
                    {tCommon("cancel")}
                  </Button>
                  <Button type="submit" disabled={createProduct.isPending}>
                    {createProduct.isPending ? t("creating") : t("createProduct")}
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
