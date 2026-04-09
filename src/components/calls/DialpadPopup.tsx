"use client";

import { useRef, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DialPad } from "@/components/calls/DialPad";
import { ActiveCallDisplay } from "@/components/calls/ActiveCallDisplay";
import { SipStatusIndicator } from "@/components/calls/SipStatusIndicator";
import { useCall } from "@/contexts/CallContext";

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
      className="fixed z-[52] animate-in slide-in-from-bottom-2 duration-200"
      style={{ right: 24, bottom: 160 }}
    >
      <Card className="w-[300px] min-w-[300px] max-w-[300px] shadow-2xl border overflow-hidden">
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
            <ActiveCallDisplay
              phoneNumber={activeCall.number}
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
            />
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
