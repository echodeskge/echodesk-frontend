"use client";

import { type KeyboardEvent, useRef, useState } from 'react';
import { Paperclip, Send } from 'lucide-react';

interface ComposerProps {
  brandColor: string;
  disabled?: boolean;
  isSending?: boolean;
  onSend: (text: string) => Promise<void> | void;
}

export function Composer({ brandColor, disabled, isSending, onSend }: ComposerProps) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const submit = async () => {
    const value = text.trim();
    if (!value || isSending) return;
    setText('');
    await onSend(value);
    // Return focus to the textarea so the visitor can keep typing.
    textareaRef.current?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  };

  const isEmpty = text.trim().length === 0;
  const sendDisabled = disabled || isEmpty || Boolean(isSending);

  return (
    <div
      style={{
        borderTop: '1px solid #e5e7eb',
        padding: '10px 10px 12px',
        background: '#ffffff',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 8,
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          padding: '6px 6px 6px 10px',
          background: '#f9fafb',
        }}
      >
        {/* TODO(PR6): wire up attachment upload → /api/widget/public/upload/. */}
        <button
          type="button"
          aria-label="Attach file (coming soon)"
          title="File attachments coming soon"
          disabled
          style={{
            background: 'transparent',
            border: 0,
            color: '#9ca3af',
            cursor: 'not-allowed',
            padding: 6,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Paperclip size={18} />
        </button>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Type a message…"
          rows={1}
          disabled={disabled}
          style={{
            flex: 1,
            resize: 'none',
            border: 0,
            outline: 'none',
            background: 'transparent',
            fontSize: 14,
            lineHeight: 1.4,
            padding: '6px 4px',
            fontFamily: 'inherit',
            color: '#111827',
            maxHeight: 120,
          }}
        />
        <button
          type="button"
          onClick={() => void submit()}
          disabled={sendDisabled}
          aria-label="Send message"
          style={{
            background: sendDisabled ? '#d1d5db' : brandColor,
            color: '#ffffff',
            border: 0,
            borderRadius: 10,
            width: 36,
            height: 36,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: sendDisabled ? 'not-allowed' : 'pointer',
            transition: 'background .12s ease',
          }}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
