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
import { useUpdateProduct, useDeleteProduct } from "@/hooks/useProducts";
import { useLanguages } from "@/hooks/useLanguages";
import type { ProductDetail, ProductCreateUpdateRequest, Language } from "@/api/generated";
import type { Locale } from "@/lib/i18n";
import { ImageGalleryPicker } from "@/components/ImageGalleryPicker";
import LoadingSpinner from "@/components/LoadingSpinner";
import { AttributeSelector, type AttributeValue } from "./AttributeSelector";
import { Trash2 } from "lucide-react";

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
  const locale = useLocale() as Locale;
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
      status: "draft" as any,
      is_featured: false,
      track_inventory: true,
    },
  });

  // Load product data when sheet opens
  useEffect(() => {
    if (open && product && activeLanguages.length > 0) {
      // Reset manual edit flags
      setSkuManuallyEdited(true); // Already has values, don't auto-generate

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
        image: product.image || "",
        quantity: product.quantity || 0,
        low_stock_threshold: product.low_stock_threshold || 10,
        status: product.status,
        is_featured: product.is_featured || false,
        track_inventory: product.track_inventory !== false,
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

  // Helper to get language name
  const getLanguageName = (lang: Language) => {
    if (typeof lang.name === "object" && lang.name !== null) {
      return lang.name[locale] || lang.name.en || lang.code;
    }
    return lang.name || lang.code;
  };

  const onSubmit = async (data: Partial<ProductCreateUpdateRequest>) => {
    if (!product?.id) return;

    try {
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

        // Validate: At least one language must be filled for name
        if (fieldName === "name" && !firstFilledValue) {
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

      await updateProduct.mutateAsync({
        id: product.id,
        data: productData as ProductCreateUpdateRequest,
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error("Failed to update product:", error);
      alert(error.message || "Failed to update product");
    }
  };

  const handleDelete = async () => {
    if (!product?.id) return;

    if (!confirm(t("deleteConfirm"))) {
      return;
    }

    try {
      await deleteProduct.mutateAsync(product.id);
      onOpenChange(false);
    } catch (error: any) {
      console.error("Failed to delete product:", error);
      alert(error.message || "Failed to delete product");
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

  if (!product) {
    return null;
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="p-0 w-full sm:max-w-lg" side="right">
        <ScrollArea className="h-full">
          <div className="p-6">
            <SheetHeader>
              <SheetTitle>Edit Product</SheetTitle>
              <SheetDescription>Update product information and attributes</SheetDescription>
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

                {/* SKU */}
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
                          <Input
                            type="number"
                            step="0.01"
                            placeholder={t("pricePlaceholder")}
                            {...field}
                          />
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
                        <FormLabel>{t("oldPrice")}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder={t("pricePlaceholder")}
                            {...field}
                          />
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
                          <Input
                            type="number"
                            step="0.01"
                            placeholder={t("pricePlaceholder")}
                            {...field}
                          />
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
                  <AttributeSelector value={attributes} onChange={setAttributes} />
                </div>

                {/* Status */}
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={String(field.value)}>
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

                <SheetFooter className="mt-6 flex justify-between">
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleteProduct.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {deleteProduct.isPending ? t("deleting") : t("deleteProduct")}
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onOpenChange(false)}
                    >
                      {tCommon("cancel")}
                    </Button>
                    <Button type="submit" disabled={updateProduct.isPending}>
                      {updateProduct.isPending ? t("saving") : t("saveChanges")}
                    </Button>
                  </div>
                </SheetFooter>
              </form>
            </Form>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
