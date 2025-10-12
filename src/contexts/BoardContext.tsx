"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

interface BoardContextType {
  selectedBoardId: number | null;
  setSelectedBoardId: (id: number | null) => void;
}

const BoardContext = createContext<BoardContextType | undefined>(undefined);

const STORAGE_KEY = 'echodesk_selected_board_id';

export function BoardProvider({ children }: { children: React.ReactNode }) {
  const [selectedBoardId, setSelectedBoardId] = useState<number | null>(() => {
    // Initialize from localStorage on mount
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? parseInt(stored, 10) : null;
    }
    return null;
  });

  // Persist to localStorage whenever selectedBoardId changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (selectedBoardId !== null) {
        localStorage.setItem(STORAGE_KEY, selectedBoardId.toString());
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, [selectedBoardId]);

  return (
    <BoardContext.Provider value={{ selectedBoardId, setSelectedBoardId }}>
      {children}
    </BoardContext.Provider>
  );
}

export function useBoard() {
  const context = useContext(BoardContext);
  if (context === undefined) {
    throw new Error('useBoard must be used within a BoardProvider');
  }
  return context;
}
