import {
  UserAgent,
  Inviter,
  Invitation,
  SessionState,
  RegistererState,
  Registerer,
  TransportState,
  URI,
} from 'sip.js';
import type { Session, Web } from 'sip.js';
import type { SipConfigurationDetail } from '@/api/generated/interfaces';
import type { CallEndReason, CallError } from '@/contexts/call-types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** `RTCIceServer` as the backend serialises it (`ice_servers` in the contract). */
export interface IceServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
}

/**
 * What `initialize()` consumes: the generated SIP configuration plus the
 * fields the softphone endpoints add (`wss_url`, `ice_servers`). The
 * generated client may lag behind the backend, so they are optional here.
 */
export type SoftphoneConfig = SipConfigurationDetail & {
  wss_url?: string | null;
  ice_servers?: IceServerConfig[] | null;
  sip_enabled?: boolean;
};

/** Which media leg an in-call action targets. */
export type CallLeg = 'main' | 'consultation';

export interface IncomingCallInfo {
  /** Remote user part; empty when the INVITE carries none. */
  number: string;
  displayName?: string;
  /** SIP Call-ID of the INVITE; the backend dedupes `log_incoming_call` on it. */
  sipCallId: string;
  /** `X-EchoDesk-Call` header (Asterisk LINKEDID) when the dialplan sets it. */
  pbxCallId?: string;
}

export interface OutgoingCallInfo {
  sipCallId: string;
  /** The number actually dialled after normalisation. */
  number: string;
}

export type TransportStatus = 'connected' | 'disconnected';

export interface SipCallEvents {
  /** 1xx provisional response to our INVITE (the callee is ringing). */
  onCallProgress: () => void;
  onCallAccepted: () => void;
  /**
   * Exactly once per main session, after it terminated for any reason
   * (bye, cancel, rejection, ICE failure, attended transfer).
   */
  onCallEnded: (reason: CallEndReason) => void;
  /**
   * Informational: why an outgoing INVITE or the media path failed. Never
   * replaces `onCallEnded`; it only carries the error key.
   */
  onCallFailed: (error: CallError) => void;
  /** The hold / resume re-INVITE was answered; UI hold state follows this. */
  onCallHeld: (held: boolean) => void;
  onIncomingCall: (invitation: Invitation) => void;
  /** A second INVITE arrived during a call and was answered with 486 Busy. */
  onCallBusyRejected: (info: IncomingCallInfo) => void;
  onRegistered: () => void;
  onUnregistered: () => void;
  onRegistrationFailed: (error: CallError) => void;
  onTransportState: (state: TransportStatus) => void;
  onConsultationProgress: () => void;
  onConsultationAccepted: () => void;
  onConsultationEnded: () => void;
  onConsultationFailed: (error: CallError) => void;
  onCallQualityWarning: (warning: CallError) => void;
}

type Listener<K extends keyof SipCallEvents> = SipCallEvents[K];

/** Error carrying a `calls.errors.*` key instead of an English message. */
export class SipCallError extends Error {
  readonly key: string;
  readonly params?: Record<string, string | number>;

  constructor(key: string, params?: Record<string, string | number>, cause?: unknown) {
    super(key);
    this.name = 'SipCallError';
    this.key = key;
    this.params = params;
    if (cause !== undefined) {
      (this as { cause?: unknown }).cause = cause;
    }
  }

  toCallError(): CallError {
    return this.params ? { key: this.key, params: this.params } : { key: this.key };
  }
}

/**
 * Normalise anything thrown by sip.js / getUserMedia into a `CallError`.
 * Media errors keep their own keys so the rail can tell "denied" from
 * "no microphone".
 */
export function toCallError(error: unknown, fallbackKey = 'callFailed'): CallError {
  if (error instanceof SipCallError) return error.toCallError();
  if (error && typeof error === 'object') {
    const name = (error as { name?: string }).name;
    const message = String((error as { message?: string }).message ?? '');
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
      return { key: 'micDenied' };
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError') {
      return { key: 'micMissing' };
    }
    if (name === 'NotReadableError' || name === 'TrackStartError' || name === 'AbortError') {
      return { key: 'micBusy' };
    }
    if (/timed out|timeout/i.test(message) && /media|microphone|getUserMedia|invite/i.test(message)) {
      return { key: 'micTimeout' };
    }
  }
  return { key: fallbackKey };
}

/** Final responses that mean "nobody picked up" rather than a failure. */
const NO_ANSWER_CODES = new Set([408, 480, 487]);

/** How an outgoing INVITE's rejection ends the leg (486 busy, no answer, or failure). */
function rejectionReason(statusCode: number | undefined): CallEndReason {
  if (statusCode === 486) return 'busy';
  if (statusCode !== undefined && NO_ANSWER_CODES.has(statusCode)) return 'no_answer';
  return 'failed';
}

function sipResponseError(statusCode: number | undefined): CallError {
  switch (statusCode) {
    case 401:
    case 403:
    case 404:
    case 408:
    case 480:
    case 481:
    case 486:
    case 487:
    case 500:
    case 503:
    case 603:
      return { key: `sip${statusCode}` };
    default:
      return { key: 'sipOther', params: { code: statusCode ?? 0 } };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// sip.js's web SessionDescriptionHandler exposes the peer connection at
// runtime but not in the public type.
interface PeerConnectionAccessor {
  peerConnection?: RTCPeerConnection;
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
    /** Dev-only test hook, present when `NEXT_PUBLIC_CALLS_TEST_HOOK=1`. */
    __echodeskSip?: SipTestHook;
  }
}

export interface SipTestHook {
  getLocalSdp(): string | null;
  getSenderTrackEnabled(): boolean | null;
  getState(): Record<string, unknown>;
}

export const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  sampleRate: 48000,
  channelCount: 1,
};

