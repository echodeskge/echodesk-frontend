/**
 * useClickToCall: enabled only with softphone access AND a registered SIP
 * state; `call` opens the rail with the sanitised number; `telHref` is the
 * fallback. The call bridge maps the legacy CallContext flags to SipState.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const state = vi.hoisted(() => ({
  access: { tenantHasCalling: true, userHasCalling: true, canUseSoftphone: true, canViewCalls: true },
  call: {} as Record<string, unknown>,
  setDialNumber: vi.fn(),
  setIsDialpadOpen: vi.fn(),
}));

vi.mock("@/lib/calling-access", () => ({ useCallingAccess: () => state.access }));
vi.mock("@/contexts/CallContext", () => ({ useCall: () => state.call }));

import { sanitizeDialNumber, telHref, useClickToCall } from "@/hooks/useClickToCall";
import { legacySipState, useCallBridgeState } from "@/hooks/useCallBridge";

beforeEach(() => {
  state.access = { tenantHasCalling: true, userHasCalling: true, canUseSoftphone: true, canViewCalls: true };
  state.setDialNumber.mockClear();
  state.setIsDialpadOpen.mockClear();
  state.call = {
    activeCall: null,
    sipRegistered: true,
    sipConnecting: false,
    activeSipConfig: { username: "101" },
    loading: false,
    error: "",
    callEndedCounter: 0,
    isDialpadOpen: false,
    setDialNumber: state.setDialNumber,
    setIsDialpadOpen: state.setIsDialpadOpen,
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

  it.each([
    ["connecting", { sipRegistered: false, sipConnecting: true }],
    ["failed", { sipRegistered: false, sipConnecting: false }],
    ["off", { activeSipConfig: null, sipRegistered: false, sipConnecting: false }],
  ])("is disabled while SIP is %s", (_label, flags) => {
    state.call = { ...state.call, ...flags };
    const { result } = renderHook(() => useClickToCall());
    expect(result.current.enabled).toBe(false);
  });

  it("call() opens the rail with the sanitised number prefilled", () => {
    const { result } = renderHook(() => useClickToCall());
    act(() => result.current.call("+995 599 12 34 56"));
    expect(state.setDialNumber).toHaveBeenCalledWith("+995599123456");
    expect(state.setIsDialpadOpen).toHaveBeenCalledWith(true);
  });

  it("call() ignores a number without digits", () => {
    const { result } = renderHook(() => useClickToCall());
    act(() => result.current.call("n/a"));
    expect(state.setDialNumber).not.toHaveBeenCalled();
    expect(state.setIsDialpadOpen).not.toHaveBeenCalled();
  });

  it("keeps a stable identity while nothing changes", () => {
    const { result, rerender } = renderHook(() => useClickToCall());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});

describe("call bridge", () => {
  it("maps the legacy flags to SipState", () => {
    expect(legacySipState({ activeSipConfig: null, sipRegistered: false, sipConnecting: false })).toBe("off");
    expect(legacySipState({ activeSipConfig: {}, sipRegistered: true, sipConnecting: false })).toBe("registered");
    expect(legacySipState({ activeSipConfig: {}, sipRegistered: false, sipConnecting: true })).toBe("connecting");
    expect(legacySipState({ activeSipConfig: {}, sipRegistered: false, sipConnecting: false })).toBe("failed");
  });

  it("exposes inCall, errorText, railOpen and the counter", () => {
    state.call = { ...state.call, activeCall: { id: "x" }, error: "SIP registration failed", isDialpadOpen: true, callEndedCounter: 4 };
    const { result } = renderHook(() => useCallBridgeState());
    expect(result.current).toMatchObject({
      inCall: true,
      sipState: "registered",
      errorText: "SIP registration failed",
      railOpen: true,
      callEndedCounter: 4,
      loading: false,
    });
  });
});
