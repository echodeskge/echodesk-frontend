"use client";

import { useMemo } from 'react';

import { pickWidgetStrings } from './widget-strings';

interface CloseConfirmDialogProps {
  brandColor: string;
  onMinimize: () => void;
  onEndConversation: () => void;
  onCancel: () => void;
}

/**
 * Lightweight in-iframe overlay shown when the visitor clicks the X button.
 * Lets them choose between hiding the chat (minimize, session preserved) or
 * fully ending the conversation (which then routes to the post-chat review).
 *
 * Inline styled + inline copy to match the rest of the widget chrome — the
 * iframe deliberately ships without next-intl to keep the bundle small, so
 * we follow PreChatForm's English-only convention.
 */
export function CloseConfirmDialog({
  brandColor,
  onMinimize,
  onEndConversation,
  onCancel,
}: CloseConfirmDialogProps) {
  const t = useMemo(() => pickWidgetStrings().close, []);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="echodesk-close-title"
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(17, 24, 39, .35)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: 16,
        zIndex: 20,
      }}
    >
      <div
        style={{
          width: '100%',
          background: '#ffffff',
          borderRadius: 14,
          boxShadow: '0 12px 32px rgba(0,0,0,.18)',
          padding: '16px 16px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <div style={{ marginBottom: 4 }}>
          <h2
            id="echodesk-close-title"
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 600,
              color: '#111827',
            }}
          >
            {t.title}
          </h2>
          <p
            style={{
              margin: '4px 0 0',
              fontSize: 13,
              color: '#6b7280',
              lineHeight: 1.4,
            }}
          >
            {t.prompt}
          </p>
        </div>

        <button
          type="button"
          autoFocus
          onClick={onMinimize}
          style={{
            background: brandColor,
            color: '#ffffff',
            border: 0,
            borderRadius: 10,
            padding: '10px 14px',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {t.minimize}
        </button>

        <button
          type="button"
          onClick={onEndConversation}
          style={{
            background: '#ffffff',
            color: '#b91c1c',
            border: '1px solid #fecaca',
            borderRadius: 10,
            padding: '10px 14px',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          {t.endConversation}
        </button>

        <button
          type="button"
          onClick={onCancel}
          style={{
            background: 'transparent',
            color: '#6b7280',
            border: 0,
            padding: '6px',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          {t.cancel}
        </button>
      </div>
    </div>
  );
}
