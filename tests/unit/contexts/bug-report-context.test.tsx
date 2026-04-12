/**
 * Tests for BugReportContext.
 * Verifies provider rendering, hook boundary, and open/close toggle.
 */
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";

import { BugReportProvider, useBugReport } from "@/contexts/BugReportContext";

// ---------------------------------------------------------------------------
// Wrapper helper
// ---------------------------------------------------------------------------

function createWrapper() {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(BugReportProvider, null, children);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("BugReportContext", () => {
  describe("useBugReport outside provider", () => {
    it("throws when used outside BugReportProvider", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});

      expect(() => {
        renderHook(() => useBugReport());
      }).toThrow("useBugReport must be used within a BugReportProvider");

      spy.mockRestore();
    });
  });

  describe("provider renders children", () => {
    it("renders children without crashing", () => {
      const { result } = renderHook(() => useBugReport(), {
        wrapper: createWrapper(),
      });

      expect(result.current).toBeDefined();
    });
  });

  describe("default state", () => {
    it("isOpen defaults to false", () => {
      const { result } = renderHook(() => useBugReport(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isOpen).toBe(false);
    });
  });

  describe("openBugReport / closeBugReport toggle", () => {
    it("opens the bug report dialog", () => {
      const { result } = renderHook(() => useBugReport(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.openBugReport();
      });

      expect(result.current.isOpen).toBe(true);
    });

    it("closes the bug report dialog", () => {
      const { result } = renderHook(() => useBugReport(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.openBugReport();
      });
      expect(result.current.isOpen).toBe(true);

      act(() => {
        result.current.closeBugReport();
      });
      expect(result.current.isOpen).toBe(false);
    });

    it("toggles open and closed multiple times", () => {
      const { result } = renderHook(() => useBugReport(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.openBugReport();
      });
      expect(result.current.isOpen).toBe(true);

      act(() => {
        result.current.closeBugReport();
      });
      expect(result.current.isOpen).toBe(false);

      act(() => {
        result.current.openBugReport();
      });
      expect(result.current.isOpen).toBe(true);
    });

    it("calling openBugReport twice remains open", () => {
      const { result } = renderHook(() => useBugReport(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.openBugReport();
      });

      act(() => {
        result.current.openBugReport();
      });

      expect(result.current.isOpen).toBe(true);
    });

    it("calling closeBugReport when already closed stays false", () => {
      const { result } = renderHook(() => useBugReport(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isOpen).toBe(false);

      act(() => {
        result.current.closeBugReport();
      });

      expect(result.current.isOpen).toBe(false);
    });
  });
});
