"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';

import { CallButton } from './CallButton';
import { CallOverlay } from './CallOverlay';
import { Composer } from './Composer';
import { Header } from './Header';
import { MessageList } from './MessageList';
import { PreChatForm } from './PreChatForm';
import { useSipCall } from './useSipCall';
import { getConfig, type WidgetConfig, WidgetApiError } from './widget-api';
import { useWidgetSession } from './useWidgetSession';

interface WidgetShellProps {
  token: string;
}

type ShellState =
  | { kind: 'loading' }
  | { kind: 'config-error'; code?: string; status?: number }
  | { kind: 'ready'; config: WidgetConfig };

const EMBED_ORIGIN = '*';

/**
 * Top-level widget iframe UI.
 *
 * Flow:
 *   1. Fetch config once by token.
 *   2. If `pre_chat_form.enabled` AND no stored session → PreChatForm gates.
 *   3. Otherwise → MessageList + Composer. `useWidgetSession` lazily creates
 *      the server-side session on first send.
 */
export function WidgetShell({ token }: WidgetShellProps) {
  const [state, setState] = useState<ShellState>({ kind: 'loading' });
  const [prechatDone, setPrechatDone] = useState(false);

  const session = useWidgetSession(token);
  const call = useSipCall();

  // Load config -----------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    const ac = new AbortController();
    getConfig(token, ac.signal)
      .then((cfg) => {
        if (cancelled) return;
        setState({ kind: 'ready', config: cfg });
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof WidgetApiError) {
          setState({ kind: 'config-error', code: err.code, status: err.status });
        } else {
          setState({ kind: 'config-error' });
        }
      });
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [token]);

  // Tell the host page we're mounted ---------------------------------------
  useEffect(() => {
    if (typeof window === 'undefined' || !window.parent) return;
    try {
      window.parent.postMessage({ type: 'echodesk:ready' }, EMBED_ORIGIN);
    } catch {
      /* ignore */
    }
  }, []);

  // Unread badge push (for PR2 it's always 0 from the widget side because
  // the iframe is only shown while the user is looking at it — PR3 adds
  // real unread counting via WebSocket + visibility tracking).
  useEffect(() => {
    if (typeof window === 'undefined' || !window.parent) return;
    try {
      window.parent.postMessage({ type: 'echodesk:unread', count: 0 }, EMBED_ORIGIN);
    } catch {
      /* ignore */
    }
  }, []);

  const onClose = useCallback(() => {
    try {
      window.parent.postMessage({ type: 'echodesk:close' }, EMBED_ORIGIN);
    } catch {
      /* ignore */
    }
  }, []);

  const needsPrechat = useMemo(() => {
    if (state.kind !== 'ready') return false;
    if (prechatDone) return false;
    if (session.sessionId) return false; // existing session takes precedence
    return Boolean(state.config.pre_chat_form?.enabled);
  }, [prechatDone, session.sessionId, state]);

  if (state.kind === 'loading') {
    return (
      <div className="echodesk-widget-root">
        <div
          style={{
            display: 'flex',
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            color: '#9ca3af',
            fontSize: 13,
          }}
        >
          Loading chat…
        </div>
      </div>
    );
  }

  if (state.kind === 'config-error') {
    const message =
      state.status === 404
        ? 'This chat widget is not configured yet.'
        : state.status === 403
        ? 'This chat widget is not enabled on this website.'
        : 'Chat is temporarily unavailable.';
    return (
      <div className="echodesk-widget-root">
        <Header config={null} onClose={onClose} />
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            textAlign: 'center',
            color: '#6b7280',
            fontSize: 13,
          }}
        >
          {message}
          {state.code && (
            <div style={{ marginTop: 8, color: '#9ca3af', fontSize: 11 }}>
              (code: {state.code})
            </div>
          )}
        </div>
      </div>
    );
  }

  const { config } = state;
  const brand = config.brand_color || '#2A2B7D';
  const welcome = pickLocalized(config.welcome_message);

  // Voice call plumbing. The button only renders when the tenant has
  // voice_enabled=true on their widget config. It's disabled until the
  // visitor has a session_id (backend won't mint SIP creds otherwise).
  const voiceEnabled = Boolean(config.voice_enabled);
  const canStartCall = voiceEnabled && Boolean(session.sessionId);
  const callActive =
    call.state !== 'idle' && call.state !== 'ended' && call.state !== 'error';
  // Overlay covers idle transitions too: show it any time the call has
  // progressed past 'idle' so the user sees both progress + terminal
  // states (ringing, connected, ended, error). The overlay has its own
  // close button for terminal states.
  const showCallOverlay = call.state !== 'idle';

  const handleStartCall = () => {
    if (!session.sessionId) return;
    void call.startCall({ token, sessionId: session.sessionId });
  };

  return (
    <div className="echodesk-widget-root" style={{ position: 'relative' }}>
      <Header
        config={config}
        onClose={onClose}
        actions={
          voiceEnabled ? (
            <CallButton
              brandColor={brand}
              disabled={!canStartCall || callActive}
              disabledReason={
                !session.sessionId
                  ? 'Send a message first to enable calling'
                  : callActive
                  ? 'A call is already in progress'
                  : undefined
              }
              onClick={handleStartCall}
            />
          ) : null
        }
      />

      {showCallOverlay && (
        <CallOverlay
          brandColor={brand}
          state={call.state}
          errorCode={call.errorCode}
          isMuted={call.isMuted}
          callDurationSec={call.callDurationSec}
          onHangUp={() => {
            void call.hangUp();
          }}
          onToggleMute={call.toggleMute}
          onDismissError={() => {
            void call.hangUp();
          }}
        />
      )}

      {needsPrechat ? (
        <PreChatForm
          config={config}
          isSubmitting={session.isStartingSession}
          onSubmit={async ({ name, email }) => {
            const id = await session.startSession({ visitorName: name, visitorEmail: email });
            if (id) setPrechatDone(true);
          }}
        />
      ) : (
        <>
          <MessageList
            messages={session.messages}
            brandColor={brand}
            welcomeMessage={welcome}
          />

          {session.error && (
            <div
              role="status"
              style={{
                background: '#fef2f2',
                color: '#b91c1c',
                fontSize: 12,
                padding: '6px 14px',
                borderTop: '1px solid #fee2e2',
              }}
            >
              {mapErrorCopy(session.error)}
            </div>
          )}

          <Composer
            brandColor={brand}
            disabled={false}
            isSending={session.isSending || session.isStartingSession}
            getUploadContext={() => ({ token, session_id: session.sessionId })}
            onSend={(text, attachments) => session.send(text, attachments)}
          />
        </>
      )}
    </div>
  );
}

function pickLocalized(value: WidgetConfig['welcome_message'] | undefined): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value || undefined;
  // Prefer the browser's primary language, then English, then whatever's there.
  const pref = typeof navigator !== 'undefined' ? navigator.language.slice(0, 2) : 'en';
  return (
    (value[pref] as string | undefined) ||
    (value.en as string | undefined) ||
    Object.values(value).find((v) => typeof v === 'string' && v) ||
    undefined
  );
}

function mapErrorCopy(code: string): string {
  if (/origin/i.test(code)) return 'This widget is not enabled on the current site.';
  if (/rate|limit|429/i.test(code)) return 'Too many messages — please wait a moment.';
  return 'Something went wrong. Please try again.';
}
