/**
 * Tests for BoardContext.
 * Verifies board selection persistence to localStorage (search moved to the URL).
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

  describe("search state removed (plan E19, critic 15)", () => {
    it("no longer exposes ticketSearchQuery or its setter", () => {
      const { result } = renderHook(() => useBoard(), {
        wrapper: createWrapper(),
      });

      expect(Object.keys(result.current).sort()).toEqual(["selectedBoardId", "setSelectedBoardId"]);
      expect("ticketSearchQuery" in result.current).toBe(false);
    });
  });

  describe("storage robustness", () => {
    it("ignores a non-numeric stored value", () => {
      localStorage.setItem(STORAGE_KEY, "abc");
      const { result } = renderHook(() => useBoard(), { wrapper: createWrapper() });
      expect(result.current.selectedBoardId).toBeNull();
    });

    it("works when localStorage throws", () => {
      const get = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new Error("blocked");
      });
      const set = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("blocked");
      });
      const { result } = renderHook(() => useBoard(), { wrapper: createWrapper() });
      expect(result.current.selectedBoardId).toBeNull();
      act(() => {
        result.current.setSelectedBoardId(3);
      });
      expect(result.current.selectedBoardId).toBe(3);
      get.mockRestore();
      set.mockRestore();
    });
  });
});
