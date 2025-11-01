"use client";

import { useForm } from "react-hook-form";
import { useEffect } from "react";
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
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCreateLanguage, useUpdateLanguage } from "@/hooks/useLanguages";
import type { Language } from "@/api/generated";
import type { Locale } from "@/lib/i18n";

interface AddLanguageSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingLanguage?: Language | null;
}

interface LanguageFormData {
  code: string;
  name: {
    en: string;
    ka: string;
  };
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
}

export function AddLanguageSheet({
  open,
  onOpenChange,
  editingLanguage,
}: AddLanguageSheetProps) {
  const locale = useLocale() as Locale;
  const t = useTranslations("languages.addLanguageSheet");
  const tCommon = useTranslations("common");
  const createLanguage = useCreateLanguage();
  const updateLanguage = useUpdateLanguage();

  const isEditing = !!editingLanguage;

  const form = useForm<LanguageFormData>({
    defaultValues: {
      code: "",
      name: { en: "", ka: "" },
      is_default: false,
      is_active: true,
      sort_order: 0,
    },
  });

  // Load editing language data
  useEffect(() => {
    if (editingLanguage && open) {
      const nameData =
        typeof editingLanguage.name === "object"
          ? editingLanguage.name
          : { en: String(editingLanguage.name), ka: String(editingLanguage.name) };

      form.reset({
        code: editingLanguage.code,
        name: {
          en: nameData.en || "",
          ka: nameData.ka || "",
        },
        is_default: editingLanguage.is_default,
        is_active: editingLanguage.is_active,
        sort_order: editingLanguage.sort_order,
      });
    } else if (!open) {
      form.reset({
        code: "",
        name: { en: "", ka: "" },
        is_default: false,
        is_active: true,
        sort_order: 0,
      });
    }
  }, [editingLanguage, open, form]);

  const onSubmit = async (data: LanguageFormData) => {
    try {
      if (isEditing) {
        await updateLanguage.mutateAsync({
          id: editingLanguage.id,
          data: {
            code: data.code,
            name: data.name,
            is_default: data.is_default,
            is_active: data.is_active,
            sort_order: data.sort_order,
          },
        });
      } else {
        await createLanguage.mutateAsync({
          code: data.code,
          name: data.name,
          is_default: data.is_default,
          is_active: data.is_active,
          sort_order: data.sort_order,
        });
      }

      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save language:", error);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="p-0 w-full sm:max-w-[600px]">
        <ScrollArea className="h-full">
          <div className="p-6">
            <SheetHeader>
              <SheetTitle>
                {isEditing ? t("editTitle") : t("title")}
              </SheetTitle>
              <SheetDescription>
                {isEditing ? t("editDescription") : t("description")}
              </SheetDescription>
            </SheetHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6">
                <div className="space-y-6">
                  {/* Language Code */}
                <FormField
                  control={form.control}
                  name="code"
                  rules={{ required: t("validation.codeRequired") }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("code")}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={t("codePlaceholder")}
                          maxLength={10}
                          disabled={isEditing && editingLanguage?.is_default}
                        />
                      </FormControl>
                      <FormDescription>{t("codeHelp")}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Language Name - English */}
                <FormField
                  control={form.control}
                  name="name.en"
                  rules={{ required: t("validation.nameEnRequired") }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("nameEn")}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={t("nameEnPlaceholder")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Language Name - Georgian */}
                <FormField
                  control={form.control}
                  name="name.ka"
                  rules={{ required: t("validation.nameKaRequired") }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("nameKa")}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={t("nameKaPlaceholder")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Sort Order */}
                <FormField
                  control={form.control}
                  name="sort_order"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("sortOrder")}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value) || 0)
                          }
                        />
                      </FormControl>
                      <FormDescription>{t("sortOrderHelp")}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Is Default */}
                <FormField
                  control={form.control}
                  name="is_default"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          {t("isDefault")}
                        </FormLabel>
                        <FormDescription>
                          {t("isDefaultHelp")}
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

                {/* Is Active */}
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          {t("isActive")}
                        </FormLabel>
                        <FormDescription>
                          {t("isActiveHelp")}
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
                </div>

                <SheetFooter className="gap-2 pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                  >
                    {tCommon("cancel")}
                  </Button>
                  <Button
                    type="submit"
                    disabled={createLanguage.isPending || updateLanguage.isPending}
                  >
                    {isEditing ? tCommon("save") : tCommon("create")}
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
