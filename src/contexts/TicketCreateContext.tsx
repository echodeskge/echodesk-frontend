"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import type { Board, TicketColumn } from "@/api/generated/interfaces";

interface TicketCreateContextType {
  isOpen: boolean;
  selectedBoard: Board | null;
  selectedColumn: TicketColumn | null;
  openTicketCreate: (board?: Board, column?: TicketColumn) => void;
  closeTicketCreate: () => void;
}

const TicketCreateContext = createContext<TicketCreateContextType | null>(null);

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

  const openTicketCreate = (board?: Board, column?: TicketColumn) => {
    if (board) setSelectedBoard(board);
    if (column) setSelectedColumn(column);
    setIsOpen(true);
  };

  const closeTicketCreate = () => {
    setIsOpen(false);
    // Don't clear board/column immediately to avoid UI flash
    setTimeout(() => {
      setSelectedBoard(null);
      setSelectedColumn(null);
    }, 200);
  };

  return (
    <TicketCreateContext.Provider
      value={{
        isOpen,
        selectedBoard,
        selectedColumn,
        openTicketCreate,
        closeTicketCreate,
      }}
    >
      {children}
    </TicketCreateContext.Provider>
  );
}
