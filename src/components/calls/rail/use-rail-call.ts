"use client";

/**
 * TEMPORARY adapter (CL-02) — delete at integration.
 *
 * CL-01 rewrites CallContext to expose `useCallState()` / `useCallActions()`
 * with the `CallStateValue` / `CallActionsValue` shapes from
 * `src/contexts/call-types.ts`. Until that lands, this file maps the CURRENT
 * `useCall()` value onto those types so the rail compiles and renders.
 *
 * The integrator deletes this file and repoints every
 * `from "./use-rail-call"` import in `src/components/calls/rail/*`,
 * `DialpadWidget.tsx` and `IncomingCallNotification.tsx` to
 * `@/contexts/CallContext`, and removes the `useRailAdapterEffects()` call in
 * `call-rail.tsx` (CL-01's context forces the rail open on ring / active
 * itself).
 *
 * Known gaps of the adapter (all closed by CL-01):
 * - `makeCall(number)` only fills the dial field (the legacy `makeCall()`
 *   reads `dialNumber` from state); the rail always dials with `makeCall()`.
 * - `reconnect` / `unlockSound` are no-ops; `soundBlocked` and `busyRejected`
 *   never become truthy; `sipState` can't distinguish `reconnecting`.
 * - `error` arrives as a legacy string under key `legacy` with
 *   `params.message`; the rail falls back to that text.
 */
import { useEffect, useMemo, useRef } from "react";
import { useCall, type ActiveCall as LegacyActiveCall } from "@/contexts/CallContext";
import type {
  ActiveCall,
  CallActionsValue,
  CallError,
  CallStateValue,
  RailState,
  SipState,
} from "@/contexts/call-types";

/** Legacy `ActiveCall` → the CL-00 model. */
export function mapActiveCall(call: LegacyActiveCall | null | undefined): ActiveCall | null {
  if (!call) return null;
  const consultation = call.consultationCall;
  return {
    id: call.id,
    sipCallId: call.id,
    logId: call.logId || null,
    logPending: !call.logId,
    number: call.number,
    callerName: call.callerName,
    direction: call.direction,
    status: call.status === "idle" ? "connecting" : call.status,
    startTime: call.startTime,
    isOnHold: !!call.isOnHold,
    isMuted: !!call.isMuted,
    transferPhase: call.transferPhase,
    consultationCall: consultation
      ? {
          targetNumber: consultation.targetNumber,
          targetName: consultation.targetName,
          status: consultation.status,
          startTime: consultation.startTime,
          logId: consultation.logId ?? null,
        }
      : null,
    answeredElsewhere: false,
  };
}

export function mapSipState(opts: {
  loading: boolean;
  sipConnecting: boolean;
  sipRegistered: boolean;
  hasConfig: boolean;
}): SipState {
  if (opts.sipRegistered) return "registered";
  if (opts.sipConnecting || opts.loading) return "connecting";
  return opts.hasConfig ? "failed" : "off";
}

export function mapRailMode(isDialpadOpen: boolean, hasActiveCall: boolean): RailState["mode"] {
  if (isDialpadOpen) return "open";
  return hasActiveCall ? "minimised" : "closed";
}

export function useCallState(): CallStateValue {
  const ctx = useCall();
  const activeCall = useMemo(() => mapActiveCall(ctx.activeCall), [ctx.activeCall]);
  const sipState = mapSipState({
    loading: ctx.loading,
    sipConnecting: ctx.sipConnecting,
    sipRegistered: ctx.sipRegistered,
    hasConfig: !!ctx.activeSipConfig,
  });
  const mode = mapRailMode(ctx.isDialpadOpen, !!ctx.activeCall);
  const rail = useMemo<RailState>(() => ({ mode, prefill: null, autoDial: false }), [mode]);
  const error = useMemo<CallError | null>(
    () => (ctx.error ? { key: "legacy", params: { message: ctx.error } } : null),
    [ctx.error]
  );

  return useMemo<CallStateValue>(
    () => ({
      activeCall,
      sipState,
      activeSipConfig: ctx.activeSipConfig,
      dialNumber: ctx.dialNumber,
      error,
      loading: ctx.loading,
      rail,
      callEndedCounter: ctx.callEndedCounter,
      missedCall: ctx.missedCall,
      busyRejected: null,
      soundBlocked: false,
    }),
    [activeCall, sipState, ctx.activeSipConfig, ctx.dialNumber, error, ctx.loading, rail, ctx.callEndedCounter, ctx.missedCall]
  );
}

export function useCallActions(): CallActionsValue {
  const ctx = useCall();
  const ref = useRef(ctx);
  useEffect(() => {
    ref.current = ctx;
  });

  // Stable identities: every action reads the latest legacy context through
  // the ref, the way CL-01's memoised actions will.
  return useMemo<CallActionsValue>(
    () => ({
      setDialNumber: (number) => ref.current.setDialNumber(number),
      makeCall: async (number) => {
        if (number !== undefined && number !== ref.current.dialNumber) {
          ref.current.setDialNumber(number);
          return;
        }
        await ref.current.makeCall();
      },
      acceptCall: () => ref.current.handleAcceptCall(),
      rejectCall: () => ref.current.handleRejectCall(),
      endCall: () => ref.current.handleEndCall(),
      toggleHold: async () => {
        ref.current.handleToggleHold();
      },
      toggleMute: () => ref.current.handleToggleMute(),
      sendDTMF: (tone) => ref.current.sendDTMF(tone),
      transferCall: (target) => ref.current.transferCall(target),
      startAttendedTransfer: (target, name) => ref.current.startAttendedTransfer(target, name),
      completeTransfer: () => ref.current.completeTransfer(),
      cancelTransfer: () => ref.current.cancelTransfer(),
      mergeConference: () => ref.current.mergeConference(),
      openRail: (opts) => {
        if (opts?.number) ref.current.setDialNumber(opts.number);
        ref.current.setIsDialpadOpen(true);
      },
      closeRail: () => {
        if (!ref.current.activeCall) ref.current.setIsDialpadOpen(false);
      },
      minimiseRail: () => {
        if (ref.current.activeCall) ref.current.setIsDialpadOpen(false);
      },
      reconnect: async () => {},
      clearMissedCall: () => ref.current.clearMissedCall(),
      clearError: () => ref.current.setError(""),
      unlockSound: () => {},
    }),
    []
  );
}

/**
 * Rail rule the legacy context doesn't know: an incoming ring or a call
 * becoming active forces the rail open. Called once from `CallRail`.
 */
export function useRailAdapterEffects() {
  const { activeCall, setIsDialpadOpen } = useCall();
  const id = activeCall?.id;
  const status = activeCall?.status;
  const direction = activeCall?.direction;
  useEffect(() => {
    if (!id) return;
    if ((direction === "incoming" && status === "ringing") || status === "active") {
      setIsDialpadOpen(true);
    }
  }, [id, status, direction, setIsDialpadOpen]);
}
