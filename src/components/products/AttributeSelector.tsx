"use client";

import { useLocale, useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";
import { TonePill, humanize, localizedText, rdButton } from "@/app/(tenant)/ecommerce/_components/ui";
import { cn } from "@/lib/utils";
import { rhf } from "./form-kit";
import { useAttributes } from "@/hooks/useAttributes";
import type { AttributeDefinition } from "@/api/generated";
import type { Locale } from "@/lib/i18n";

export interface AttributeValue {
  attribute_id: number;
  value_text?: string;
  value_number?: string;
  value_boolean?: boolean;
  value_date?: string;
  value_json?: any;
}

interface AttributeSelectorProps {
  value: AttributeValue[];
  onChange: (attributes: AttributeValue[]) => void;
  disabled?: boolean;
}

export function AttributeSelector({
  value,
  onChange,
  disabled = false,
}: AttributeSelectorProps) {
  const locale = useLocale() as Locale;
  const t = useTranslations("products.attributeSelector");
  const tTypes = useTranslations("productAttributes.types");

  // Fetch all active attributes
  const { data: attributesData } = useAttributes({} as any);

  const attributes = attributesData?.results || [];

  // Get attribute name in current locale
  const getAttributeName = (attribute: AttributeDefinition) =>
    localizedText(attribute.name as Parameters<typeof localizedText>[0], locale) || attribute.key || t("unnamed");

  // Get option label in current locale
  const getOptionLabel = (option: any) => {
    if (typeof option === "object" && option !== null) {
      return option[locale] || option.en || option.value || t("unnamed");
    }
    return String(option);
  };

  // Handle value change for an attribute
  const handleAttributeChange = (
    attributeId: number,
    attributeType: string,
    newValue: any
  ) => {
    const existingIndex = value.findIndex((v) => v.attribute_id === attributeId);
    const newAttributes = [...value];

    // Create new attribute value object
    const attributeValue: AttributeValue = { attribute_id: attributeId };

    // Set value based on attribute type
    switch (String(attributeType)) {
      case "text":
      case "select":
        attributeValue.value_text = newValue;
        break;
      case "multiselect":
        // For multiselect, store as JSON array
        attributeValue.value_json = newValue;
        break;
      case "number":
        attributeValue.value_number = newValue;
        break;
      case "boolean":
        attributeValue.value_boolean = newValue;
        break;
      case "date":
        attributeValue.value_date = newValue;
        break;
      case "color":
        attributeValue.value_text = newValue;
        break;
    }

    if (existingIndex >= 0) {
      // Update existing attribute
      newAttributes[existingIndex] = attributeValue;
    } else {
      // Add new attribute
      newAttributes.push(attributeValue);
    }

    onChange(newAttributes);
  };

  // Remove an attribute value
  const handleRemoveAttribute = (attributeId: number) => {
    onChange(value.filter((v) => v.attribute_id !== attributeId));
  };

  // Get current value for an attribute
  const getAttributeValue = (attributeId: number, attributeType: string) => {
    const attr = value.find((v) => v.attribute_id === attributeId);
    if (!attr) return undefined;

    switch (String(attributeType)) {
      case "text":
      case "select":
      case "color":
        return attr.value_text;
      case "multiselect":
        return attr.value_json || [];
      case "number":
        return attr.value_number;
      case "boolean":
        return attr.value_boolean;
      case "date":
        return attr.value_date;
      default:
        return undefined;
    }
  };

  // Render input field based on attribute type
  const renderAttributeInput = (attribute: AttributeDefinition) => {
    const attributeType = String(attribute.attribute_type);
    const currentValue = getAttributeValue(attribute.id, attributeType);
    const isSet = value.some((v) => v.attribute_id === attribute.id);

    switch (attributeType) {
      case "text":
        return (
          <div className="flex items-center gap-2">
            <Input
              type="text"
              placeholder={t("valuePlaceholder")}
              value={currentValue || ""}
              onChange={(e) =>
                handleAttributeChange(attribute.id, attributeType, e.target.value)
              }
              disabled={disabled}
              className={cn(rhf.input, "min-w-0 flex-1")}
            />
            {isSet && clearButton(attribute)}
          </div>
        );

      case "number":
        return (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              step="any"
              placeholder={t("valuePlaceholder")}
              value={currentValue || ""}
              onChange={(e) =>
                handleAttributeChange(attribute.id, attributeType, e.target.value)
              }
              disabled={disabled}
              className={cn(rhf.input, "min-w-0 flex-1")}
            />
            {attribute.unit && (
              <span className="text-xs text-muted-foreground">{attribute.unit}</span>
            )}
            {isSet && clearButton(attribute)}
          </div>
        );

      case "boolean":
        return (
          <div className="flex items-center gap-2">
            <Checkbox
              checked={currentValue || false}
              onCheckedChange={(checked) =>
                handleAttributeChange(attribute.id, attributeType, checked)
              }
              disabled={disabled}
            />
            <span className="text-[13px]">{currentValue ? t("yes") : t("no")}</span>
          </div>
        );

      case "select":
        if (!attribute.options || !Array.isArray(attribute.options)) {
          return <span className="text-xs text-muted-foreground">{t("noOptions")}</span>;
        }
        return (
          <div className="flex items-center gap-2">
            <Select
              value={currentValue || ""}
              onValueChange={(val) =>
                handleAttributeChange(attribute.id, attributeType, val)
              }
              disabled={disabled}
            >
              <SelectTrigger className={cn(rhf.select, "min-w-0 flex-1")}>
                <SelectValue placeholder={t("choose")} />
              </SelectTrigger>
              <SelectContent>
                {attribute.options.map((option: any, idx: number) => (
                  <SelectItem key={idx} value={option.value || String(idx)}>
                    {getOptionLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isSet && clearButton(attribute)}
          </div>
        );

      case "multiselect":
        if (!attribute.options || !Array.isArray(attribute.options)) {
          return <span className="text-xs text-muted-foreground">{t("noOptions")}</span>;
        }
        const selectedValues = (currentValue as string[]) || [];
        return (
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex flex-wrap gap-1.5 empty:hidden">
              {selectedValues.map((val: string) => {
                const option = attribute.options?.find((opt: any) => opt.value === val);
                return (
                  <span
                    key={val}
                    className="inline-flex h-6 items-center gap-1 rounded-md border bg-muted/60 ps-2 pe-1 text-xs"
                  >
                    {option ? getOptionLabel(option) : val}
                    <button
                      type="button"
                      onClick={() => {
                        const newValues = selectedValues.filter((v) => v !== val);
                        handleAttributeChange(attribute.id, attributeType, newValues);
                      }}
                      className="inline-flex h-4 w-4 items-center justify-center rounded text-muted-foreground hover:bg-background hover:text-destructive"
                      disabled={disabled}
                      aria-label={t("removeValue", { value: option ? getOptionLabel(option) : val })}
                      title={t("removeValue", { value: option ? getOptionLabel(option) : val })}
                    >
                      <X className="h-3 w-3" aria-hidden />
                    </button>
                  </span>
                );
              })}
            </div>
            <Select
              value=""
              onValueChange={(val) => {
                if (!selectedValues.includes(val)) {
                  handleAttributeChange(attribute.id, attributeType, [
                    ...selectedValues,
                    val,
                  ]);
                }
              }}
              disabled={disabled}
            >
              <SelectTrigger className={rhf.select}>
                <SelectValue placeholder={t("addValue")} />
              </SelectTrigger>
              <SelectContent>
                {attribute.options
                  .filter((opt: any) => !selectedValues.includes(opt.value))
                  .map((option: any, idx: number) => (
                    <SelectItem key={idx} value={option.value || String(idx)}>
                      {getOptionLabel(option)}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        );

      case "color":
        return (
          <div className="flex items-center gap-2">
            <Input
              type="color"
              value={currentValue || "#000000"}
              onChange={(e) =>
                handleAttributeChange(attribute.id, attributeType, e.target.value)
              }
              disabled={disabled}
              className="h-[34px] w-14 shrink-0 p-1"
              aria-label={getAttributeName(attribute)}
            />
            <Input
              type="text"
              value={currentValue || ""}
              onChange={(e) =>
                handleAttributeChange(attribute.id, attributeType, e.target.value)
              }
              placeholder="#000000"
              disabled={disabled}
              className={cn(rhf.input, "min-w-0 flex-1 font-mono")}
            />
            {isSet && clearButton(attribute)}
          </div>
        );

      case "date":
        return (
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={currentValue || ""}
              onChange={(e) =>
                handleAttributeChange(attribute.id, attributeType, e.target.value)
              }
              disabled={disabled}
              className={cn(rhf.input, "min-w-0 flex-1")}
            />
            {isSet && clearButton(attribute)}
          </div>
        );

      default:
        return <span className="text-xs text-muted-foreground">{t("unsupported")}</span>;
    }
  };

  const clearButton = (attribute: AttributeDefinition) => (
    <button
      type="button"
      onClick={() => handleRemoveAttribute(attribute.id)}
      className={cn(rdButton.ghostIconSm, "hover:text-destructive")}
      disabled={disabled}
      aria-label={t("clear", { name: getAttributeName(attribute) })}
      title={t("clear", { name: getAttributeName(attribute) })}
    >
      <X className="h-3.5 w-3.5" aria-hidden />
    </button>
  );

  if (attributes.length === 0) {
    return (
      <div className="rounded-lg border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
        {t("empty")}
      </div>
    );
  }

  // One bordered list (the design's settings rows): name, required and type
  // on the left (above the control on phones), the value control on the right.
  return (
    <div className="divide-y overflow-hidden rounded-lg border" data-testid="ec-attribute-selector">
      {attributes.map((attribute) => {
        const type = String(attribute.attribute_type);
        return (
          <div
            key={attribute.id}
            className="grid min-w-0 gap-2 px-3 py-2.5 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)] sm:items-start sm:gap-4"
          >
            <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:min-h-[34px]">
              <span className="truncate text-[13px] font-medium">{getAttributeName(attribute)}</span>
              {attribute.is_required && <TonePill tone="danger">{t("required")}</TonePill>}
              <TonePill tone="neutral">{tTypes.has(type) ? tTypes(type) : humanize(type)}</TonePill>
            </div>
            <div className="min-w-0">{renderAttributeInput(attribute)}</div>
          </div>
        );
      })}
    </div>
  );
}
