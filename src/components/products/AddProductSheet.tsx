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
import { useCreateProduct } from "@/hooks/useProducts";
import type { ProductCreateUpdate } from "@/api/generated";
import type { Locale } from "@/lib/i18n";

interface AddProductSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddProductSheet({ open, onOpenChange }: AddProductSheetProps) {
  const locale = useLocale() as Locale;
  const t = useTranslations("products.addProductSheet");
  const tCommon = useTranslations("common");
  const createProduct = useCreateProduct();

  // Track if user has manually edited SKU or slug
  const [skuManuallyEdited, setSkuManuallyEdited] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const form = useForm<Partial<ProductCreateUpdate>>({
    defaultValues: {
      name: { en: "", ka: "" },
      description: { en: "", ka: "" },
      short_description: { en: "", ka: "" },
      sku: "",
      slug: "",
      price: "0.00",
      compare_at_price: "",
      cost_price: "",
      quantity: 0,
      low_stock_threshold: 10,
      status: "draft" as any,
      is_featured: false,
      track_inventory: true,
      product_type: 1, // Default product type - you may need to adjust this
    },
  });

  // Watch the name field to auto-generate SKU and slug
  const nameEn = form.watch("name.en");

  // Reset manual edit flags when sheet opens
  useEffect(() => {
    if (open) {
      setSkuManuallyEdited(false);
      setSlugManuallyEdited(false);
    }
  }, [open]);

  useEffect(() => {
    if (nameEn && open) {
      // Auto-generate SKU (uppercase with underscores)
      if (!skuManuallyEdited) {
        const generatedSku = nameEn
          .toUpperCase()
          .replace(/[^A-Z0-9]+/g, "_")
          .replace(/(^_|_$)/g, "");
        form.setValue("sku", generatedSku);
      }

      // Auto-generate slug (lowercase with dashes)
      if (!slugManuallyEdited) {
        const generatedSlug = nameEn
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");
        form.setValue("slug", generatedSlug);
      }
    }
  }, [nameEn, open, skuManuallyEdited, slugManuallyEdited, form]);

  const onSubmit = async (data: Partial<ProductCreateUpdate>) => {
    try {
      await createProduct.mutateAsync(data as ProductCreateUpdate);

      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Failed to create product:", error);
      alert(error.message || "Failed to create product");
    }
  };

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
                {/* Product Name - Multilanguage */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name.en"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("nameEn")}</FormLabel>
                        <FormControl>
                          <Input placeholder={t("namePlaceholder")} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="name.ka"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("nameKa")}</FormLabel>
                        <FormControl>
                          <Input placeholder={t("nameKaPlaceholder")} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

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

                {/* Short Description - Multilanguage */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="short_description.en"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("shortDescriptionEn")}</FormLabel>
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
                  <FormField
                    control={form.control}
                    name="short_description.ka"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("shortDescriptionKa")}</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={t("shortDescKaPlaceholder")}
                            className="resize-none"
                            rows={2}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

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
