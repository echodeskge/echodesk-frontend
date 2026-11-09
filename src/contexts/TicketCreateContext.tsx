"use client";

/**
 * Opens the global create sheet (mounted once in the tenant layout).
 *
 * `openTicketCreate(board?, column?, opts?)` keeps its positional signature
 * (WS14) and adds an optional third argument for callers that know more
 * about the ticket, such as the incoming-call sidebar (caller as customer,
 * caller name as title).
 *
 * Every open replaces the previous selection (a board or column the caller
 * leaves out is cleared), and a pending "clear after close" timer is
 * cancelled, so reopening right after a close never loses the new board.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Board, TicketColumn } from "@/api/generated/interfaces";

export interface TicketCreateOptions {
  /** A `social_integrations.Client` id to link as the ticket's customer. */
  customerId?: number;
  /** Pre-filled title. */
  title?: string;
}

interface TicketCreateContextType {
  isOpen: boolean;
  selectedBoard: Board | null;
  selectedColumn: TicketColumn | null;
  options: TicketCreateOptions;
  openTicketCreate: (board?: Board, column?: TicketColumn, opts?: TicketCreateOptions) => void;
  closeTicketCreate: () => void;
}

const TicketCreateContext = createContext<TicketCreateContextType | null>(null);

const EMPTY_OPTIONS: TicketCreateOptions = {};
/** Keep the selection while the sheet animates out, so it doesn't flash. */
const CLEAR_DELAY_MS = 200;

export function useTicketCreate() {
  const context = useContext(TicketCreateContext);
  if (!context) {
    throw new Error("useTicketCreate must be used within a TicketCreateProvider");
  }
  return context;
}

interface TicketCreateProviderProps {
  children: ReactNode;
}

export function TicketCreateProvider({ children }: TicketCreateProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<TicketColumn | null>(null);
  const [options, setOptions] = useState<TicketCreateOptions>(EMPTY_OPTIONS);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClear = () => {
    if (clearTimer.current) {
      clearTimeout(clearTimer.current);
      clearTimer.current = null;
    }
  };

  useEffect(() => cancelClear, []);

  const openTicketCreate = useCallback((board?: Board, column?: TicketColumn, opts?: TicketCreateOptions) => {
    cancelClear();
    setSelectedBoard(board ?? null);
    setSelectedColumn(column ?? null);
    setOptions(opts ?? EMPTY_OPTIONS);
    setIsOpen(true);
  }, []);

  const closeTicketCreate = useCallback(() => {
    setIsOpen(false);
    cancelClear();
    clearTimer.current = setTimeout(() => {
      clearTimer.current = null;
      setSelectedBoard(null);
      setSelectedColumn(null);
      setOptions(EMPTY_OPTIONS);
    }, CLEAR_DELAY_MS);
  }, []);

  const value = useMemo(
    () => ({ isOpen, selectedBoard, selectedColumn, options, openTicketCreate, closeTicketCreate }),
    [isOpen, selectedBoard, selectedColumn, options, openTicketCreate, closeTicketCreate],
  );

  return <TicketCreateContext.Provider value={value}>{children}</TicketCreateContext.Provider>;
}
