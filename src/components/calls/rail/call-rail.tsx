"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronLeft, RotateCw, Volume2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CallError, SipState } from "@/contexts/call-types";
import { useCallingAccess } from "@/lib/calling-access";
import { useViewportIsMobile } from "@/hooks/use-mobile";
import { DOCK, announceDockPopoverOpened, onDockPopoverOpened, setCallRailWidth } from "@/components/TeamChat/floatingDock";
import { CallerContext } from "./caller-context";
import { SoftphonePanel } from "./softphone-panel";
import { useCallActions, useCallState } from "@/contexts/CallContext";

const SIP_LABEL: Record<SipState, "sipOff" | "sipConnecting" | "sipRegistered" | "sipReconnecting" | "sipFailed" | "sipOffline"> = {
  off: "sipOff",
  connecting: "sipConnecting",
  registered: "sipRegistered",
  reconnecting: "sipReconnecting",
  failed: "sipFailed",
  offline: "sipOffline",
};

const SIP_DOT: Record<SipState, string> = {
  off: "bg-muted-foreground/50",
  connecting: "bg-[#2563eb] motion-safe:animate-ed-blink",
  registered: "bg-ed-green",
  reconnecting: "bg-[#2563eb] motion-safe:animate-ed-blink",
  failed: "bg-destructive",
  offline: "bg-destructive",
};

const iconButton =
  "flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/**
 * SIP pill of the rail header. After the retries are exhausted (`failed`) or
 * while the browser is offline it becomes the Reconnect button.
 */
function RailSipStatus({ sipState, extension, onReconnect }: { sipState: SipState; extension?: string; onReconnect: () => void }) {
  const t = useTranslations("calls.rail");
  const label = t(SIP_LABEL[sipState]);
  const pill = "inline-flex h-6 min-w-0 shrink items-center gap-1.5 whitespace-nowrap rounded-full border pl-[7px] pr-2 text-xs text-muted-foreground";

  if (sipState === "failed" || sipState === "offline") {
    return (
      <button
        type="button"
        onClick={onReconnect}
        data-testid="call-rail-sip"
        data-state={sipState}
        aria-label={t("sipStatus", { status: label })}
        className={cn(pill, "hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring")}
      >
        <span className={cn("h-[7px] w-[7px] shrink-0 rounded-full", SIP_DOT[sipState])} aria-hidden />
        <span aria-hidden>{label}</span>
        <RotateCw className="h-3 w-3" aria-hidden />
        <span className="text-foreground">{t("reconnect")}</span>
      </button>
    );
  }

  return (
    <span role="status" aria-live="polite" aria-label={t("sipStatus", { status: label })} data-testid="call-rail-sip" data-state={sipState} className={pill}>
      <span className={cn("h-[7px] w-[7px] shrink-0 rounded-full", SIP_DOT[sipState])} aria-hidden />
      <span aria-hidden className="truncate">
        {label}
      </span>
      {extension && (
        <span className="font-mono text-foreground" aria-hidden>
          {t("ext", { ext: extension })}
        </span>
      )}
    </span>
  );
}

