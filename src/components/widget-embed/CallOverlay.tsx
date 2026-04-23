"use client";

import { useEffect, useRef } from 'react';
import { Mic, MicOff, Phone, PhoneOff, X } from 'lucide-react';

import type { CallState } from './useSipCall';

interface CallOverlayProps {
  brandColor: string;
  state: CallState;
  errorCode: string | null;
  isMuted: boolean;
  callDurationSec: number;
  onHangUp: () => void;
  onToggleMute: () => void;
  onDismissError: () => void;
}

function stateLabel(state: CallState): string {
  switch (state) {
    case 'requesting-mic':
      return 'Requesting microphone…';
    case 'fetching-creds':
      return 'Connecting…';
    case 'registering':
      return 'Connecting…';
    case 'ringing':
      return 'Ringing…';
    case 'connected':
      return 'Connected';
    case 'ending':
      return 'Ending call…';
    case 'ended':
      return 'Call ended';
    case 'error':
      return 'Call failed';
    default:
      return '';
  }
}

function errorCopy(code: string | null): string {
  switch (code) {
    case 'mic_denied':
      return 'Microphone access is required to make a call.';
    case 'mic_not_found':
      return 'No microphone was detected on this device.';
    case 'voice_disabled':
      return 'Voice calls are not enabled on this chat.';
    case 'outside_hours':
      return 'Calls are available during business hours only.';
    case 'origin_not_allowed':
      return 'Voice calls are not enabled on this website.';
    case 'pbx_unavailable':
    case 'provision_failed':
      return 'Calls are temporarily unavailable. Please try again in a moment.';
    case 'session_expired':
    case 'session_not_found':
      return 'This chat session has expired. Start a new chat to call.';
    case 'not_found':
      return 'This chat widget is not configured for calls.';
    case 'busy':
      return 'The agent is busy. Please try again in a moment.';
    case 'no_answer':
      return 'No one answered. Please try again later.';
    case 'declined':
      return 'The call was declined.';
    case 'unavailable':
      return 'No agents are available right now.';
    default:
      return 'Something went wrong starting the call.';
  }
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

/**
 * Full-iframe overlay shown while a voice call is in progress. Replaces the
 * chat surface entirely (not dismissable except via hang-up) so visitors
 * can't accidentally close the widget mid-call. Solid brand-color background
 * with white foreground — visually distinct from the chat view so users
 * immediately understand they're in a call.
 *
 * The hidden <audio> sink for remote audio is mounted by `useSipCall` on
 * document.body (outside the React tree), so nothing related to playback
 * lives in this component — it's purely UI chrome.
 */
export function CallOverlay({
  brandColor,
  state,
  errorCode,
  isMuted,
  callDurationSec,
  onHangUp,
  onToggleMute,
  onDismissError,
}: CallOverlayProps) {
  const hangUpRef = useRef<HTMLButtonElement>(null);
  const dismissRef = useRef<HTMLButtonElement>(null);

  // Focus the most-likely-actioned button on state changes for a11y.
  useEffect(() => {
    if (state === 'error' || state === 'ended') {
      dismissRef.current?.focus();
    } else {
      hangUpRef.current?.focus();
    }
  }, [state]);

  const isError = state === 'error';
  const isEnded = state === 'ended';
  const showTimer = state === 'connected' || state === 'ending';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Voice call"
      style={{
        position: 'absolute',
        inset: 0,
        background: brandColor,
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 20,
      }}
    >
      {/* Top-right close (only while error/ended) */}
      {(isError || isEnded) && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: 10 }}>
          <button
            type="button"
            ref={dismissRef}
            onClick={onDismissError}
            aria-label="Close"
            style={{
              background: 'rgba(255,255,255,.14)',
              color: '#fff',
              border: 0,
              width: 32,
              height: 32,
              borderRadius: 999,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Body */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 24px',
          textAlign: 'center',
          gap: 14,
        }}
      >
        {/* Avatar / initials bubble */}
        <div
          aria-hidden="true"
          style={{
            width: 88,
            height: 88,
            borderRadius: 999,
            background: 'rgba(255,255,255,.18)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 32,
            fontWeight: 600,
            letterSpacing: 1,
            marginBottom: 6,
          }}
        >
          {isError ? '!' : <Phone size={36} />}
        </div>

        <div style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.2 }}>
          {isError ? 'Call failed' : 'Support'}
        </div>

        <div
          style={{
            fontSize: 13,
            opacity: 0.85,
            minHeight: 18,
          }}
        >
          {stateLabel(state)}
        </div>

        {showTimer && (
          <div
            aria-live="polite"
            style={{
              fontSize: 22,
              fontVariantNumeric: 'tabular-nums',
              fontWeight: 500,
              marginTop: 2,
            }}
          >
            {formatDuration(callDurationSec)}
          </div>
        )}

        {isError && (
          <div
            role="alert"
            style={{
              marginTop: 10,
              background: 'rgba(0,0,0,.18)',
              color: '#fff',
              padding: '10px 14px',
              borderRadius: 10,
              fontSize: 13,
              maxWidth: 280,
              lineHeight: 1.4,
            }}
          >
            {errorCopy(errorCode)}
          </div>
        )}
      </div>

      {/* Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 18,
          padding: '16px 16px 28px',
        }}
      >
        {!isError && !isEnded && (
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            aria-pressed={isMuted}
            disabled={state !== 'connected'}
            style={{
              background: isMuted ? '#ffffff' : 'rgba(255,255,255,.2)',
              color: isMuted ? brandColor : '#ffffff',
              border: 0,
              width: 52,
              height: 52,
              borderRadius: 999,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: state === 'connected' ? 'pointer' : 'not-allowed',
              opacity: state === 'connected' ? 1 : 0.5,
            }}
          >
            {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
          </button>
        )}

        {!isError && !isEnded && (
          <button
            type="button"
            ref={hangUpRef}
            onClick={onHangUp}
            aria-label="Hang up"
            style={{
              background: '#dc2626',
              color: '#ffffff',
              border: 0,
              width: 64,
              height: 64,
              borderRadius: 999,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 6px 18px rgba(0,0,0,.25)',
            }}
          >
            <PhoneOff size={26} />
          </button>
        )}

        {(isError || isEnded) && (
          <button
            type="button"
            onClick={onDismissError}
            style={{
              background: '#ffffff',
              color: brandColor,
              border: 0,
              padding: '10px 24px',
              borderRadius: 999,
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
}
