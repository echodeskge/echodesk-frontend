/**
 * Tests for useDebounce hook.
 * Verifies that the hook returns the initial value immediately,
 * debounces updates after the specified delay, and resets on new values.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebounce } from "@/hooks/useDebounce";

describe("useDebounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns initial value immediately", () => {
    const { result } = renderHook(() => useDebounce("hello", 500));

    expect(result.current).toBe("hello");
  });

  it("does not update value before delay elapses", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "hello", delay: 500 } }
    );

    rerender({ value: "world", delay: 500 });

    // Before delay elapses, should still be the old value
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe("hello");
  });

  it("updates value after delay elapses", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "hello", delay: 500 } }
    );

    rerender({ value: "world", delay: 500 });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current).toBe("world");
  });

  it("resets timer when value changes before delay elapses", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "a", delay: 500 } }
    );

    // First change
    rerender({ value: "b", delay: 500 });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Second change before first delay completes
    rerender({ value: "c", delay: 500 });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    // "b" should never have been set, still at "a"
    expect(result.current).toBe("a");

    // Finish the remaining delay
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Now it should be "c", not "b"
    expect(result.current).toBe("c");
  });

  it("works with numeric values", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 0, delay: 300 } }
    );

    rerender({ value: 42, delay: 300 });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe(42);
  });

  it("works with object values", () => {
    const initial = { name: "test" };
    const updated = { name: "updated" };

    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: initial, delay: 200 } }
    );

    rerender({ value: updated, delay: 200 });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current).toEqual({ name: "updated" });
  });

  it("respects different delay values", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "fast", delay: 100 } }
    );

    rerender({ value: "slow", delay: 1000 });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Should not have updated yet with 1000ms delay
    expect(result.current).toBe("fast");

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current).toBe("slow");
  });
});
