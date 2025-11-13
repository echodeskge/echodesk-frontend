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
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useCreateAttribute } from "@/hooks/useAttributes";
import { useLanguages } from "@/hooks/useLanguages";
import type { AttributeDefinition, Language } from "@/api/generated";
import type { Locale } from "@/lib/i18n";

interface AttributeOption {
  value: string;
  [key: string]: string; // Language codes as keys
}

interface AddAttributeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddAttributeSheet({ open, onOpenChange }: AddAttributeSheetProps) {
  const locale = useLocale() as Locale;
  const t = useTranslations("productAttributes.addAttributeSheet");
  const tCommon = useTranslations("common");
  const tTypes = useTranslations("productAttributes.types");
  const createAttribute = useCreateAttribute();

  // Fetch active languages
  const { data: languagesData, isLoading: languagesLoading } = useLanguages({
    ordering: "sort_order,code",
  });

  const activeLanguages = languagesData?.results || [];

  // Selected language for name field and options
  const [selectedLanguage, setSelectedLanguage] = useState<string>("ka");

  // Options state (for select/multiselect types)
  const [options, setOptions] = useState<AttributeOption[]>([]);
  const [newOptionValue, setNewOptionValue] = useState("");
  const [newOptionLabel, setNewOptionLabel] = useState("");

  const form = useForm<Partial<AttributeDefinition>>({
    defaultValues: {
      name: {},
      key: "",
      attribute_type: "text" as any,
      unit: "",
      is_required: false,
      is_variant_attribute: false,
      is_filterable: true,
      is_active: true,
      sort_order: 0,
      options: [],
    },
  });

  const attributeType = form.watch("attribute_type");

  // Build initial default values with dynamic languages
  const buildDefaultValues = (): Partial<AttributeDefinition> => {
    const nameObj: Record<string, string> = {};

    activeLanguages.forEach((lang) => {
      nameObj[lang.code] = "";
    });

    return {
      name: nameObj as any,
      key: "",
      attribute_type: "text" as any,
      unit: "",
      is_required: false,
      is_variant_attribute: false,
      is_filterable: true,
      is_active: true,
      sort_order: 0,
      options: [],
    };
  };

  // Reset form when sheet opens
  useEffect(() => {
    if (open && activeLanguages.length > 0) {
      form.reset(buildDefaultValues());
      setOptions([]);
      setNewOptionValue("");
      setNewOptionLabel("");
      const kaLang = activeLanguages.find((l) => l.code === "ka");
      setSelectedLanguage(kaLang ? "ka" : activeLanguages[0]?.code || "ka");
    }
  }, [open, activeLanguages.length]);

  // Watch the selected language's name field to auto-generate key
  const selectedLangName = form.watch(`name.${selectedLanguage}` as any);

