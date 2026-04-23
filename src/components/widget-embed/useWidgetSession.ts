"use client";

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  createSession,
  listMessages,
  sendMessage,
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

export interface UseWidgetSessionResult {
  sessionId: string | null;
  messages: WidgetMessage[];
  isStartingSession: boolean;
  isSending: boolean;
  error: string | null;
  startSession: (opts?: StartSessionOpts) => Promise<string | null>;
  send: (text: string) => Promise<void>;
}

const POLL_INTERVAL_MS = 4000;

/**
 * Manages the widget's session + message history for a given token.
 *
 * - Lazily creates a session the first time `startSession` or `send` is
 *   called (whichever happens first).
 * - Polls /api/widget/public/messages/list/ every 4s while the tab is
 *   visible. Pauses on visibilitychange → hidden.
 * - Exposes `send(text)` that optimistically starts a session if one
 *   doesn't exist yet.
 *
 * PR 3 will swap the poll loop for a WebSocket; the hook's public API
 * stays the same so callers don't need to change.
 */
export function useWidgetSession(token: string): UseWidgetSessionResult {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<WidgetMessage[]>([]);
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep the latest values in refs for use inside stable poll callbacks.
  const sessionIdRef = useRef<string | null>(null);
  const lastTsRef = useRef<string | null>(null);
  const messageIdsRef = useRef<Set<string>>(new Set());
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isVisibleRef = useRef<boolean>(
    typeof document !== 'undefined' ? document.visibilityState !== 'hidden' : true
  );

  // Restore any persisted session_id on mount.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(sessionStorageKey(token));
      if (stored) {
        sessionIdRef.current = stored;
        setSessionId(stored);
      }
    } catch {
      /* storage blocked — fine, we just start fresh */
    }
  }, [token]);

  // ---- Polling ---------------------------------------------------------
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
      if (err instanceof Error && /403|404/.test(err.message)) {
        setError(err.message);
        if (pollTimerRef.current) {
          clearTimeout(pollTimerRef.current);
          pollTimerRef.current = null;
        }
      }
    }
  }, [token]);

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
    pollTimerRef.current = setTimeout(async () => {
      await pollOnce();
      scheduleNextPoll();
    }, POLL_INTERVAL_MS);
  }, [pollOnce]);

  useEffect(() => {
    function handleVisibility() {
      const visible = document.visibilityState !== 'hidden';
      isVisibleRef.current = visible;
      if (visible) {
        // Fire an immediate catch-up fetch, then resume regular polling.
        void pollOnce().then(() => scheduleNextPoll());
      } else {
        stopPolling();
      }
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      stopPolling();
    };
  }, [pollOnce, scheduleNextPoll, stopPolling]);

  // Kick off polling when a session_id appears.
  useEffect(() => {
    if (sessionId) {
      // Initial history fetch + then polling loop.
      void pollOnce().then(() => scheduleNextPoll());
    } else {
      stopPolling();
    }
    return stopPolling;
    // pollOnce/scheduleNextPoll are stable via their own useCallback deps
  }, [sessionId, pollOnce, scheduleNextPoll, stopPolling]);

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
        try {
          localStorage.setItem(sessionStorageKey(token), newId);
        } catch {
          /* ignore */
        }
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
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      setIsSending(true);
      setError(null);

      // Optimistic local bubble so the UI feels instant.
      const tempId = `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const optimistic: WidgetMessage = {
        message_id: tempId,
        message_text: trimmed,
        is_from_visitor: true,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => prev.concat(optimistic));

      try {
        let sid = sessionIdRef.current;
        if (!sid) sid = await startSession();
        if (!sid) throw new Error('session_unavailable');

        const res = await sendMessage({
          token,
          session_id: sid,
          message_text: trimmed,
        });

        // Swap the optimistic bubble for the authoritative server copy.
        setMessages((prev) =>
          prev.map((m) => (m.message_id === tempId ? { ...res } : m))
        );
        messageIdsRef.current.add(res.message_id);
        if (!lastTsRef.current || res.timestamp > lastTsRef.current) {
          lastTsRef.current = res.timestamp;
        }
      } catch (err) {
        // Roll back the optimistic bubble on hard failure.
        setMessages((prev) => prev.filter((m) => m.message_id !== tempId));
        setError(err instanceof Error ? err.message : 'send_failed');
      } finally {
        setIsSending(false);
      }
    },
    [startSession, token]
  );

  return {
    sessionId,
    messages,
    isStartingSession,
    isSending,
    error,
    startSession,
    send,
  };
}
