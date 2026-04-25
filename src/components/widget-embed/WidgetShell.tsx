"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';

import { Composer } from './Composer';
import { Header } from './Header';
import { MessageList } from './MessageList';
import { PreChatForm } from './PreChatForm';
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
// Brand splash duration. Shown over the loading state so the widget always
// presents the EchoDesk logo for a beat before the chat appears, even if
// the config request resolves instantly.
const SPLASH_DURATION_MS = 2000;

export function WidgetShell({ token }: WidgetShellProps) {
  const [state, setState] = useState<ShellState>({ kind: 'loading' });
  const [splashDone, setSplashDone] = useState(false);
  const [prechatDone, setPrechatDone] = useState(false);

  const session = useWidgetSession(token);

  // Hold the brand splash for the full duration regardless of how quickly
  // /api/widget/public/config/ resolves.
  useEffect(() => {
    const timer = setTimeout(() => setSplashDone(true), SPLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

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

  // Show the EchoDesk brand splash whenever the config is still loading OR
  // the minimum splash duration hasn't elapsed yet — whichever takes longer.
  if (state.kind === 'loading' || !splashDone) {
    return <BrandSplash />;
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

  return (
    <div className="echodesk-widget-root" style={{ position: 'relative' }}>
      <Header config={config} onClose={onClose} />

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
              className="echodesk-error-strip"
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

/**
 * Brand splash shown for the first SPLASH_DURATION_MS of every iframe load.
 * Plain inline styles + the keyframes registered in widget.css so visitors
 * always see "EchoDesk.ge" before the chat materialises.
 */
function BrandSplash() {
  return (
    <div className="echodesk-widget-root echodesk-splash-root">
      <div className="echodesk-splash-inner">
        <a
          href="https://echodesk.ge"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open echodesk.ge"
          className="echodesk-splash-link"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-svg.svg"
            alt="EchoDesk"
            width={140}
            height={40}
            className="echodesk-splash-logo"
          />
        </a>
      </div>
    </div>
  );
}
