"use client";

/**
 * The board selected for global consumers (the create sheet, the board admin
 * host, the sidebar outside `/tickets`).
 *
 * On `/tickets` the URL (`?board=`) is the source of truth (plan E19); the
 * tenant layout keeps `selectedBoardId` in sync with it. The value persists
 * in `localStorage` under `echodesk_selected_board_id`, which is also the
 * fallback `useTicketFilters` reads. Storage can be unavailable (private
 * mode, blocked site data), so every access is wrapped in try/catch.
 *
 * Search is no longer kept here: it lives in the toolbar's `?q` (FE-06).
 */
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

interface BoardContextType {
  selectedBoardId: number | null;
  setSelectedBoardId: (id: number | null) => void;
}

const BoardContext = createContext<BoardContextType | undefined>(undefined);

const STORAGE_KEY = "echodesk_selected_board_id";

function readStored(): number | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw || !/^\d+$/.test(raw)) return null;
    const id = Number(raw);
    return id > 0 ? id : null;
  } catch {
    return null;
  }
}

function writeStored(id: number | null): void {
  try {
    if (typeof window === "undefined") return;
    if (id !== null) window.localStorage.setItem(STORAGE_KEY, String(id));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage blocked: the selection still lives in memory and in the URL.
  }
}

export function BoardProvider({ children }: { children: React.ReactNode }) {
  const [selectedBoardId, setSelectedBoardId] = useState<number | null>(readStored);

  useEffect(() => {
    writeStored(selectedBoardId);
  }, [selectedBoardId]);

  const value = useMemo(() => ({ selectedBoardId, setSelectedBoardId }), [selectedBoardId]);

  return <BoardContext.Provider value={value}>{children}</BoardContext.Provider>;
}

export function useBoard() {
  const context = useContext(BoardContext);
  if (context === undefined) {
    throw new Error("useBoard must be used within a BoardProvider");
  }
  return context;
}
