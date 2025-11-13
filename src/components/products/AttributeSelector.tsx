"use client";

import { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
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

  // Fetch all active attributes
  const { data: attributesData } = useAttributes({} as any);

  const attributes = attributesData?.results || [];

  // Get attribute name in current locale
  const getAttributeName = (attribute: AttributeDefinition) => {
    if (typeof attribute.name === "object" && attribute.name !== null) {
      return (attribute.name as any)[locale] || (attribute.name as any).en || "Unnamed";
    }
    return attribute.name || "Unnamed";
  };

  // Get option label in current locale
  const getOptionLabel = (option: any) => {
    if (typeof option === "object" && option !== null) {
      return option[locale] || option.en || option.value || "Unnamed";
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
              placeholder={`Enter ${getAttributeName(attribute).toLowerCase()}`}
              value={currentValue || ""}
              onChange={(e) =>
                handleAttributeChange(attribute.id, attributeType, e.target.value)
              }
              disabled={disabled}
              className="flex-1"
            />
            {isSet && (
              <button
                type="button"
                onClick={() => handleRemoveAttribute(attribute.id)}
                className="text-muted-foreground hover:text-destructive"
                disabled={disabled}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        );

      case "number":
        return (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              step="any"
              placeholder={`Enter ${getAttributeName(attribute).toLowerCase()}`}
              value={currentValue || ""}
              onChange={(e) =>
                handleAttributeChange(attribute.id, attributeType, e.target.value)
              }
              disabled={disabled}
              className="flex-1"
            />
            {attribute.unit && (
              <span className="text-sm text-muted-foreground">{attribute.unit}</span>
            )}
            {isSet && (
              <button
                type="button"
                onClick={() => handleRemoveAttribute(attribute.id)}
                className="text-muted-foreground hover:text-destructive"
                disabled={disabled}
              >
                <X className="h-4 w-4" />
              </button>
            )}
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
            <span className="text-sm">{currentValue ? "Yes" : "No"}</span>
          </div>
        );

      case "select":
        if (!attribute.options || !Array.isArray(attribute.options)) {
          return <span className="text-sm text-muted-foreground">No options available</span>;
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
              <SelectTrigger className="flex-1">
                <SelectValue placeholder={`Select ${getAttributeName(attribute).toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {attribute.options.map((option: any, idx: number) => (
                  <SelectItem key={idx} value={option.value || String(idx)}>
                    {getOptionLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isSet && (
              <button
                type="button"
                onClick={() => handleRemoveAttribute(attribute.id)}
                className="text-muted-foreground hover:text-destructive"
                disabled={disabled}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        );

      case "multiselect":
        if (!attribute.options || !Array.isArray(attribute.options)) {
          return <span className="text-sm text-muted-foreground">No options available</span>;
        }
        const selectedValues = (currentValue as string[]) || [];
        return (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {selectedValues.map((val: string) => {
                const option = attribute.options?.find((opt: any) => opt.value === val);
                return (
                  <Badge key={val} variant="secondary">
                    {option ? getOptionLabel(option) : val}
                    <button
                      type="button"
                      onClick={() => {
                        const newValues = selectedValues.filter((v) => v !== val);
                        handleAttributeChange(attribute.id, attributeType, newValues);
                      }}
                      className="ml-1 hover:text-destructive"
                      disabled={disabled}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
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
              <SelectTrigger>
                <SelectValue placeholder="Add option" />
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
              className="w-20 h-10 p-1"
            />
            <Input
              type="text"
              value={currentValue || ""}
              onChange={(e) =>
                handleAttributeChange(attribute.id, attributeType, e.target.value)
              }
              placeholder="#000000"
              disabled={disabled}
              className="flex-1 font-mono"
            />
            {isSet && (
              <button
                type="button"
                onClick={() => handleRemoveAttribute(attribute.id)}
                className="text-muted-foreground hover:text-destructive"
                disabled={disabled}
              >
                <X className="h-4 w-4" />
              </button>
            )}
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
              className="flex-1"
            />
            {isSet && (
              <button
                type="button"
                onClick={() => handleRemoveAttribute(attribute.id)}
                className="text-muted-foreground hover:text-destructive"
                disabled={disabled}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        );

      default:
        return <span className="text-sm text-muted-foreground">Unknown type</span>;
    }
  };

  if (attributes.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4 border-2 border-dashed rounded-lg">
        No attributes available. Create attributes first.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-semibold">Product Attributes</Label>
        <p className="text-xs text-muted-foreground mt-1">
          Define specific characteristics for this product
        </p>
      </div>

      <div className="space-y-3">
        {attributes.map((attribute) => (
          <div
            key={attribute.id}
            className="border rounded-lg p-3 space-y-2 bg-muted/20"
          >
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">
                {getAttributeName(attribute)}
              </Label>
              {attribute.is_required && (
                <Badge variant="destructive" className="text-xs">
                  Required
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">
                {String(attribute.attribute_type)}
              </Badge>
            </div>
            {renderAttributeInput(attribute)}
          </div>
        ))}
      </div>
    </div>
  );
}
