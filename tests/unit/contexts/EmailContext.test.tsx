/**
 * Tests for EmailContext and useEmailContext hook.
 * Verifies initial state, email selection toggling,
 * connection management, and sidebar state.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";

import {
  EmailProvider,
  EmailContext,
} from "@/app/(tenant)/email/_contexts/email-context";
import { useEmailContext } from "@/app/(tenant)/email/_hooks/use-email-context";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createWrapper() {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(EmailProvider, null, children);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("EmailContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // Hook boundary
  // -----------------------------------------------------------------------

  describe("useEmailContext outside provider", () => {
    it("throws when used outside EmailProvider", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});

      expect(() => {
        renderHook(() => useEmailContext());
      }).toThrow("useEmailContext must be used within an EmailProvider");

      spy.mockRestore();
    });
  });

  // -----------------------------------------------------------------------
  // Initial state
  // -----------------------------------------------------------------------

  describe("initial state", () => {
    it("has empty selectedEmailIds", () => {
      const { result } = renderHook(() => useEmailContext(), {
        wrapper: createWrapper(),
      });

      expect(result.current.selectedEmailIds).toEqual([]);
    });

    it("has null currentConnectionId", () => {
      const { result } = renderHook(() => useEmailContext(), {
        wrapper: createWrapper(),
      });

      expect(result.current.currentConnectionId).toBeNull();
    });

    it("has sidebar closed by default", () => {
      const { result } = renderHook(() => useEmailContext(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isEmailSidebarOpen).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // handleToggleSelectEmail
  // -----------------------------------------------------------------------

  describe("handleToggleSelectEmail", () => {
    it("adds email ID to selection when not selected", () => {
      const { result } = renderHook(() => useEmailContext(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handleToggleSelectEmail(1);
      });

      expect(result.current.selectedEmailIds).toEqual([1]);
    });

    it("removes email ID from selection when already selected", () => {
      const { result } = renderHook(() => useEmailContext(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handleToggleSelectEmail(1);
      });
      expect(result.current.selectedEmailIds).toEqual([1]);

      act(() => {
        result.current.handleToggleSelectEmail(1);
      });
      expect(result.current.selectedEmailIds).toEqual([]);
    });

    it("handles toggling multiple email IDs independently", () => {
      const { result } = renderHook(() => useEmailContext(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handleToggleSelectEmail(1);
      });
      act(() => {
        result.current.handleToggleSelectEmail(2);
      });
      act(() => {
        result.current.handleToggleSelectEmail(3);
      });

      expect(result.current.selectedEmailIds).toEqual([1, 2, 3]);

      // Remove the middle one
      act(() => {
        result.current.handleToggleSelectEmail(2);
      });

      expect(result.current.selectedEmailIds).toEqual([1, 3]);
    });
  });

  // -----------------------------------------------------------------------
  // handleToggleSelectAllEmails
  // -----------------------------------------------------------------------

  describe("handleToggleSelectAllEmails", () => {
    it("selects all IDs when none are selected", () => {
      const { result } = renderHook(() => useEmailContext(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handleToggleSelectAllEmails([1, 2, 3]);
      });

      expect(result.current.selectedEmailIds).toEqual([1, 2, 3]);
    });

    it("deselects all IDs when all are already selected", () => {
      const { result } = renderHook(() => useEmailContext(), {
        wrapper: createWrapper(),
      });

      // First select all
      act(() => {
        result.current.handleToggleSelectAllEmails([1, 2, 3]);
      });
      expect(result.current.selectedEmailIds).toEqual([1, 2, 3]);

      // Toggle again should deselect all
      act(() => {
        result.current.handleToggleSelectAllEmails([1, 2, 3]);
      });
      expect(result.current.selectedEmailIds).toEqual([]);
    });

    it("selects remaining when in indeterminate state (some selected)", () => {
      const { result } = renderHook(() => useEmailContext(), {
        wrapper: createWrapper(),
      });

      // Select only 1 and 3
      act(() => {
        result.current.handleToggleSelectEmail(1);
      });
      act(() => {
        result.current.handleToggleSelectEmail(3);
      });
      expect(result.current.selectedEmailIds).toEqual([1, 3]);

      // Toggle all [1,2,3] — not all selected, so should select all
      act(() => {
        result.current.handleToggleSelectAllEmails([1, 2, 3]);
      });

      expect(result.current.selectedEmailIds).toContain(1);
      expect(result.current.selectedEmailIds).toContain(2);
      expect(result.current.selectedEmailIds).toContain(3);
    });

    it("handles empty array without error", () => {
      const { result } = renderHook(() => useEmailContext(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handleToggleSelectAllEmails([]);
      });

      // Empty array means all 0 IDs are "selected", so toggling deselects
      expect(result.current.selectedEmailIds).toEqual([]);
    });

    it("preserves selections outside the toggled set", () => {
      const { result } = renderHook(() => useEmailContext(), {
        wrapper: createWrapper(),
      });

      // Select IDs 10 and 20 individually
      act(() => {
        result.current.handleToggleSelectEmail(10);
      });
      act(() => {
        result.current.handleToggleSelectEmail(20);
      });

      // Toggle all for IDs [1, 2, 3]
      act(() => {
        result.current.handleToggleSelectAllEmails([1, 2, 3]);
      });

      // 10 and 20 should still be selected along with 1, 2, 3
      expect(result.current.selectedEmailIds).toContain(10);
      expect(result.current.selectedEmailIds).toContain(20);
      expect(result.current.selectedEmailIds).toContain(1);
      expect(result.current.selectedEmailIds).toContain(2);
      expect(result.current.selectedEmailIds).toContain(3);
    });

    it("does not create duplicate IDs", () => {
      const { result } = renderHook(() => useEmailContext(), {
        wrapper: createWrapper(),
      });

      // Select ID 1 individually
      act(() => {
        result.current.handleToggleSelectEmail(1);
      });

      // Toggle all [1, 2, 3] — ID 1 is already selected, should not duplicate
      act(() => {
        result.current.handleToggleSelectAllEmails([1, 2, 3]);
      });

      const countOf1 = result.current.selectedEmailIds.filter(
        (id) => id === 1
      ).length;
      expect(countOf1).toBe(1);
    });
  });

  // -----------------------------------------------------------------------
  // handleClearSelection
  // -----------------------------------------------------------------------

  describe("handleClearSelection", () => {
    it("empties the selection array", () => {
      const { result } = renderHook(() => useEmailContext(), {
        wrapper: createWrapper(),
      });

      // Add some selections
      act(() => {
        result.current.handleToggleSelectEmail(1);
      });
      act(() => {
        result.current.handleToggleSelectEmail(2);
      });
      expect(result.current.selectedEmailIds).toHaveLength(2);

      // Clear
      act(() => {
        result.current.handleClearSelection();
      });

      expect(result.current.selectedEmailIds).toEqual([]);
    });

    it("is a no-op when already empty", () => {
      const { result } = renderHook(() => useEmailContext(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.handleClearSelection();
      });

      expect(result.current.selectedEmailIds).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // setCurrentConnectionId
  // -----------------------------------------------------------------------

  describe("setCurrentConnectionId", () => {
    it("updates connection ID to a number", () => {
      const { result } = renderHook(() => useEmailContext(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setCurrentConnectionId(42);
      });

      expect(result.current.currentConnectionId).toBe(42);
    });

    it("updates connection ID to null", () => {
      const { result } = renderHook(() => useEmailContext(), {
        wrapper: createWrapper(),
      });

      // Set to a number first
      act(() => {
        result.current.setCurrentConnectionId(42);
      });
      expect(result.current.currentConnectionId).toBe(42);

      // Reset to null
      act(() => {
        result.current.setCurrentConnectionId(null);
      });
      expect(result.current.currentConnectionId).toBeNull();
    });

    it("can switch between different connection IDs", () => {
      const { result } = renderHook(() => useEmailContext(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setCurrentConnectionId(1);
      });
      expect(result.current.currentConnectionId).toBe(1);

      act(() => {
        result.current.setCurrentConnectionId(2);
      });
      expect(result.current.currentConnectionId).toBe(2);
    });
  });

  // -----------------------------------------------------------------------
  // setIsEmailSidebarOpen
  // -----------------------------------------------------------------------

  describe("setIsEmailSidebarOpen", () => {
    it("opens the sidebar", () => {
      const { result } = renderHook(() => useEmailContext(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setIsEmailSidebarOpen(true);
      });

      expect(result.current.isEmailSidebarOpen).toBe(true);
    });

    it("closes the sidebar", () => {
      const { result } = renderHook(() => useEmailContext(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setIsEmailSidebarOpen(true);
      });
      expect(result.current.isEmailSidebarOpen).toBe(true);

      act(() => {
        result.current.setIsEmailSidebarOpen(false);
      });
      expect(result.current.isEmailSidebarOpen).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Context value shape
  // -----------------------------------------------------------------------

  describe("context value shape", () => {
    it("exposes all expected functions and state", () => {
      const { result } = renderHook(() => useEmailContext(), {
        wrapper: createWrapper(),
      });

      expect(result.current).toHaveProperty("selectedEmailIds");
      expect(result.current).toHaveProperty("currentConnectionId");
      expect(result.current).toHaveProperty("isEmailSidebarOpen");
      expect(typeof result.current.setIsEmailSidebarOpen).toBe("function");
      expect(typeof result.current.setCurrentConnectionId).toBe("function");
      expect(typeof result.current.handleToggleSelectEmail).toBe("function");
      expect(typeof result.current.handleToggleSelectAllEmails).toBe(
        "function"
      );
      expect(typeof result.current.handleClearSelection).toBe("function");
    });
  });
});
