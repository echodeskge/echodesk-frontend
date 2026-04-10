"use client";

import { useMemo } from "react";
import { Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCall } from "@/contexts/CallContext";
import { useAuth } from "@/contexts/AuthContext";
import { DialpadPopup } from "./DialpadPopup";
import { IncomingCallNotification } from "./IncomingCallNotification";

export default function DialpadWidget() {
  const { user } = useAuth();
  const {
    activeCall,
    sipRegistered,
    activeSipConfig,
    isDialpadOpen,
    toggleDialpad,
    setIsDialpadOpen,
  } = useCall();

  // Check user's group-level feature keys (same as sidebar)
  const userFeatureKeys = useMemo(() => {
    const profile = user as any;
    if (!profile?.feature_keys) return [];
    if (typeof profile.feature_keys === "string") {
      try { return JSON.parse(profile.feature_keys); } catch { return []; }
    }
    return Array.isArray(profile.feature_keys) ? profile.feature_keys : [];
  }, [user]);

  const isStaffOrAdmin = user?.is_staff || user?.is_superuser;
  const hasIpCalling = isStaffOrAdmin || userFeatureKeys.includes("ip_calling");

  // Don't render if user doesn't have ip_calling permission or no SIP config
  if (!hasIpCalling || !activeSipConfig) return null;

  const hasActiveCall = !!activeCall;
  const isRinging = activeCall?.direction === "incoming" && activeCall?.status === "ringing";

  return (
    <>
      {/* Incoming call notification (renders at top-right on any page) */}
      <IncomingCallNotification />

      {/* Floating phone icon button — positioned above TeamChat (bottom: 24 + 56 + 12 = 92px) */}
      <div
        className="fixed z-50 cursor-pointer"
        style={{ right: 24, bottom: 92 }}
        data-dialpad-trigger
        onClick={toggleDialpad}
      >
        <div
          className={cn(
            "relative flex items-center justify-center rounded-full shadow-lg transition-all duration-200",
            isDialpadOpen
              ? "bg-primary/90 scale-95"
              : hasActiveCall
                ? "bg-green-600 hover:bg-green-700 hover:scale-105"
                : "bg-primary hover:bg-primary/90 hover:scale-105"
          )}
          style={{ width: 56, height: 56 }}
        >
          <Phone className={cn("h-6 w-6 text-primary-foreground", hasActiveCall && "animate-pulse")} />

          {/* SIP registered indicator */}
          {sipRegistered && !hasActiveCall && (
            <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-green-500 border-2 border-background" />
          )}

          {/* Active call pulse */}
          {hasActiveCall && !isRinging && (
            <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-red-500 border-2 border-background animate-pulse" />
          )}

          {/* Ringing indicator */}
          {isRinging && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500 border-2 border-background" />
            </span>
          )}
        </div>
      </div>

      {/* Dialpad popup */}
      {isDialpadOpen && (
        <DialpadPopup onClose={() => setIsDialpadOpen(false)} />
      )}
    </>
  );
}
