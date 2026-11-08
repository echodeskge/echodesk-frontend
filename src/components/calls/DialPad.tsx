"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { Delete, Phone, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { callInitials, sanitizeDial } from "./call-format";

/** Keypad keys in display order with their letters (EchoDesk Redesign). */
export const DIAL_KEYS: ReadonlyArray<{ key: string; letters: string }> = [
  { key: "1", letters: "" },
  { key: "2", letters: "ABC" },
  { key: "3", letters: "DEF" },
  { key: "4", letters: "GHI" },
  { key: "5", letters: "JKL" },
  { key: "6", letters: "MNO" },
  { key: "7", letters: "PQRS" },
  { key: "8", letters: "TUV" },
  { key: "9", letters: "WXYZ" },
  { key: "*", letters: "" },
  { key: "0", letters: "+" },
  { key: "#", letters: "" },
];

export interface RecentContact {
  name: string;
  number: string;
}

interface DialPadProps {
  value: string;
  onChange: (value: string) => void;
  onCall: () => void;
  /** Placing a call is impossible (SIP not registered). Typing still works. */
  disabled?: boolean;
  /** Name of the contact matching the dialled number, if any. */
  matchedName?: string | null;
  /** Up to three recent named contacts; clicking one puts its number in the display. */
  recents?: RecentContact[];
}

/**
 * The idle softphone: number display, keypad, Delete / Call / Clear and the
 * recent contacts list. Presentational: the dialled number lives in
 * CallContext (`dialNumber`) and is passed in.
 */
export function DialPad({ value, onChange, onCall, disabled, matchedName, recents = [] }: DialPadProps) {
  const t = useTranslations("calls.phone");
  const inputRef = useRef<HTMLInputElement>(null);
  const hasValue = value.length > 0;
  const canCall = hasValue && !disabled;

  const focusInput = () => inputRef.current?.focus();

  const press = (key: string) => {
    onChange(value + key);
    focusInput();
  };

  const hint = !hasValue ? "" : matchedName || t("unknownNumber");

  return (
    <div className="flex flex-1 flex-col gap-4 px-5 pb-4 pt-5" data-testid="softphone-idle">
      {/* display */}
      <div className="flex min-h-16 flex-col items-center justify-center gap-1">
        <input
          ref={inputRef}
          type="tel"
          inputMode="tel"
          autoFocus
          autoComplete="off"
          aria-label={t("numberLabel")}
          placeholder={t("enterNumber")}
          value={value}
          onChange={(e) => onChange(sanitizeDial(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (canCall) onCall();
            }
          }}
          className={cn(
            "h-10 w-full border-0 bg-transparent text-center text-[28px] font-medium leading-9 tracking-[.04em] tabular-nums caret-transparent outline-none",
            "placeholder:text-base placeholder:font-normal placeholder:tracking-normal placeholder:text-muted-foreground"
          )}
        />
        <p className="min-h-4 text-xs text-muted-foreground" aria-live="polite" data-testid="dial-hint">
          {hint}
        </p>
      </div>

      {/* keypad */}
      <div className="grid grid-cols-3 gap-2" role="group" aria-label={t("keypadLabel")}>
        {DIAL_KEYS.map(({ key, letters }) => (
          <button
            key={key}
            type="button"
            onClick={() => press(key)}
            onMouseDown={(e) => e.preventDefault()}
            className="flex h-[52px] flex-col items-center justify-center rounded-lg border bg-background shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-[background-color,transform] hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[.97]"
            data-dial-key={key}
          >
            <span className="text-xl font-medium leading-6">{key}</span>
            <span className="min-h-2.5 text-[9px] leading-[10px] tracking-[.12em] text-muted-foreground" aria-hidden>
              {letters}
            </span>
          </button>
        ))}
      </div>

      {/* actions */}
      <div className="grid grid-cols-[52px_1fr_52px] gap-2">
        <button
          type="button"
          onClick={() => {
            onChange(value.slice(0, -1));
            focusInput();
          }}
          onMouseDown={(e) => e.preventDefault()}
          disabled={!hasValue}
          aria-label={t("deleteDigit")}
          title={t("deleteDigit")}
          className="flex h-11 items-center justify-center rounded-lg text-muted-foreground transition-opacity hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-0"
        >
          <Delete className="h-[18px] w-[18px]" />
        </button>
        <button
          type="button"
          onClick={onCall}
          onMouseDown={(e) => e.preventDefault()}
          disabled={!canCall}
          className="flex h-11 items-center justify-center gap-2 rounded-full bg-ed-green text-sm font-semibold text-white transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          data-testid="softphone-call"
        >
          <Phone className="h-4 w-4" />
          {t("call")}
        </button>
        <button
          type="button"
          onClick={() => {
            onChange("");
            focusInput();
          }}
          onMouseDown={(e) => e.preventDefault()}
          disabled={!hasValue}
          aria-label={t("clear")}
          title={t("clear")}
          className="flex h-11 items-center justify-center rounded-lg text-muted-foreground transition-opacity hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-0"
        >
          <X className="h-[18px] w-[18px]" />
        </button>
      </div>

      {disabled && (
        <p className="text-center text-xs text-muted-foreground" data-testid="softphone-not-registered">
          {t("notRegistered")}
        </p>
      )}

      {/* recent */}
      {recents.length > 0 && (
        <div className="mt-auto flex flex-col gap-1.5">
          <p className="text-[11px] font-medium uppercase tracking-[.04em] text-muted-foreground">{t("recent")}</p>
          <ul className="flex flex-col">
            {recents.slice(0, 3).map((r) => (
              <li key={r.number}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(r.number);
                    focusInput();
                  }}
                  className="flex h-9 w-full items-center gap-2.5 rounded-md px-2 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  data-testid="softphone-recent"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[9px] font-semibold text-primary">
                    {callInitials(r.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium leading-4">{r.name}</span>
                    <span className="block truncate text-[11px] leading-[14px] text-muted-foreground tabular-nums">{r.number}</span>
                  </span>
                  <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
