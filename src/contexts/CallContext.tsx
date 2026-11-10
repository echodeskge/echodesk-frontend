'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import type { Invitation } from 'sip.js';
import {
  SipService,
  SipCallError,
  toCallError,
  type IceServerConfig,
  type SoftphoneConfig,
} from '@/services/SipService';
import {
  sipConfigurationsList,
  sipConfigurationsMyConfigRetrieve,
  sipConfigurationsWebrtcConfigRetrieve,
  callLogsInitiateCallCreate,
  callLogsLogIncomingCallCreate,
  callLogsEndCallCreate,
  callLogsUpdateStatusPartialUpdate,
  callLogsInitiateConsultationCreate,
  callLogsCompleteAttendedTransferCreate,
  callLogsCancelConsultationCreate,
  callLogsMergeConferenceCreate,
} from '@/api/generated/api';
import type {
  CallLog,
  CallLogCreateRequest,
  MySoftphoneConfig,
  SoftphoneSipConfiguration,
  StatusB9eEnum,
} from '@/api/generated/interfaces';
import { useAuth } from '@/contexts/AuthContext';
import { useCallingAccess } from '@/lib/calling-access';
import { useCallDuration } from '@/hooks/useCallDuration';
import { onCallEvent, type CallEventPayload } from '@/lib/call-events';
import type {
  ActiveCall,
  CallActionsValue,
  CallEndReason,
  CallError,
  CallStateValue,
  CallStatus,
  CallValue,
  MissedCall,
  BusyRejectedCall,
  OpenRailOptions,
  RailState,
  SipState,
} from '@/contexts/call-types';

export type {
  ActiveCall,
  CallStatus,
  ConsultationCall,
  TransferPhase,
  CallError,
  SipState,
  RailState,
  CallStateValue,
  CallActionsValue,
  CallValue,
} from '@/contexts/call-types';

// ---------------------------------------------------------------------------
// Local types
// ---------------------------------------------------------------------------

/** Fields the softphone endpoints add that the generated client may not know yet. */
interface SoftphoneConfigExtras {
  wss_url?: string | null;
  ice_servers?: IceServerConfig[] | null;
}

type MyConfigResponse = MySoftphoneConfig &
  SoftphoneConfigExtras & {
    sip_configuration: SoftphoneSipConfiguration & SoftphoneConfigExtras;
  };

type WebrtcConfigResponse = SoftphoneSipConfiguration & SoftphoneConfigExtras;

/** `log_incoming_call` body incl. the contract fields (`pbx_call_id` is not generated yet). */
type IncomingLogRequest = CallLogCreateRequest & {
  sip_call_id?: string;
  pbx_call_id?: string;
};

interface LogTracker {
  /** Resolves to the CallLog id, or null when the write failed / was abandoned. */
  logId: Promise<number | null>;
  resolve: (id: number | null) => void;
  /** Writes against this log run in order, after the log exists. */
  chain: Promise<unknown>;
}

const ERROR_AUTO_CLEAR_MS = 6_000;
const UNREGISTERED_RETRIES = 5;
const UNREGISTERED_RETRY_STEP_MS = 5_000;
const REGISTRATION_RETRIES = 3;
const REGISTRATION_RETRY_STEP_MS = 10_000;

const RINGTONE_FREQUENCY_HZ = 800;
const RINGTONE_INTERVAL_MS = 1_000;

const CONNECTION_ERROR_KEYS = new Set(['registrationFailed', 'networkFailed', 'initFailed', 'notRegistered']);

// The softphone endpoints send sip_enabled=false with blank credentials when
// this user has nothing to register with.
function isSipEnabled(config: SoftphoneConfig): boolean {
  if (config.sip_enabled === false) return false;
  return Boolean(config.username);
}

function newCallId(prefix: string, seed: string): string {
  const rand =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `${prefix}-${seed || rand}-${Date.now()}`;
}

// ---------------------------------------------------------------------------
// Contexts
// ---------------------------------------------------------------------------

