/**
 * Tests for TicketCreateContext.
 * Verifies provider rendering, hook boundary, open/close toggle, and board/column state.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";

import {
  TicketCreateProvider,
  useTicketCreate,
} from "@/contexts/TicketCreateContext";

// ---------------------------------------------------------------------------
// Wrapper helper
// ---------------------------------------------------------------------------

function createWrapper() {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(TicketCreateProvider, null, children);
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_BOARD = {
  id: 1,
  name: "Sprint Board",
  description: "Main sprint board",
} as any;

const MOCK_COLUMN = {
  id: 10,
  name: "To Do",
  order: 0,
} as any;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("TicketCreateContext", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("useTicketCreate outside provider", () => {
    it("throws when used outside TicketCreateProvider", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});

      expect(() => {
        renderHook(() => useTicketCreate());
      }).toThrow("useTicketCreate must be used within a TicketCreateProvider");

      spy.mockRestore();
    });
  });

  describe("provider renders children", () => {
    it("renders children without crashing", () => {
      const { result } = renderHook(() => useTicketCreate(), {
        wrapper: createWrapper(),
      });

      expect(result.current).toBeDefined();
    });
  });

  describe("default state", () => {
    it("isOpen defaults to false", () => {
      const { result } = renderHook(() => useTicketCreate(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isOpen).toBe(false);
    });

    it("selectedBoard defaults to null", () => {
      const { result } = renderHook(() => useTicketCreate(), {
        wrapper: createWrapper(),
      });

      expect(result.current.selectedBoard).toBeNull();
    });

    it("selectedColumn defaults to null", () => {
      const { result } = renderHook(() => useTicketCreate(), {
        wrapper: createWrapper(),
      });

      expect(result.current.selectedColumn).toBeNull();
    });
  });

  describe("openTicketCreate / closeTicketCreate toggle", () => {
    it("opens the ticket create dialog", () => {
      const { result } = renderHook(() => useTicketCreate(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.openTicketCreate();
      });

      expect(result.current.isOpen).toBe(true);
    });

    it("closes the ticket create dialog", () => {
      const { result } = renderHook(() => useTicketCreate(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.openTicketCreate();
      });
      expect(result.current.isOpen).toBe(true);

      act(() => {
        result.current.closeTicketCreate();
      });
      expect(result.current.isOpen).toBe(false);
    });

    it("toggles open and closed multiple times", () => {
      const { result } = renderHook(() => useTicketCreate(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.openTicketCreate();
      });
      expect(result.current.isOpen).toBe(true);

      act(() => {
        result.current.closeTicketCreate();
      });
      expect(result.current.isOpen).toBe(false);

      act(() => {
        result.current.openTicketCreate();
      });
      expect(result.current.isOpen).toBe(true);
    });
  });

  describe("board and column selection", () => {
    it("sets board and column when opening", () => {
      const { result } = renderHook(() => useTicketCreate(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.openTicketCreate(MOCK_BOARD, MOCK_COLUMN);
      });

      expect(result.current.isOpen).toBe(true);
      expect(result.current.selectedBoard).toEqual(MOCK_BOARD);
      expect(result.current.selectedColumn).toEqual(MOCK_COLUMN);
    });

    it("opens without board/column when called with no arguments", () => {
      const { result } = renderHook(() => useTicketCreate(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.openTicketCreate();
      });

      expect(result.current.isOpen).toBe(true);
      expect(result.current.selectedBoard).toBeNull();
      expect(result.current.selectedColumn).toBeNull();
    });

    it("clears board and column after close with delay", () => {
      const { result } = renderHook(() => useTicketCreate(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.openTicketCreate(MOCK_BOARD, MOCK_COLUMN);
      });

      expect(result.current.selectedBoard).toEqual(MOCK_BOARD);
      expect(result.current.selectedColumn).toEqual(MOCK_COLUMN);

      act(() => {
        result.current.closeTicketCreate();
      });

      // Immediately after close, board and column are still set (delayed clear)
      expect(result.current.isOpen).toBe(false);
      expect(result.current.selectedBoard).toEqual(MOCK_BOARD);
      expect(result.current.selectedColumn).toEqual(MOCK_COLUMN);

      // After the 200ms timeout, they should be cleared
      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(result.current.selectedBoard).toBeNull();
      expect(result.current.selectedColumn).toBeNull();
    });

    it("sets only board when column is not provided", () => {
      const { result } = renderHook(() => useTicketCreate(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.openTicketCreate(MOCK_BOARD);
      });

      expect(result.current.selectedBoard).toEqual(MOCK_BOARD);
      expect(result.current.selectedColumn).toBeNull();
    });
  });
});
