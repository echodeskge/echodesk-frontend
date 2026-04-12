"use client";

import { Phone, PhoneOff, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCall } from "@/contexts/CallContext";
import { useIncomingCallSidebar } from "@/contexts/IncomingCallSidebarContext";

export function IncomingCallNotification() {
  const { activeCall, handleAcceptCall, handleRejectCall } = useCall();
  const { openSidebar } = useIncomingCallSidebar();

  if (!activeCall || activeCall.direction !== "incoming" || activeCall.status !== "ringing") {
    return null;
  }

  const handleViewDetails = () => {
    if (activeCall.logId) {
      openSidebar(activeCall.logId, activeCall.number, activeCall.callerName);
    }
  };

  return (
    <div className="fixed top-4 right-4 z-[60] animate-in slide-in-from-top-2 duration-300">
      <div className="bg-background border-2 border-green-500 rounded-lg shadow-2xl p-4 w-72">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center animate-pulse">
            <Phone className="h-5 w-5 text-green-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">
              {activeCall.callerName || "Incoming Call"}
            </p>
            <p className="text-sm text-muted-foreground">{activeCall.number}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={handleViewDetails}
            title="View caller details"
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleAcceptCall}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            size="sm"
          >
            <Phone className="h-4 w-4 mr-1" />
            Accept
          </Button>
          <Button
            onClick={handleRejectCall}
            variant="destructive"
            className="flex-1"
            size="sm"
          >
            <PhoneOff className="h-4 w-4 mr-1" />
            Decline
          </Button>
        </div>
      </div>
    </div>
  );
}
