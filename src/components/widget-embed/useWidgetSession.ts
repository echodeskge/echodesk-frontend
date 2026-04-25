"use client";

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  buildWebSocketUrl,
  closeSession as closeSessionApi,
  createSession,
  listMessages,
  rateSession as rateSessionApi,
  sendMessage,
  WidgetApiError,
  type WidgetMessage,
} from './widget-api';

/**
 * Stable per-browser visitor identifier. Persisted in localStorage.
 * Falls back to an in-memory id when storage is blocked (private mode,
 * Safari ITP, etc.) so the session still works for the tab's lifetime.
 */
function getOrCreateVisitorId(): string {
  const key = 'echodesk.widget.visitor_id';
  try {
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const fresh = generateId();
    localStorage.setItem(key, fresh);
    return fresh;
  } catch {
    return generateId();
  }
}

function sessionStorageKey(token: string) {
  return `echodesk.widget.session_${token}`;
}

/**
 * Stored session shape: `{sessionId, savedAt}`.
 *
 * `savedAt` is wall-clock ms-since-epoch — used to TTL the entry so a stale
 * `widget_session_id` can't outlive the backend's 24-hour idle window. If the
 * stored entry is older than 24h we drop it on the floor and start fresh,
 * which avoids the visitor-side 410 round-trip on the first message after a
 * long idle.
 *
 * Backwards-compat: old installs persisted a bare string `<session_id>` under
 * the same key. `readStoredSession` accepts either shape and treats the bare
 * form as "no timestamp known" — we keep using it but stamp `savedAt` on the
 * next write.
 */
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

interface StoredSession {
  sessionId: string;
  savedAt: number | null;
}

function readStoredSession(token: string): StoredSession | null {
  try {
    const raw = localStorage.getItem(sessionStorageKey(token));
    if (!raw) return null;
    // Try JSON first (new format).
    if (raw.startsWith('{')) {
      try {
        const parsed = JSON.parse(raw) as { sessionId?: unknown; savedAt?: unknown };
        const sessionId =
          typeof parsed.sessionId === 'string' ? parsed.sessionId : null;
        if (!sessionId) return null;
        const savedAt =
          typeof parsed.savedAt === 'number' && Number.isFinite(parsed.savedAt)
            ? parsed.savedAt
            : null;
        if (savedAt !== null && Date.now() - savedAt > SESSION_TTL_MS) {
          // Stale — drop it.
          try {
            localStorage.removeItem(sessionStorageKey(token));
          } catch {
            /* ignore */
          }
          return null;
        }
        return { sessionId, savedAt };
      } catch {
        return null;
      }
    }
    // Legacy: bare string. Keep it (we'll re-stamp on next write) but with
    // no savedAt so it's effectively "valid until something writes again".
    return { sessionId: raw, savedAt: null };
  } catch {
    return null;
  }
}

function writeStoredSession(token: string, sessionId: string) {
  try {
    const payload: StoredSession = { sessionId, savedAt: Date.now() };
    localStorage.setItem(sessionStorageKey(token), JSON.stringify(payload));
  } catch {
    /* storage blocked — fine */
  }
}

function generateId(): string {
  // crypto.randomUUID exists in all modern browsers; fall back if missing.
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    try {
      return (crypto as Crypto & { randomUUID: () => string }).randomUUID();
    } catch {
      /* ignore */
    }
  }
  return (
    Math.random().toString(36).slice(2) + Date.now().toString(36)
  ).replace(/[^a-z0-9]/gi, '');
}

export interface StartSessionOpts {
  visitorName?: string;
  visitorEmail?: string;
}

export type SessionEndedBy = 'visitor' | 'agent' | 'timeout' | null;

export interface UseWidgetSessionResult {
  sessionId: string | null;
  messages: WidgetMessage[];
  isStartingSession: boolean;
  isSending: boolean;
  error: string | null;
  /**
   * Non-null once the session has been closed. The shell uses this to swap
   * the composer/messages for the post-chat review form.
   */
  endedBy: SessionEndedBy;
  startSession: (opts?: StartSessionOpts) => Promise<string | null>;
  send: (text: string, attachments?: WidgetMessage['attachments']) => Promise<void>;
  /**
   * Visitor-initiated end. Fires the public close endpoint, then sets
   * `endedBy='visitor'` so the shell shows the rating prompt. Does NOT clear
   * localStorage — that happens after the review form is dismissed (or after
   * the visitor explicitly closes the iframe via the post-rating "Skip"
   * button).
   */
  closeSession: () => Promise<void>;
  /** Submit a 1–5 rating + optional comment for the just-ended session. */
  rate: (
    rating: number,
    comment?: string
  ) => Promise<{ status: 'ok'; rating: number } | null>;
  /**
   * Hard reset. Wipes local session id, message history, AND localStorage.
   * Called from the shell after the review form is fully dismissed so the
   * next iframe open lands on a fresh session.
   */
  clearSession: () => void;
}

