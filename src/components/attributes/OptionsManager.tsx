"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const [selectedLanguage, setSelectedLanguage] = useState<string>(
    languages[0]?.code || "en"
  );

  const addOption = () => {
    const newOption: AttributeOption = { value: "" };
    // Initialize all language fields
    languages.forEach((lang) => {
      newOption[lang.code] = "";
    });
    onChange([...options, newOption]);
  };

  const removeOption = (index: number) => {
    const newOptions = options.filter((_, i) => i !== index);
    onChange(newOptions);
  };

  const updateOption = (index: number, field: string, value: string) => {
    const newOptions = [...options];
    newOptions[index] = { ...newOptions[index], [field]: value };
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
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Attribute Options</Label>
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">Language:</Label>
          <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {languages.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  {getLanguageName(lang)} ({lang.code.toUpperCase()})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-3">
        {options.map((option, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1 space-y-3">
                  {/* Value field (always visible as identifier) */}
                  <div className="grid gap-2">
                    <Label className="text-xs text-muted-foreground">
                      Value (identifier)
                    </Label>
                    <Input
                      placeholder="e.g., red, blue, large"
                      value={option.value || ""}
                      onChange={(e) =>
                        updateOption(index, "value", e.target.value)
                      }
                      disabled={disabled}
                      className="font-mono text-sm"
                    />
                  </div>

                  {/* Label in selected language */}
                  <div className="grid gap-2">
                    <Label className="text-xs text-muted-foreground">
                      Label ({selectedLanguage.toUpperCase()})
                    </Label>
                    <Input
                      placeholder={`Label in ${selectedLanguage}`}
                      value={option[selectedLanguage] || ""}
                      onChange={(e) =>
                        updateOption(index, selectedLanguage, e.target.value)
                      }
                      disabled={disabled}
                    />
                  </div>

                  {/* Show all filled languages as badges */}
                  <div className="flex flex-wrap gap-1">
                    {languages.map((lang) => {
                      if (option[lang.code] && lang.code !== selectedLanguage) {
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
                  className="shrink-0"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {options.length === 0 && (
        <div className="text-center py-8 text-sm text-muted-foreground border-2 border-dashed rounded-lg">
          No options added yet. Click the button below to add options.
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        onClick={addOption}
        disabled={disabled}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Option
      </Button>
    </div>
  );
}
