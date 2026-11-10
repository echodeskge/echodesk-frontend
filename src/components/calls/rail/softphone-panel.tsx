"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { Delete, Phone, PhoneOff, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { callInitials, sanitizeDial } from "../call-format";
import { useSoftphoneData, type RecentContact } from "../useSoftphoneData";
import { DIAL_KEYS, dialKeyTestId } from "./dial-keys";
import { InCallView } from "./in-call-view";
import { useCallActions, useCallState } from "@/contexts/CallContext";

interface DialPadViewProps {
  value: string;
  onChange: (value: string) => void;
  onCall: () => void;
  /** Placing a call is impossible (SIP not registered). Typing still works. */
  disabled?: boolean;
  matchedName?: string | null;
  recents?: RecentContact[];
}

/**
 * The idle softphone (spec: 28px/500 centred tel input, contact hint, 3-col
 * keypad with 52px keys, Delete / 44px green Call pill / Clear, RECENT rows).
 */
export function DialPadView({ value, onChange, onCall, disabled, matchedName, recents = [] }: DialPadViewProps) {
  const t = useTranslations("calls.rail");
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
    <div className="flex flex-1 flex-col gap-4 px-5 pb-4 pt-5" data-testid="call-rail-idle">
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
          data-testid="call-rail-dial"
          className={cn(
            "h-10 w-full border-0 bg-transparent text-center text-[28px] font-medium leading-9 tracking-[.04em] tabular-nums caret-transparent outline-none",
            "placeholder:text-base placeholder:font-normal placeholder:tracking-normal placeholder:text-muted-foreground"
          )}
        />
        <p className="min-h-4 text-xs text-muted-foreground" aria-live="polite" data-testid="call-rail-dial-hint">
          {hint}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2" role="group" aria-label={t("keypadLabel")}>
        {DIAL_KEYS.map(({ key, letters }) => (
          <button
            key={key}
            type="button"
            onClick={() => press(key)}
            onMouseDown={(e) => e.preventDefault()}
            className="flex h-[52px] flex-col items-center justify-center rounded-lg border bg-background shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-[background-color,transform] hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[.97]"
            data-dial-key={key}
            data-testid={dialKeyTestId(key)}
          >
            <span className="text-xl font-medium leading-6">{key}</span>
            <span className="min-h-2.5 text-[9px] leading-[10px] tracking-[.12em] text-muted-foreground" aria-hidden>
              {letters}
            </span>
          </button>
        ))}
      </div>

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
          data-testid="call-rail-call"
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
        <p className="text-center text-xs text-muted-foreground" data-testid="call-rail-not-registered">
          {t("notRegistered")}
        </p>
      )}

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
                  data-testid="call-rail-recent"
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

/** "Answered by {agent}" notice shown for 3 s after a ringall sibling took the call. */
function AnsweredElsewhere({ agent }: { agent?: string }) {
  const t = useTranslations("calls.rail");
  return (
    <div
      className="flex flex-1 flex-col items-center justify-center gap-3 px-5 py-10 text-center"
      role="status"
      aria-live="polite"
      data-testid="call-rail-answered-elsewhere"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <PhoneOff className="h-[18px] w-[18px]" aria-hidden />
      </span>
      <p className="text-sm font-medium">{agent ? t("answeredBy", { agent }) : t("answeredElsewhere")}</p>
    </div>
  );
}

/**
 * Switches between the idle dial pad and the in-call view. While the
 * provider holds an answered-elsewhere notice (it keeps it for a few
 * seconds after the sibling leg is torn down) the notice replaces both,
 * unless another call has started since.
 */
export function SoftphonePanel() {
  const { activeCall, dialNumber, callEndedCounter, sipState, answeredElsewhereNotice } = useCallState();
  const { setDialNumber, makeCall } = useCallActions();
  const idle = !activeCall;
  const { recents, matchedName } = useSoftphoneData(dialNumber, callEndedCounter, idle);

  const notice = answeredElsewhereNotice && (!activeCall || activeCall.id === answeredElsewhereNotice.callId) ? answeredElsewhereNotice : null;
  if (notice) return <AnsweredElsewhere />;
  if (activeCall) return <InCallView call={activeCall} />;

  return (
    <DialPadView
      value={dialNumber}
      onChange={setDialNumber}
      onCall={() => {
        void makeCall();
      }}
      disabled={sipState !== "registered"}
      matchedName={matchedName}
      recents={recents}
    />
  );
}
