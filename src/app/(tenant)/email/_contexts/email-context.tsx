"use client";

import { createContext, useCallback, useState } from "react";
import type { ReactNode } from "react";

export interface EmailContextType {
  selectedEmailIds: number[];
  currentConnectionId: number | null;
  isEmailSidebarOpen: boolean;
  setIsEmailSidebarOpen: (val: boolean) => void;
  setCurrentConnectionId: (id: number | null) => void;
  handleToggleSelectEmail: (id: number) => void;
  handleToggleSelectAllEmails: (ids: number[]) => void;
  handleClearSelection: () => void;
}

export const EmailContext = createContext<EmailContextType | undefined>(
  undefined
);

export function EmailProvider({ children }: { children: ReactNode }) {
  const [selectedEmailIds, setSelectedEmailIds] = useState<number[]>([]);
  const [currentConnectionId, setCurrentConnectionId] = useState<number | null>(
    null
  );
  const [isEmailSidebarOpen, setIsEmailSidebarOpen] = useState(false);

  const handleToggleSelectEmail = useCallback((id: number) => {
    setSelectedEmailIds((prev) =>
      prev.includes(id) ? prev.filter((eid) => eid !== id) : [...prev, id]
    );
  }, []);

  const handleToggleSelectAllEmails = useCallback((ids: number[]) => {
    setSelectedEmailIds((prev) => {
      const allSelected = ids.every((id) => prev.includes(id));
      if (allSelected) return prev.filter((id) => !ids.includes(id));
      return [...new Set([...prev, ...ids])];
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedEmailIds([]);
  }, []);

  return (
    <EmailContext.Provider
      value={{
        selectedEmailIds,
        currentConnectionId,
        isEmailSidebarOpen,
        setIsEmailSidebarOpen,
        setCurrentConnectionId,
        handleToggleSelectEmail,
        handleToggleSelectAllEmails,
        handleClearSelection,
      }}
    >
      {children}
    </EmailContext.Provider>
  );
}
