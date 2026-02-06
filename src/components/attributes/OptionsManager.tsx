"use client";

import React, { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Language } from "@/api/generated";

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

export function OptionsManager({
  options,
  onChange,
  languages,
  disabled = false,
}: OptionsManagerProps) {
  const t = useTranslations("productAttributes.addAttributeSheet");
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
      alert("Please enter a value for the option");
      return;
    }

    // Check if at least one language label is filled
    const hasAnyLabel = Object.values(newOptionLabels).some((label) => label.trim());
    if (!hasAnyLabel) {
      alert("Please enter at least one language label");
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

  const getLanguageName = (lang: Language) => {
    if (typeof lang.name === "object" && lang.name !== null) {
      return (lang.name as any).en || lang.code;
    }
    return lang.name || lang.code;
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-semibold">{t("attributeOptions")}</Label>
        <p className="text-xs text-muted-foreground mt-1">
          {t("attributeOptionsDescription")}
        </p>
      </div>

      {/* Add New Option Form */}
      <Card className="bg-muted/30">
        <CardContent className="p-4 space-y-3">
          <div className="space-y-2">
            <Label className="text-xs font-semibold">{t("valueIdentifier")}</Label>
            <Input
              placeholder={t("valueIdentifierPlaceholder")}
              value={newOptionValue}
              onChange={(e) => setNewOptionValue(e.target.value)}
              disabled={disabled}
              className="font-mono text-sm"
            />
          </div>

          <div className="border-t pt-3 space-y-2">
            <Label className="text-xs font-semibold">{t("labelsAllLanguages")}</Label>
            {languages.map((lang) => (
              <div key={lang.code} className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  {getLanguageName(lang)} ({lang.code.toUpperCase()})
                </Label>
                <Input
                  placeholder={t("labelPlaceholder", { lang: lang.code })}
                  value={newOptionLabels[lang.code] || ""}
                  onChange={(e) =>
                    setNewOptionLabels({
                      ...newOptionLabels,
                      [lang.code]: e.target.value,
                    })
                  }
                  disabled={disabled}
                />
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              {t("fillAtLeastOneAutoFill")}
            </p>
          </div>

          <Button
            type="button"
            onClick={addOption}
            disabled={disabled}
            className="w-full"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("addOption")}
          </Button>
        </CardContent>
      </Card>

      {/* Existing Options List */}
      {options.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-semibold">{t("addedOptions", { count: options.length })}</Label>
          <div className="space-y-2">
            {options.map((option, index) => (
              <Card key={index}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {languages.map((lang) => option[lang.code]).find(Boolean) || option.value}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono truncate">
                        {option.value}
                      </div>
                      {/* Show all language labels as badges */}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {languages.map((lang) => {
                          if (option[lang.code]) {
                            return (
                              <Badge
                                key={lang.code}
                                variant="secondary"
                                className="text-xs"
                              >
                                {lang.code.toUpperCase()}: {option[lang.code]}
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
                      disabled={disabled}
                      className="shrink-0 h-8 w-8"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {options.length === 0 && (
        <div className="text-center py-8 text-sm text-muted-foreground border-2 border-dashed rounded-lg">
          {t("noOptionsYet")}
        </div>
      )}
    </div>
  );
}