/** Translates a `CallError` (`calls.errors.<key>`, owned by CL-01); legacy string errors fall back to their text. */
function ErrorStrip({ error, onDismiss }: { error: CallError; onDismiss: () => void }) {
  const t = useTranslations("calls.rail");
  const te = useTranslations("calls.errors");
  const legacy = typeof error.params?.message === "string" ? error.params.message : null;
  const text = te.has(error.key) ? te(error.key, error.params) : legacy ?? t("errorUnknown");
  return (
    <div role="alert" title={text} className="mx-3 mt-3 flex items-start gap-2 rounded-md bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive" data-testid="call-rail-error" data-key={error.key}>
      <span className="line-clamp-2 min-w-0 flex-1 break-words">{text}</span>
      <button type="button" onClick={onDismiss} aria-label={t("dismiss")} className="shrink-0 rounded hover:bg-destructive/15">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/**
 * The call rail: a 320px column after `SidebarInset` on desktop (md+), a
 * full-screen sheet below. Header with the SIP pill / Reconnect, minimise
 * (only during a call) or close (only idle); error strip; sound-blocked
 * banner; the softphone; caller context during a call.
 *
 * Opening for dialling announces the `dialpad` dock popover (the chat list
 * closes); an opening chat list closes an idle rail. The dock shifts left by
 * the rail width on desktop (`setCallRailWidth`).
 */
export function CallRail() {
  const t = useTranslations("calls.rail");
  const { activeCall, sipState, activeSipConfig, error, rail, soundBlocked } = useCallState();
  const { closeRail, minimiseRail, reconnect, clearError, unlockSound } = useCallActions();
  const { canUseSoftphone } = useCallingAccess();
  // `undefined` on the first client render: nothing is painted and no dock
  // width is published until the breakpoint is known, so a phone never sees
  // the desktop column for a frame.
  const isMobile = useViewportIsMobile();

  const open = rail.mode === "open" && canUseSoftphone;
  const inCall = !!activeCall;
  const inCallRef = useRef(inCall);
  inCallRef.current = inCall;

  useEffect(() => {
    setCallRailWidth(open && isMobile === false ? DOCK.CALL_RAIL_WIDTH : 0);
    return () => setCallRailWidth(0);
  }, [open, isMobile]);

  // Only the transition to "open for dialling" announces the popover, so a
  // call ending inside an open rail doesn't close the chat list.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current && !inCallRef.current) announceDockPopoverOpened("dialpad");
    wasOpen.current = open;
  }, [open]);

  useEffect(
    () =>
      onDockPopoverOpened((opened) => {
        if (opened === "chat-list" && !inCallRef.current) closeRail();
      }),
    [closeRail]
  );

  // Escape closes the idle rail (desktop), like the old popup.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !inCallRef.current) closeRail();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, closeRail]);

  if (!open || isMobile === undefined) return null;

  const dismiss = inCall ? minimiseRail : closeRail;

  return (
    <aside
      data-testid="call-rail"
      data-layout={isMobile ? "sheet" : "rail"}
      aria-label={t("title")}
      {...(isMobile ? { role: "dialog", "aria-modal": true } : {})}
      className={cn(
        "flex flex-col text-foreground",
        isMobile ? "fixed inset-0 z-[47] bg-background" : "w-[320px] shrink-0 border-l bg-muted/35"
      )}
    >
      <div className="flex h-11 shrink-0 items-center gap-2 border-b px-3">
        {isMobile && (
          <button type="button" onClick={dismiss} aria-label={t("back")} title={t("back")} className={iconButton} data-testid="call-rail-back">
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
        <RailSipStatus
          sipState={sipState}
          extension={activeSipConfig?.username}
          onReconnect={() => {
            void reconnect();
          }}
        />
        <span className="ml-auto" />
        {inCall ? (
          <button type="button" onClick={minimiseRail} aria-label={t("minimize")} title={t("minimize")} className={iconButton} data-testid="call-rail-minimise">
            <ChevronDown className="h-4 w-4" />
          </button>
        ) : (
          <button type="button" onClick={closeRail} aria-label={t("close")} title={t("close")} className={iconButton} data-testid="call-rail-close">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
        {error && <ErrorStrip error={error} onDismiss={clearError} />}

        {soundBlocked && (
          <div className="mx-3 mt-3 flex items-center gap-2 rounded-md border bg-background px-2.5 py-1.5 text-xs" role="status" data-testid="call-rail-sound-blocked">
            <Volume2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <span className="min-w-0 flex-1">{t("soundBlocked")}</span>
            <button
              type="button"
              onClick={unlockSound}
              className="h-6 shrink-0 rounded-md bg-primary px-2 text-[11px] font-medium text-primary-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              data-testid="call-rail-enable-sound"
            >
              {t("enableSound")}
            </button>
          </div>
        )}

        <SoftphonePanel />

        {activeCall && <CallerContext call={activeCall} />}
      </div>
    </aside>
  );
}

export default CallRail;
