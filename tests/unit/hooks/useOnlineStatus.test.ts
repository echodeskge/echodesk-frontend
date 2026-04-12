/**
 * Tests for useOnlineStatus hook.
 * Verifies online/offline detection and event listener behavior.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

describe("useOnlineStatus", () => {
  let addEventSpy: ReturnType<typeof vi.spyOn>;
  let removeEventSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Default to online
    Object.defineProperty(navigator, "onLine", {
      value: true,
      writable: true,
      configurable: true,
    });

    addEventSpy = vi.spyOn(window, "addEventListener");
    removeEventSpy = vi.spyOn(window, "removeEventListener");
  });

  afterEach(() => {
    addEventSpy.mockRestore();
    removeEventSpy.mockRestore();
  });

  it("returns true when navigator.onLine is true", () => {
    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current.isOnline).toBe(true);
    expect(result.current.wasOffline).toBe(false);
  });

  it("returns false when navigator.onLine is false", () => {
    Object.defineProperty(navigator, "onLine", {
      value: false,
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current.isOnline).toBe(false);
  });

  it("registers online and offline event listeners", () => {
    renderHook(() => useOnlineStatus());

    const onlineCalls = addEventSpy.mock.calls.filter(
      (call) => call[0] === "online"
    );
    const offlineCalls = addEventSpy.mock.calls.filter(
      (call) => call[0] === "offline"
    );

    expect(onlineCalls.length).toBeGreaterThanOrEqual(1);
    expect(offlineCalls.length).toBeGreaterThanOrEqual(1);
  });

  it("updates isOnline to false when offline event fires", () => {
    const { result } = renderHook(() => useOnlineStatus());

    act(() => {
      window.dispatchEvent(new Event("offline"));
    });

    expect(result.current.isOnline).toBe(false);
    expect(result.current.wasOffline).toBe(true);
  });

  it("updates isOnline to true when online event fires after going offline", () => {
    const { result } = renderHook(() => useOnlineStatus());

    // Go offline first
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });

    expect(result.current.isOnline).toBe(false);

    // Come back online
    act(() => {
      window.dispatchEvent(new Event("online"));
    });

    expect(result.current.isOnline).toBe(true);
  });

  it("calls onOffline callback when going offline", () => {
    const onOffline = vi.fn();

    renderHook(() => useOnlineStatus({ onOffline }));

    act(() => {
      window.dispatchEvent(new Event("offline"));
    });

    expect(onOffline).toHaveBeenCalledTimes(1);
  });

  it("calls onOnline callback when coming back online after being offline", () => {
    const onOnline = vi.fn();

    renderHook(() => useOnlineStatus({ onOnline }));

    // Go offline first
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });

    // Come back online
    act(() => {
      window.dispatchEvent(new Event("online"));
    });

    expect(onOnline).toHaveBeenCalledTimes(1);
  });

  it("removes event listeners on unmount", () => {
    const { unmount } = renderHook(() => useOnlineStatus());

    unmount();

    const removeOnlineCalls = removeEventSpy.mock.calls.filter(
      (call) => call[0] === "online"
    );
    const removeOfflineCalls = removeEventSpy.mock.calls.filter(
      (call) => call[0] === "offline"
    );

    expect(removeOnlineCalls.length).toBeGreaterThanOrEqual(1);
    expect(removeOfflineCalls.length).toBeGreaterThanOrEqual(1);
  });
});
