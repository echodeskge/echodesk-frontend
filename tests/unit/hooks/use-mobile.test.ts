/**
 * Tests for useIsMobile hook (src/hooks/use-mobile.ts).
 * Tests media query matching and responsive behavior.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useIsMobile } from "@/hooks/use-mobile";

describe("useIsMobile", () => {
  let listeners: Map<string, Set<(e: any) => void>>;
  let mockAddEventListener: ReturnType<typeof vi.fn>;
  let mockRemoveEventListener: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    listeners = new Map();
    mockAddEventListener = vi.fn((event: string, handler: (e: any) => void) => {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(handler);
    });
    mockRemoveEventListener = vi.fn((event: string, handler: (e: any) => void) => {
      listeners.get(event)?.delete(handler);
    });

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: mockAddEventListener,
        removeEventListener: mockRemoveEventListener,
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns false on desktop-width viewport (>= 768px)", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      value: 1024,
    });

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);
  });

  it("returns true on mobile-width viewport (< 768px)", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      value: 375,
    });

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(true);
  });

  it("returns true at exactly 767px (just below breakpoint)", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      value: 767,
    });

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(true);
  });

  it("returns false at exactly 768px (breakpoint)", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      value: 768,
    });

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);
  });

  it("registers a change event listener on matchMedia", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      value: 1024,
    });

    renderHook(() => useIsMobile());

    expect(mockAddEventListener).toHaveBeenCalledWith(
      "change",
      expect.any(Function)
    );
  });

  it("responds to media query change events", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      value: 1024,
    });

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);

    // Simulate resize to mobile
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      value: 375,
    });

    // Trigger the change handler
    act(() => {
      const changeHandlers = listeners.get("change");
      if (changeHandlers) {
        for (const handler of changeHandlers) {
          handler({});
        }
      }
    });

    expect(result.current).toBe(true);
  });

  it("removes event listener on unmount", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      value: 1024,
    });

    const { unmount } = renderHook(() => useIsMobile());

    unmount();

    expect(mockRemoveEventListener).toHaveBeenCalledWith(
      "change",
      expect.any(Function)
    );
  });

  it("calls matchMedia with correct breakpoint query", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      value: 1024,
    });

    renderHook(() => useIsMobile());

    expect(window.matchMedia).toHaveBeenCalledWith("(max-width: 767px)");
  });
});
