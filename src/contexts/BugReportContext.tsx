"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface BugReportContextType {
  isOpen: boolean;
  openBugReport: () => void;
  closeBugReport: () => void;
}

const BugReportContext = createContext<BugReportContextType | null>(null);

export function useBugReport() {
  const context = useContext(BugReportContext);
  if (!context) {
    throw new Error("useBugReport must be used within a BugReportProvider");
  }
  return context;
}

interface BugReportProviderProps {
  children: ReactNode;
}

export function BugReportProvider({ children }: BugReportProviderProps) {
  const [isOpen, setIsOpen] = useState(false);

  const openBugReport = () => setIsOpen(true);
  const closeBugReport = () => setIsOpen(false);

  return (
    <BugReportContext.Provider value={{ isOpen, openBugReport, closeBugReport }}>
      {children}
    </BugReportContext.Provider>
  );
}
