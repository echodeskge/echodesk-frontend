"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { Eye, Phone, PhoneIncoming, PhoneOff } from "lucide-react";
import { useCall } from "@/contexts/CallContext";
import { useIncomingCallSidebar } from "@/contexts/IncomingCallSidebarContext";
import { callInitials } from "./call-format";

const AUTO_DISMISS_MS = 30000; // Auto-dismiss after 30 seconds

/**
 * Incoming-call toast (top-right stack in DialpadWidget, every page): caller, Accept / Decline and
 * "caller details". Announced to screen readers (role="alert"). Hides after
 * 30s; the call keeps ringing in the softphone.
 */
export function IncomingCallNotification() {
  const t = useTranslations("calls");
  const { activeCall, handleAcceptCall, handleRejectCall } = useCall();
  const { openSidebar } = useIncomingCallSidebar();
  const [dismissed, setDismissed] = useState(false);

  // Auto-dismiss after 30 seconds
  useEffect(() => {
    if (activeCall?.direction === "incoming" && activeCall.status === "ringing") {
      setDismissed(false);
      const timer = setTimeout(() => setDismissed(true), AUTO_DISMISS_MS);
      return () => clearTimeout(timer);
    }
  }, [activeCall?.id, activeCall?.status, activeCall?.direction]);

  if (
    !activeCall ||
    activeCall.direction !== "incoming" ||
    activeCall.status !== "ringing" ||
    dismissed
  ) {
    return null;
  }

  const handleViewDetails = () => {
    if (activeCall.logId) {
      openSidebar(activeCall.logId, activeCall.number, activeCall.callerName);
    }
  };

  const caller = activeCall.callerName || activeCall.number;
  const ring = { ["--ring-c" as string]: "var(--green)" } as CSSProperties;

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-label={t("phone.incomingFrom", { caller })}
      className="w-full rounded-lg border bg-background p-3 text-foreground shadow-lg animate-in slide-in-from-top-2 duration-300"
      data-testid="incoming-call-toast"
    >
      <div className="mb-3 flex items-center gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ed-green/12 text-sm font-semibold text-ed-green motion-safe:animate-ed-ring"
          style={ring}
          aria-hidden
        >
          {activeCall.callerName ? callInitials(activeCall.callerName) : <Phone className="h-4 w-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-[.04em] text-muted-foreground">
            <PhoneIncoming className="h-3 w-3" aria-hidden />
            {t("phone.incomingCall")}
          </p>
          <p className="truncate text-[13px] font-semibold leading-5">{activeCall.callerName || t("phone.unknownCaller")}</p>
          <p className="truncate text-xs text-muted-foreground tabular-nums">{activeCall.number}</p>
        </div>
        <button
          type="button"
          onClick={handleViewDetails}
          title={t("callDetail.viewDetails")}
          aria-label={t("callDetail.viewDetails")}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Eye className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={handleRejectCall}
          className="flex h-8 items-center justify-center gap-1.5 rounded-md bg-destructive text-[13px] font-medium text-white transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <PhoneOff className="h-3.5 w-3.5" aria-hidden />
          {t("decline")}
        </button>
        <button
          type="button"
          onClick={handleAcceptCall}
          className="flex h-8 items-center justify-center gap-1.5 rounded-md bg-ed-green text-[13px] font-medium text-white transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Phone className="h-3.5 w-3.5" aria-hidden />
          {t("accept")}
        </button>
      </div>
    </div>
  );
}
