"use client";

import { useRef, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DialPad } from "@/components/calls/DialPad";
import { ActiveCallDisplay } from "@/components/calls/ActiveCallDisplay";
import { SipStatusIndicator } from "@/components/calls/SipStatusIndicator";
import { useCall } from "@/contexts/CallContext";
import { DOCK, DOCK_PANEL_RIGHT, panelMaxHeight } from "@/components/TeamChat/floatingDock";

interface DialpadPopupProps {
  onClose: () => void;
}

export function DialpadPopup({ onClose }: DialpadPopupProps) {
  const {
    activeCall,
    callDuration,
    sipRegistered,
    sipConnecting,
    activeSipConfig,
    dialNumber,
    setDialNumber,
    makeCall,
    handleAcceptCall,
    handleRejectCall,
    handleEndCall,
    handleToggleHold,
    handleToggleMute,
    sendDTMF,
    transferCall,
    startAttendedTransfer,
    completeTransfer,
    cancelTransfer,
    mergeConference,
    error,
  } = useCall();

  const popupRef = useRef<HTMLDivElement>(null);

  // Close on click outside (unless active call)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (activeCall) return; // Don't close during active call
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        // Check if click is on the dialpad widget button itself
        const target = e.target as HTMLElement;
        if (target.closest('[data-dialpad-trigger]')) return;
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeCall, onClose]);

  return (
    <div
      ref={popupRef}
      className="fixed animate-in slide-in-from-bottom-2 duration-200"
      // Opens beside the launcher column (shared dock layout), so it never
      // covers the launchers or minimized chat bubbles. Team chat windows
      // shift left while it is open.
      style={{
        right: DOCK_PANEL_RIGHT,
        bottom: DOCK.BOTTOM,
        zIndex: DOCK.Z_INDEX.popup,
        maxWidth: `calc(100vw - ${DOCK_PANEL_RIGHT + 8}px)`,
      }}
    >
      <Card
        className="w-[300px] max-w-full shadow-2xl border overflow-x-hidden overflow-y-auto"
        style={{ maxHeight: panelMaxHeight(DOCK.BOTTOM) }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b">
          <SipStatusIndicator
            isRegistered={sipRegistered}
            isConnecting={sipConnecting}
            extension={activeSipConfig?.username}
            compact
          />
          {!activeCall && (
            <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Content */}
        <div className="p-3">
          {error && (
            <div className="mb-3 p-2 text-xs text-destructive bg-destructive/10 rounded line-clamp-2 break-words">
              {error}
            </div>
          )}

          {activeCall ? (
            <>
              <ActiveCallDisplay
                phoneNumber={activeCall.number}
                callerName={activeCall.callerName}
                direction={activeCall.direction}
                status={activeCall.status as "ringing" | "connecting" | "active" | "ending"}
                duration={callDuration}
                isOnHold={activeCall.isOnHold}
                isMuted={activeCall.isMuted}
                onAccept={handleAcceptCall}
                onReject={handleRejectCall}
                onEndCall={handleEndCall}
                onToggleHold={handleToggleHold}
                onToggleMute={handleToggleMute}
                onTransfer={async (num) => { try { await transferCall(num); } catch {} }}
                transferPhase={activeCall.transferPhase}
                consultationCall={activeCall.consultationCall}
                onStartAttendedTransfer={async (num, name) => { try { await startAttendedTransfer(num, name); } catch {} }}
                onCompleteTransfer={async () => { try { await completeTransfer(); } catch {} }}
                onCancelTransfer={async () => { try { await cancelTransfer(); } catch {} }}
                onMergeConference={async () => { try { await mergeConference(); } catch {} }}
              />
              {activeCall.status === "active" && (
                <div className="mt-3 border-t pt-3">
                  <DialPad
                    value={dialNumber}
                    onChange={setDialNumber}
                    onCall={() => {}}
                    disabled={false}
                    dtmfMode
                    onDTMF={sendDTMF}
                  />
                </div>
              )}
            </>
          ) : (
            <DialPad
              value={dialNumber}
              onChange={setDialNumber}
              onCall={makeCall}
              disabled={!sipRegistered}
            />
          )}
        </div>
      </Card>
    </div>
  );
}