const MEDIA_CONSTRAINTS: MediaStreamConstraints = { audio: AUDIO_CONSTRAINTS, video: false };

/** getUserMedia + ICE gathering must finish within this before we give up. */
const INVITE_MEDIA_TIMEOUT_MS = 15_000;
/** A hold / resume re-INVITE that is not answered in this time is a failure. */
const REINVITE_TIMEOUT_MS = 15_000;
/** `disconnect()` waits this long for the REGISTER (expires=0) to go out. */
const UNREGISTER_TIMEOUT_MS = 2_000;
/** After an attended transfer Asterisk BYEs us; hang up ourselves if it does not. */
const TRANSFER_HANGUP_FALLBACK_MS = 10_000;

const DEV_WS_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', 'lvh.me']);

function isDevWebSocketHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return DEV_WS_HOSTS.has(host) || host.endsWith('.lvh.me');
}

/**
 * WebSocket URL for the SIP transport. `wss_url` from the backend wins;
 * otherwise `wss://host:port/path`. Plain `ws://` is accepted only for the
 * local development hosts.
 */
export function resolveWebSocketUrl(config: SoftphoneConfig): string {
  const explicit = config.wss_url?.trim();
  let url: URL;
  if (explicit) {
    try {
      url = new URL(explicit);
    } catch {
      throw new SipCallError('configMissing');
    }
  } else {
    const host = config.sip_server?.trim();
    if (!host) throw new SipCallError('configMissing');
    const port = config.sip_port || 8089;
    const rawPath = config.websocket_path?.trim() || '/ws';
    const path = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
    url = new URL(`wss://${host}:${port}${path}`);
  }
  if (url.protocol === 'wss:') return url.toString();
  if (url.protocol === 'ws:' && isDevWebSocketHost(url.hostname)) return url.toString();
  throw new SipCallError('insecureTransport', { url: url.toString() });
}

/** ICE servers come from the backend only: `ice_servers`, else the legacy STUN/TURN fields. */
export function resolveIceServers(config: SoftphoneConfig): RTCIceServer[] {
  if (Array.isArray(config.ice_servers) && config.ice_servers.length > 0) {
    return config.ice_servers
      .filter((s) => s && s.urls && (Array.isArray(s.urls) ? s.urls.length > 0 : s.urls.trim()))
      .map((s) => ({
        urls: s.urls,
        ...(s.username ? { username: s.username } : {}),
        ...(s.credential ? { credential: s.credential } : {}),
      }));
  }
  const servers: RTCIceServer[] = [];
  const stun = config.stun_server?.trim();
  if (stun) servers.push({ urls: stun });
  const turn = config.turn_server?.trim();
  if (turn) {
    servers.push({
      urls: turn,
      username: config.turn_username || '',
      credential: config.turn_password || '',
    });
  }
  return servers;
}

/**
 * Dial string clean-up. Feature codes and IVR targets (`*100`, `#1`) are
 * passed through untouched; plain digit strings get the Georgian country
 * code heuristics the dialplan expects.
 */
