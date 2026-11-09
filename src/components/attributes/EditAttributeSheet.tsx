"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Form } from "@/components/ui/form";
import { toast } from "sonner";
import { useUpdateAttribute } from "@/hooks/useAttributes";
import { useLanguages } from "@/hooks/useLanguages";
import { type AttributeOption } from "./OptionsManager";
import type { AttributeDefinition } from "@/api/generated";
import { getApiErrorMessage } from "@/lib/utils";
import { EcLoading, FormSheet } from "@/app/(tenant)/ecommerce/_components/ui";
import { AttributeFormSections } from "./AttributeFormSections";

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
  const t = useTranslations("productAttributes.addAttributeSheet");
  const tCommon = useTranslations("common");
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
          toast.error(t("nameRequired"));
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
          toast.error(t("optionsInvalid"));
          return;
        }

        data.options = options as any;
      } else if (String(attributeType) === "multiselect") {
        // Require at least one option for multiselect type
        toast.error(t("optionsRequired"));
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
      toast.error(getApiErrorMessage(error, t("updateFailed")));
    }
  };

  // Show loading state while fetching languages
  if (languagesLoading || activeLanguages.length === 0) {
    return (
      <FormSheet open={open} onOpenChange={onOpenChange} title={t("editTitle")} description={t("editDescription")} size="lg" testId="ec-attribute-edit-sheet">
        <EcLoading className="py-16" />
      </FormSheet>
    );
  }

  if (!attribute) {
    return null;
  }

  return (
    <Form {...form}>
      <FormSheet
        open={open}
        onOpenChange={onOpenChange}
        title={t("editTitle")}
        description={t("editDescription")}
        size="lg"
        testId="ec-attribute-edit-sheet"
        onSubmit={() => void form.handleSubmit(onSubmit)()}
        submitting={updateAttribute.isPending}
        submitLabel={updateAttribute.isPending ? t("saving") : t("saveChanges")}
        cancelLabel={tCommon("cancel")}
      >
        <AttributeFormSections
          form={form}
          languages={activeLanguages}
          editing
          options={options}
          onOptionsChange={setOptions}
        />
      </FormSheet>
    </Form>
  );
}