const POLL_INTERVAL_MS = 4000;
const PING_INTERVAL_MS = 30_000;
const MAX_WS_BACKOFF_MS = 30_000;
const BASE_WS_BACKOFF_MS = 3_000;
const MAX_WS_FAILURES_BEFORE_POLL_FALLBACK = 3;

/**
 * Manages the widget's session + message history for a given token.
 *
 * - Lazily creates a session the first time `startSession` or `send` is
 *   called (whichever happens first).
 * - Real-time transport: opens a WebSocket to
 *   `wss://api.echodesk.ge/ws/widget/<token>/<session_id>/` once a session
 *   exists. Dedupes by `message_id` so the optimistic bubble + server echo
 *   don't render twice.
 * - Exponential backoff on WS reconnect (3s → 6s → 12s → 24s → max 30s)
 *   with a bit of jitter. After 3 hard failures we fall back to 4-second
 *   HTTP polling so the widget stays functional even when WS is blocked
 *   by a corporate proxy.
 * - Pauses both WS and polling when the document is hidden; resumes on
 *   visibility change (with an immediate catch-up fetch when in fallback
 *   polling mode).
 * - `send(text)` stays HTTP — the backend broadcasts to both the widget
 *   visitor group AND the agent inbox group, so we don't need to await a
 *   WS-level ack. Matches the agent-side pattern (HTTP send, WS receive).
 */
