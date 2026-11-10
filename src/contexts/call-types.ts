/**
 * Shared type model for the calling stack (CallContext, the call rail and
 * everything that consumes `useCallState()` / `useCallActions()`).
 *
 * This file is the contract CL-01 (CallContext/SipService), CL-02 (rail UI)
 * and CL-03 (access, click-to-call) code against. It contains types only:
 * no React, no sip.js imports, so UI tests can mock the contexts freely.
 */
import type { SipConfigurationDetail } from '@/api/generated/interfaces';

// ---------------------------------------------------------------------------
// Call
// ---------------------------------------------------------------------------

/**
 * Lifecycle of the one call the softphone can carry.
 * - `ringing`: incoming INVITE not yet answered, or outgoing leg ringing (180)
 * - `connecting`: outgoing INVITE sent, no provisional response yet
 * - `active`: media flowing (also while on hold)
 * - `ending`: BYE sent, waiting for the Terminated event
 * There is no `idle`: an idle softphone has `activeCall === null`.
 */
export type CallStatus = 'ringing' | 'connecting' | 'active' | 'ending';

export type CallDirection = 'incoming' | 'outgoing';

/** Attended-transfer phase of the main call. */
export type TransferPhase = 'idle' | 'consulting' | 'conferenced';

export type ConsultationStatus = 'connecting' | 'ringing' | 'active' | 'ended' | 'failed';

/** The second (consultation) leg during an attended transfer. */
export interface ConsultationCall {
  targetNumber: string;
  targetName?: string;
  status: ConsultationStatus;
  startTime?: Date;
  /** Backend call-log id of the consultation leg, once known. */
  logId?: number | null;
}

export interface ActiveCall {
  /** Client-side id (unique per call instance, used as React key). */
  id: string;
  /** SIP Call-ID of the INVITE; the backend dedupes `log_incoming_call` on it. */
  sipCallId: string;
  /** `X-EchoDesk-Call` header (Asterisk LINKEDID) when the PBX sends it. */
  pbxCallId?: string;
  /**
   * Backend `CallLog` id. `null` until the background log write resolves
   * (or when it failed); accept/decline never wait for it.
   */
  logId: number | null;
  /** True while the log write is in flight; notes etc. stay disabled. */
  logPending: boolean;
  number: string;
  callerName?: string;
  direction: CallDirection;
  status: CallStatus;
  /** Set when the call becomes `active`; `useCallDuration` ticks from it. */
  startTime?: Date;
  isOnHold: boolean;
  isMuted: boolean;
  transferPhase: TransferPhase;
  consultationCall: ConsultationCall | null;
  /**
   * A ringall sibling answered this call. The PBX CANCEL that follows must
   * not be logged as missed nor `end_call`ed.
   */
  answeredElsewhere: boolean;
}

/** Why `onCallEnded` fired; CallContext maps each reason to one log write. */
export type CallEndReason = 'ended' | 'failed' | 'rejected' | 'transferred' | 'busy';

// ---------------------------------------------------------------------------
// SIP registration
// ---------------------------------------------------------------------------

/**
 * - `off`: no SIP configuration / user has no softphone access
 * - `connecting`: UA starting or REGISTER in flight
 * - `registered`: ready to place and receive calls
 * - `reconnecting`: transport dropped, automatic retry in progress
 * - `failed`: retries exhausted (the rail SIP pill becomes a Reconnect button)
 * - `offline`: browser reports no network
 */
export type SipState = 'off' | 'connecting' | 'registered' | 'reconnecting' | 'failed' | 'offline';

// ---------------------------------------------------------------------------
// Rail
// ---------------------------------------------------------------------------

export type RailMode = 'closed' | 'open' | 'minimised';

export interface RailState {
  mode: RailMode;
  /** Number to put in the dial field when the rail opens (click-to-call). */
  prefill: string | null;
  /** Dial `prefill` immediately once the rail is open. */
  autoDial: boolean;
}

export interface OpenRailOptions {
  number?: string;
  autoDial?: boolean;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/**
 * Error keys live under `calls.errors.<key>` (owned by CL-01). The UI
 * translates them; nothing user-facing is an English string.
 */
export interface CallError {
  key: string;
  params?: Record<string, string | number>;
}

export interface MissedCall {
  number: string;
  time: Date;
}

/** Second INVITE rejected with 486 while a call was in progress. */
export interface BusyRejectedCall {
  number: string;
  time: Date;
}

// ---------------------------------------------------------------------------
// Context values
// ---------------------------------------------------------------------------

/** Read-only state; re-renders consumers when the call model changes. */
export interface CallStateValue {
  activeCall: ActiveCall | null;
  sipState: SipState;
  activeSipConfig: SipConfigurationDetail | null;
  dialNumber: string;
  error: CallError | null;
  /** True while the SIP configuration is being loaded. */
  loading: boolean;
  rail: RailState;
  /** Incremented after every call end so lists can refetch. */
  callEndedCounter: number;
  missedCall: MissedCall | null;
  busyRejected: BusyRejectedCall | null;
  /** Ringtone `AudioContext` is suspended (autoplay policy); show the unlock banner. */
  soundBlocked: boolean;
}

/** Stable action callbacks; memoised once with refs so they never change identity. */
export interface CallActionsValue {
  setDialNumber: (number: string) => void;
  /** Dials `number`, or `dialNumber` when omitted. */
  makeCall: (number?: string) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => Promise<void>;
  endCall: () => Promise<void>;
  toggleHold: () => Promise<void>;
  toggleMute: () => void;
  /** Returns false when no leg could carry the tone. */
  sendDTMF: (tone: string) => boolean;
  /** Blind transfer. Sets `error` and rethrows on failure. */
  transferCall: (targetNumber: string) => Promise<void>;
  startAttendedTransfer: (targetNumber: string, targetName?: string) => Promise<void>;
  completeTransfer: () => Promise<void>;
  cancelTransfer: () => Promise<void>;
  mergeConference: () => Promise<void>;
  /** Opens the rail (forced open on ring / active regardless of this call). */
  openRail: (opts?: OpenRailOptions) => void;
  /** Allowed only when idle (no `activeCall`). */
  closeRail: () => void;
  /** Allowed only during a call. */
  minimiseRail: () => void;
  /** Transport reconnect + re-REGISTER after `failed`/`offline`. */
  reconnect: () => Promise<void>;
  clearMissedCall: () => void;
  clearError: () => void;
  /** Resume the shared `AudioContext` from a user gesture. */
  unlockSound: () => void;
}
