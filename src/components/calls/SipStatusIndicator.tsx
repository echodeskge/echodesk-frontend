"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export type SipState = "registered" | "connecting" | "disconnected";

export function sipState(isRegistered: boolean, isConnecting?: boolean): SipState {
  if (isConnecting) return "connecting";
  return isRegistered ? "registered" : "disconnected";
}

interface SipStatusIndicatorProps {
  isRegistered: boolean;
  isConnecting?: boolean;
  sipServer?: string;
  extension?: string;
  /** Dot only on narrow layouts (label + extension from sm up). */
  compact?: boolean;
  className?: string;
}

const DOT: Record<SipState, string> = {
  registered: "bg-ed-green",
  connecting: "bg-[#2563eb] motion-safe:animate-ed-blink",
  disconnected: "bg-destructive",
};

const LABEL_KEY: Record<SipState, "sipRegistered" | "sipConnecting" | "sipDisconnected"> = {
  registered: "sipRegistered",
  connecting: "sipConnecting",
  disconnected: "sipDisconnected",
};

/**
 * SIP registration pill (EchoDesk Redesign): coloured dot, state label and
 * the user's extension in mono. Non-interactive; announced politely when it
 * changes.
 */
export function SipStatusIndicator({ isRegistered, isConnecting, sipServer, extension, compact, className }: SipStatusIndicatorProps) {
  const t = useTranslations("calls.page");
  const state = sipState(isRegistered, isConnecting);
  const label = t(LABEL_KEY[state]);

  return (
    <span
      role="status"
      aria-live="polite"
      aria-label={t("sipStatus", { status: label })}
      data-sip-state={state}
      data-testid="sip-status"
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border pl-[7px] pr-2 text-xs font-normal text-muted-foreground",
        compact && "max-sm:w-6 max-sm:justify-center max-sm:px-0",
        className
      )}
    >
      <span className={cn("h-[7px] w-[7px] shrink-0 rounded-full", DOT[state])} aria-hidden />
      <span aria-hidden className={cn(compact && "hidden sm:inline")}>
        {label}
      </span>
      {extension && (
        <span className={cn("font-mono text-foreground", compact && "hidden sm:inline")} aria-hidden>
          {t("ext", { ext: extension })}
        </span>
      )}
      {sipServer && !compact && (
        <span className="hidden truncate md:inline" aria-hidden>
          · {sipServer}
        </span>
      )}
    </span>
  );
}
