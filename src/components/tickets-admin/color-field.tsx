"use client";

import { useEffect, useId, useState } from "react";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { COLOR_SWATCHES, isHexColor } from "./colors";

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
  disabled?: boolean;
  /** Reports whether the typed hex is valid, so the form can block submit. */
  onValidityChange?: (valid: boolean) => void;
}

/**
 * 26px round swatches (the design's settings swatches) plus a free hex field.
 * The hex field only reports a colour upwards once it is a full `#rrggbb`.
 */
export function ColorField({ label, value, onChange, disabled, onValidityChange }: ColorFieldProps) {
  const t = useTranslations("tickets.boardAdmin");
  const hexId = useId();
  const [hex, setHex] = useState(value);

  useEffect(() => {
    setHex(value);
  }, [value]);

  const hexValid = isHexColor(hex);
  useEffect(() => {
    onValidityChange?.(hexValid);
  }, [hexValid, onValidityChange]);

  const current = value.toLowerCase();

  return (
    <div className="grid gap-2">
      <span className="text-[13px] font-medium">{label}</span>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
        {COLOR_SWATCHES.map((c) => {
          const active = c === current;
          return (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={c}
              title={c}
              disabled={disabled}
              onClick={() => onChange(c)}
              className={cn(
                "flex size-[26px] cursor-pointer items-center justify-center rounded-full outline-none transition-shadow",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                "disabled:cursor-not-allowed disabled:opacity-50",
                active && "ring-2 ring-foreground/70 ring-offset-2 ring-offset-background",
              )}
              style={{ backgroundColor: c }}
            >
              {active && <Check className="size-[13px] text-white" aria-hidden />}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="size-[18px] shrink-0 rounded-full border"
          style={{ backgroundColor: hexValid ? hex : "transparent" }}
        />
        <Label htmlFor={hexId} className="sr-only">
          {t("color.hex")}
        </Label>
        <Input
          id={hexId}
          value={hex}
          disabled={disabled}
          maxLength={7}
          spellCheck={false}
          autoComplete="off"
          placeholder="#3b82f6"
          aria-invalid={!hexValid}
          aria-describedby={hexValid ? undefined : `${hexId}-err`}
          className="h-[34px] w-32 font-mono text-[13px]"
          onChange={(e) => {
            let next = e.target.value.trim();
            if (next && !next.startsWith("#")) next = `#${next}`;
            setHex(next);
            if (isHexColor(next)) onChange(next.toLowerCase());
          }}
        />
        <span className="text-xs text-muted-foreground">{t("color.hex")}</span>
      </div>
      {!hexValid && (
        <p id={`${hexId}-err`} className="text-xs text-destructive">
          {t("color.invalid")}
        </p>
      )}
    </div>
  );
}
