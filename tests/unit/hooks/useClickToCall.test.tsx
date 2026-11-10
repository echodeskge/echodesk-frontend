/**
 * useClickToCall: enabled only with softphone access AND a registered SIP
 * state; `call` opens the rail with the sanitised number; `telHref` is the
 * fallback.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const state = vi.hoisted(() => ({
  access: { tenantHasCalling: true, userHasCalling: true, canUseSoftphone: true, canViewCalls: true },
  call: {} as Record<string, unknown>,
  openRail: vi.fn(),
}));

vi.mock("@/lib/calling-access", () => ({ useCallingAccess: () => state.access }));
vi.mock("@/contexts/CallContext", () => ({ useCallState: () => state.call, useCallActions: () => ({ openRail: state.openRail }) }));

import { sanitizeDialNumber, telHref, useClickToCall } from "@/hooks/useClickToCall";

beforeEach(() => {
  state.access = { tenantHasCalling: true, userHasCalling: true, canUseSoftphone: true, canViewCalls: true };
  state.openRail.mockClear();
  state.call = {
    activeCall: null,
    sipState: "registered",
    activeSipConfig: { username: "101" },
    loading: false,
    error: null,
    callEndedCounter: 0,
    rail: { mode: "closed", prefill: null, autoDial: false },
  };
});

describe("sanitizeDialNumber / telHref", () => {
  it("keeps + and digits, drops formatting, maps 00 to +", () => {
    expect(sanitizeDialNumber("+995 599 12-34-56")).toBe("+995599123456");
    expect(sanitizeDialNumber("(032) 2 42 12 19")).toBe("0322421219");
    expect(sanitizeDialNumber("00995599123456")).toBe("+995599123456");
    expect(sanitizeDialNumber("*200#")).toBe("*200#");
    expect(sanitizeDialNumber("  ")).toBe("");
    expect(sanitizeDialNumber(null)).toBe("");
    expect(telHref("+995 599 12 34 56")).toBe("tel:+995599123456");
  });
});

describe("useClickToCall", () => {
  it("is enabled with softphone access and a registered SIP state", () => {
    const { result } = renderHook(() => useClickToCall());
    expect(result.current.enabled).toBe(true);
  });

  it("is disabled without the make_calls permission / feature key", () => {
    state.access = { ...state.access, canUseSoftphone: false };
    const { result } = renderHook(() => useClickToCall());
    expect(result.current.enabled).toBe(false);
  });

  it.each(["connecting", "reconnecting", "failed", "offline", "off"] as const)("is disabled while SIP is %s", (sipState) => {
    state.call = { ...state.call, sipState, activeSipConfig: sipState === "off" ? null : state.call.activeSipConfig };
    const { result } = renderHook(() => useClickToCall());
    expect(result.current.enabled).toBe(false);
  });

  it("call() opens the rail with the sanitised number prefilled", () => {
    const { result } = renderHook(() => useClickToCall());
    act(() => result.current.call("+995 599 12 34 56"));
    expect(state.openRail).toHaveBeenCalledWith({ number: "+995599123456", autoDial: false });
  });

  it("call() ignores a number without digits", () => {
    const { result } = renderHook(() => useClickToCall());
    act(() => result.current.call("n/a"));
    expect(state.openRail).not.toHaveBeenCalled();
  });

  it("keeps a stable identity while nothing changes", () => {
    const { result, rerender } = renderHook(() => useClickToCall());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});
