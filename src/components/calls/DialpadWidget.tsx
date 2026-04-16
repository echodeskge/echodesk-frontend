"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Phone, PhoneMissed, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { useCall } from "@/contexts/CallContext";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { DialpadPopup } from "./DialpadPopup";
import { IncomingCallNotification } from "./IncomingCallNotification";

export default function DialpadWidget() {
  const t = useTranslations("calls");
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

  // Don't render if user doesn't have ip_calling permission or no SIP config
  if (!hasIpCalling || !activeSipConfig) return null;

  const hasActiveCall = !!activeCall;
  const isRinging = activeCall?.direction === "incoming" && activeCall?.status === "ringing";

  return (
    <>
      {/* Incoming call notification (renders at top-right on any page) */}
      <IncomingCallNotification />

      {/* Missed call notification */}
      {missedCall && (
        <div className="fixed top-4 right-4 z-[60] animate-in slide-in-from-top-2 duration-300">
          <div className="bg-background border-2 border-red-500 rounded-lg shadow-2xl p-4 w-72">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <PhoneMissed className="h-5 w-5 text-red-500" />
                <p className="text-sm font-semibold">{t("missedCall")}</p>
              </div>
              <button onClick={clearMissedCall} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-1">{missedCall.number}</p>
            <p className="text-xs text-muted-foreground mb-2">{format(missedCall.time, "h:mm a")}</p>
            <Button
              size="sm"
              className="w-full bg-green-600 hover:bg-green-700"
              onClick={() => {
                setDialNumber(missedCall.number);
                setIsDialpadOpen(true);
                clearMissedCall();
              }}
            >
              <Phone className="h-4 w-4 mr-1" />
              {t("callBack")}
            </Button>
          </div>
        </div>
      )}

      {/* Floating phone icon button — stacked above TeamChat icon.
          Bottom 10 + size 28 + gap 6 = 44 for the second slot. */}
      <div
        className="fixed z-50 cursor-pointer"
        style={{ right: 10, bottom: 44 }}
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
          style={{ width: 28, height: 28 }}
        >
          <Phone className={cn("h-3.5 w-3.5 text-primary-foreground", hasActiveCall && "animate-pulse")} />

          {/* SIP registered indicator */}
          {sipRegistered && !hasActiveCall && (
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-500 border border-background" />
          )}

          {/* Active call pulse */}
          {hasActiveCall && !isRinging && (
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500 border border-background animate-pulse" />
          )}

          {/* Ringing indicator */}
          {isRinging && (
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500 border border-background" />
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
