"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useCall } from "@/contexts/CallContext";

interface IncomingCallSidebarContextType {
  isOpen: boolean;
  callLogId: number | null;
  phoneNumber: string | null;
  clientName: string | null;
  openSidebar: (callLogId: number, phoneNumber: string, clientName?: string) => void;
  closeSidebar: () => void;
}

const IncomingCallSidebarContext = createContext<IncomingCallSidebarContextType | null>(null);

export function useIncomingCallSidebar() {
  const context = useContext(IncomingCallSidebarContext);
  if (!context) {
    throw new Error("useIncomingCallSidebar must be used within IncomingCallSidebarProvider");
  }
  return context;
}

interface IncomingCallSidebarProviderProps {
  children: ReactNode;
}

export function IncomingCallSidebarProvider({ children }: IncomingCallSidebarProviderProps) {
  const { activeCall } = useCall();
  const [isOpen, setIsOpen] = useState(false);
  const [callLogId, setCallLogId] = useState<number | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [clientName, setClientName] = useState<string | null>(null);

  // Auto-open sidebar when an incoming call is answered
  useEffect(() => {
    if (
      activeCall &&
      activeCall.direction === "incoming" &&
      activeCall.status === "active" &&
      activeCall.logId
    ) {
      setCallLogId(activeCall.logId);
      setPhoneNumber(activeCall.number);
      setClientName(activeCall.callerName || null);
      setIsOpen(true);
    }
  }, [activeCall?.status, activeCall?.logId, activeCall?.direction, activeCall?.number, activeCall?.callerName, activeCall]);

  const openSidebar = (logId: number, phone: string, name?: string) => {
    setCallLogId(logId);
    setPhoneNumber(phone);
    setClientName(name || null);
    setIsOpen(true);
  };

  const closeSidebar = () => {
    setIsOpen(false);
    // Don't clear data immediately to avoid UI flash during close animation
    setTimeout(() => {
      setCallLogId(null);
      setPhoneNumber(null);
      setClientName(null);
    }, 300);
  };

  return (
    <IncomingCallSidebarContext.Provider
      value={{
        isOpen,
        callLogId,
        phoneNumber,
        clientName,
        openSidebar,
        closeSidebar,
      }}
    >
      {children}
    </IncomingCallSidebarContext.Provider>
  );
}
