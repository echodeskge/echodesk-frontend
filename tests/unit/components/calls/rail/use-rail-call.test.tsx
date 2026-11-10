/**
 * The temporary adapter from the legacy `useCall()` value to the CL-00
 * `CallStateValue` / `CallActionsValue` shapes (deleted at integration).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, renderHook } from "@testing-library/react";
import React from "react";

const h = vi.hoisted(() => ({ legacy: {} as Record<string, unknown> }));
vi.mock("@/contexts/CallContext", () => ({ useCall: () => h.legacy }));

import { mapActiveCall, mapRailMode, mapSipState, useCallActions, useCallState, useRailAdapterEffects } from "@/components/calls/rail/use-rail-call";

function legacyValue(overrides: Record<string, unknown> = {}) {
  return {
    activeCall: null,
    callDuration: 0,
    sipRegistered: true,
    sipConnecting: false,
    activeSipConfig: { username: "101" },
    dialNumber: "",
    error: "",
    loading: false,
    isDialpadOpen: false,
    setDialNumber: vi.fn(),
    makeCall: vi.fn().mockResolvedValue(undefined),
    handleAcceptCall: vi.fn().mockResolvedValue(undefined),
    handleRejectCall: vi.fn().mockResolvedValue(undefined),
    handleEndCall: vi.fn().mockResolvedValue(undefined),
    handleToggleHold: vi.fn(),
    handleToggleMute: vi.fn(),
    setError: vi.fn(),
    setIsDialpadOpen: vi.fn(),
    toggleDialpad: vi.fn(),
    callEndedCounter: 3,
    sendDTMF: vi.fn(() => true),
    transferCall: vi.fn().mockResolvedValue(undefined),
    startAttendedTransfer: vi.fn().mockResolvedValue(undefined),
    completeTransfer: vi.fn().mockResolvedValue(undefined),
    cancelTransfer: vi.fn().mockResolvedValue(undefined),
    mergeConference: vi.fn().mockResolvedValue(undefined),
    missedCall: null,
    clearMissedCall: vi.fn(),
    ...overrides,
  };
}

const legacyCall = (overrides: Record<string, unknown> = {}) => ({
  id: "c1",
  logId: 7,
  number: "+995555",
  direction: "incoming",
  status: "active",
  duration: 0,
  transferPhase: "idle",
  consultationCall: null,
  ...overrides,
});

beforeEach(() => {
  h.legacy = legacyValue();
});

describe("mapping helpers", () => {
  it("mapActiveCall: idle → connecting, logId 0 → null + logPending, booleans defaulted, consultation copied", () => {
    expect(mapActiveCall(null)).toBeNull();
    const mapped = mapActiveCall(legacyCall({ status: "idle", logId: 0, consultationCall: { targetNumber: "102", status: "ringing", duration: 0 } }) as never)!;
    expect(mapped).toMatchObject({
      id: "c1",
      sipCallId: "c1",
      logId: null,
      logPending: true,
      status: "connecting",
      isOnHold: false,
      isMuted: false,
      answeredElsewhere: false,
      consultationCall: { targetNumber: "102", status: "ringing", logId: null },
    });
    expect(mapActiveCall(legacyCall() as never)).toMatchObject({ logId: 7, logPending: false, status: "active" });
  });

  it("mapSipState", () => {
    expect(mapSipState({ loading: false, sipConnecting: false, sipRegistered: true, hasConfig: true })).toBe("registered");
    expect(mapSipState({ loading: true, sipConnecting: false, sipRegistered: false, hasConfig: false })).toBe("connecting");
    expect(mapSipState({ loading: false, sipConnecting: true, sipRegistered: false, hasConfig: true })).toBe("connecting");
    expect(mapSipState({ loading: false, sipConnecting: false, sipRegistered: false, hasConfig: true })).toBe("failed");
    expect(mapSipState({ loading: false, sipConnecting: false, sipRegistered: false, hasConfig: false })).toBe("off");
  });

  it("mapRailMode", () => {
    expect(mapRailMode(true, false)).toBe("open");
    expect(mapRailMode(true, true)).toBe("open");
    expect(mapRailMode(false, true)).toBe("minimised");
    expect(mapRailMode(false, false)).toBe("closed");
  });
});

describe("useCallState", () => {
  it("exposes the CL-00 shape", () => {
    h.legacy = legacyValue({ isDialpadOpen: true, error: "Call failed: busy", activeCall: legacyCall() });
    const { result } = renderHook(() => useCallState());
    expect(result.current.rail).toEqual({ mode: "open", prefill: null, autoDial: false });
    expect(result.current.error).toEqual({ key: "legacy", params: { message: "Call failed: busy" } });
    expect(result.current.sipState).toBe("registered");
    expect(result.current.activeCall?.logId).toBe(7);
    expect(result.current.callEndedCounter).toBe(3);
    expect(result.current.soundBlocked).toBe(false);
    expect(result.current.busyRejected).toBeNull();
  });
});

describe("useCallActions", () => {
  it("keeps a stable identity and forwards to the legacy handlers", async () => {
    const { result, rerender } = renderHook(() => useCallActions());
    const first = result.current;
    h.legacy = legacyValue();
    rerender();
    expect(result.current).toBe(first);

    await result.current.acceptCall();
    await result.current.makeCall();
    result.current.toggleMute();
    await result.current.toggleHold();
    result.current.clearError();
    const legacy = h.legacy as ReturnType<typeof legacyValue>;
    expect(legacy.handleAcceptCall).toHaveBeenCalledTimes(1);
    expect(legacy.makeCall).toHaveBeenCalledTimes(1);
    expect(legacy.handleToggleMute).toHaveBeenCalledTimes(1);
    expect(legacy.handleToggleHold).toHaveBeenCalledTimes(1);
    expect(legacy.setError).toHaveBeenCalledWith("");
  });

  it("openRail prefills the dial field; closeRail only when idle; minimiseRail only during a call", () => {
    const { result, rerender } = renderHook(() => useCallActions());
    const legacy = h.legacy as ReturnType<typeof legacyValue>;
    result.current.openRail({ number: "555" });
    expect(legacy.setDialNumber).toHaveBeenCalledWith("555");
    expect(legacy.setIsDialpadOpen).toHaveBeenCalledWith(true);

    result.current.minimiseRail();
    expect(legacy.setIsDialpadOpen).not.toHaveBeenCalledWith(false);
    result.current.closeRail();
    expect(legacy.setIsDialpadOpen).toHaveBeenCalledWith(false);

    h.legacy = legacyValue({ activeCall: legacyCall() });
    rerender();
    const inCall = h.legacy as ReturnType<typeof legacyValue>;
    result.current.closeRail();
    expect(inCall.setIsDialpadOpen).not.toHaveBeenCalled();
    result.current.minimiseRail();
    expect(inCall.setIsDialpadOpen).toHaveBeenCalledWith(false);
  });

  it("makeCall(number) only fills the dial field (legacy makeCall reads state)", async () => {
    const { result } = renderHook(() => useCallActions());
    const legacy = h.legacy as ReturnType<typeof legacyValue>;
    await result.current.makeCall("777");
    expect(legacy.setDialNumber).toHaveBeenCalledWith("777");
    expect(legacy.makeCall).not.toHaveBeenCalled();
  });
});

describe("useRailAdapterEffects", () => {
  function Probe() {
    useRailAdapterEffects();
    return null;
  }

  it("forces the rail open on an incoming ring and when a call becomes active", () => {
    h.legacy = legacyValue({ activeCall: legacyCall({ direction: "outgoing", status: "connecting" }) });
    const { rerender } = render(<Probe />);
    expect((h.legacy as ReturnType<typeof legacyValue>).setIsDialpadOpen).not.toHaveBeenCalled();

    h.legacy = legacyValue({ activeCall: legacyCall({ direction: "outgoing", status: "active" }) });
    rerender(<Probe />);
    expect((h.legacy as ReturnType<typeof legacyValue>).setIsDialpadOpen).toHaveBeenCalledWith(true);

    h.legacy = legacyValue({ activeCall: legacyCall({ id: "c2", direction: "incoming", status: "ringing" }) });
    rerender(<Probe />);
    expect((h.legacy as ReturnType<typeof legacyValue>).setIsDialpadOpen).toHaveBeenCalledWith(true);
  });
});
