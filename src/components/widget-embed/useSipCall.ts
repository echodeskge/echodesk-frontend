"use client";

/**
 * Visitor-facing voice-call lifecycle hook for the embeddable chat widget.
 *
 * Mirrors the shape of `src/services/SipService.ts` (UserAgent → Registerer
 * → Inviter) but is intentionally standalone — the widget runs anonymously
 * in a sandboxed iframe with no tenant auth context, so we can't import
 * from the agent-side softphone. Keeping this self-contained also lets us
 * lazy-load sip.js (~300 KB minified) only when the visitor clicks "Call",
 * so the cold widget bundle stays lean.
 *
 * Contract: see `POST /api/widget/public/call/credentials/` (widget backend
 * PR 7). The endpoint returns a short-lived SIP password good for ~4 hours.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  fetchCallCredentials,
  WidgetApiError,
  type WidgetCallCredentials,
} from './widget-api';

export type CallState =
  | 'idle'
  | 'requesting-mic'
  | 'fetching-creds'
  | 'registering'
  | 'ringing'
  | 'connected'
  | 'ending'
  | 'ended'
  | 'error';

export interface StartCallParams {
  token: string;
  sessionId: string;
}

export interface UseSipCallResult {
  state: CallState;
  errorCode: string | null;
  isMuted: boolean;
  callDurationSec: number;
  startCall: (params: StartCallParams) => Promise<void>;
  hangUp: () => Promise<void>;
  toggleMute: () => void;
}

// Light structural types so we don't have to load sip.js just for the type
// annotations of our refs. Actual sip.js types are only referenced inside
// the lazy-import branch of startCall.
type SipUserAgentLike = {
  start: () => Promise<void>;
  stop: () => Promise<void>;
};
type SipRegistererLike = {
  register: () => Promise<unknown>;
  unregister: () => Promise<unknown>;
  stateChange: {
    addListener: (cb: (state: string) => void) => void;
  };
};
type SipSessionLike = {
  bye: () => Promise<unknown>;
  cancel?: () => Promise<unknown>;
  invite: (opts?: unknown) => Promise<unknown>;
  stateChange: {
    addListener: (cb: (state: string) => void) => void;
  };
  sessionDescriptionHandler: unknown;
  state: string;
};

interface PeerConnectionAccessor {
  peerConnection: RTCPeerConnection;
}

const REMOTE_AUDIO_ID = 'echodesk-widget-call-audio';

function mapCredentialErrorCode(err: unknown): string {
  if (err instanceof WidgetApiError) {
    // Backend emits structured error codes for 403/404/410/503 — pass them
    // through so the UI layer can render specific copy.
    const code = (err.code || '').toString();
    if (code) return code;
    // HTTP-fallback mapping in case the backend returned a bare status.
    if (err.status === 403) return 'voice_disabled';
    if (err.status === 404) return 'not_found';
    if (err.status === 410) return 'session_expired';
    if (err.status === 503) return 'pbx_unavailable';
    return 'credentials_failed';
  }
  if (err instanceof Error && err.name === 'AbortError') return 'aborted';
  return 'credentials_failed';
}

function mapMicErrorCode(err: unknown): string {
  if (err instanceof Error) {
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      return 'mic_denied';
    }
    if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      return 'mic_not_found';
    }
  }
  return 'mic_failed';
}

/**
 * Find-or-create the hidden `<audio>` element that plays the agent's voice.
 *
 * We keep it on document.body rather than in the React tree so the tag
 * survives quick state flips (ringing → connected → ended) and a single
 * React re-render won't tear down an audio sink mid-call. The element is
 * explicitly torn down on hangUp / unmount in `removeRemoteAudioEl`.
 */
function ensureRemoteAudioEl(): HTMLAudioElement {
  const existing = document.getElementById(REMOTE_AUDIO_ID);
  if (existing && existing instanceof HTMLAudioElement) return existing;

  const el = document.createElement('audio');
  el.id = REMOTE_AUDIO_ID;
  el.autoplay = true;
  el.muted = false;
  el.setAttribute('playsinline', 'true');
  // Hidden but present — some browsers need it in the DOM to play.
  el.style.position = 'fixed';
  el.style.width = '1px';
  el.style.height = '1px';
  el.style.left = '-9999px';
  el.style.opacity = '0';
  el.style.pointerEvents = 'none';
  document.body.appendChild(el);
  return el;
}

