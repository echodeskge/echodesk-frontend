"use client";

import { useForm } from "react-hook-form";
import { useLocale } from "next-intl";
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
import { useCreateAttribute } from "@/hooks/useAttributes";
import type { AttributeDefinition } from "@/api/generated";
import type { Locale } from "@/lib/i18n";

interface AddAttributeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddAttributeSheet({ open, onOpenChange }: AddAttributeSheetProps) {
  const locale = useLocale() as Locale;
  const createAttribute = useCreateAttribute();

  const form = useForm<Partial<AttributeDefinition>>({
    defaultValues: {
      name: { en: "", ka: "" },
      key: "",
      attribute_type: "text" as any,
      unit: "",
      is_required: false,
      is_variant_attribute: false,
      is_filterable: false,
      is_active: true,
      sort_order: 0,
    },
  });

  const onSubmit = async (data: Partial<AttributeDefinition>) => {
    try {
      // Auto-generate key from name if not provided
      if (!data.key && data.name) {
        const nameEn = typeof data.name === "object" ? data.name.en : data.name;
        data.key = nameEn
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/(^_|_$)/g, "");
      }

      await createAttribute.mutateAsync(data as AttributeDefinition);

      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Failed to create attribute:", error);
      alert(error.message || "Failed to create attribute");
    }
  };

  const attributeType = form.watch("attribute_type");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="p-0 w-full sm:max-w-lg" side="right">
        <ScrollArea className="h-full">
          <div className="p-6">
            <SheetHeader>
              <SheetTitle>Add New Attribute</SheetTitle>
              <SheetDescription>
                Create a custom attribute for your products
              </SheetDescription>
            </SheetHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 mt-6">
                {/* Attribute Name - Multilanguage */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name.en"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name (English)</FormLabel>
                        <FormControl>
                          <Input placeholder="Color" {...field} />
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
                        <FormLabel>Name (Georgian)</FormLabel>
                        <FormControl>
                          <Input placeholder="ფერი" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Key */}
                <FormField
                  control={form.control}
                  name="key"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Key (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="color" {...field} />
                      </FormControl>
                      <FormDescription>
                        Auto-generated from name if not provided
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Attribute Type */}
                <FormField
                  control={form.control}
                  name="attribute_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Attribute Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={String(field.value)}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="boolean">Boolean</SelectItem>
                          <SelectItem value="select">Select</SelectItem>
                          <SelectItem value="multiselect">Multi-select</SelectItem>
                          <SelectItem value="color">Color</SelectItem>
                          <SelectItem value="date">Date</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Unit (for number type) */}
                {String(attributeType) === "number" && (
                  <FormField
                    control={form.control}
                    name="unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit</FormLabel>
                        <FormControl>
                          <Input placeholder="kg, cm, etc." {...field} />
                        </FormControl>
                        <FormDescription>
                          Optional unit for numeric values
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Sort Order */}
                <FormField
                  control={form.control}
                  name="sort_order"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sort Order</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} />
                      </FormControl>
                      <FormDescription>
                        Controls display order (lower numbers first)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                          <FormLabel>Required</FormLabel>
                          <FormDescription>
                            This attribute must be filled for all products
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="is_variant_attribute"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Variant Attribute</FormLabel>
                          <FormDescription>
                            Use this attribute to create product variants
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
                          <FormLabel>Filterable</FormLabel>
                          <FormDescription>
                            Allow customers to filter products by this attribute
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
                          <FormLabel>Active</FormLabel>
                          <FormDescription>
                            Enable this attribute for use
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
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createAttribute.isPending}>
                    {createAttribute.isPending ? "Creating..." : "Create Attribute"}
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
