"use client";

import { createContext, useCallback, useRef, useState } from "react";
import type { MutableRefObject, ReactNode } from "react";

/** Actions the open conversation registers for keyboard shortcuts (E / R). */
export interface EmailPaneActions {
  archive?: () => void;
  reply?: () => void;
}

export interface EmailContextType {
  selectedEmailIds: number[];
  currentConnectionId: number | null;
  isEmailSidebarOpen: boolean;
  setIsEmailSidebarOpen: (val: boolean) => void;
  setCurrentConnectionId: (id: number | null) => void;
  handleToggleSelectEmail: (id: number) => void;
  handleToggleSelectAllEmails: (ids: number[]) => void;
  handleClearSelection: () => void;
  /** Folder / view route last shown in the list (compose keeps it beside the composer). */
  lastFilter: string;
  setLastFilter: (filter: string) => void;
  /** Ids of the rows currently in the list, top to bottom (newer / older, J / K). */
  listOrder: number[];
  setListOrder: (ids: number[]) => void;
  paneActions: MutableRefObject<EmailPaneActions>;
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
  const [lastFilter, setLastFilter] = useState("INBOX");
  const [listOrder, setListOrderState] = useState<number[]>([]);
  const paneActions = useRef<EmailPaneActions>({});

  const setListOrder = useCallback((ids: number[]) => {
    setListOrderState((prev) =>
      prev.length === ids.length && prev.every((id, i) => id === ids[i]) ? prev : ids
    );
  }, []);

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
        lastFilter,
        setLastFilter,
        listOrder,
        setListOrder,
        paneActions,
      }}
    >
      {children}
    </EmailContext.Provider>
  );
}