const CallStateContext = createContext<CallStateValue | undefined>(undefined);
const CallActionsContext = createContext<CallActionsValue | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export const CallProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { canUseSoftphone } = useCallingAccess();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;

  // ---- State ----
  const [activeCall, setActiveCallState] = useState<ActiveCall | null>(null);
  const [sipState, setSipStateState] = useState<SipState>('off');
  const [activeSipConfig, setActiveSipConfig] = useState<SoftphoneConfig | null>(null);
  const [dialNumber, setDialNumberState] = useState('');
  const [error, setErrorState] = useState<CallError | null>(null);
  const [loading, setLoading] = useState(true);
  const [rail, setRailState] = useState<RailState>({ mode: 'closed', prefill: null, autoDial: false });
  const [callEndedCounter, setCallEndedCounter] = useState(0);
  const [missedCall, setMissedCall] = useState<MissedCall | null>(null);
  const [busyRejected, setBusyRejected] = useState<BusyRejectedCall | null>(null);
  const [soundBlocked, setSoundBlocked] = useState(false);

  // ---- Refs (synchronous mirrors read by SIP event handlers and actions) ----
  const activeCallRef = useRef<ActiveCall | null>(null);
  const sipStateRef = useRef<SipState>('off');
  const activeSipConfigRef = useRef<SoftphoneConfig | null>(null);
  const dialNumberRef = useRef('');
  const railRef = useRef<RailState>(rail);
  const userIdRef = useRef<number | null>(userId);
  const sipServiceRef = useRef<SipService | null>(null);
  const localAudioRef = useRef<HTMLAudioElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const mountedRef = useRef(true);
  const logsRef = useRef(new Map<string, LogTracker>());
  const retryRef = useRef<{ attempts: number; timer: ReturnType<typeof setTimeout> | null }>({
    attempts: 0,
    timer: null,
  });
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const ringingRef = useRef(false);
  const ringTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  useEffect(() => {
    activeSipConfigRef.current = activeSipConfig;
  }, [activeSipConfig]);

  // ---- Synchronous state wrappers ----

  const setSipState = useCallback((next: SipState) => {
    sipStateRef.current = next;
    if (mountedRef.current) setSipStateState(next);
  }, []);

  const updateRail = useCallback((fn: (prev: RailState) => RailState) => {
    const next = fn(railRef.current);
    if (
      next.mode === railRef.current.mode &&
      next.prefill === railRef.current.prefill &&
      next.autoDial === railRef.current.autoDial
    ) {
      return;
    }
    railRef.current = next;
    if (mountedRef.current) setRailState(next);
  }, []);

  /**
   * Every write to `activeCall` goes through here so `activeCallRef` is
   * current *before* the next SIP event fires (C2). Rail rule: an incoming
   * ring or a call turning active forces the rail open.
   */
  const updateCall = useCallback(
    (next: ActiveCall | null | ((prev: ActiveCall | null) => ActiveCall | null)) => {
      const prev = activeCallRef.current;
      const value = typeof next === 'function' ? next(prev) : next;
      if (value === prev) return;
      activeCallRef.current = value;
      if (mountedRef.current) setActiveCallState(value);
      if (value) {
        const newIncomingRing = value.direction === 'incoming' && value.status === 'ringing' && prev?.id !== value.id;
        const becameActive = value.status === 'active' && prev?.status !== 'active';
        if (newIncomingRing || becameActive) {
          updateRail((r) => (r.mode === 'open' ? r : { ...r, mode: 'open' }));
        }
      }
    },
    [updateRail]
  );

  // Reading through a function keeps TypeScript from narrowing the ref
  // across awaits (the ref changes while an action is suspended).
  const readActiveCall = useCallback((): ActiveCall | null => activeCallRef.current, []);

  const setDialNumber = useCallback((number: string) => {
    dialNumberRef.current = number;
    setDialNumberState(number);
  }, []);

  const setError = useCallback((next: CallError | null) => {
    if (!mountedRef.current) return;
    setErrorState(next);
  }, []);

  const clearError = useCallback(() => setError(null), [setError]);

  // Errors clear themselves; the rail strip is informational.
  useEffect(() => {
    if (errorTimerRef.current) {
      clearTimeout(errorTimerRef.current);
      errorTimerRef.current = null;
    }
    if (!error) return;
    errorTimerRef.current = setTimeout(() => setErrorState(null), ERROR_AUTO_CLEAR_MS);
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, [error]);

  // ---------------------------------------------------------------------------
  // Ringtone: one AudioContext for the provider's lifetime (C8)
  // ---------------------------------------------------------------------------

  const getAudioContext = useCallback((): AudioContext | null => {
    if (typeof window === 'undefined') return null;
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      try {
        audioContextRef.current = new Ctor();
      } catch {
        return null;
      }
    }
    return audioContextRef.current;
  }, []);

  const ringTick = useCallback(() => {
    ringTimerRef.current = null;
    if (!ringingRef.current || !mountedRef.current) return;
    const ctx = audioContextRef.current;
    if (!ctx || ctx.state !== 'running') {
      setSoundBlocked(true);
      return;
    }
    try {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.frequency.setValueAtTime(RINGTONE_FREQUENCY_HZ, ctx.currentTime);
      oscillator.type = 'sine';
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.1);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.5);
    } catch (err) {
      console.warn('[calls] ringtone failed:', err);
      ringingRef.current = false;
      return;
    }
    ringTimerRef.current = setTimeout(ringTick, RINGTONE_INTERVAL_MS);
  }, []);

  const playRingtone = useCallback(() => {
    if (ringingRef.current) return;
    ringingRef.current = true;
    const ctx = getAudioContext();
    if (!ctx) return;
    const start = () => {
      if (!ringingRef.current) return;
      if (ctx.state === 'running') {
        setSoundBlocked(false);
        if (!ringTimerRef.current) ringTick();
      } else {
        setSoundBlocked(true);
      }
    };
    if (ctx.state === 'running') {
      start();
    } else {
      ctx.resume().then(start, () => setSoundBlocked(true));
    }
  }, [getAudioContext, ringTick]);

  const stopRingtone = useCallback(() => {
    ringingRef.current = false;
    if (ringTimerRef.current) {
      clearTimeout(ringTimerRef.current);
      ringTimerRef.current = null;
    }
  }, []);

  /** Resume the shared AudioContext from a user gesture (autoplay policy). */
  const unlockSound = useCallback(() => {
    const ctx = getAudioContext();
    if (!ctx) return;
    const done = () => {
      if (!mountedRef.current) return;
      const running = ctx.state === 'running';
      setSoundBlocked(!running);
      if (running && ringingRef.current && !ringTimerRef.current) ringTick();
    };
    if (ctx.state === 'running') {
      done();
    } else {
      ctx.resume().then(done, done);
    }
  }, [getAudioContext, ringTick]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onGesture = () => {
      unlockSound();
      window.removeEventListener('pointerdown', onGesture);
      window.removeEventListener('keydown', onGesture);
    };
    window.addEventListener('pointerdown', onGesture, { passive: true });
    window.addEventListener('keydown', onGesture);
    return () => {
      window.removeEventListener('pointerdown', onGesture);
      window.removeEventListener('keydown', onGesture);
    };
  }, [unlockSound]);

  useEffect(
    () => () => {
      stopRingtone();
      const ctx = audioContextRef.current;
      audioContextRef.current = null;
      if (ctx && ctx.state !== 'closed') ctx.close().catch(() => {});
    },
    [stopRingtone]
  );

  // ---------------------------------------------------------------------------
  // Call-log bookkeeping: UI first, writes in the background (C1)
  // ---------------------------------------------------------------------------

  /**
   * Register a call before its log exists so status writes that arrive
   * early (a callee answering before the INVITE promise settles) queue
   * instead of being dropped.
   */
  const reserveLog = useCallback((callId: string): LogTracker => {
    const existing = logsRef.current.get(callId);
    if (existing) return existing;
    let resolve: (id: number | null) => void = () => {};
    const logId = new Promise<number | null>((r) => {
      resolve = r;
    });
    const tracker: LogTracker = { logId, resolve, chain: Promise.resolve() };
    logsRef.current.set(callId, tracker);
    return tracker;
  }, []);

  const startLog = useCallback(
    (callId: string, create: () => Promise<CallLog>, onCreated?: (log: CallLog) => void) => {
      const tracker = reserveLog(callId);
      create().then(
        (log) => {
          onCreated?.(log);
          tracker.resolve(log.id);
        },
        (err) => {
          console.error('[calls] call log write failed:', err);
          setError({ key: 'logFailed' });
          tracker.resolve(null);
        }
      );
      tracker.logId.then((id) => {
        updateCall((prev) => (prev && prev.id === callId ? { ...prev, logId: id, logPending: false } : prev));
      });
    },
    [reserveLog, setError, updateCall]
  );

  /** The call never got a log (dialling failed): release queued writes. */
  const abandonLog = useCallback((callId: string) => {
    const tracker = logsRef.current.get(callId);
    if (!tracker) return;
    tracker.resolve(null);
    logsRef.current.delete(callId);
  }, []);

  /** Run `write` once the log exists; writes for one call are serialised. */
  const queueLogWrite = useCallback((callId: string, write: (logId: number) => Promise<unknown>, final = false) => {
    const tracker = logsRef.current.get(callId);
    if (!tracker) return;
    tracker.chain = tracker.chain
      .then(() => tracker.logId)
      .then((id) => (id === null ? undefined : write(id)))
      .catch((err) => {
        console.error('[calls] call log update failed:', err);
      });
    if (final) {
      tracker.chain.finally(() => {
        if (logsRef.current.get(callId) === tracker) logsRef.current.delete(callId);
      });
    }
  }, []);

  /** Resolve the backend log id of a call, waiting for a pending write. */
  const awaitLogId = useCallback(async (callId: string): Promise<number | null> => {
    const tracker = logsRef.current.get(callId);
    if (tracker) return tracker.logId;
    return activeCallRef.current?.id === callId ? activeCallRef.current.logId : null;
  }, []);

  const bumpCallEnded = useCallback(() => {
    if (mountedRef.current) setCallEndedCounter((c) => c + 1);
  }, []);

  // ---------------------------------------------------------------------------
  // Registration retries (C4)
  // ---------------------------------------------------------------------------

  const clearRetry = useCallback(() => {
    if (retryRef.current.timer) {
      clearTimeout(retryRef.current.timer);
      retryRef.current.timer = null;
    }
  }, []);

  const scheduleReconnect = useCallback(
    (kind: 'unregistered' | 'registration') => {
      if (!mountedRef.current || !sipServiceRef.current) return;
      if (retryRef.current.timer) return; // one retry in flight at a time
      const max = kind === 'registration' ? REGISTRATION_RETRIES : UNREGISTERED_RETRIES;
      const step = kind === 'registration' ? REGISTRATION_RETRY_STEP_MS : UNREGISTERED_RETRY_STEP_MS;
      const attempt = retryRef.current.attempts + 1;
      retryRef.current.attempts = attempt;
      if (attempt > max) {
        setSipState('failed');
        setError({ key: kind === 'registration' ? 'registrationFailed' : 'networkFailed' });
        return;
      }
      setSipState('reconnecting');
      retryRef.current.timer = setTimeout(() => {
        retryRef.current.timer = null;
        const sip = sipServiceRef.current;
        if (!mountedRef.current || !sip) return;
        sip.reconnect().catch(() => {
          // The failure events (onUnregistered / onRegistrationFailed) schedule
          // the next attempt; this covers a transport that never came back.
          if (!retryRef.current.timer) scheduleReconnect(kind);
        });
      }, attempt * step);
    },
    [setError, setSipState]
  );

  // ---------------------------------------------------------------------------
  // SIP service lifecycle
  // ---------------------------------------------------------------------------

  const teardownSipService = useCallback(async () => {
    clearRetry();
    retryRef.current.attempts = 0;
    const sip = sipServiceRef.current;
    sipServiceRef.current = null;
    stopRingtone();
    if (sip) {
      sip.removeAllListeners();
      try {
        await sip.disconnect();
      } catch (err) {
        console.warn('[calls] disconnect failed:', err);
      }
    }
    if (localAudioRef.current) localAudioRef.current.srcObject = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
  }, [clearRetry, stopRingtone]);

  const initializeSipService = useCallback(
    async (config: SoftphoneConfig) => {
      if (!localAudioRef.current || !remoteAudioRef.current) {
        setError({ key: 'initFailed' });
        setSipState('failed');
        return;
      }
      if (sipServiceRef.current) {
        await teardownSipService();
      }

      const sip = new SipService(localAudioRef.current, remoteAudioRef.current);
      // Set before initialize() so cleanup and retries during the handshake
      // always see the service (C3).
      sipServiceRef.current = sip;
      const isCurrent = () => mountedRef.current && sipServiceRef.current === sip;
      setSipState('connecting');

      sip.on('onRegistered', () => {
        if (!isCurrent()) return;
        clearRetry();
        retryRef.current.attempts = 0;
        setSipState('registered');
        setErrorState((prev) => (prev && CONNECTION_ERROR_KEYS.has(prev.key) ? null : prev));
      });

      sip.on('onUnregistered', () => {
        if (!isCurrent()) return;
        if (sipStateRef.current === 'offline') return;
        scheduleReconnect('unregistered');
      });

      sip.on('onRegistrationFailed', (err) => {
        if (!isCurrent()) return;
        setError(err);
        scheduleReconnect('registration');
      });

      sip.on('onTransportState', (state) => {
        if (!isCurrent()) return;
        if (state === 'disconnected' && sipStateRef.current === 'registered') {
          setSipState('reconnecting');
        }
      });

      sip.on('onIncomingCall', (invitation: Invitation) => {
        if (!isCurrent()) return;
        const info = sip.getIncomingInfo(invitation);
        const callId = newCallId('in', info.sipCallId);
        playRingtone();

        // UI first: accept / decline never wait for the backend (C1).
        updateCall({
          id: callId,
          sipCallId: info.sipCallId,
          pbxCallId: info.pbxCallId,
          logId: null,
          logPending: true,
          number: info.number,
          callerName: info.displayName,
          direction: 'incoming',
          status: 'ringing',
          isOnHold: false,
          isMuted: false,
          transferPhase: 'idle',
          consultationCall: null,
          answeredElsewhere: false,
        });

        const config = activeSipConfigRef.current;
        const body: IncomingLogRequest = {
          caller_number: info.number || 'anonymous',
          recipient_number: config?.phone_number || config?.username || '',
          direction: 'inbound',
          sip_call_id: info.sipCallId,
          ...(info.pbxCallId ? { pbx_call_id: info.pbxCallId } : {}),
        };
        // A 200 (the backend already has this sip_call_id) carries the same
        // row as a 201; the generated client returns the body either way.
        startLog(
          callId,
          () => callLogsLogIncomingCallCreate(body),
          (log) => {
            if (log.client_name) {
              updateCall((prev) =>
                prev && prev.id === callId && !prev.callerName ? { ...prev, callerName: log.client_name } : prev
              );
            }
          }
        );
      });

      sip.on('onCallProgress', () => {
        if (!isCurrent()) return;
        updateCall((prev) =>
          prev && prev.direction === 'outgoing' && prev.status === 'connecting' ? { ...prev, status: 'ringing' } : prev
        );
      });

      sip.on('onCallAccepted', () => {
        if (!isCurrent()) return;
        stopRingtone();
        const current = activeCallRef.current;
        if (!current) return;
        updateCall((prev) => (prev ? { ...prev, status: 'active', startTime: new Date() } : prev));
        queueLogWrite(current.id, (logId) => callLogsUpdateStatusPartialUpdate(logId, { status: 'answered' }));
      });

      sip.on('onCallHeld', (held) => {
        if (!isCurrent()) return;
        updateCall((prev) => (prev && prev.isOnHold !== held ? { ...prev, isOnHold: held } : prev));
      });

      sip.on('onCallFailed', (err) => {
        if (!isCurrent()) return;
        setError(err);
      });

      sip.on('onCallQualityWarning', (warning) => {
        if (!isCurrent()) return;
        setError(warning);
      });

      sip.on('onCallBusyRejected', (info) => {
        if (!isCurrent()) return;
        const time = new Date();
        setBusyRejected({ number: info.number, time });
        setMissedCall({ number: info.number, time });
      });

      sip.on('onCallEnded', (reason: CallEndReason) => {
        if (!isCurrent()) return;
        stopRingtone();
        const current = activeCallRef.current;
        if (!current) return;

        // `status` may already be 'ending'; the start time says whether it was ever answered.
        const wasActive = current.status === 'active' || Boolean(current.startTime);
        const unansweredIncoming = current.direction === 'incoming' && !wasActive;
        let write: ((logId: number) => Promise<unknown>) | null = null;
        let status: StatusB9eEnum | null = null;

        if (current.answeredElsewhere || reason === 'transferred') {
          // The backend already settled this leg (cancelled by the answering
          // sibling, or complete_attended_transfer).
        } else if (reason === 'ended') {
          if (unansweredIncoming) {
            setMissedCall({ number: current.number, time: new Date() });
          }
          write = (logId) => callLogsEndCallCreate(logId, { status: 'ended' });
        } else if (reason === 'rejected') {
          status = 'cancelled';
        } else if (reason === 'busy') {
          status = 'busy';
        } else if (reason === 'failed') {
          if (wasActive) write = (logId) => callLogsEndCallCreate(logId, { status: 'failed' });
          else status = 'failed';
        }
        if (!write && status) {
          const finalStatus = status;
          write = (logId) => callLogsUpdateStatusPartialUpdate(logId, { status: finalStatus });
        }
        if (write) queueLogWrite(current.id, write, true);
        else logsRef.current.delete(current.id);

        updateCall(null);
        bumpCallEnded();
      });

      sip.on('onConsultationProgress', () => {
        if (!isCurrent()) return;
        updateCall((prev) =>
          prev?.consultationCall && prev.consultationCall.status === 'connecting'
            ? { ...prev, consultationCall: { ...prev.consultationCall, status: 'ringing' } }
            : prev
        );
      });

      sip.on('onConsultationAccepted', () => {
        if (!isCurrent()) return;
        updateCall((prev) =>
          prev?.consultationCall
            ? { ...prev, consultationCall: { ...prev.consultationCall, status: 'active', startTime: new Date() } }
            : prev
        );
      });

      const resetConsultation = () => {
        updateCall((prev) =>
          prev && (prev.transferPhase !== 'idle' || prev.consultationCall)
            ? { ...prev, transferPhase: 'idle', consultationCall: null }
            : prev
        );
        sip.cancelConsultation().catch(() => {});
      };

      sip.on('onConsultationEnded', () => {
        if (!isCurrent()) return;
        if (activeCallRef.current?.transferPhase === 'consulting') resetConsultation();
      });

      sip.on('onConsultationFailed', (err) => {
        if (!isCurrent()) return;
        setError(err);
        resetConsultation();
      });

      try {
        await sip.initialize(config);
      } catch (err) {
        console.error('[calls] SIP initialisation failed:', err);
        if (isCurrent()) {
          setError(toCallError(err, 'initFailed'));
          setSipState('failed');
        }
        // Leave nothing behind: the UA (and its reconnect timers) is stopped
        // and `reconnect()` re-initialises from the config.
        try {
          await sip.disconnect();
        } finally {
          if (sipServiceRef.current === sip) sipServiceRef.current = null;
        }
      }
    },
    [
      bumpCallEnded,
      clearRetry,
      playRingtone,
      queueLogWrite,
      scheduleReconnect,
      setError,
      setSipState,
      startLog,
      stopRingtone,
      teardownSipService,
      updateCall,
    ]
  );

  const loadSipConfiguration = useCallback(async () => {
    setLoading(true);
    try {
      // The user's own phone assignment first
      try {
        const my = (await sipConfigurationsMyConfigRetrieve()) as MyConfigResponse;
        if (my && my.sip_configuration) {
          if (my.sip_enabled === false || !my.extension) {
            setActiveSipConfig(null);
            return;
          }
          const base = my.sip_configuration;
          setActiveSipConfig({
            ...base,
            username: my.extension,
            password: my.extension_password,
            phone_number: my.phone_number || base.phone_number,
            wss_url: my.wss_url ?? base.wss_url ?? null,
            ice_servers: my.ice_servers ?? base.ice_servers ?? null,
          });
          return;
        }
      } catch {
        // No personal assignment: fall back to the tenant default below.
      }

      const list = await sipConfigurationsList();
      const defaultConfig = list.results.find((c) => c.is_default);
      if (!defaultConfig) {
        setActiveSipConfig(null);
        setError({ key: 'configMissing' });
        return;
      }
      const webrtc = (await sipConfigurationsWebrtcConfigRetrieve(defaultConfig.id)) as WebrtcConfigResponse;
      if (!isSipEnabled(webrtc)) {
        setActiveSipConfig(null);
        return;
      }
      setActiveSipConfig(webrtc);
    } catch (err) {
      console.error('[calls] failed to load the SIP configuration:', err);
      setActiveSipConfig(null);
      setError({ key: 'configLoadFailed' });
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [setError]);

  // Load (and reload on user change) while the user may use the softphone.
  useEffect(() => {
    if (!canUseSoftphone || !userId) {
      setLoading(false);
      setActiveSipConfig(null);
      return;
    }
    loadSipConfiguration();
    return () => {
      setActiveSipConfig(null);
    };
  }, [canUseSoftphone, userId, loadSipConfiguration]);

  // Connect when a usable configuration is known; disconnect when it goes away.
  useEffect(() => {
    if (activeSipConfig && isSipEnabled(activeSipConfig)) {
      if (!sipServiceRef.current) initializeSipService(activeSipConfig);
      return;
    }
    if (sipServiceRef.current) {
      teardownSipService();
      updateCall(null);
    }
    setSipState('off');
  }, [activeSipConfig, initializeSipService, teardownSipService, updateCall, setSipState]);

  // Unmount: drop everything.
  useEffect(
    () => () => {
      teardownSipService();
    },
    [teardownSipService]
  );

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const reconnect = useCallback(async () => {
    clearRetry();
    retryRef.current.attempts = 0;
    const sip = sipServiceRef.current;
    if (!sip) {
      const config = activeSipConfigRef.current;
      if (config && isSipEnabled(config)) await initializeSipService(config);
      return;
    }
    setSipState('connecting');
    try {
      await sip.reconnect();
    } catch (err) {
      if (!mountedRef.current) return;
      setSipState('failed');
      setError(toCallError(err, 'networkFailed'));
    }
  }, [clearRetry, initializeSipService, setError, setSipState]);

  const reconnectRef = useRef(reconnect);
  useEffect(() => {
    reconnectRef.current = reconnect;
  }, [reconnect]);

  // Network and tab visibility drive reconnects (C4).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onOnline = () => {
      if (sipServiceRef.current || activeSipConfigRef.current) reconnectRef.current();
    };
    const onOffline = () => {
      clearRetry();
      if (sipServiceRef.current) setSipState('offline');
    };
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      const state = sipStateRef.current;
      if ((state === 'failed' || state === 'reconnecting' || state === 'offline') && navigator.onLine !== false) {
        reconnectRef.current();
      }
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [clearRetry, setSipState]);

  const openRail = useCallback(
    (opts?: OpenRailOptions) => {
      const number = opts?.number?.trim() || null;
      if (number) setDialNumber(number);
      updateRail((r) => ({
        mode: 'open',
        prefill: number ?? r.prefill,
        autoDial: Boolean(number && opts?.autoDial),
      }));
    },
    [setDialNumber, updateRail]
  );

  const closeRail = useCallback(() => {
    if (activeCallRef.current) return; // only when idle
    updateRail(() => ({ mode: 'closed', prefill: null, autoDial: false }));
  }, [updateRail]);

  const minimiseRail = useCallback(() => {
    if (!activeCallRef.current) return; // only during a call
    updateRail((r) => (r.mode === 'minimised' ? r : { ...r, mode: 'minimised' }));
  }, [updateRail]);

  const makeCall = useCallback(
    async (number?: string) => {
      const target = (number ?? dialNumberRef.current).trim();
      if (!target) return;
      const sip = sipServiceRef.current;
      if (!sip || sipStateRef.current !== 'registered') {
        setError({ key: 'notRegistered' });
        return;
      }
      if (activeCallRef.current) {
        setError({ key: 'callInProgress' });
        return;
      }

      const callId = newCallId('out', '');
      updateCall({
        id: callId,
        sipCallId: '',
        logId: null,
        logPending: true,
        number: target,
        direction: 'outgoing',
        status: 'connecting',
        isOnHold: false,
        isMuted: false,
        transferPhase: 'idle',
        consultationCall: null,
        answeredElsewhere: false,
      });
      updateRail((r) => ({ ...r, mode: 'open', autoDial: false }));
      setDialNumber('');
      reserveLog(callId);

      // Dial first; the log is written once the INVITE is on its way (C6).
      let sipCallId: string;
      try {
        const result = await sip.makeCall(target);
        sipCallId = result.sipCallId;
      } catch (err) {
        setError(toCallError(err, 'callFailed'));
        abandonLog(callId);
        updateCall((prev) => (prev && prev.id === callId ? null : prev));
        bumpCallEnded();
        return;
      }
      if (readActiveCall()?.id !== callId) return; // already ended
      updateCall((prev) => (prev && prev.id === callId ? { ...prev, sipCallId } : prev));
      startLog(callId, () => callLogsInitiateCallCreate({ recipient_number: target }));
    },
    [abandonLog, bumpCallEnded, readActiveCall, reserveLog, setDialNumber, setError, startLog, updateCall, updateRail]
  );

  // Click-to-call with autoDial: dial once the rail is open.
  const makeCallRef = useRef(makeCall);
  useEffect(() => {
    makeCallRef.current = makeCall;
  }, [makeCall]);
  useEffect(() => {
    if (rail.mode !== 'open' || !rail.autoDial || !rail.prefill) return;
    if (activeCall || sipState !== 'registered') return;
    const number = rail.prefill;
    updateRail((r) => ({ ...r, autoDial: false }));
    makeCallRef.current(number);
  }, [rail, activeCall, sipState, updateRail]);

  const acceptCall = useCallback(async () => {
    const sip = sipServiceRef.current;
    const current = activeCallRef.current;
    if (!sip || !current || current.direction !== 'incoming' || current.status !== 'ringing') return;
    stopRingtone();
    try {
      await sip.acceptCall();
    } catch (err) {
      setError(toCallError(err, 'callFailed'));
    }
  }, [setError, stopRingtone]);

  const rejectCall = useCallback(async () => {
    const sip = sipServiceRef.current;
    const current = activeCallRef.current;
    if (!sip || !current || current.direction !== 'incoming' || current.status !== 'ringing') return;
    stopRingtone();
    try {
      await sip.rejectCall();
    } catch (err) {
      setError(toCallError(err, 'callFailed'));
    }
  }, [setError, stopRingtone]);

  const endCall = useCallback(async () => {
    const sip = sipServiceRef.current;
    if (!sip || !activeCallRef.current) return;
    stopRingtone();
    updateCall((prev) => (prev && prev.status !== 'ending' ? { ...prev, status: 'ending' } : prev));
    try {
      await sip.endCall();
    } catch (err) {
      setError(toCallError(err, 'callFailed'));
    }
  }, [setError, stopRingtone, updateCall]);

  const toggleHold = useCallback(async () => {
    const sip = sipServiceRef.current;
    const current = activeCallRef.current;
    if (!sip || !current || current.status !== 'active') return;
    try {
      await sip.toggleHold(!current.isOnHold);
    } catch (err) {
      setError(toCallError(err, 'holdFailed'));
    }
  }, [setError]);

  const toggleMute = useCallback(() => {
    const sip = sipServiceRef.current;
    if (!sip || !activeCallRef.current) return;
    const isMuted = sip.toggleMute();
    updateCall((prev) => (prev && prev.isMuted !== isMuted ? { ...prev, isMuted } : prev));
  }, [updateCall]);

  const sendDTMF = useCallback((tone: string): boolean => {
    const sip = sipServiceRef.current;
    if (!sip) return false;
    return sip.sendDTMF(tone);
  }, []);

  const failWith = useCallback(
    (err: unknown, fallbackKey: string): never => {
      const callError = toCallError(err, fallbackKey);
      setError(callError);
      throw err instanceof Error ? err : new SipCallError(callError.key, callError.params, err);
    },
    [setError]
  );

  const transferCall = useCallback(
    async (targetNumber: string) => {
      const sip = sipServiceRef.current;
      const current = activeCallRef.current;
      if (!sip || !current || current.status !== 'active') {
        failWith(new SipCallError('noActiveCall'), 'transferFailed');
      }
      try {
        await sip!.transferCall(targetNumber);
      } catch (err) {
        failWith(err, 'transferFailed');
      }
    },
    [failWith]
  );

  const startAttendedTransfer = useCallback(
    async (targetNumber: string, targetName?: string) => {
      const sip = sipServiceRef.current;
      const current = activeCallRef.current;
      if (!sip || !current || current.status !== 'active') {
        failWith(new SipCallError('noActiveCall'), 'consultationFailed');
      }
      const call = current!;
      const logId = await awaitLogId(call.id);
      if (logId === null) {
        failWith(new SipCallError('logFailed'), 'consultationFailed');
      }

      try {
        // 1. Log the consultation on the backend
        const res = await callLogsInitiateConsultationCreate(logId!, { target_number: targetNumber });

        // 2. Reflect it in the UI
        updateCall((prev) =>
          prev && prev.id === call.id
            ? {
                ...prev,
                transferPhase: 'consulting',
                consultationCall: {
                  targetNumber,
                  targetName,
                  status: 'connecting',
                  logId: res.consultation_log_id,
                },
              }
            : prev
        );

        // 3. Hold the main call and dial the target (hold state arrives via onCallHeld)
        await sip!.startConsultation(targetNumber);
      } catch (err) {
        updateCall((prev) =>
          prev && prev.id === call.id ? { ...prev, transferPhase: 'idle', consultationCall: null } : prev
        );
        failWith(err, 'consultationFailed');
      }
    },
    [awaitLogId, failWith, updateCall]
  );

  const completeTransfer = useCallback(async () => {
    const sip = sipServiceRef.current;
    const current = activeCallRef.current;
    if (!sip || !current) return;
    const consultation = current.consultationCall;
    if (!consultation || consultation.logId === null || consultation.logId === undefined) {
      failWith(new SipCallError('noConsultation'), 'transferFailed');
    }
    const logId = await awaitLogId(current.id);
    try {
      await sip.completeAttendedTransfer();
      if (logId !== null) {
        await callLogsCompleteAttendedTransferCreate(logId, {
          consultation_log_id: consultation!.logId as number,
          target_number: consultation!.targetNumber,
        });
      }
      logsRef.current.delete(current.id);
      // The PBX's BYE may already have ended the call through onCallEnded('transferred').
      if (readActiveCall()?.id === current.id) {
        updateCall(null);
        bumpCallEnded();
      }
    } catch (err) {
      failWith(err, 'transferFailed');
    }
  }, [awaitLogId, bumpCallEnded, failWith, readActiveCall, updateCall]);

  const mergeConference = useCallback(async () => {
    const sip = sipServiceRef.current;
    const current = activeCallRef.current;
    if (!sip || !current) return;
    const consultation = current.consultationCall;
    if (!consultation || consultation.logId === null || consultation.logId === undefined) {
      failWith(new SipCallError('noConsultation'), 'mergeFailed');
    }
    const logId = await awaitLogId(current.id);
    if (logId === null) {
      failWith(new SipCallError('logFailed'), 'mergeFailed');
    }
    try {
      // The backend bridges both channels into a ConfBridge via AMI; our
      // legs then hang up without a further log write.
      await callLogsMergeConferenceCreate(logId!, { consultation_log_id: consultation!.logId as number });
      logsRef.current.delete(current.id);
      updateCall((prev) => (prev && prev.id === current.id ? null : prev));
      await sip.endCall();
      bumpCallEnded();
    } catch (err) {
      failWith(err, 'mergeFailed');
    }
  }, [awaitLogId, bumpCallEnded, failWith, updateCall]);

  const cancelTransfer = useCallback(async () => {
    const sip = sipServiceRef.current;
    const current = activeCallRef.current;
    if (!sip || !current) return;
    const consultation = current.consultationCall;
    try {
      await sip.cancelConsultation();
      if (consultation?.logId !== null && consultation?.logId !== undefined) {
        const logId = await awaitLogId(current.id);
        if (logId !== null) {
          await callLogsCancelConsultationCreate(logId, { consultation_log_id: consultation.logId });
        }
      }
    } catch (err) {
      failWith(err, 'transferFailed');
    } finally {
      updateCall((prev) =>
        prev && prev.id === current.id && (prev.transferPhase !== 'idle' || prev.consultationCall)
          ? { ...prev, transferPhase: 'idle', consultationCall: null }
          : prev
      );
    }
  }, [awaitLogId, failWith, updateCall]);

  const clearMissedCall = useCallback(() => {
    setMissedCall(null);
    setBusyRejected(null);
  }, []);

  // ---------------------------------------------------------------------------
  // Backend call events: answered elsewhere + list refresh
  // ---------------------------------------------------------------------------

  useEffect(
    () =>
      onCallEvent((call: CallEventPayload) => {
        queryClient.invalidateQueries({ queryKey: ['calls'] });

        const current = activeCallRef.current;
        if (!current || current.answeredElsewhere) return;
        const sameSip = Boolean(call.sip_call_id && current.sipCallId && call.sip_call_id === current.sipCallId);
        const samePbx = Boolean(call.pbx_call_id && current.pbxCallId && call.pbx_call_id === current.pbxCallId);
        if (!sameSip && !samePbx) return;

        const me = userIdRef.current;
        const byOther = call.handled_by !== null && call.handled_by !== undefined && call.handled_by !== me;
        const answeredElsewhere = call.status === 'answered' && byOther;
        const ownLegCancelled = call.status === 'cancelled' && sameSip && current.status !== 'active';
        if (!answeredElsewhere && !ownLegCancelled) return;
        if (current.status === 'active') return; // we are on this call ourselves

        stopRingtone();
        updateCall((prev) => (prev && prev.id === current.id ? { ...prev, answeredElsewhere: true } : prev));
      }),
    [queryClient, stopRingtone, updateCall]
  );

  // ---------------------------------------------------------------------------
  // Context values
  // ---------------------------------------------------------------------------

  const stateValue = useMemo<CallStateValue>(
    () => ({
      activeCall,
      sipState,
      activeSipConfig,
      dialNumber,
      error,
      loading,
      rail,
      callEndedCounter,
      missedCall,
      busyRejected,
      soundBlocked,
    }),
    [
      activeCall,
      sipState,
      activeSipConfig,
      dialNumber,
      error,
      loading,
      rail,
      callEndedCounter,
      missedCall,
      busyRejected,
      soundBlocked,
    ]
  );

  const actionsValue = useMemo<CallActionsValue>(
    () => ({
      setDialNumber,
      makeCall,
      acceptCall,
      rejectCall,
      endCall,
      toggleHold,
      toggleMute,
      sendDTMF,
      transferCall,
      startAttendedTransfer,
      completeTransfer,
      cancelTransfer,
      mergeConference,
      openRail,
      closeRail,
      minimiseRail,
      reconnect,
      clearMissedCall,
      clearError,
      unlockSound,
    }),
    [
      setDialNumber,
      makeCall,
      acceptCall,
      rejectCall,
      endCall,
      toggleHold,
      toggleMute,
      sendDTMF,
      transferCall,
      startAttendedTransfer,
      completeTransfer,
      cancelTransfer,
      mergeConference,
      openRail,
      closeRail,
      minimiseRail,
      reconnect,
      clearMissedCall,
      clearError,
      unlockSound,
    ]
  );

  return (
    <CallActionsContext.Provider value={actionsValue}>
      <CallStateContext.Provider value={stateValue}>
        {children}
        {/* Hidden audio elements for SIP: they live in the provider so they
            persist across page navigations. */}
        <audio ref={localAudioRef} autoPlay muted style={{ display: 'none' }} />
        <audio ref={remoteAudioRef} autoPlay style={{ display: 'none' }} />
      </CallStateContext.Provider>
    </CallActionsContext.Provider>
  );
};

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useCallState(): CallStateValue {
  const context = useContext(CallStateContext);
  if (context === undefined) {
    throw new Error('useCallState must be used within a CallProvider');
  }
  return context;
}

