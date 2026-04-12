/**
 * Tests for ThemeContext.
 * Verifies default theme, toggle, localStorage persistence, and system preference detection.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";

import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createWrapper() {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(ThemeProvider, null, children);
}

// Helper to mock matchMedia with a specific preference
function mockMatchMedia(prefersDark: boolean) {
  const listeners: Array<(e: { matches: boolean }) => void> = [];

  const mql = {
    matches: prefersDark,
    addEventListener: vi.fn((_event: string, handler: any) => {
      listeners.push(handler);
    }),
    removeEventListener: vi.fn((_event: string, handler: any) => {
      const idx = listeners.indexOf(handler);
      if (idx !== -1) listeners.splice(idx, 1);
    }),
  };

  window.matchMedia = vi.fn(() => mql as any);

  return {
    mql,
    listeners,
    /** Simulate a system preference change */
    triggerChange(newPrefersDark: boolean) {
      mql.matches = newPrefersDark;
      listeners.forEach((fn) => fn({ matches: newPrefersDark }));
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ThemeContext", () => {
  beforeEach(() => {
    localStorage.clear();
    // Default: system prefers light
    mockMatchMedia(false);
    // Clean up dark class
    document.documentElement.classList.remove("dark");
  });

  describe("useTheme outside provider", () => {
    it("throws when used outside ThemeProvider", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});

      expect(() => {
        renderHook(() => useTheme());
      }).toThrow("useTheme must be used within a ThemeProvider");

      spy.mockRestore();
    });
  });

  describe("default theme", () => {
    it("defaults to 'system' mode", () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(),
      });

      expect(result.current.mode).toBe("system");
    });

    it("resolves to 'light' when system prefers light", () => {
      mockMatchMedia(false);

      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(),
      });

      expect(result.current.resolvedMode).toBe("light");
    });

    it("resolves to 'dark' when system prefers dark", () => {
      mockMatchMedia(true);

      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(),
      });

      expect(result.current.resolvedMode).toBe("dark");
    });

    it("has null appearance by default", () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(),
      });

      expect(result.current.appearance).toBeNull();
    });
  });

  describe("toggle theme (light/dark)", () => {
    it("sets mode to dark", () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setMode("dark");
      });

      expect(result.current.mode).toBe("dark");
      expect(result.current.resolvedMode).toBe("dark");
    });

    it("sets mode to light", () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setMode("light");
      });

      expect(result.current.mode).toBe("light");
      expect(result.current.resolvedMode).toBe("light");
    });

    it("toggles from light to dark and back", () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setMode("dark");
      });
      expect(result.current.resolvedMode).toBe("dark");

      act(() => {
        result.current.setMode("light");
      });
      expect(result.current.resolvedMode).toBe("light");
    });

    it("can switch back to system mode", () => {
      mockMatchMedia(false);

      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setMode("dark");
      });
      expect(result.current.resolvedMode).toBe("dark");

      act(() => {
        result.current.setMode("system");
      });
      expect(result.current.mode).toBe("system");
      expect(result.current.resolvedMode).toBe("light");
    });
  });

  describe("theme persistence to localStorage", () => {
    it("persists mode to localStorage when setMode is called", () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setMode("dark");
      });

      expect(localStorage.getItem("theme-mode")).toBe("dark");
    });

    it("reads mode from localStorage on mount", () => {
      localStorage.setItem("theme-mode", "dark");

      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(),
      });

      expect(result.current.mode).toBe("dark");
      expect(result.current.resolvedMode).toBe("dark");
    });

    it("reads 'light' from localStorage on mount", () => {
      localStorage.setItem("theme-mode", "light");

      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(),
      });

      expect(result.current.mode).toBe("light");
      expect(result.current.resolvedMode).toBe("light");
    });

    it("reads 'system' from localStorage on mount", () => {
      mockMatchMedia(true);
      localStorage.setItem("theme-mode", "system");

      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(),
      });

      expect(result.current.mode).toBe("system");
      expect(result.current.resolvedMode).toBe("dark");
    });

    it("ignores invalid localStorage values", () => {
      localStorage.setItem("theme-mode", "rainbow");

      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(),
      });

      // Should stay at default 'system'
      expect(result.current.mode).toBe("system");
    });
  });

  describe("system preference detection", () => {
    it("reacts to system preference change when in system mode", () => {
      const { triggerChange } = mockMatchMedia(false);

      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(),
      });

      expect(result.current.resolvedMode).toBe("light");

      act(() => {
        triggerChange(true);
      });

      expect(result.current.resolvedMode).toBe("dark");
    });

    it("does not react to system preference change when mode is explicit", () => {
      const { triggerChange } = mockMatchMedia(false);

      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setMode("light");
      });

      act(() => {
        triggerChange(true);
      });

      // Should stay light because mode is explicitly set
      expect(result.current.resolvedMode).toBe("light");
    });
  });

  describe("appearance settings", () => {
    it("sets appearance", () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(),
      });

      const customAppearance = {
        primary_color: "210 40% 50%",
        primary_color_dark: "210 40% 90%",
        secondary_color: "150 30% 40%",
        accent_color: "210 20% 95%",
        sidebar_background: "0 0% 100%",
        sidebar_primary: "210 40% 50%",
        border_radius: "1rem",
        sidebar_order: [],
        updated_at: "2026-01-01T00:00:00Z",
      };

      act(() => {
        result.current.setAppearance(customAppearance);
      });

      expect(result.current.appearance).toEqual(customAppearance);
    });

    it("clears appearance when set to null", () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setAppearance({
          primary_color: "0 0% 0%",
          sidebar_order: [],
          updated_at: "2026-01-01T00:00:00Z",
        } as any);
      });

      expect(result.current.appearance).not.toBeNull();

      act(() => {
        result.current.setAppearance(null);
      });

      expect(result.current.appearance).toBeNull();
    });
  });

  describe("dark class on documentElement", () => {
    it("adds dark class when resolved mode is dark", () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setMode("dark");
      });

      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    it("removes dark class when resolved mode is light", () => {
      document.documentElement.classList.add("dark");

      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setMode("light");
      });

      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });
  });
});