  // Auto-generate key from selected language name
  useEffect(() => {
    if (selectedLangName && open && selectedLanguage && !form.getValues("key")) {
      const generatedKey = selectedLangName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/(^_|_$)/g, "");
      form.setValue("key", generatedKey);
    }
  }, [selectedLangName, open, selectedLanguage, form]);

  // Helper to get language name
  const getLanguageName = (lang: Language) => {
    if (typeof lang.name === "object" && lang.name !== null) {
      return (lang.name as any)[locale] || (lang.name as any).en || lang.code;
    }
    return lang.name || lang.code;
  };

  // Add new option
  const handleAddOption = () => {
    if (!newOptionValue.trim()) {
      alert("Please enter a value for the option");
      return;
    }

    if (!newOptionLabel.trim()) {
      alert(`Please enter a label in ${selectedLanguage.toUpperCase()}`);
      return;
    }

    // Create new option with all languages initialized
    const newOption: AttributeOption = { value: newOptionValue.trim() };
    activeLanguages.forEach((lang) => {
      newOption[lang.code] = lang.code === selectedLanguage ? newOptionLabel.trim() : "";
    });

    // Auto-fill other languages with the entered label
    activeLanguages.forEach((lang) => {
      if (lang.code !== selectedLanguage) {
        newOption[lang.code] = newOptionLabel.trim();
      }
    });

    setOptions([...options, newOption]);
    setNewOptionValue("");
    setNewOptionLabel("");
  };

  // Remove option
  const removeOption = (index: number) => {
    const newOptions = options.filter((_, i) => i !== index);
    setOptions(newOptions);
  };

  // Get option label for display
  const getOptionLabel = (option: AttributeOption) => {
    return option[selectedLanguage] || option[locale] || option.value;
  };

  const onSubmit = async (data: Partial<AttributeDefinition>) => {
    try {
      // Auto-fill name
      const nameData = data.name as Record<string, string>;
      if (nameData && typeof nameData === "object") {
        let firstFilledValue = "";
        for (const langCode of Object.keys(nameData)) {
          if (nameData[langCode]?.trim()) {
            firstFilledValue = nameData[langCode];
            break;
          }
        }

        if (!firstFilledValue) {
          alert("Please fill at least one language for the attribute name");
          return;
        }

        activeLanguages.forEach((lang) => {
          if (!nameData[lang.code]?.trim()) {
            nameData[lang.code] = firstFilledValue;
          }
        });
      }

      // Auto-generate key if not provided
      if (!data.key && data.name) {
        const nameEn =
          typeof data.name === "object"
            ? (data.name as any)[selectedLanguage] || (data.name as any).en
            : data.name;
        data.key = nameEn
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/(^_|_$)/g, "");
      }

      // Handle options for select types
      if (
        String(attributeType) === "select" ||
        String(attributeType) === "multiselect"
      ) {
        if (options.length === 0) {
          alert("Please add at least one option for select/multiselect types");
          return;
        }
        data.options = options as any;
      } else {
        data.options = [];
      }

      await createAttribute.mutateAsync(data as AttributeDefinition);

      form.reset(buildDefaultValues());
      setOptions([]);
      onOpenChange(false);
    } catch (error: any) {
      console.error("Failed to create attribute:", error);
      alert(error.message || "Failed to create attribute");
    }
  };

  if (languagesLoading || activeLanguages.length === 0) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="p-0 w-full sm:max-w-4xl" side="right">
          <div className="flex items-center justify-center h-full">
            <div className="text-sm text-muted-foreground">Loading languages...</div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  const showOptionsSection =
    String(attributeType) === "select" || String(attributeType) === "multiselect";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="p-0 w-full sm:max-w-4xl"
        side="right"
      >
        <div className="flex h-full">
          {/* Main Form */}
          <div className="flex-1 border-r">
            <ScrollArea className="h-full">
              <div className="p-6">
                <SheetHeader>
                  <SheetTitle>{t("title")}</SheetTitle>
                  <SheetDescription>{t("description")}</SheetDescription>
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

                    {/* Attribute Name */}
                    <FormField
                      control={form.control}
                      name={`name.${selectedLanguage}` as any}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {t("nameEn")} ({selectedLanguage.toUpperCase()})
                          </FormLabel>
                          <FormControl>
                            <Input placeholder={t("namePlaceholder")} {...field} />
                          </FormControl>
                          <FormDescription>
                            Fill in at least one language. Others will be auto-filled.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Key */}
                    <FormField
                      control={form.control}
                      name="key"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("keyLabel")}</FormLabel>
                          <FormControl>
                            <Input placeholder={t("keyPlaceholder")} {...field} />
                          </FormControl>
                          <FormDescription>{t("keyDescription")}</FormDescription>
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
                          <FormLabel>{t("attributeType")}</FormLabel>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(value);
                              if (value !== "select" && value !== "multiselect") {
                                setOptions([]);
                              }
                            }}
                            defaultValue={String(field.value)}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t("selectType")} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="text">{tTypes("text")}</SelectItem>
                              <SelectItem value="number">{tTypes("number")}</SelectItem>
                              <SelectItem value="boolean">{tTypes("boolean")}</SelectItem>
                              <SelectItem value="select">{tTypes("select")}</SelectItem>
                              <SelectItem value="multiselect">
                                {tTypes("multiselect")}
                              </SelectItem>
                              <SelectItem value="color">{tTypes("color")}</SelectItem>
                              <SelectItem value="date">{tTypes("date")}</SelectItem>
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

                    {/* Sort Order */}
                    <FormField
                      control={form.control}
                      name="sort_order"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("sortOrder")}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder={t("sortOrderPlaceholder")}
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>{t("sortOrderDescription")}</FormDescription>
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
                              <FormLabel>{t("requiredLabel")}</FormLabel>
                              <FormDescription>{t("requiredDescription")}</FormDescription>
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
                              <FormLabel>{t("variantAttributeLabel")}</FormLabel>
                              <FormDescription>
                                {t("variantAttributeDescription")}
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
                              <FormDescription>{t("activeDescription")}</FormDescription>
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
                      <Button type="submit" disabled={createAttribute.isPending}>
                        {createAttribute.isPending ? t("creating") : t("createAttribute")}
                      </Button>
                    </SheetFooter>
                  </form>
                </Form>
              </div>
            </ScrollArea>
          </div>

          {/* Sidebar for Options */}
          {showOptionsSection && (
            <div className="w-80 bg-muted/30">
              <ScrollArea className="h-full">
                <div className="p-6 space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Attribute Values</h3>
                    <p className="text-sm text-muted-foreground">
                      Add values for this {String(attributeType)} attribute
                    </p>
                  </div>

                  <Separator />

                  {/* Add New Option Form */}
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Value (identifier)</Label>
                      <Input
                        placeholder="e.g., red, large, cotton"
                        value={newOptionValue}
                        onChange={(e) => setNewOptionValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddOption();
                          }
                        }}
                        className="font-mono text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">
                        Label ({selectedLanguage.toUpperCase()})
                      </Label>
                      <Input
                        placeholder={`Label in ${selectedLanguage}`}
                        value={newOptionLabel}
                        onChange={(e) => setNewOptionLabel(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddOption();
                          }
                        }}
                      />
                    </div>

                    <Button
                      type="button"
                      onClick={handleAddOption}
                      className="w-full"
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Value
                    </Button>
                  </div>

                  <Separator />

                  {/* Options List */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold">
                        Values ({options.length})
                      </h4>
                    </div>

                    {options.length === 0 ? (
                      <div className="text-center py-8 text-sm text-muted-foreground border-2 border-dashed rounded-lg">
                        No values added yet
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {options.map((option, index) => (
                          <Card key={index} className="p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 space-y-1 min-w-0">
                                <div className="text-sm font-medium truncate">
                                  {getOptionLabel(option)}
                                </div>
                                <div className="text-xs text-muted-foreground font-mono truncate">
                                  {option.value}
                                </div>
                                {/* Show other languages as badges */}
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {activeLanguages.map((lang) => {
                                    if (
                                      option[lang.code] &&
                                      lang.code !== selectedLanguage
                                    ) {
                                      return (
                                        <Badge
                                          key={lang.code}
                                          variant="secondary"
                                          className="text-xs"
                                        >
                                          {lang.code}: {option[lang.code]}
                                        </Badge>
                                      );
                                    }
                                    return null;
                                  })}
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeOption(index)}
                                className="shrink-0 h-8 w-8"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