export function useWidgetSession(token: string): UseWidgetSessionResult {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<WidgetMessage[]>([]);
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [endedBy, setEndedBy] = useState<SessionEndedBy>(null);

  // Keep the latest values in refs for use inside stable callbacks.
  const sessionIdRef = useRef<string | null>(null);
  const lastTsRef = useRef<string | null>(null);
  const messageIdsRef = useRef<Set<string>>(new Set());
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isVisibleRef = useRef<boolean>(
    typeof document !== 'undefined' ? document.visibilityState !== 'hidden' : true
  );

  // WebSocket state.
  const wsRef = useRef<WebSocket | null>(null);
  const wsPingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wsReconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wsFailuresRef = useRef<number>(0);
  const isWsIntentionalCloseRef = useRef<boolean>(false);
  const useFallbackPollingRef = useRef<boolean>(false);

  // Restore any persisted session_id on mount. `readStoredSession` enforces
  // the 24h TTL — anything older is dropped before it gets here.
  useEffect(() => {
    const stored = readStoredSession(token);
    if (stored) {
      sessionIdRef.current = stored.sessionId;
      setSessionId(stored.sessionId);
    }
  }, [token]);

  // Drop just the localStorage pointer to the active session. We use this
  // the moment a session ends (visitor- OR agent-initiated) so the next
  // iframe open never resurrects a closed session id from disk — even if
  // the visitor closes the iframe before completing the review form. The
  // in-memory session_id stays around so the review form can still POST
  // the rating against it.
  const dropStoredSessionId = useCallback(() => {
    try {
      localStorage.removeItem(sessionStorageKey(token));
    } catch {
      /* ignore */
    }
  }, [token]);

  // Hard-reset all session-bound state. Called when the backend tells us
  // a stored session is no longer valid (HTTP 410 `session_expired`), or by
  // the shell after the visitor dismisses the post-chat review.
  const clearSession = useCallback(() => {
    dropStoredSessionId();
    sessionIdRef.current = null;
    messageIdsRef.current = new Set();
    lastTsRef.current = null;
    setSessionId(null);
    setMessages([]);
    setEndedBy(null);
  }, [dropStoredSessionId]);

  const isSessionExpired = (err: unknown): boolean =>
    err instanceof WidgetApiError &&
    (err.status === 410 || err.code === 'session_expired');

  // ---- Shared message-merge helper ------------------------------------
  const appendIfNew = useCallback((msg: WidgetMessage) => {
    if (messageIdsRef.current.has(msg.message_id)) return;
    messageIdsRef.current.add(msg.message_id);
    setMessages((prev) => {
      // Double-check state by id — covers the race where the visitor's
      // HTTP POST broadcasts back over their own WS before `send()` has
      // swapped the optimistic bubble's tempId for the real message_id.
      if (prev.some((m) => m.message_id === msg.message_id)) return prev;
      return prev.concat(msg);
    });
    if (!lastTsRef.current || msg.timestamp > lastTsRef.current) {
      lastTsRef.current = msg.timestamp;
    }
  }, []);

  // ---- Polling (fallback + initial catch-up) -------------------------
  const pollOnce = useCallback(async () => {
    const sid = sessionIdRef.current;
    if (!sid) return;
    try {
      const after = lastTsRef.current ?? undefined;
      const batch = await listMessages({ token, session_id: sid, after });
      if (!batch || batch.length === 0) return;

      setMessages((prev) => {
        const next = prev.slice();
        for (const msg of batch) {
          if (messageIdsRef.current.has(msg.message_id)) continue;
          messageIdsRef.current.add(msg.message_id);
          next.push(msg);
          if (!lastTsRef.current || msg.timestamp > lastTsRef.current) {
            lastTsRef.current = msg.timestamp;
          }
        }
        return next;
      });
    } catch (err) {
      // Silent on poll errors — keep the loop alive. Surface only hard
      // auth/forbidden errors so we stop hammering the backend.
      if (isSessionExpired(err)) {
        // Stale session — wipe local state so the next send starts fresh.
        clearSession();
        return;
      }
      if (err instanceof Error && /403|404/.test(err.message)) {
        setError(err.message);
        if (pollTimerRef.current) {
          clearTimeout(pollTimerRef.current);
          pollTimerRef.current = null;
        }
      }
    }
  }, [clearSession, token]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const scheduleNextPoll = useCallback(() => {
    // Inline stopPolling so React's exhaustive-deps check is satisfied
    // without pulling the callback into the dependency array (which would
    // make scheduleNextPoll unstable and restart the timer on every render).
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (!sessionIdRef.current) return;
    if (!isVisibleRef.current) return;
    if (!useFallbackPollingRef.current) return;
    pollTimerRef.current = setTimeout(async () => {
      await pollOnce();
      scheduleNextPoll();
    }, POLL_INTERVAL_MS);
  }, [pollOnce]);

  // ---- WebSocket ------------------------------------------------------
  const clearWsTimers = useCallback(() => {
    if (wsPingTimerRef.current) {
      clearInterval(wsPingTimerRef.current);
      wsPingTimerRef.current = null;
    }
    if (wsReconnectTimerRef.current) {
      clearTimeout(wsReconnectTimerRef.current);
      wsReconnectTimerRef.current = null;
    }
  }, []);

  const closeWs = useCallback(
    (intentional: boolean) => {
      isWsIntentionalCloseRef.current = intentional;
      clearWsTimers();
      const ws = wsRef.current;
      if (ws) {
        try {
          ws.close();
        } catch {
          /* ignore */
        }
        wsRef.current = null;
      }
    },
    [clearWsTimers]
  );

  const openWs = useCallback(() => {
    const sid = sessionIdRef.current;
    if (!sid) return;
    if (!isVisibleRef.current) return;
    if (typeof window === 'undefined' || typeof WebSocket === 'undefined') return;

    // Avoid stacking connections.
    const existing = wsRef.current;
    if (existing && (existing.readyState === WebSocket.OPEN || existing.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const url = buildWebSocketUrl(token, sid);
    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch {
      // Synchronous construction failure — treat as hard failure, flip to polling fallback.
      wsFailuresRef.current += 1;
      if (wsFailuresRef.current >= MAX_WS_FAILURES_BEFORE_POLL_FALLBACK) {
        useFallbackPollingRef.current = true;
        scheduleNextPoll();
      }
      return;
    }
    wsRef.current = ws;
    isWsIntentionalCloseRef.current = false;

    ws.onopen = () => {
      wsFailuresRef.current = 0;
      useFallbackPollingRef.current = false;
      // Stop any running fallback poll loop — WS is authoritative now.
      stopPolling();
      // Keepalive so proxies don't idle-kill the socket.
      if (wsPingTimerRef.current) clearInterval(wsPingTimerRef.current);
      wsPingTimerRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
          } catch {
            /* ignore */
          }
        }
      }, PING_INTERVAL_MS);
    };

    ws.onmessage = (event) => {
      let data: unknown;
      try {
        data = JSON.parse(typeof event.data === 'string' ? event.data : '');
      } catch {
        return;
      }
      if (!data || typeof data !== 'object') return;

      const payload = data as Record<string, unknown>;
      const type = payload.type;

      // The connection handshake carries the session's current ended-state.
      // This catches the "missed event" case: the WS was closed when the
      // session ended (iframe was hidden, host reload, network blip), so
      // the visitor never got the live `session_ended` frame. On reconnect
      // we resync from the handshake and route them to the review form.
      if (type === 'connection') {
        const rawEndedBy = payload.ended_by;
        if (
          rawEndedBy === 'visitor' ||
          rawEndedBy === 'agent' ||
          rawEndedBy === 'timeout'
        ) {
          setEndedBy(rawEndedBy);
          dropStoredSessionId();
        }
        return;
      }

      if (type === 'session_ended') {
        const rawEndedBy = payload.ended_by;
        if (
          rawEndedBy === 'visitor' ||
          rawEndedBy === 'agent' ||
          rawEndedBy === 'timeout'
        ) {
          setEndedBy(rawEndedBy);
          // Wipe the persisted session id immediately so the next iframe
          // open never resurrects a closed session — even if the visitor
          // closes the iframe before completing the review form.
          dropStoredSessionId();
        }
        return;
      }

      if (type !== 'new_message') return;

      const raw = payload.message;
      if (!raw || typeof raw !== 'object') return;
      const m = raw as Record<string, unknown>;

      const messageId = typeof m.message_id === 'string' ? m.message_id : undefined;
      if (!messageId) return;

      const msg: WidgetMessage = {
        message_id: messageId,
        message_text: typeof m.message_text === 'string' ? m.message_text : '',
        is_from_visitor: Boolean(m.is_from_visitor),
        timestamp: typeof m.timestamp === 'string' ? m.timestamp : new Date().toISOString(),
        attachments: Array.isArray(m.attachments)
          ? (m.attachments as WidgetMessage['attachments'])
          : undefined,
        sent_by_name: typeof m.sent_by === 'string' ? m.sent_by : undefined,
      };
      appendIfNew(msg);
    };

    ws.onerror = () => {
      // Errors are followed by `close`; let that handler do the real work.
    };

    ws.onclose = () => {
      clearWsTimers();
      wsRef.current = null;

      if (isWsIntentionalCloseRef.current) {
        isWsIntentionalCloseRef.current = false;
        return;
      }
      if (!sessionIdRef.current) return;
      if (!isVisibleRef.current) return;

      wsFailuresRef.current += 1;

      if (wsFailuresRef.current >= MAX_WS_FAILURES_BEFORE_POLL_FALLBACK) {
        // Give up on WS for now — fall back to HTTP polling. We still
        // periodically try to re-open WS on the same cadence so the
        // widget upgrades back to real-time when the network recovers.
        useFallbackPollingRef.current = true;
        // Kick an immediate catch-up fetch + start the poll loop.
        void pollOnce().then(() => scheduleNextPoll());
      }

      // Exponential backoff: 3s → 6s → 12s → 24s → max 30s, with jitter.
      const baseDelay = Math.min(
        BASE_WS_BACKOFF_MS * Math.pow(2, wsFailuresRef.current - 1),
        MAX_WS_BACKOFF_MS
      );
      const delay = baseDelay * (0.5 + Math.random());
      wsReconnectTimerRef.current = setTimeout(() => {
        openWs();
      }, delay);
    };
  }, [appendIfNew, clearWsTimers, dropStoredSessionId, pollOnce, scheduleNextPoll, stopPolling, token]);

  // ---- Visibility handling -------------------------------------------
  useEffect(() => {
    function handleVisibility() {
      const visible = document.visibilityState !== 'hidden';
      isVisibleRef.current = visible;
      if (visible) {
        // Fire an immediate catch-up fetch so we don't miss messages that
        // arrived while the tab was backgrounded. Then bring WS back up (or
        // resume polling if we're in fallback mode).
        void pollOnce().then(() => {
          if (useFallbackPollingRef.current) {
            scheduleNextPoll();
          } else {
            openWs();
          }
        });
      } else {
        stopPolling();
        closeWs(true);
      }
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      stopPolling();
      closeWs(true);
    };
  }, [closeWs, openWs, pollOnce, scheduleNextPoll, stopPolling]);

  // Kick off transport when a session_id appears.
  useEffect(() => {
    if (sessionId) {
      // Initial history fetch so the widget has context immediately.
      // Then open WS for real-time updates; polling only kicks in if the
      // WS connection fails repeatedly.
      void pollOnce().then(() => {
        openWs();
      });
    } else {
      stopPolling();
      closeWs(true);
    }
    return () => {
      stopPolling();
      closeWs(true);
    };
  }, [sessionId, pollOnce, openWs, stopPolling, closeWs]);

  // ---- Session creation -----------------------------------------------
  const startSession = useCallback(
    async (opts?: StartSessionOpts): Promise<string | null> => {
      if (sessionIdRef.current) return sessionIdRef.current;
      setIsStartingSession(true);
      setError(null);
      try {
        const visitorId = getOrCreateVisitorId();
        const res = await createSession({
          token,
          visitor_id: visitorId,
          visitor_name: opts?.visitorName,
          visitor_email: opts?.visitorEmail,
          page_url: typeof window !== 'undefined' ? window.location.href : undefined,
          referrer: typeof document !== 'undefined' ? document.referrer : undefined,
        });
        const newId = res.session_id;
        sessionIdRef.current = newId;
        writeStoredSession(token, newId);
        setSessionId(newId);
        return newId;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'session_failed';
        setError(msg);
        return null;
      } finally {
        setIsStartingSession(false);
      }
    },
    [token]
  );

  // ---- Send -----------------------------------------------------------
  const send = useCallback(
    async (text: string, attachments?: WidgetMessage['attachments']) => {
      const trimmed = text.trim();
      if (!trimmed && (!attachments || attachments.length === 0)) return;

      setIsSending(true);
      setError(null);

      // No optimistic bubble — the bubble only appears when we receive the
      // authoritative copy back from the server (via WS echo, or polling
      // fallback). This keeps the "render once" invariant trivial: there's
      // exactly one source of truth for a message's existence in the UI.
      // A sub-second latency between hitting Send and seeing the bubble is
      // the trade-off for zero-dedupe-logic simplicity.
      try {
        let sid = sessionIdRef.current;
        if (!sid) sid = await startSession();
        if (!sid) throw new Error('session_unavailable');

        try {
          const res = await sendMessage({
            token,
            session_id: sid,
            message_text: trimmed,
            attachments,
          });
          // Feed the authoritative response through the same merge path the
          // WS listener uses. appendIfNew dedupes against the WS echo that
          // arrives slightly earlier / later from the backend broadcast.
          appendIfNew(res);
        } catch (err) {
          if (!isSessionExpired(err)) throw err;
          // Stored session expired server-side. Clear it, mint a fresh one,
          // and resend transparently so the visitor never sees the failure.
          clearSession();
          const newSid = await startSession();
          if (!newSid) throw new Error('session_unavailable');
          const res = await sendMessage({
            token,
            session_id: newSid,
            message_text: trimmed,
            attachments,
          });
          appendIfNew(res);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'send_failed');
      } finally {
        setIsSending(false);
      }
    },
    [appendIfNew, clearSession, startSession, token]
  );

  // ---- Visitor-initiated end of conversation -------------------------
  const closeSession = useCallback(async () => {
    const sid = sessionIdRef.current;
    if (!sid) {
      // No active session — just flip the local state so the shell can
      // route to the review/closed view without a backend round-trip.
      setEndedBy('visitor');
      return;
    }
    try {
      await closeSessionApi({ token, session_id: sid });
    } catch (err) {
      // Best-effort: even if the close API fails (e.g. session already
      // expired server-side), still surface ended state locally so the
      // visitor isn't stuck in a half-closed UI.
      if (!isSessionExpired(err)) {
        // Swallow other errors silently — closing is a teardown action.
      }
    }
    setEndedBy('visitor');
    // Drop the persisted session id immediately. The in-memory id is kept
    // until the review form is dismissed so `rate()` still has a target,
    // but localStorage is gone right now — closing the iframe before
    // reviewing won't resurrect the closed session on the next open.
    dropStoredSessionId();
  }, [dropStoredSessionId, token]);

  const rate = useCallback(
    async (rating: number, comment?: string) => {
      const sid = sessionIdRef.current;
      if (!sid) return null;
      try {
        return await rateSessionApi({
          token,
          session_id: sid,
          rating,
          comment: comment?.trim() || undefined,
        });
      } catch {
        return null;
      }
    },
    [token]
  );

  return {
    sessionId,
    messages,
    isStartingSession,
    isSending,
    error,
    endedBy,
    startSession,
    send,
    closeSession,
    rate,
    clearSession,
  };
}
