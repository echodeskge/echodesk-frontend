"use client";

import { useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useCall } from "@/contexts/CallContext";
import { useIncomingCallSidebar } from "@/contexts/IncomingCallSidebarContext";
import { DOCK, DOCK_PANEL_RIGHT, panelMaxHeight } from "@/components/TeamChat/floatingDock";
import { Softphone } from "./Softphone";
import { useSoftphoneData } from "./useSoftphoneData";

interface DialpadPopupProps {
  onClose: () => void;
}

/**
 * The softphone in the floating dock: opens beside the launcher column
 * (shared dock layout), so it never covers the launchers or minimized chat
 * bubbles. Team chat windows shift left while it is open.
 */
export function DialpadPopup({ onClose }: DialpadPopupProps) {
  const t = useTranslations("calls.phone");
  const call = useCall();
  const { activeCall } = call;
  const { openSidebar } = useIncomingCallSidebar();
  const { recents, matchedName } = useSoftphoneData(call.dialNumber, call.callEndedCounter, !activeCall);

  const popupRef = useRef<HTMLDivElement>(null);

  // Close on click outside (never during a call, never on the launcher).
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (activeCall) return;
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        const target = e.target as HTMLElement;
        if (target.closest("[data-dialpad-trigger]")) return;
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeCall, onClose]);

  // Escape closes the idle panel.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !activeCall) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [activeCall, onClose]);

  return (
    <div
      ref={popupRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby="softphone-title"
      className="fixed animate-in slide-in-from-bottom-2 duration-200"
      style={{
        right: DOCK_PANEL_RIGHT,
        bottom: DOCK.BOTTOM,
        zIndex: DOCK.Z_INDEX.popup,
        maxWidth: `calc(100vw - ${DOCK_PANEL_RIGHT + 8}px)`,
      }}
      data-testid="dialpad-popup-panel"
    >
      <div
        className="flex max-w-full flex-col overflow-y-auto overflow-x-hidden rounded-lg border bg-background text-foreground shadow-lg"
        style={{ width: DOCK.DIALPAD_PANEL_WIDTH, maxHeight: panelMaxHeight(DOCK.BOTTOM) }}
      >
        {/* Visually hidden dialog title (the SIP pill is the visible header). */}
        <h2 id="softphone-title" className="sr-only">
          {t("title")}
        </h2>
        <Softphone
          call={call}
          onClose={onClose}
          matchedName={matchedName}
          recents={recents}
          onShowDetails={() => {
            if (activeCall?.logId) openSidebar(activeCall.logId, activeCall.number, activeCall.callerName);
          }}
        />
      </div>
    </div>
  );
}
