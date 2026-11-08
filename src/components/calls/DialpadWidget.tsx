"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { Phone, PhoneMissed, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useCall } from "@/contexts/CallContext";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useIncomingCallSidebar } from "@/contexts/IncomingCallSidebarContext";
import { DialpadPopup } from "./DialpadPopup";
import {
  DOCK,
  DIALPAD_SLOT,
  dockSlotBottom,
  setDialpadPresent,
  setDialpadPanelOpen,
  announceDockPopoverOpened,
  onDockPopoverOpened,
} from "@/components/TeamChat/floatingDock";
import { IncomingCallNotification } from "./IncomingCallNotification";
import { DockBadge, DockDot, dockLauncherClass } from "./dock-launcher";

export type PhoneLauncherState = "in-call" | "ringing" | "ready" | "offline";

export function phoneLauncherState(opts: { hasActiveCall: boolean; isRinging: boolean; sipRegistered: boolean }): PhoneLauncherState {
  if (opts.isRinging) return "ringing";
  if (opts.hasActiveCall) return "in-call";
  return opts.sipRegistered ? "ready" : "offline";
}

const STATE_LABEL: Record<PhoneLauncherState, "phoneInCall" | "phoneRinging" | "phoneReady" | "phoneOffline"> = {
  "in-call": "phoneInCall",
  ringing: "phoneRinging",
  ready: "phoneReady",
  offline: "phoneOffline",
};

/**
 * The floating phone launcher (dock slot 1). Presentational.
 * - ringing: green with the ed-ring halo
 * - in call: green, red dot
 * - ready (SIP registered): green status dot
 * - missed calls: destructive count badge (replaces the dot)
 */
export function PhoneLauncher({
  state,
  open,
  missedCount,
  onClick,
}: {
  state: PhoneLauncherState;
  open: boolean;
  missedCount: number;
  onClick: () => void;
}) {
  const t = useTranslations("calls.dock");
  const green = state === "in-call" || state === "ringing";
  const label = [
    open ? t("closePhone") : t("openPhone"),
    t(STATE_LABEL[state]),
    missedCount > 0 ? t("missedCount", { count: missedCount }) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <button
      type="button"
      className={cn(dockLauncherClass(open), "fixed", green && "bg-ed-green text-white", state === "ringing" && "motion-safe:animate-ed-ring")}
      style={{
        right: DOCK.RIGHT,
        bottom: dockSlotBottom(DIALPAD_SLOT),
        zIndex: DOCK.Z_INDEX.launcher,
        width: DOCK.SLOT_SIZE,
        height: DOCK.SLOT_SIZE,
        ...(state === "ringing" ? ({ ["--ring-c" as string]: "var(--green)" } as CSSProperties) : null),
      }}
      onClick={onClick}
      aria-label={label}
      aria-expanded={open}
      aria-haspopup="dialog"
      title={label}
      data-dialpad-trigger
      data-phone-state={state}
    >
      <Phone className="h-4 w-4" aria-hidden />
      {missedCount > 0 ? (
        <DockBadge count={missedCount} testId="phone-missed-badge" />
      ) : state === "ready" ? (
        <DockDot className="bg-ed-green" testId="phone-ready-dot" />
      ) : state === "in-call" ? (
        <DockDot className="bg-destructive" testId="phone-in-call-dot" />
      ) : null}
    </button>
  );
}

/** Missed-call toast (top-right), restyled to the redesign toast pattern. */
export function MissedCallToast({
  number,
  time,
  onCallBack,
  onDismiss,
}: {
  number: string;
  time: Date;
  onCallBack: () => void;
  onDismiss: () => void;
}) {
  const t = useTranslations("calls.dock");
  return (
    <div
      role="status"
      aria-live="polite"
      className="w-full rounded-lg border bg-background p-3 text-foreground shadow-lg animate-in slide-in-from-top-2 duration-300"
      data-testid="missed-call-toast"
    >
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-destructive/12 text-destructive">
          <PhoneMissed className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium leading-5">{t("missedCall")}</p>
          <p className="truncate text-xs text-muted-foreground tabular-nums">
            {number} · {format(time, "HH:mm")}
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label={t("dismiss")}
          title={t("dismiss")}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <button
        type="button"
        onClick={onCallBack}
        className="mt-2.5 flex h-8 w-full items-center justify-center gap-1.5 rounded-md bg-ed-green text-[13px] font-medium text-white transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <Phone className="h-3.5 w-3.5" aria-hidden />
        {t("callBack")}
      </button>
    </div>
  );
}

