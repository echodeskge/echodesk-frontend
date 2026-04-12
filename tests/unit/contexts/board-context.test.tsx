/**
 * Tests for BoardContext.
 * Verifies board selection persistence to localStorage and search query state.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";
import { BoardProvider, useBoard } from "@/contexts/BoardContext";

function createWrapper() {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(BoardProvider, null, children);
}

const STORAGE_KEY = "echodesk_selected_board_id";

describe("BoardContext", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("useBoard outside provider", () => {
    it("throws when used outside BoardProvider", () => {
      // Suppress console.error for expected error
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});

      expect(() => {
        renderHook(() => useBoard());
      }).toThrow("useBoard must be used within a BoardProvider");

      spy.mockRestore();
    });
  });

  describe("selectedBoardId", () => {
    it("defaults to null when localStorage is empty", () => {
      const { result } = renderHook(() => useBoard(), {
        wrapper: createWrapper(),
      });

      expect(result.current.selectedBoardId).toBeNull();
    });

    it("initializes from localStorage on mount", () => {
      localStorage.setItem(STORAGE_KEY, "42");

      const { result } = renderHook(() => useBoard(), {
        wrapper: createWrapper(),
      });

      expect(result.current.selectedBoardId).toBe(42);
    });

    it("persists selectedBoardId to localStorage when changed", async () => {
      const { result } = renderHook(() => useBoard(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setSelectedBoardId(7);
      });

      expect(result.current.selectedBoardId).toBe(7);
      expect(localStorage.getItem(STORAGE_KEY)).toBe("7");
    });

    it("removes from localStorage when set to null", () => {
      localStorage.setItem(STORAGE_KEY, "5");

      const { result } = renderHook(() => useBoard(), {
        wrapper: createWrapper(),
      });

      expect(result.current.selectedBoardId).toBe(5);

      act(() => {
        result.current.setSelectedBoardId(null);
      });

      expect(result.current.selectedBoardId).toBeNull();
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it("handles multiple board ID changes", () => {
      const { result } = renderHook(() => useBoard(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setSelectedBoardId(1);
      });
      expect(result.current.selectedBoardId).toBe(1);

      act(() => {
        result.current.setSelectedBoardId(99);
      });
      expect(result.current.selectedBoardId).toBe(99);
      expect(localStorage.getItem(STORAGE_KEY)).toBe("99");
    });
  });

  describe("ticketSearchQuery", () => {
    it("defaults to empty string", () => {
      const { result } = renderHook(() => useBoard(), {
        wrapper: createWrapper(),
      });

      expect(result.current.ticketSearchQuery).toBe("");
    });

    it("updates search query state", () => {
      const { result } = renderHook(() => useBoard(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setTicketSearchQuery("urgent bug");
      });

      expect(result.current.ticketSearchQuery).toBe("urgent bug");
    });

    it("can clear search query", () => {
      const { result } = renderHook(() => useBoard(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setTicketSearchQuery("search term");
      });
      expect(result.current.ticketSearchQuery).toBe("search term");

      act(() => {
        result.current.setTicketSearchQuery("");
      });
      expect(result.current.ticketSearchQuery).toBe("");
    });
  });
});
