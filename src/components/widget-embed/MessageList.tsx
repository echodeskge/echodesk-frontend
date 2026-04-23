"use client";

import { useEffect, useRef } from 'react';

import { MessageBubble } from './MessageBubble';
import type { WidgetMessage } from './widget-api';

interface MessageListProps {
  messages: WidgetMessage[];
  brandColor: string;
  welcomeMessage?: string;
}

export function MessageList({ messages, brandColor, welcomeMessage }: MessageListProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    // Small delay keeps the scroll reliable on initial mount when bubbles
    // are still laying out.
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [messages.length]);

  return (
    <div
      ref={scrollerRef}
      className="echodesk-scroll"
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px 14px',
        background: '#ffffff',
      }}
    >
      {welcomeMessage && (
        <div
          style={{
            background: '#f9fafb',
            border: '1px solid #e5e7eb',
            color: '#4b5563',
            padding: '10px 12px',
            borderRadius: 12,
            fontSize: 13,
            marginBottom: 12,
          }}
        >
          {welcomeMessage}
        </div>
      )}

      {messages.length === 0 && !welcomeMessage && (
        <div style={{ color: '#9ca3af', textAlign: 'center', fontSize: 13, padding: '2rem 0' }}>
          Say hi to start the conversation.
        </div>
      )}

      {messages.map((m) => (
        <MessageBubble key={m.message_id} message={m} brandColor={brandColor} />
      ))}
    </div>
  );
}