export function normalizeDialNumber(raw: string): string {
  let n = raw.replace(/[^\d+*#]/g, '');
  if (n.includes('*') || n.includes('#')) return n;
  if (n.startsWith('00')) {
    n = `+${n.substring(2)}`;
  } else if (n.length === 9 && n.startsWith('5')) {
    n = `+995${n}`;
  } else if (n.length === 8 && n.startsWith('2')) {
    n = `+995${n}`;
  } else if (!n.startsWith('+') && n.length > 7) {
    n = `+${n}`;
  }
  return n;
}

function withTimeout<T>(promise: Promise<T>, ms: number, onTimeout: () => void, key: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      onTimeout();
      reject(new SipCallError(key));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

function peerConnectionOf(session: Session | null | undefined): RTCPeerConnection | null {
  const sdh = session?.sessionDescriptionHandler as PeerConnectionAccessor | undefined;
  return sdh?.peerConnection ?? null;
}

function audioSenderOf(session: Session | null | undefined): RTCRtpSender | null {
  const pc = peerConnectionOf(session);
  if (!pc) return null;
  return pc.getSenders().find((s) => s.track?.kind === 'audio') ?? null;
}

// [Issue #8] Cache the dynamic import result so NoiseSuppression module is loaded only once
let noiseSuppressionModuleCache: Promise<typeof import('./NoiseSuppression')> | null = null;

function getNoiseSuppressionModule(): Promise<typeof import('./NoiseSuppression')> {
  if (!noiseSuppressionModuleCache) {
    noiseSuppressionModuleCache = import('./NoiseSuppression');
  }
  return noiseSuppressionModuleCache;
}

/** One SIP dialog we own, with the bookkeeping its listeners need. */
interface Leg {
  session: Inviter | Invitation;
  /** Set before the terminating request so the Terminated listener knows why. */
  reason: CallEndReason | null;
  /** Outgoing only: false until `invite()` resolved; failures before that are reported by `makeCall`. */
  inviteSent: boolean;
  muted: boolean;
  held: boolean;
  /** Terminated event already dispatched. */
  ended: boolean;
  /** Consultation: do not emit `onConsultationEnded` (we tore it down ourselves). */
  silent: boolean;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class SipService {
  private userAgent: UserAgent | null = null;
  private registerer: Registerer | null = null;
  private main: Leg | null = null;
  private consultation: Leg | null = null;
  private activeLeg: CallLeg = 'main';
  private localAudioElement: HTMLAudioElement | null;
  private remoteAudioElement: HTMLAudioElement | null;
  private listeners = new Map<keyof SipCallEvents, Set<(...args: never[]) => void>>();
  private isRegistered = false;
  private transportConnected = false;
  /** True while `disconnect()` tears the UA down: registerer events are expected then. */
  private stopping = false;
  private noiseSuppression: import('./NoiseSuppression').NoiseSuppression | null = null;
  private noiseSuppressionEnabled = false; // Disabled by default: adds ~43ms latency

  // Audio pipeline bookkeeping (one remote stream at a time)
  private audioSetupDone = false;
  private audioPlayRetryTimeout: ReturnType<typeof setTimeout> | null = null;
  private audioContext: AudioContext | null = null;

  constructor(localAudio: HTMLAudioElement, remoteAudio: HTMLAudioElement) {
    this.localAudioElement = localAudio;
    this.remoteAudioElement = remoteAudio;
    this.installTestHook();
  }

  // -------------------------------------------------------------------------
  // Events: any number of listeners per event, each `on()` returns its unsubscribe
  // -------------------------------------------------------------------------

  on<K extends keyof SipCallEvents>(event: K, callback: Listener<K>): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(callback as (...args: never[]) => void);
    return () => this.off(event, callback);
  }

  off<K extends keyof SipCallEvents>(event: K, callback: Listener<K>): void {
    this.listeners.get(event)?.delete(callback as (...args: never[]) => void);
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }

  private emit<K extends keyof SipCallEvents>(event: K, ...args: Parameters<SipCallEvents[K]>): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const callback of Array.from(set)) {
      try {
        (callback as (...a: Parameters<SipCallEvents[K]>) => void)(...args);
      } catch (error) {
        console.error(`[SipService] ${event} listener failed:`, error);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  async initialize(config: SoftphoneConfig): Promise<void> {
    if (this.userAgent) {
      await this.disconnect();
    }

    const server = resolveWebSocketUrl(config);
    const realm = config.realm?.trim() || config.sip_server?.trim();
    if (!config.username || !realm) {
      throw new SipCallError('configMissing');
    }

    const userAgent = new UserAgent({
      uri: new URI('sip', config.username, realm),
      transportOptions: {
        server,
        connectionTimeout: 30,
        keepAliveInterval: 30,
      },
      reconnectionAttempts: 5,
      reconnectionDelay: 10,
      authorizationUsername: config.username,
      authorizationPassword: config.password,
      displayName: config.username,
      logLevel: 'warn',
      sessionDescriptionHandlerFactoryOptions: {
        peerConnectionConfiguration: {
          iceServers: resolveIceServers(config),
          iceCandidatePoolSize: 10,
        },
        constraints: MEDIA_CONSTRAINTS,
      },
      delegate: {
        onInvite: (invitation: Invitation) => this.handleIncomingCall(invitation),
      },
    });
    this.userAgent = userAgent;

    userAgent.transport.stateChange.addListener((state: TransportState) => {
      if (this.userAgent !== userAgent) return;
      if (state === TransportState.Connected) {
        this.transportConnected = true;
        this.emit('onTransportState', 'connected');
      } else if (state === TransportState.Disconnected) {
        const wasConnected = this.transportConnected;
        this.transportConnected = false;
        this.emit('onTransportState', 'disconnected');
        // Registration cannot survive the socket; tell the UI immediately
        // instead of waiting for the registerer to notice.
        if (this.isRegistered && !this.stopping) {
          this.isRegistered = false;
          this.emit('onUnregistered');
        } else if (!wasConnected && !this.stopping) {
          // Initial connect attempt failed: surface it so retries get scheduled.
          this.emit('onUnregistered');
        }
      }
    });

    this.registerer = this.createRegisterer(userAgent);

    try {
      await userAgent.start();
      await this.register();
    } catch (error) {
      if (error instanceof SipCallError) throw error;
      throw new SipCallError('initFailed', undefined, error);
    }
  }

  private createRegisterer(userAgent: UserAgent): Registerer {
    const registerer = new Registerer(userAgent);
    registerer.stateChange.addListener((state: RegistererState) => {
      if (this.registerer !== registerer || this.stopping) return;
      switch (state) {
        case RegistererState.Registered:
          this.isRegistered = true;
          this.emit('onRegistered');
          break;
        case RegistererState.Unregistered:
          if (this.isRegistered) {
            this.isRegistered = false;
            this.emit('onUnregistered');
          }
          break;
        case RegistererState.Terminated:
          this.isRegistered = false;
          break;
      }
    });
    return registerer;
  }

  /** (Re-)REGISTER with the one Registerer created in `initialize()`. */
  async register(): Promise<void> {
    const userAgent = this.userAgent;
    if (!userAgent) {
      throw new SipCallError('notRegistered');
    }
    if (!this.registerer || this.registerer.state === RegistererState.Terminated) {
      this.registerer = this.createRegisterer(userAgent);
    }
    const registerer = this.registerer;

    try {
      await registerer.register({
        requestDelegate: {
          onReject: (response) => {
            if (this.registerer !== registerer || this.stopping) return;
            const code = response.message.statusCode;
            this.isRegistered = false;
            this.emit('onRegistrationFailed', { key: 'registrationFailed', params: { code: code ?? 0 } });
          },
        },
      });
    } catch (error) {
      const callError = toCallError(error, 'registrationFailed');
      this.emit('onRegistrationFailed', callError);
      throw error instanceof SipCallError ? error : new SipCallError(callError.key, callError.params, error);
    }
  }

  /** Reconnect the transport if needed, then re-REGISTER. */
  async reconnect(): Promise<void> {
    const userAgent = this.userAgent;
    if (!userAgent) {
      throw new SipCallError('notRegistered');
    }
    try {
      if (!userAgent.transport.isConnected()) {
        await userAgent.transport.connect();
      }
    } catch (error) {
      throw new SipCallError('networkFailed', undefined, error);
    }
    await this.register();
  }

  /** Unregister, stop the user agent and drop every session. */
  async disconnect(): Promise<void> {
    this.stopping = true;
    try {
      if (this.main || this.consultation) {
        await this.endCall();
      }
      this.cleanupAudioResources();

      const registerer = this.registerer;
      this.registerer = null;
      if (registerer && registerer.state === RegistererState.Registered) {
        try {
          await withTimeout(
            registerer.unregister(),
            UNREGISTER_TIMEOUT_MS,
            () => {},
            'registrationFailed'
          );
        } catch {
          // The socket may already be gone; stopping the UA disposes it anyway.
        }
      }

      const userAgent = this.userAgent;
      this.userAgent = null;
      if (userAgent) {
        try {
          await userAgent.stop();
        } catch (error) {
          console.warn('[SipService] Error stopping user agent:', error);
        }
      }
      this.isRegistered = false;
      this.transportConnected = false;
    } finally {
      this.stopping = false;
    }
  }

  // -------------------------------------------------------------------------
  // Outgoing / incoming
  // -------------------------------------------------------------------------

  async makeCall(phoneNumber: string): Promise<OutgoingCallInfo> {
    const userAgent = this.userAgent;
    if (!userAgent || !this.isRegistered) {
      throw new SipCallError('notRegistered');
    }
    if (this.main) {
      throw new SipCallError('callInProgress');
    }
    const realm = userAgent.configuration.uri?.host;
    if (!realm) {
      throw new SipCallError('configMissing');
    }

    const number = normalizeDialNumber(phoneNumber);
    if (!number) {
      throw new SipCallError('sip404');
    }

    const inviter = new Inviter(userAgent, new URI('sip', number, realm), {
      sessionDescriptionHandlerOptions: { constraints: MEDIA_CONSTRAINTS },
    });
    const leg: Leg = {
      session: inviter,
      reason: null,
      inviteSent: false,
      muted: false,
      held: false,
      ended: false,
      silent: false,
    };
    this.main = leg;
    this.activeLeg = 'main';
    this.audioSetupDone = false;
    this.attachMainListener(leg);

    try {
      await withTimeout(
        inviter.invite({
          requestDelegate: {
            onProgress: () => {
              if (this.main === leg) this.emit('onCallProgress');
            },
            onReject: (response) => {
              // A CANCEL we sent (hang-up while ringing, media timeout) is
              // answered with a 487: the reason is already set, not a failure.
              if (leg.reason) return;
              const code = response.message.statusCode;
              leg.reason = rejectionReason(code);
              this.emit('onCallFailed', sipResponseError(code));
            },
          },
        }),
        INVITE_MEDIA_TIMEOUT_MS,
        () => {
          leg.reason = 'failed';
          inviter.cancel().catch(() => {});
        },
        'micTimeout'
      );
      leg.inviteSent = true;
      return { sipCallId: inviter.request.callId, number };
    } catch (error) {
      if (this.main === leg) {
        this.main = null;
      }
      this.cleanupAudioResources();
      const callError = toCallError(error, 'callFailed');
      throw error instanceof SipCallError ? error : new SipCallError(callError.key, callError.params, error);
    }
  }

  private handleIncomingCall(invitation: Invitation): void {
    if (this.main || this.consultation) {
      // No call waiting: answer the second INVITE with 486 Busy Here.
      const info = this.getIncomingInfo(invitation);
      invitation.reject({ statusCode: 486 }).catch((error) => {
        console.warn('[SipService] Failed to reject second INVITE:', error);
      });
      this.emit('onCallBusyRejected', info);
      return;
    }

    const leg: Leg = {
      session: invitation,
      reason: null,
      inviteSent: true,
      muted: false,
      held: false,
      ended: false,
      silent: false,
    };
    this.main = leg;
    this.activeLeg = 'main';
    this.audioSetupDone = false;
    this.attachMainListener(leg);
    this.emit('onIncomingCall', invitation);
  }

  /** Caller details the context needs before it writes the call log. */
  getIncomingInfo(invitation: Invitation): IncomingCallInfo {
    const remote = invitation.remoteIdentity;
    const displayName = remote?.displayName?.trim();
    const pbxCallId = invitation.request?.getHeader?.('X-EchoDesk-Call')?.trim();
    return {
      number: remote?.uri?.user ?? '',
      displayName: displayName || undefined,
      sipCallId: invitation.request?.callId ?? '',
      pbxCallId: pbxCallId || undefined,
    };
  }

  /**
   * One listener per main session. The Terminated branch is the single
   * place `onCallEnded` is emitted; `leg.reason` says why. sip.js runs the
   * INVITE `requestDelegate.onReject` *after* the Terminated transition, so
   * the emission is deferred one microtask to read the reason it sets.
   */
  private attachMainListener(leg: Leg): void {
    const session = leg.session;
    const onState = (state: SessionState) => {
      switch (state) {
        case SessionState.Established:
          if (this.main === leg) {
            this.activeLeg = 'main';
            this.emit('onCallAccepted');
            this.setupAudioStreams();
          }
          break;
        case SessionState.Terminated: {
          session.stateChange.removeListener(onState);
          if (this.main !== leg) return;
          this.main = null;
          this.activeLeg = 'main';
          this.destroyNoiseSuppression();
          this.cleanupAudioResources();
          if (!leg.inviteSent) return; // makeCall() reports this failure itself
          Promise.resolve().then(() => {
            if (leg.ended) return;
            leg.ended = true;
            this.emit('onCallEnded', leg.reason ?? 'ended');
          });
          break;
        }
        default:
          break;
      }
    };
    session.stateChange.addListener(onState);
  }

  async acceptCall(): Promise<void> {
    const leg = this.main;
    if (!leg || !(leg.session instanceof Invitation)) {
      throw new SipCallError('noIncomingCall');
    }
    try {
      await leg.session.accept({
        sessionDescriptionHandlerOptions: { constraints: MEDIA_CONSTRAINTS },
      });
    } catch (error) {
      const callError = toCallError(error, 'callFailed');
      leg.reason = 'failed';
      throw error instanceof SipCallError ? error : new SipCallError(callError.key, callError.params, error);
    }
  }

  async rejectCall(): Promise<void> {
    const leg = this.main;
    if (!leg || !(leg.session instanceof Invitation)) {
      throw new SipCallError('noIncomingCall');
    }
    leg.reason = 'rejected';
    try {
      await leg.session.reject();
    } catch (error) {
      throw new SipCallError('callFailed', undefined, error);
    }
  }

  /** Hang up (or cancel / decline) the main call and any consultation leg. */
  async endCall(): Promise<void> {
    await this.dropConsultation();

    const leg = this.main;
    if (!leg) {
      this.cleanupAudioResources();
      return;
    }
    try {
      await this.terminateLeg(leg, leg.reason ?? (leg.session.state === SessionState.Established ? 'ended' : 'rejected'));
    } catch (error) {
      console.warn('[SipService] Failed to end call:', error);
    } finally {
      this.destroyNoiseSuppression();
      this.cleanupAudioResources();
    }
  }

  private async terminateLeg(leg: Leg, reason: CallEndReason): Promise<void> {
    leg.reason = reason;
    const session = leg.session;
    if (session.state === SessionState.Terminated || session.state === SessionState.Terminating) return;
    if (session.state === SessionState.Established) {
      await session.bye();
    } else if (session instanceof Inviter) {
      await session.cancel();
    } else {
      await session.reject();
    }
  }

  // -------------------------------------------------------------------------
  // In-call controls
  // -------------------------------------------------------------------------

  private legFor(leg: CallLeg): Leg | null {
    return leg === 'consultation' ? this.consultation : this.main;
  }

  /** Flip the local audio track of `leg` (default: the leg carrying audio). Returns the new muted state. */
  toggleMute(leg: CallLeg = this.activeLeg): boolean {
    const target = this.legFor(leg);
    if (!target) return false;
    const sender = audioSenderOf(target.session);
    if (!sender?.track) return target.muted;
    target.muted = !target.muted;
    sender.track.enabled = !target.muted && !target.held;
    return target.muted;
  }

  /**
   * Hold / resume the main call with a real re-INVITE
   * (`sessionDescriptionHandlerOptions.hold` → `a=sendonly` / `a=sendrecv`)
   * and stop the local track while held. Resolves after the far end
   * answered the re-INVITE; `onCallHeld` follows the network state.
   */
  async toggleHold(hold: boolean): Promise<void> {
    const leg = this.main;
    if (!leg || leg.session.state !== SessionState.Established) {
      throw new SipCallError('noActiveCall');
    }
    await this.reinvite(leg.session, hold);
    leg.held = hold;
    const sender = audioSenderOf(leg.session);
    if (sender?.track) {
      sender.track.enabled = !hold && !leg.muted;
    }
    this.emit('onCallHeld', hold);
  }

  private reinvite(session: Session, hold: boolean): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new SipCallError('holdFailed'));
      }, REINVITE_TIMEOUT_MS);
      const finish = (error?: SipCallError) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (error) reject(error);
        else resolve();
      };
      const sessionDescriptionHandlerOptions: Web.SessionDescriptionHandlerOptions = { hold };
      session
        .invite({
          sessionDescriptionHandlerOptions,
          requestDelegate: {
            onAccept: () => finish(),
            onReject: (response) =>
              finish(new SipCallError('holdFailed', { code: response.message.statusCode ?? 0 })),
          },
        })
        .catch((error) => finish(new SipCallError('holdFailed', undefined, error)));
    });
  }

  /** Send a DTMF tone on `leg` (default: the leg carrying audio). */
  sendDTMF(tone: string, leg: CallLeg = this.activeLeg): boolean {
    const target = this.legFor(leg);
    if (!target || target.session.state !== SessionState.Established) {
      return false;
    }
    try {
      const sender = audioSenderOf(target.session);
      if (sender?.dtmf) {
        // insertDTMF() replaces the tones still queued, so keys pressed while
        // the previous tone plays (100 ms + 70 ms gap) would be dropped and
        // only the first and the last digit would reach the PBX: append to
        // what is still pending.
        sender.dtmf.insertDTMF(`${sender.dtmf.toneBuffer ?? ''}${tone}`, 100, 70);
        return true;
      }
      // Fallback: SIP INFO
      target.session
        .info({
          requestOptions: {
            body: {
              contentDisposition: 'render',
              contentType: 'application/dtmf-relay',
              content: `Signal=${tone}\r\nDuration=100`,
            },
          },
        })
        .catch((error) => {
          console.warn('[SipService] SIP INFO DTMF fallback failed:', error);
        });
      return true;
    } catch (error) {
      console.error('[SipService] Failed to send DTMF:', error);
      return false;
    }
  }

  /**
   * Blind transfer (REFER) of the main call. Resolves once the PBX accepted
   * the REFER (202): from then on the customer is in the target's dialplan
   * and our leg is out of the bridge with no media, and Asterisk does not
   * BYE the transferor (observed on the local harness), so we hang up
   * ourselves with reason `transferred`. A refused REFER (4xx/6xx) rejects
   * with `transferFailed` and the call carries on. The NOTIFYs that report
   * the target's progress are acknowledged and otherwise ignored.
   */
  async transferCall(targetNumber: string): Promise<void> {
    const leg = this.main;
    const userAgent = this.userAgent;
    if (!leg || !userAgent || leg.session.state !== SessionState.Established) {
      throw new SipCallError('noActiveCall');
    }
    const realm = userAgent.configuration.uri?.host;
    if (!realm) throw new SipCallError('configMissing');
    await new Promise<void>((resolve, reject) => {
      leg.session
        .refer(new URI('sip', normalizeDialNumber(targetNumber), realm), {
          requestDelegate: {
            onAccept: () => resolve(),
            onReject: (response) =>
              reject(new SipCallError('transferFailed', { code: response.message.statusCode ?? 0 })),
          },
          onNotify: (notification) => {
            notification.accept().catch(() => {});
          },
        })
        .catch((error) => reject(new SipCallError('transferFailed', undefined, error)));
    });
    if (this.main !== leg || leg.session.state !== SessionState.Established) return;
    leg.reason = 'transferred';
    leg.session.bye().catch(() => {});
  }

  // -------------------------------------------------------------------------
  // Attended transfer
  // -------------------------------------------------------------------------

  /** Put the main call on hold and dial the consultation target. */
  async startConsultation(targetNumber: string): Promise<void> {
    const main = this.main;
    const userAgent = this.userAgent;
    if (!main || !userAgent || main.session.state !== SessionState.Established) {
      throw new SipCallError('noActiveCall');
    }
    if (this.consultation) {
      throw new SipCallError('consultationFailed');
    }
    const realm = userAgent.configuration.uri?.host;
    if (!realm) throw new SipCallError('configMissing');

    await this.toggleHold(true);

    const inviter = new Inviter(userAgent, new URI('sip', normalizeDialNumber(targetNumber), realm), {
      sessionDescriptionHandlerOptions: { constraints: MEDIA_CONSTRAINTS },
    });
    const leg: Leg = {
      session: inviter,
      reason: null,
      inviteSent: false,
      muted: false,
      held: false,
      ended: false,
      silent: false,
    };
    this.consultation = leg;

    const onState = (state: SessionState) => {
      switch (state) {
        case SessionState.Established:
          if (this.consultation === leg) {
            this.activeLeg = 'consultation';
            this.emit('onConsultationAccepted');
            this.setupAudioForSession(leg.session);
          }
          break;
        case SessionState.Terminated:
          inviter.stateChange.removeListener(onState);
          if (this.consultation !== leg) return;
          this.consultation = null;
          this.activeLeg = 'main';
          if (!leg.inviteSent || leg.silent) return;
          // `requestDelegate.onReject` runs after this transition: read the
          // reason one microtask later so a rejection is not reported twice.
          Promise.resolve().then(() => {
            if (leg.ended || leg.reason === 'failed') return;
            leg.ended = true;
            this.emit('onConsultationEnded');
          });
          break;
        default:
          break;
      }
    };
    inviter.stateChange.addListener(onState);

    try {
      await withTimeout(
        inviter.invite({
          requestDelegate: {
            onProgress: () => {
              if (this.consultation === leg) this.emit('onConsultationProgress');
            },
            onReject: (response) => {
              leg.reason = 'failed';
              const code = response.message.statusCode;
              this.emit('onConsultationFailed', code === 486 ? { key: 'sip486' } : { key: 'consultationRejected' });
            },
          },
        }),
        INVITE_MEDIA_TIMEOUT_MS,
        () => {
          inviter.cancel().catch(() => {});
        },
        'micTimeout'
      );
      leg.inviteSent = true;
    } catch (error) {
      if (this.consultation === leg) this.consultation = null;
      this.activeLeg = 'main';
      try {
        await this.toggleHold(false);
      } catch {
        // best effort: the main call stays on hold if the resume fails
      }
      const callError = toCallError(error, 'consultationFailed');
      throw error instanceof SipCallError ? error : new SipCallError(callError.key, callError.params, error);
    }
  }

  /**
   * REFER with Replaces: Asterisk bridges the customer to the consultation
   * target and BYEs our leg, whose Terminated listener emits the single
   * `onCallEnded('transferred')`.
   */
  async completeAttendedTransfer(): Promise<void> {
    const main = this.main;
    const consultation = this.consultation;
    if (!main || !consultation) {
      throw new SipCallError('noConsultation');
    }
    if (consultation.session.state !== SessionState.Established) {
      throw new SipCallError('consultationNotEstablished');
    }

    main.reason = 'transferred';
    try {
      await main.session.refer(consultation.session);
    } catch (error) {
      main.reason = null;
      throw new SipCallError('transferFailed', undefined, error);
    }

    consultation.silent = true;
    this.consultation = null;
    this.activeLeg = 'main';
    try {
      await consultation.session.bye();
    } catch {
      // Already torn down by the far end.
    }

    // Asterisk hangs up the transferor once the transfer went through. Do it
    // ourselves if that BYE never arrives so the agent's line frees up.
    const session = main.session;
    setTimeout(() => {
      if (this.main === main && session.state === SessionState.Established) {
        session.bye().catch(() => {});
      }
    }, TRANSFER_HANGUP_FALLBACK_MS);
  }

  /** End the consultation leg and resume the main call. */
  async cancelConsultation(): Promise<void> {
    await this.dropConsultation();
    const main = this.main;
    if (main && main.session.state === SessionState.Established) {
      try {
        await this.toggleHold(false);
        this.setupAudioForSession(main.session);
      } catch (error) {
        console.error('[SipService] Error resuming original call:', error);
      }
    }
  }

  private async dropConsultation(): Promise<void> {
    const leg = this.consultation;
    if (!leg) return;
    leg.silent = true;
    this.consultation = null;
    this.activeLeg = 'main';
    try {
      await this.terminateLeg(leg, 'ended');
    } catch (error) {
      console.warn('[SipService] Error ending consultation:', error);
    }
  }

  /** Resume the main call from hold (used while merging into a conference). */
  async resumeOriginalFromHold(): Promise<void> {
    const main = this.main;
    if (main && main.session.state === SessionState.Established && main.held) {
      await this.toggleHold(false);
    }
  }

  hasConsultationSession(): boolean {
    return this.consultation !== null && this.consultation.session.state === SessionState.Established;
  }

  // -------------------------------------------------------------------------
  // Noise suppression (opt-in)
  // -------------------------------------------------------------------------

  private async applyNoiseSuppression(audioSender: RTCRtpSender): Promise<void> {
    try {
      const { NoiseSuppression } = await getNoiseSuppressionModule();
      this.noiseSuppression = new NoiseSuppression();

      const originalTrack = audioSender.track;
      if (!originalTrack) return;

      const cleanStream = await this.noiseSuppression.process(new MediaStream([originalTrack]));
      const cleanTrack = cleanStream.getAudioTracks()[0];
      if (cleanTrack) {
        await audioSender.replaceTrack(cleanTrack);
      }
    } catch (error) {
      console.warn('[SipService] Failed to apply noise suppression:', error);
    }
  }

  private destroyNoiseSuppression(): void {
    if (this.noiseSuppression) {
      this.noiseSuppression.destroy();
      this.noiseSuppression = null;
    }
  }

  setNoiseSuppression(enabled: boolean): void {
    this.noiseSuppressionEnabled = enabled;
    this.noiseSuppression?.setEnabled(enabled);
  }

  isNoiseSuppressionEnabled(): boolean {
    return this.noiseSuppressionEnabled;
  }

  // -------------------------------------------------------------------------
  // Audio
  // -------------------------------------------------------------------------

  private cleanupAudioResources(): void {
    if (this.audioPlayRetryTimeout !== null) {
      clearTimeout(this.audioPlayRetryTimeout);
      this.audioPlayRetryTimeout = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
    }
    this.audioContext = null;
    this.audioSetupDone = false;
  }

  /** Route a session's remote track straight to the audio element (leg switches). */
  private setupAudioForSession(session: Session): void {
    const remote = this.remoteAudioElement;
    if (!remote) return;
    const pc = peerConnectionOf(session);
    if (!pc) return;
    const receiver = pc.getReceivers().find((r) => r.track?.kind === 'audio');
    if (!receiver?.track) return;
    remote.srcObject = new MediaStream([receiver.track]);
    remote.play().catch((error) => {
      console.warn('[SipService] Failed to play session audio:', error);
    });
  }

  /** Wire the main session's peer connection: remote audio, ICE monitoring, local monitor. */
  setupAudioStreams(): void {
    if (this.audioSetupDone) return;
    const leg = this.main;
    if (!leg || !this.remoteAudioElement || !this.localAudioElement) return;

    const peerConnection = peerConnectionOf(leg.session);
    if (!peerConnection) return;
    this.audioSetupDone = true;

    peerConnection.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (!this.remoteAudioElement || !remoteStream) return;
      this.attachRemoteStream(remoteStream);
    };

    peerConnection.onconnectionstatechange = () => {
      if (peerConnection.connectionState === 'failed') {
        this.failLeg(leg, 'networkFailed');
      }
    };

    peerConnection.oniceconnectionstatechange = () => {
      const state = peerConnection.iceConnectionState;
      if (state === 'failed') {
        this.failLeg(leg, 'networkFailed');
      } else if (state === 'disconnected') {
        this.emit('onCallQualityWarning', { key: 'networkUnstable' });
      }
    };

    const audioSender = audioSenderOf(leg.session);
    if (audioSender?.track) {
      if (this.noiseSuppressionEnabled) {
        this.applyNoiseSuppression(audioSender).catch(() => {});
      }
      this.localAudioElement.srcObject = new MediaStream([audioSender.track]);
      this.localAudioElement.muted = true;
      this.localAudioElement.autoplay = true;
    }

    // Tracks that arrived before `ontrack` was installed
    for (const receiver of peerConnection.getReceivers()) {
      if (receiver.track?.kind === 'audio') {
        this.attachRemoteStream(new MediaStream([receiver.track]));
        break;
      }
    }
  }

  /** ICE / connection failure: report once, then terminate so one `onCallEnded('failed')` follows. */
  private failLeg(leg: Leg, key: string): void {
    if (this.main !== leg || leg.reason) return;
    this.emit('onCallFailed', { key });
    this.terminateLeg(leg, 'failed').catch(() => {});
  }

  private attachRemoteStream(remoteStream: MediaStream): void {
    const remote = this.remoteAudioElement;
    if (!remote) return;

    try {
      if (this.audioContext && this.audioContext.state !== 'closed') {
        this.audioContext.close().catch(() => {});
      }
      const ctx = new AudioContext();
      this.audioContext = ctx;
      const source = ctx.createMediaStreamSource(remoteStream);

      // Compressor: even out volume levels
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -24;
      compressor.knee.value = 12;
      compressor.ratio.value = 4;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.15;

      // Presence (2-4 kHz) for voice clarity on narrowband audio
      const presenceBoost = ctx.createBiquadFilter();
      presenceBoost.type = 'peaking';
      presenceBoost.frequency.value = 3000;
      presenceBoost.Q.value = 1.0;
      presenceBoost.gain.value = 4;

      // Warmth (200-500 Hz) against the "tinny" sound
      const warmthBoost = ctx.createBiquadFilter();
      warmthBoost.type = 'peaking';
      warmthBoost.frequency.value = 350;
      warmthBoost.Q.value = 1.0;
      warmthBoost.gain.value = 2;

      const highPass = ctx.createBiquadFilter();
      highPass.type = 'highpass';
      highPass.frequency.value = 80;

      const gain = ctx.createGain();
      gain.gain.value = 1.3;

      const dest = ctx.createMediaStreamDestination();
      source.connect(highPass);
      highPass.connect(warmthBoost);
      warmthBoost.connect(presenceBoost);
      presenceBoost.connect(compressor);
      compressor.connect(gain);
      gain.connect(dest);

      remote.srcObject = dest.stream;
    } catch {
      remote.srcObject = remoteStream;
    }

    remote.autoplay = true;
    remote.controls = false;
    remote.muted = false;
    remote.play().catch((error) => {
      console.warn('[SipService] Failed to play remote audio, retrying in 1s:', error);
      if (this.audioPlayRetryTimeout !== null) {
        clearTimeout(this.audioPlayRetryTimeout);
      }
      this.audioPlayRetryTimeout = setTimeout(() => {
        this.audioPlayRetryTimeout = null;
        this.remoteAudioElement?.play().catch((retryError) => {
          console.warn('[SipService] Retry play also failed:', retryError);
        });
      }, 1000);
    });
  }

  // -------------------------------------------------------------------------
  // Introspection
  // -------------------------------------------------------------------------

  getCurrentCallInfo(): { remoteNumber: string; state: SessionState; direction: 'incoming' | 'outgoing' } | null {
    const leg = this.main;
    if (!leg) return null;
    const session = leg.session;
    return {
      remoteNumber: session.remoteIdentity?.uri?.user || '',
      state: session.state,
      direction: session instanceof Inviter ? 'outgoing' : 'incoming',
    };
  }

  getRegistrationStatus(): boolean {
    return this.isRegistered;
  }

  isTransportConnected(): boolean {
    return this.transportConnected;
  }

  getActiveLeg(): CallLeg {
    return this.activeLeg;
  }

  /** Dev-only: expose SDP / track state for the Playwright suite. */
  private installTestHook(): void {
    if (typeof window === 'undefined') return;
    if (process.env.NEXT_PUBLIC_CALLS_TEST_HOOK !== '1') return;
    const legState = (leg: Leg | null) =>
      leg
        ? {
            state: leg.session.state,
            direction: leg.session instanceof Inviter ? 'outgoing' : 'incoming',
            reason: leg.reason,
            held: leg.held,
            muted: leg.muted,
            remote: leg.session.remoteIdentity?.uri?.user ?? null,
          }
        : null;
    window.__echodeskSip = {
      getLocalSdp: () => {
        const pc = peerConnectionOf(this.main?.session);
        return pc?.currentLocalDescription?.sdp ?? pc?.localDescription?.sdp ?? null;
      },
      getSenderTrackEnabled: () => {
        const sender = audioSenderOf(this.main?.session);
        return sender?.track ? sender.track.enabled : null;
      },
      getState: () => ({
        registered: this.isRegistered,
        transportConnected: this.transportConnected,
        activeLeg: this.activeLeg,
        main: legState(this.main),
        consultation: legState(this.consultation),
      }),
    };
  }
}