export default function DialpadWidget() {
  const { user } = useAuth();
  const { data: userProfile } = useUserProfile();
  const {
    activeCall,
    sipRegistered,
    activeSipConfig,
    isDialpadOpen,
    toggleDialpad,
    setIsDialpadOpen,
    missedCall,
    clearMissedCall,
    setDialNumber,
  } = useCall();
  const { isOpen: sidebarOpen } = useIncomingCallSidebar();

  // The right-side call sidebar carries the same end/hold/mute/transfer
  // controls plus client context — when it opens, hide the bottom-right
  // popup so the user isn't seeing two stacked call UIs at once.
  useEffect(() => {
    if (sidebarOpen && isDialpadOpen) {
      setIsDialpadOpen(false);
    }
  }, [sidebarOpen, isDialpadOpen, setIsDialpadOpen]);

  // Check user's group-level feature keys (same as sidebar uses userProfile)
  const hasIpCalling = useMemo(() => {
    if (user?.is_staff || user?.is_superuser) return true;
    const profile = userProfile as Record<string, unknown> | undefined;
    if (!profile?.feature_keys) return false;
    let keys: string[] = [];
    if (typeof profile.feature_keys === "string") {
      try { keys = JSON.parse(profile.feature_keys); } catch { return false; }
    } else if (Array.isArray(profile.feature_keys)) {
      keys = profile.feature_keys;
    }
    return keys.includes("ip_calling");
  }, [user, userProfile]);

  const isVisible = hasIpCalling && !!activeSipConfig;
  const isPanelOpen = isVisible && isDialpadOpen && !sidebarOpen;
  const hasActiveCall = !!activeCall;

  // Missed calls since the phone was last opened (CallContext keeps only the
  // latest one, so the count lives here). Opening the phone clears it.
  const [missedCount, setMissedCount] = useState(0);
  const lastMissed = useRef<Date | null>(null);
  useEffect(() => {
    if (missedCall && missedCall.time !== lastMissed.current) {
      lastMissed.current = missedCall.time;
      setMissedCount((n) => n + 1);
    }
  }, [missedCall]);
  useEffect(() => {
    if (isPanelOpen) setMissedCount(0);
  }, [isPanelOpen]);

  // Tell the team chat dock whether the phone launcher occupies its slot, so
  // minimized chat bubbles stack above it instead of underneath.
  useEffect(() => {
    setDialpadPresent(isVisible);
    return () => setDialpadPresent(false);
  }, [isVisible]);

  // Chat windows shift left while the popup is open; the chat list closes.
  useEffect(() => {
    setDialpadPanelOpen(isPanelOpen);
    if (isPanelOpen) announceDockPopoverOpened("dialpad");
    return () => setDialpadPanelOpen(false);
  }, [isPanelOpen]);

  // Opening the team chat list closes the dialpad (kept open during a call).
  useEffect(
    () =>
      onDockPopoverOpened((opened) => {
        if (opened === "chat-list" && !hasActiveCall) setIsDialpadOpen(false);
      }),
    [hasActiveCall, setIsDialpadOpen]
  );

  // Don't render if user doesn't have ip_calling permission or no SIP config
  if (!isVisible) return null;

  const isRinging = activeCall?.direction === "incoming" && activeCall?.status === "ringing";

  return (
    <>
      {/* Call toasts, top-right on any page. Stacked so a new incoming
          call never covers (or hides under) an earlier missed-call toast. */}
      <div
        className="pointer-events-none fixed right-4 top-4 z-[60] flex w-72 max-w-[calc(100vw-2rem)] flex-col gap-2 [&>*]:pointer-events-auto"
        data-testid="call-toasts"
      >
        <IncomingCallNotification />

        {missedCall && (
          <MissedCallToast
            number={missedCall.number}
            time={missedCall.time}
            onDismiss={clearMissedCall}
            onCallBack={() => {
              setDialNumber(missedCall.number);
              setIsDialpadOpen(true);
              clearMissedCall();
            }}
          />
        )}
      </div>

      {/* Floating phone launcher — the dock slot directly above the
          TeamChat icon (shared layout in TeamChat/floatingDock). */}
      <PhoneLauncher
        state={phoneLauncherState({ hasActiveCall, isRinging, sipRegistered })}
        open={isPanelOpen}
        missedCount={missedCount}
        onClick={toggleDialpad}
      />

      {/* Dialpad popup — suppressed while the call sidebar is showing
          to avoid two overlapping call UIs. */}
      {isDialpadOpen && !sidebarOpen && (
        <DialpadPopup onClose={() => setIsDialpadOpen(false)} />
      )}
    </>
  );
}