function removeRemoteAudioEl(): void {
  const el = document.getElementById(REMOTE_AUDIO_ID);
  if (el && el.parentNode) {
    try {
      if (el instanceof HTMLAudioElement) {
        try {
          el.pause();
        } catch {
          /* ignore */
        }
        el.srcObject = null;
      }
    } catch {
      /* ignore */
    }
    el.parentNode.removeChild(el);
  }
}

export function useSipCall(): UseSipCallResult {
  const [state, setState] = useState<CallState>('idle');
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [callDurationSec, setCallDurationSec] = useState(0);

  // Long-lived refs so state updates don't trigger SIP reconnects.
  const userAgentRef = useRef<SipUserAgentLike | null>(null);
  const registererRef = useRef<SipRegistererLike | null>(null);
  const sessionRef = useRef<SipSessionLike | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);
  // Monotonic call token so out-of-order state callbacks from a torn-down
  // session can't flip the UI back to 'connected' after hang-up.
  const callTokenRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const safeSetState = useCallback((next: CallState, token?: number) => {
    if (!mountedRef.current) return;
    if (typeof token === 'number' && token !== callTokenRef.current) return;
    setState(next);
  }, []);

  const stopDurationTimer = useCallback(() => {
    if (durationTimerRef.current !== null) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
  }, []);

  const startDurationTimer = useCallback(() => {
    stopDurationTimer();
    setCallDurationSec(0);
    durationTimerRef.current = setInterval(() => {
      if (!mountedRef.current) return;
      setCallDurationSec((s) => s + 1);
    }, 1000);
  }, [stopDurationTimer]);

  const releaseLocalStream = useCallback(() => {
    const stream = localStreamRef.current;
    if (stream) {
      for (const track of stream.getTracks()) {
        try {
          track.stop();
        } catch {
          /* ignore */
        }
      }
    }
    localStreamRef.current = null;
  }, []);

  const teardown = useCallback(
    async (nextState: CallState, code?: string) => {
      stopDurationTimer();
      // Bump token so any in-flight session callbacks become no-ops.
      callTokenRef.current += 1;

      const session = sessionRef.current;
      const registerer = registererRef.current;
      const ua = userAgentRef.current;
      sessionRef.current = null;
      registererRef.current = null;
      userAgentRef.current = null;

      if (session) {
        try {
          if (session.state === 'Established') {
            await session.bye();
          } else if (session.state === 'Establishing' && session.cancel) {
            await session.cancel();
          }
        } catch {
          /* ignore — teardown must be best-effort */
        }
      }
      if (registerer) {
        try {
          await registerer.unregister();
        } catch {
          /* ignore */
        }
      }
      if (ua) {
        try {
          await ua.stop();
        } catch {
          /* ignore */
        }
      }
      releaseLocalStream();
      removeRemoteAudioEl();

      if (!mountedRef.current) return;
      if (code !== undefined) setErrorCode(code);
      setState(nextState);
      setIsMuted(false);
    },
    [releaseLocalStream, stopDurationTimer]
  );

  const startCall = useCallback(
    async ({ token, sessionId }: StartCallParams) => {
      // Serialize: if a call is already live (or being torn down), ignore.
      if (
        state !== 'idle' &&
        state !== 'ended' &&
        state !== 'error'
      ) {
        return;
      }

      const myToken = ++callTokenRef.current;
      setErrorCode(null);
      setIsMuted(false);
      setCallDurationSec(0);

      // 1. Request mic first — fast fail if permission is denied.
      safeSetState('requesting-mic', myToken);
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err) {
        if (myToken !== callTokenRef.current) return;
        const code = mapMicErrorCode(err);
        setErrorCode(code);
        safeSetState('error', myToken);
        return;
      }
      if (myToken !== callTokenRef.current) {
        // A hang-up raced us — release the mic we just grabbed.
        for (const t of stream.getTracks()) {
          try {
            t.stop();
          } catch {
            /* ignore */
          }
        }
        return;
      }
      localStreamRef.current = stream;

      // 2. Fetch short-lived SIP credentials from the public widget API.
      safeSetState('fetching-creds', myToken);
      let creds: WidgetCallCredentials;
      try {
        creds = await fetchCallCredentials({ token, session_id: sessionId });
      } catch (err) {
        if (myToken !== callTokenRef.current) return;
        releaseLocalStream();
        setErrorCode(mapCredentialErrorCode(err));
        safeSetState('error', myToken);
        return;
      }
      if (myToken !== callTokenRef.current) {
        releaseLocalStream();
        return;
      }

      // 3. Lazy-load sip.js only now, so it isn't in the cold bundle.
      let sip: typeof import('sip.js');
      try {
        sip = await import('sip.js');
      } catch {
        if (myToken !== callTokenRef.current) return;
        releaseLocalStream();
        setErrorCode('sip_load_failed');
        safeSetState('error', myToken);
        return;
      }
      if (myToken !== callTokenRef.current) {
        releaseLocalStream();
        return;
      }

      const { UserAgent, Registerer, Inviter, RegistererState, SessionState } = sip;

      // 4. Build the UserAgent.
      safeSetState('registering', myToken);
      const uri = UserAgent.makeURI(creds.sip_uri);
      if (!uri) {
        releaseLocalStream();
        setErrorCode('invalid_sip_uri');
        safeSetState('error', myToken);
        return;
      }

      let ua: import('sip.js').UserAgent;
      try {
        ua = new UserAgent({
          uri,
          transportOptions: {
            server: creds.sip_server_wss,
          },
          authorizationUsername: creds.sip_username,
          authorizationPassword: creds.sip_password,
          // Keep the widget quiet in production consoles.
          logLevel: 'warn',
          sessionDescriptionHandlerFactoryOptions: {
            peerConnectionConfiguration: {
              iceServers: creds.ice_servers.map((srv) => ({
                urls: srv.urls,
                ...(srv.username ? { username: srv.username } : {}),
                ...(srv.credential ? { credential: srv.credential } : {}),
              })),
            },
            constraints: { audio: true, video: false },
          },
        });
      } catch {
        releaseLocalStream();
        setErrorCode('ua_init_failed');
        safeSetState('error', myToken);
        return;
      }
      userAgentRef.current = ua;

      try {
        await ua.start();
      } catch {
        if (myToken !== callTokenRef.current) return;
        await teardown('error', 'transport_failed');
        return;
      }
      if (myToken !== callTokenRef.current) return;

      // 5. Register (short-lived — Asterisk auths us as widget_<session_id>).
      const registerer = new Registerer(ua);
      registererRef.current = registerer;

      let registered = false;
      registerer.stateChange.addListener((rs) => {
        if (myToken !== callTokenRef.current) return;
        if (rs === RegistererState.Registered) {
          registered = true;
        } else if (rs === RegistererState.Terminated && !registered) {
          // Never got a 200 OK from REGISTER — abort.
          void teardown('error', 'registration_failed');
        }
      });

      try {
        await registerer.register();
      } catch {
        if (myToken !== callTokenRef.current) return;
        await teardown('error', 'registration_failed');
        return;
      }
      if (myToken !== callTokenRef.current) return;

      // 6. Invite the destination extension.
      const targetUri = UserAgent.makeURI(
        `sip:${creds.destination_extension}@${creds.sip_domain}`
      );
      if (!targetUri) {
        await teardown('error', 'invalid_destination');
        return;
      }

      const inviter = new Inviter(ua, targetUri, {
        sessionDescriptionHandlerOptions: {
          constraints: { audio: true, video: false },
        },
      });
      sessionRef.current = inviter as unknown as SipSessionLike;

      inviter.stateChange.addListener((s) => {
        if (myToken !== callTokenRef.current) return;
        if (s === SessionState.Establishing) {
          safeSetState('ringing', myToken);
        } else if (s === SessionState.Established) {
          safeSetState('connected', myToken);
          startDurationTimer();
          attachRemoteAudio(inviter);
        } else if (s === SessionState.Terminated) {
          stopDurationTimer();
          // Only transition to 'ended' if we were mid-call; otherwise the
          // teardown() path already owns the final state.
          if (mountedRef.current && sessionRef.current === (inviter as unknown as SipSessionLike)) {
            sessionRef.current = null;
            safeSetState('ended', myToken);
            // Best-effort unregister + stop after a terminated session.
            const reg = registererRef.current;
            const agent = userAgentRef.current;
            registererRef.current = null;
            userAgentRef.current = null;
            if (reg) {
              reg.unregister().catch(() => {});
            }
            if (agent) {
              agent.stop().catch(() => {});
            }
            releaseLocalStream();
            removeRemoteAudioEl();
          }
        }
      });

      safeSetState('ringing', myToken);
      try {
        await inviter.invite({
          requestDelegate: {
            onReject: (response) => {
              if (myToken !== callTokenRef.current) return;
              const status = response?.message?.statusCode;
              let code = 'call_rejected';
              if (status === 486) code = 'busy';
              else if (status === 480) code = 'unavailable';
              else if (status === 408) code = 'no_answer';
              else if (status === 603) code = 'declined';
              void teardown('error', code);
            },
          },
        });
      } catch {
        if (myToken !== callTokenRef.current) return;
        await teardown('error', 'invite_failed');
      }
    },
    [releaseLocalStream, safeSetState, startDurationTimer, state, stopDurationTimer, teardown]
  );

  /**
   * Hook the remote RTP track up to a hidden <audio> element on the document
   * body. We subscribe to `ontrack` so we catch tracks added after the offer
   * round-trip (common on Asterisk-backed PBXes) and also walk existing
   * receivers for the case where tracks arrived before we attached.
   */
  function attachRemoteAudio(session: import('sip.js').Inviter) {
    const sdh = session.sessionDescriptionHandler as unknown as PeerConnectionAccessor | undefined;
    if (!sdh) return;
    const pc = sdh.peerConnection;
    if (!pc) return;

    const audioEl = ensureRemoteAudioEl();

    const playStream = (stream: MediaStream) => {
      try {
        audioEl.srcObject = stream;
      } catch {
        /* ignore */
      }
      audioEl.play().catch(() => {
        // Autoplay may fail if the user hasn't interacted yet — since the
        // call was initiated by a click this should almost never trigger,
        // but retry once after 500ms just in case.
        setTimeout(() => {
          audioEl.play().catch(() => {
            /* give up silently — browser policy */
          });
        }, 500);
      });
    };

    pc.ontrack = (event) => {
      const [remote] = event.streams;
      if (remote) playStream(remote);
    };

    // Existing receivers (track may have arrived before we set ontrack).
    for (const receiver of pc.getReceivers()) {
      if (receiver.track && receiver.track.kind === 'audio') {
        playStream(new MediaStream([receiver.track]));
        break;
      }
    }
  }

  const hangUp = useCallback(async () => {
    if (state === 'idle' || state === 'ended') return;
    safeSetState('ending');
    await teardown('ended');
  }, [safeSetState, state, teardown]);

  const toggleMute = useCallback(() => {
    const session = sessionRef.current;
    if (!session) return;
    const sdh = session.sessionDescriptionHandler as PeerConnectionAccessor | undefined | null;
    const pc = sdh?.peerConnection;
    if (!pc) return;
    const sender = pc.getSenders().find((s) => s.track?.kind === 'audio');
    if (!sender?.track) return;
    sender.track.enabled = !sender.track.enabled;
    setIsMuted(!sender.track.enabled);
  }, []);

  // Cleanup on unmount: best-effort hang-up + mic release.
  useEffect(() => {
    return () => {
      stopDurationTimer();
      const session = sessionRef.current;
      const registerer = registererRef.current;
      const ua = userAgentRef.current;
      sessionRef.current = null;
      registererRef.current = null;
      userAgentRef.current = null;
      // Don't await — unmount can't block.
      if (session) {
        (async () => {
          try {
            if (session.state === 'Established') await session.bye();
            else if (session.state === 'Establishing' && session.cancel) {
              await session.cancel();
            }
          } catch {
            /* ignore */
          }
        })();
      }
      if (registerer) {
        registerer.unregister().catch(() => {});
      }
      if (ua) {
        ua.stop().catch(() => {});
      }
      const stream = localStreamRef.current;
      if (stream) {
        for (const t of stream.getTracks()) {
          try {
            t.stop();
          } catch {
            /* ignore */
          }
        }
      }
      localStreamRef.current = null;
      removeRemoteAudioEl();
    };
  }, [stopDurationTimer]);

  return {
    state,
    errorCode,
    isMuted,
    callDurationSec,
    startCall,
    hangUp,
    toggleMute,
  };
}
