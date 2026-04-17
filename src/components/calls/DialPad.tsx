"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Phone, PhoneOff, Delete } from "lucide-react";

interface DialPadProps {
  value: string;
  onChange: (value: string) => void;
  onCall: () => void;
  disabled?: boolean;
  dtmfMode?: boolean;
  onDTMF?: (tone: string) => void;
  /**
   * Optional "decline / end call" handler rendered in the bottom-right
   * action slot. When omitted, an invisible placeholder keeps the layout
   * balanced (used in DTMF mode where there is no separate decline button).
   */
  onDecline?: () => void;
  /** When true, the decline button is rendered as disabled. */
  declineDisabled?: boolean;
}

// null cells render as invisible spacers to keep the 3-column grid layout.
const DIAL_PAD_KEYS: (string | null)[][] = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  [null, "0", null],
];

export function DialPad({
  value,
  onChange,
  onCall,
  disabled,
  dtmfMode,
  onDTMF,
  onDecline,
  declineDisabled,
}: DialPadProps) {
  const t = useTranslations("calls");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyPress = (key: string) => {
    if (dtmfMode && onDTMF) {
      onDTMF(key);
      onChange(value + key);
    } else {
      onChange(value + key);
    }
    // Keep keyboard focus on the input so the user can continue typing
    // digits after clicking a keypad button.
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
        <div className="space-y-2">
          <Input
            ref={inputRef}
            type="tel"
            placeholder={t("enterPhoneNumber")}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="text-center text-2xl h-14"
            disabled={disabled}
            autoFocus
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          {DIAL_PAD_KEYS.map((row, rowIndex) =>
            row.map((key, colIndex) =>
              key === null ? (
                <div key={`spacer-${rowIndex}-${colIndex}`} />
              ) : (
                <Button
                  key={key}
                  variant="outline"
                  size="lg"
                  className="h-16 text-xl font-semibold"
                  onClick={() => handleKeyPress(key)}
                  disabled={disabled}
                  // Prevent the button from stealing focus; keyboard typing
                  // should stay targeted at the tel input above.
                  onMouseDown={(e) => e.preventDefault()}
                >
                  {key}
                </Button>
              )
            )
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="outline"
            size="lg"
            className="h-14"
            onClick={handleDelete}
            onMouseDown={(e) => e.preventDefault()}
            disabled={disabled || !value}
          >
            <Delete className="h-5 w-5" />
          </Button>
          <Button
            variant="default"
            size="lg"
            className="h-14 bg-green-600 hover:bg-green-700"
            onClick={onCall}
            onMouseDown={(e) => e.preventDefault()}
            disabled={disabled || !value}
          >
            <Phone className="h-5 w-5 mr-2" />
            {t("call")}
          </Button>
          {onDecline ? (
            <Button
              variant="destructive"
              size="lg"
              className="h-14"
              onClick={onDecline}
              onMouseDown={(e) => e.preventDefault()}
              disabled={disabled || declineDisabled}
            >
              <PhoneOff className="h-5 w-5 mr-2" />
              {t("endCall")}
            </Button>
          ) : (
            <div />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
