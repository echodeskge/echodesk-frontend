"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, Delete } from "lucide-react";
import { cn } from "@/lib/utils";

interface DialPadProps {
  value: string;
  onChange: (value: string) => void;
  onCall: () => void;
  disabled?: boolean;
  dtmfMode?: boolean;
  onDTMF?: (tone: string) => void;
}

const TOP_THREE_ROWS: string[][] = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
];

const DTMF_BOTTOM_ROW = ["*", "0", "#"] as const;

export function DialPad({
  value,
  onChange,
  onCall,
  disabled,
  dtmfMode,
  onDTMF,
}: DialPadProps) {
  const t = useTranslations("calls");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyPress = (key: string) => {
    if (dtmfMode && onDTMF) {
      onDTMF(key);
    }
    onChange(value + key);
    inputRef.current?.focus();
  };

  const handleDelete = () => {
    onChange(value.slice(0, -1));
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (value) onCall();
    }
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        {/* iOS-style phone number display: borderless, centered, tracking */}
        <input
          ref={inputRef}
          type="tel"
          placeholder={t("enterPhoneNumber")}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className={cn(
            "w-full h-12 bg-transparent border-0 outline-none",
            "text-center text-3xl font-medium tracking-wide tabular-nums",
            "placeholder:text-sm placeholder:font-normal placeholder:tracking-normal",
            "placeholder:text-muted-foreground/50"
          )}
          disabled={disabled}
          autoFocus
          inputMode="tel"
        />

        <div className="grid grid-cols-3 gap-2">
          {TOP_THREE_ROWS.map((row) =>
            row.map((key) => (
              <Button
                key={key}
                variant="outline"
                size="lg"
                className="h-16 text-xl font-semibold"
                onClick={() => handleKeyPress(key)}
                onMouseDown={(e) => e.preventDefault()}
                disabled={disabled}
              >
                {key}
              </Button>
            ))
          )}

          {dtmfMode ? (
            // In DTMF mode keep *, 0, # — IVR menus rely on them.
            DTMF_BOTTOM_ROW.map((key) => (
              <Button
                key={key}
                variant="outline"
                size="lg"
                className="h-16 text-xl font-semibold"
                onClick={() => handleKeyPress(key)}
                onMouseDown={(e) => e.preventDefault()}
                disabled={disabled}
              >
                {key}
              </Button>
            ))
          ) : (
            <>
              {/* Left: delete-last-digit (was `*`) */}
              <Button
                variant="outline"
                size="lg"
                className="h-16"
                onClick={handleDelete}
                onMouseDown={(e) => e.preventDefault()}
                disabled={disabled || !value}
                aria-label={t("deleteDigit")}
              >
                <Delete className="h-5 w-5" />
              </Button>

              {/* Center: 0 */}
              <Button
                variant="outline"
                size="lg"
                className="h-16 text-xl font-semibold"
                onClick={() => handleKeyPress("0")}
                onMouseDown={(e) => e.preventDefault()}
                disabled={disabled}
              >
                0
              </Button>

              {/* Right: call (was `#`) */}
              <Button
                variant="default"
                size="lg"
                className="h-16 bg-green-600 hover:bg-green-700"
                onClick={onCall}
                onMouseDown={(e) => e.preventDefault()}
                disabled={disabled || !value}
                aria-label={t("call")}
              >
                <Phone className="h-5 w-5" />
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
