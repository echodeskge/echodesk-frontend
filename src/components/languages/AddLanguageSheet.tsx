"use client";

import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
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
import { Switch } from "@/components/ui/switch";
import { FormGrid, FormSection, FormSwitchRow, FormSheet } from "@/app/(tenant)/ecommerce/_components/ui";
import { rhf } from "@/components/products/form-kit";
import { useCreateLanguage, useUpdateLanguage } from "@/hooks/useLanguages";
import type { Language } from "@/api/generated";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/utils";

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
      // e.g. a code that already exists: show the API's reason (it was only logged).
      console.error("Failed to save language:", error);
      toast.error(getApiErrorMessage(error, t("saveFailed")));
    }
  };

  const saving = createLanguage.isPending || updateLanguage.isPending;

  return (
    <Form {...form}>
      <FormSheet
        open={open}
        onOpenChange={onOpenChange}
        title={isEditing ? t("editTitle") : t("title")}
        description={isEditing ? t("editDescription") : t("description")}
        size="md"
        testId="ec-language-sheet"
        onSubmit={() => void form.handleSubmit(onSubmit)()}
        submitting={saving}
        submitLabel={isEditing ? tCommon("save") : tCommon("create")}
        cancelLabel={tCommon("cancel")}
      >
        <FormSection>
          {/* Language Code */}
          <FormField
            control={form.control}
            name="code"
            rules={{ required: t("validation.codeRequired") }}
            render={({ field }) => (
              <FormItem className={rhf.item}>
                <FormLabel className={rhf.label}>
                  {t("code")}
                  <span aria-hidden className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder={t("codePlaceholder")}
                    maxLength={10}
                    disabled={isEditing && editingLanguage?.is_default}
                    className={`${rhf.input} max-w-[200px] font-mono`}
                  />
                </FormControl>
                <FormDescription className={rhf.help}>{t("codeHelp")}</FormDescription>
                <FormMessage className={rhf.message} />
              </FormItem>
            )}
          />

          <FormGrid>
            {/* Language Name - English */}
            <FormField
              control={form.control}
              name="name.en"
              rules={{ required: t("validation.nameEnRequired") }}
              render={({ field }) => (
                <FormItem className={rhf.item}>
                  <FormLabel className={rhf.label}>
                    {t("nameEn")}
                    <span aria-hidden className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={t("nameEnPlaceholder")} className={rhf.input} />
                  </FormControl>
                  <FormMessage className={rhf.message} />
                </FormItem>
              )}
            />

            {/* Language Name - Georgian */}
            <FormField
              control={form.control}
              name="name.ka"
              rules={{ required: t("validation.nameKaRequired") }}
              render={({ field }) => (
                <FormItem className={rhf.item}>
                  <FormLabel className={rhf.label}>
                    {t("nameKa")}
                    <span aria-hidden className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={t("nameKaPlaceholder")} className={rhf.input} />
                  </FormControl>
                  <FormMessage className={rhf.message} />
                </FormItem>
              )}
            />
          </FormGrid>

          {/* Sort Order */}
          <FormField
            control={form.control}
            name="sort_order"
            render={({ field }) => (
              <FormItem className={rhf.item}>
                <FormLabel className={rhf.label}>{t("sortOrder")}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    className={`${rhf.input} max-w-[120px] tabular-nums`}
                  />
                </FormControl>
                <FormDescription className={rhf.help}>{t("sortOrderHelp")}</FormDescription>
                <FormMessage className={rhf.message} />
              </FormItem>
            )}
          />
        </FormSection>

        <FormSection title={t("settings")}>
          {/* Is Default */}
          <FormField
            control={form.control}
            name="is_default"
            render={({ field }) => (
              <FormSwitchRow label={t("isDefault")} help={t("isDefaultHelp")} htmlFor="ec-language-default">
                <Switch id="ec-language-default" checked={field.value} onCheckedChange={field.onChange} />
              </FormSwitchRow>
            )}
          />

          {/* Is Active */}
          <FormField
            control={form.control}
            name="is_active"
            render={({ field }) => (
              <FormSwitchRow label={t("isActive")} help={t("isActiveHelp")} htmlFor="ec-language-active">
                <Switch id="ec-language-active" checked={field.value} onCheckedChange={field.onChange} />
              </FormSwitchRow>
            )}
          />
        </FormSection>
      </FormSheet>
    </Form>
  );
}