export function useCallActions(): CallActionsValue {
  const context = useContext(CallActionsContext);
  if (context === undefined) {
    throw new Error('useCallActions must be used within a CallProvider');
  }
  return context;
}

// ---------------------------------------------------------------------------
// Compatibility shim (removed once CL-02 / CL-03 migrate every consumer)
// ---------------------------------------------------------------------------

/** The old `ActiveCall` also knew an `idle` status; nothing ever set it. */
export type LegacyActiveCall = Omit<ActiveCall, 'status'> & { status: CallStatus | 'idle' };

/** Names the pre-rail components still use. */
export interface LegacyCallFields {
  callDuration: number;
  sipRegistered: boolean;
  sipConnecting: boolean;
  isDialpadOpen: boolean;
  setIsDialpadOpen: (open: boolean) => void;
  toggleDialpad: () => void;
  handleAcceptCall: () => Promise<void>;
  handleRejectCall: () => Promise<void>;
  handleEndCall: () => Promise<void>;
  handleToggleHold: () => Promise<void>;
  handleToggleMute: () => void;
}

/**
 * `useCall()` return type: the new state + actions, with `error` already
 * translated and `activeCall` widened for the legacy components.
 */
export type CallContextValue = Omit<CallValue, 'error' | 'activeCall'> & {
  error: string;
  activeCall: LegacyActiveCall | null;
} & LegacyCallFields;

