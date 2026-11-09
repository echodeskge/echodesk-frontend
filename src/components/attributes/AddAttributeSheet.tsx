"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Form } from "@/components/ui/form";
import { toast } from "sonner";
import { useCreateAttribute } from "@/hooks/useAttributes";
import { useLanguages } from "@/hooks/useLanguages";
import type { AttributeDefinition } from "@/api/generated";
import { getApiErrorMessage } from "@/lib/utils";
import { EcLoading, FormSheet } from "@/app/(tenant)/ecommerce/_components/ui";
import { AttributeFormSections } from "./AttributeFormSections";
import type { AttributeOption } from "./OptionsManager";

interface AddAttributeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddAttributeSheet({ open, onOpenChange }: AddAttributeSheetProps) {
  const t = useTranslations("productAttributes.addAttributeSheet");
  const tCommon = useTranslations("common");
  const createAttribute = useCreateAttribute();

  // Fetch active languages
  const { data: languagesData, isLoading: languagesLoading } = useLanguages({
    ordering: "sort_order,code",
  });

  const activeLanguages = languagesData?.results || [];


  // Options state (for select/multiselect types)
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

  // Build initial default values with dynamic languages
  const buildDefaultValues = (): Partial<AttributeDefinition> => {
    const nameObj: Record<string, string> = {};

    activeLanguages.forEach((lang) => {
      nameObj[lang.code] = "";
    });

    return {
      name: nameObj as any,
      key: "",
      attribute_type: "multiselect" as any,
      unit: "",
      is_required: false,
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
    }
  }, [open, activeLanguages.length]);

  // Watch all name fields to auto-generate key from first filled language
  const nameValues = form.watch("name");

  // Auto-generate key from first filled language name
  useEffect(() => {
    if (open && nameValues && typeof nameValues === "object" && !form.getValues("key")) {
      // Find first non-empty name value
      const firstFilledName = Object.values(nameValues).find((val) => typeof val === 'string' && val?.trim());
      if (firstFilledName && typeof firstFilledName === 'string') {
        const generatedKey = firstFilledName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/(^_|_$)/g, "");
        form.setValue("key", generatedKey);
      }
    }
  }, [nameValues, open, form]);

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
          toast.error(t("nameRequired"));
          return;
        }

        activeLanguages.forEach((lang) => {
          if (!nameData[lang.code]?.trim()) {
            nameData[lang.code] = firstFilledValue;
          }
        });
      }

      // Auto-generate key if not provided (use first filled name value)
      if (!data.key && data.name) {
        const nameData = data.name as Record<string, string>;
        const firstFilledName = typeof nameData === "object"
          ? Object.values(nameData).find((val) => val?.trim())
          : data.name;
        if (firstFilledName) {
          data.key = firstFilledName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/(^_|_$)/g, "");
        }
      }

      // Validate key is required
      if (!data.key?.trim()) {
        toast.error(t("keyRequired"));
        return;
      }

      // Handle options for multiselect type
      if (String(attributeType) === "multiselect") {
        if (options.length === 0) {
          toast.error(t("optionsRequired"));
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
      toast.error(getApiErrorMessage(error, t("createFailed")));
    }
  };

  if (languagesLoading || activeLanguages.length === 0) {
    return (
      <FormSheet open={open} onOpenChange={onOpenChange} title={t("title")} description={t("description")} size="lg" testId="ec-attribute-add-sheet">
        <EcLoading className="py-16" />
      </FormSheet>
    );
  }

  return (
    <Form {...form}>
      <FormSheet
        open={open}
        onOpenChange={onOpenChange}
        title={t("title")}
        description={t("description")}
        size="lg"
        testId="ec-attribute-add-sheet"
        onSubmit={() => void form.handleSubmit(onSubmit)()}
        submitting={createAttribute.isPending}
        submitLabel={createAttribute.isPending ? t("creating") : t("createAttribute")}
        cancelLabel={tCommon("cancel")}
      >
        <AttributeFormSections
          form={form}
          languages={activeLanguages}
          options={options}
          onOptionsChange={setOptions}
          onTypeChange={(value) => {
            if (value !== "multiselect") setOptions([]);
          }}
        />
      </FormSheet>
    </Form>
  );
}
