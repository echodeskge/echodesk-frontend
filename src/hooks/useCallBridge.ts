/**
 * Bridge between the calling UI outside the rail (click-to-call, the Calls
 * screen) and CallContext.
 *
 * CL-01 splits CallContext into `useCallState()` / `useCallActions()`
 * (`src/contexts/call-types.ts`). Until that lands, this file adapts the
 * current `useCall()` to the same vocabulary (`sipState`, `openRail`), so no
 * consumer reads `sipRegistered` / `setIsDialpadOpen` directly.
 *
 * Integration (CL-INT): replace the bodies of the two hooks with
 * `useCallState()` / `useCallActions()` and keep the exported types; the
 * consumers (`useClickToCall`, `calls-screen.tsx`) need no change.
 */
import { useCallback, useMemo } from "react";
import { useCall } from "@/contexts/CallContext";
import type { OpenRailOptions, SipState } from "@/contexts/call-types";
import type { SipConfigurationDetail } from "@/api/generated/interfaces";

export interface CallBridgeState {
  /** A call is in progress (ringing, connecting, active or ending). */
  inCall: boolean;
  sipState: SipState;
  activeSipConfig: SipConfigurationDetail | null;
  /** The SIP configuration is still loading. */
  loading: boolean;
  /**
   * Error text to show outside the rail (null when there is none). The legacy
   * context carries an English string; the split context carries a
   * `CallError` key that the rail translates.
   */
  errorText: string | null;
  /** Incremented after every call end so lists can refetch. */
  callEndedCounter: number;
  /** The rail (legacy: the dock popup) is open, so it shows errors itself. */
  railOpen: boolean;
}

export interface CallBridgeActions {
  /** Opens the rail, optionally with a number prefilled (click-to-call). */
  openRail: (opts?: OpenRailOptions) => void;
}

/** Legacy flags -> `SipState` (`off` without a configuration, `failed` when neither registered nor connecting). */
export function legacySipState(input: {
  activeSipConfig: unknown;
  sipRegistered: boolean;
  sipConnecting: boolean;
}): SipState {
  if (!input.activeSipConfig) return "off";
  if (input.sipRegistered) return "registered";
  if (input.sipConnecting) return "connecting";
  return "failed";
}

export function useCallBridgeState(): CallBridgeState {
  const call = useCall();
  const { activeCall, sipRegistered, sipConnecting, activeSipConfig, loading, error, callEndedCounter, isDialpadOpen } = call;
  return useMemo(
    () => ({
      inCall: !!activeCall,
      sipState: legacySipState({ activeSipConfig, sipRegistered, sipConnecting }),
      activeSipConfig: activeSipConfig ?? null,
      loading: !!loading,
      errorText: error ? String(error) : null,
      callEndedCounter: callEndedCounter ?? 0,
      railOpen: !!isDialpadOpen,
    }),
    [activeCall, sipRegistered, sipConnecting, activeSipConfig, loading, error, callEndedCounter, isDialpadOpen]
  );
}

export function useCallBridgeActions(): CallBridgeActions {
  const { setDialNumber, setIsDialpadOpen } = useCall();
  const openRail = useCallback(
    (opts?: OpenRailOptions) => {
      if (opts?.number !== undefined) setDialNumber(opts.number);
      setIsDialpadOpen(true);
    },
    [setDialNumber, setIsDialpadOpen]
  );
  return useMemo(() => ({ openRail }), [openRail]);
}
