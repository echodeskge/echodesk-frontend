"use client";

import React, { useState, type KeyboardEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { Language } from "@/api/generated";
import { IdText, ecField, localizedText, rdButton } from "@/app/(tenant)/ecommerce/_components/ui";
import { cn } from "@/lib/utils";

export interface AttributeOption {
  value: string;
  [key: string]: string; // Language codes as keys
}

interface OptionsManagerProps {
  options: AttributeOption[];
  onChange: (options: AttributeOption[]) => void;
  languages: Language[];
  disabled?: boolean;
}

/**
 * Options of a multi-select attribute: a muted "new option" card (mono value
 * + a label per language, empty labels take the first one typed) and the
 * list of options as bordered rows (label, mono value, the other labels).
 * Enter (or Ctrl+Enter) in the new-option fields adds the option instead of
 * submitting the attribute form around it.
 */
export function OptionsManager({
  options,
  onChange,
  languages,
  disabled = false,
}: OptionsManagerProps) {
  const t = useTranslations("productAttributes.addAttributeSheet");
  const locale = useLocale();
  const [newOptionValue, setNewOptionValue] = useState("");
  const [newOptionLabels, setNewOptionLabels] = useState<Record<string, string>>({});

  // Initialize empty labels when languages change
  React.useEffect(() => {
    const emptyLabels: Record<string, string> = {};
    languages.forEach((lang) => {
      emptyLabels[lang.code] = "";
    });
    setNewOptionLabels(emptyLabels);
  }, [languages]);

  const addOption = () => {
    if (!newOptionValue.trim()) {
      toast.error(t("optionValueRequired"));
      return;
    }

    // Check if at least one language label is filled
    const hasAnyLabel = Object.values(newOptionLabels).some((label) => label.trim());
    if (!hasAnyLabel) {
      toast.error(t("optionLabelRequired"));
      return;
    }

    // Create new option with all language labels
    const newOption: AttributeOption = { value: newOptionValue.trim() };

    // Find first filled label for auto-fill
    let firstFilledLabel = "";
    for (const langCode of Object.keys(newOptionLabels)) {
      if (newOptionLabels[langCode]?.trim()) {
        firstFilledLabel = newOptionLabels[langCode].trim();
        break;
      }
    }

    // Set all language labels (auto-fill empty ones)
    languages.forEach((lang) => {
      const label = newOptionLabels[lang.code]?.trim();
      newOption[lang.code] = label || firstFilledLabel;
    });

    onChange([...options, newOption]);

    // Reset inputs
    setNewOptionValue("");
    const emptyLabels: Record<string, string> = {};
    languages.forEach((lang) => {
      emptyLabels[lang.code] = "";
    });
    setNewOptionLabels(emptyLabels);
  };

  const removeOption = (index: number) => {
    const newOptions = options.filter((_, i) => i !== index);
    onChange(newOptions);
  };

  const getLanguageName = (lang: Language) =>
    localizedText(lang.name as Parameters<typeof localizedText>[0], locale) || lang.code;

  const optionLabel = (option: AttributeOption) =>
    option[locale] || option.en || languages.map((lang) => option[lang.code]).find(Boolean) || option.value;

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      addOption();
    }
  };

  return (
    <div className="flex min-w-0 flex-col gap-3" data-testid="ec-options-manager">
      {/* New option */}
      <div className="flex min-w-0 flex-col gap-3 rounded-lg border bg-muted/40 p-3">
        <label className="flex min-w-0 flex-col gap-1.5">
          <span className="text-[13px] font-medium leading-4">{t("valueIdentifier")}</span>
          <Input
            placeholder={t("valueIdentifierPlaceholder")}
            value={newOptionValue}
            onChange={(e) => setNewOptionValue(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={disabled}
            className={cn(ecField.input, "bg-background font-mono")}
            data-testid="ec-option-value"
          />
        </label>

        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-[13px] font-medium leading-4">{t("labelsAllLanguages")}</span>
          <div className="grid min-w-0 gap-2 sm:grid-cols-2">
            {languages.map((lang) => (
              <label key={lang.code} className="flex min-w-0 flex-col gap-1">
                <span className="truncate text-xs text-muted-foreground">{getLanguageName(lang)}</span>
                <Input
                  placeholder={t("labelPlaceholder", { lang: getLanguageName(lang) })}
                  value={newOptionLabels[lang.code] || ""}
                  onChange={(e) =>
                    setNewOptionLabels({
                      ...newOptionLabels,
                      [lang.code]: e.target.value,
                    })
                  }
                  onKeyDown={onKeyDown}
                  disabled={disabled}
                  className={cn(ecField.input, "bg-background")}
                  data-testid={`ec-option-label-${lang.code}`}
                />
              </label>
            ))}
          </div>
          <span className="text-xs leading-4 text-muted-foreground">{t("fillAtLeastOneAutoFill")}</span>
        </div>

        <button
          type="button"
          onClick={addOption}
          disabled={disabled}
          className={cn(rdButton.outlineSm, "self-start")}
          data-testid="ec-option-add"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          {t("addOption")}
        </button>
      </div>

      {/* Existing options */}
      {options.length > 0 ? (
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">{t("addedOptions", { count: options.length })}</span>
          <div className="divide-y overflow-hidden rounded-lg border">
            {options.map((option, index) => {
              const others = languages
                .filter((lang) => option[lang.code])
                .map((lang) => `${lang.code.toUpperCase()}: ${option[lang.code]}`)
                .join(" · ");
              return (
                <div key={index} className="flex min-h-[34px] min-w-0 items-center gap-3 px-3 py-1.5" data-testid="ec-option-row">
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-baseline gap-2">
                      <span className="truncate text-[13px] font-medium">{optionLabel(option)}</span>
                      <IdText className="text-[11px] text-muted-foreground">{option.value}</IdText>
                    </div>
                    {others && <p className="truncate text-xs text-muted-foreground" title={others}>{others}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeOption(index)}
                    disabled={disabled}
                    className={cn(rdButton.ghostIconSm, "hover:text-destructive")}
                    aria-label={t("removeOption", { name: optionLabel(option) })}
                    title={t("removeOption", { name: optionLabel(option) })}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
          {t("noOptionsYet")}
        </div>
      )}
    </div>
  );
}
