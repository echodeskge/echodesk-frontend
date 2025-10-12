"use client";

import React, { createContext, useContext, useState } from 'react';

interface BoardContextType {
  selectedBoardId: number | null;
  setSelectedBoardId: (id: number | null) => void;
}

const BoardContext = createContext<BoardContextType | undefined>(undefined);

export function BoardProvider({ children }: { children: React.ReactNode }) {
  const [selectedBoardId, setSelectedBoardId] = useState<number | null>(null);

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
