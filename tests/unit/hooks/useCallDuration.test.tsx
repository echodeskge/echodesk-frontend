/**
 * useCallDuration ticks once per second from the call's start time and is
 * the only thing that re-renders on the tick.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCallDuration } from "@/hooks/useCallDuration";

describe("useCallDuration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T10:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 0 without a start time", () => {
    const { result } = renderHook(() => useCallDuration(null));
    expect(result.current).toBe(0);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current).toBe(0);
  });

  it("returns 0 for undefined", () => {
    const { result } = renderHook(() => useCallDuration(undefined));
    expect(result.current).toBe(0);
  });

  it("starts at the elapsed seconds and ticks every second", () => {
    const start = new Date("2026-01-01T09:59:57Z");
    const { result } = renderHook(() => useCallDuration(start));
    expect(result.current).toBe(3);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current).toBe(4);

    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(result.current).toBe(6);
  });

  it("never goes negative for a start time in the future", () => {
    const start = new Date("2026-01-01T10:00:05Z");
    const { result } = renderHook(() => useCallDuration(start));
    expect(result.current).toBe(0);
  });

  it("resets to 0 when the start time is cleared and restarts with a new one", () => {
    const start = new Date("2026-01-01T10:00:00Z");
    const { result, rerender } = renderHook(
      ({ startTime }: { startTime: Date | null }) => useCallDuration(startTime),
      { initialProps: { startTime: start as Date | null } }
    );

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current).toBe(3);

    rerender({ startTime: null });
    expect(result.current).toBe(0);
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current).toBe(0);

    rerender({ startTime: new Date("2026-01-01T10:00:06Z") });
    expect(result.current).toBe(0);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current).toBe(1);
  });

  it("treats a new Date object with the same time as the same start (no interval restart)", () => {
    const setInterval = vi.spyOn(globalThis, "setInterval");
    const { rerender } = renderHook(
      ({ startTime }: { startTime: Date }) => useCallDuration(startTime),
      { initialProps: { startTime: new Date("2026-01-01T10:00:00Z") } }
    );
    const calls = setInterval.mock.calls.length;
    rerender({ startTime: new Date("2026-01-01T10:00:00Z") });
    expect(setInterval.mock.calls.length).toBe(calls);
    setInterval.mockRestore();
  });

  it("clears its interval on unmount", () => {
    const clearInterval = vi.spyOn(globalThis, "clearInterval");
    const { unmount } = renderHook(() => useCallDuration(new Date("2026-01-01T10:00:00Z")));
    unmount();
    expect(clearInterval).toHaveBeenCalled();
    clearInterval.mockRestore();
  });
});