/**
 * Compatibility hook: `{...state, ...actions}` plus the old field names.
 * It ticks with the call timer, so new code uses `useCallState()` /
 * `useCallActions()` and `useCallDuration()` instead.
 */
export function useCall(): CallContextValue {
  const state = useCallState();
  const actions = useCallActions();
  const t = useTranslations('calls.errors');
  const callDuration = useCallDuration(state.activeCall?.status === 'active' ? state.activeCall.startTime : null);

  const error = state.error ? t(state.error.key, state.error.params) : '';
  const { rail, sipState, activeCall } = state;
  const { openRail, closeRail, minimiseRail } = actions;

  const setIsDialpadOpen = useCallback(
    (open: boolean) => {
      if (open) openRail();
      else if (activeCall) minimiseRail();
      else closeRail();
    },
    [openRail, closeRail, minimiseRail, activeCall]
  );
  const isDialpadOpen = rail.mode === 'open';
  const toggleDialpad = useCallback(() => setIsDialpadOpen(!isDialpadOpen), [setIsDialpadOpen, isDialpadOpen]);

  return useMemo<CallContextValue>(
    () => ({
      ...state,
      ...actions,
      error,
      callDuration,
      sipRegistered: sipState === 'registered',
      sipConnecting: sipState === 'connecting' || sipState === 'reconnecting',
      isDialpadOpen,
      setIsDialpadOpen,
      toggleDialpad,
      handleAcceptCall: actions.acceptCall,
      handleRejectCall: actions.rejectCall,
      handleEndCall: actions.endCall,
      handleToggleHold: actions.toggleHold,
      handleToggleMute: actions.toggleMute,
    }),
    [state, actions, error, callDuration, sipState, isDialpadOpen, setIsDialpadOpen, toggleDialpad]
  );
}
