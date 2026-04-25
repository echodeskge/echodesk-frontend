"use client";

import type { WidgetMessage } from './widget-api';

interface MessageBubbleProps {
  message: WidgetMessage;
  brandColor: string;
}

/**
 * One bubble. Visitor → right-aligned, branded; Agent → left-aligned, grey.
 * Text is rendered as a plain string so React's default escaping handles
 * any HTML the visitor or agent types. We never use dangerouslySetInnerHTML.
 */
export function MessageBubble({ message, brandColor }: MessageBubbleProps) {
  const isVisitor = message.is_from_visitor;
  const label = relativeTime(message.timestamp);

  return (
    <div
      className={isVisitor ? 'echodesk-msg-enter--visitor' : 'echodesk-msg-enter--agent'}
      style={{
        display: 'flex',
        justifyContent: isVisitor ? 'flex-end' : 'flex-start',
        marginBottom: 6,
      }}
    >
      <div style={{ maxWidth: '78%', display: 'flex', flexDirection: 'column', alignItems: isVisitor ? 'flex-end' : 'flex-start' }}>
        <div
          style={{
            background: isVisitor ? brandColor : '#f3f4f6',
            color: isVisitor ? '#ffffff' : '#111827',
            padding: '8px 12px',
            borderRadius: 14,
            borderBottomRightRadius: isVisitor ? 4 : 14,
            borderBottomLeftRadius: isVisitor ? 14 : 4,
            fontSize: 14,
            lineHeight: 1.4,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            boxShadow: '0 1px 1px rgba(0,0,0,.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          {message.attachments && message.attachments.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {message.attachments.map((att, i) => {
                const isImage = /^image\//.test(att.content_type || '');
                if (isImage && att.url) {
                  return (
                    // eslint-disable-next-line @next/next/no-img-element
                    <a key={i} href={att.url} target="_blank" rel="noopener noreferrer">
                      <img
                        src={att.url}
                        alt={att.filename || 'attachment'}
                        style={{
                          maxWidth: '100%',
                          maxHeight: 260,
                          borderRadius: 8,
                          display: 'block',
                        }}
                      />
                    </a>
                  );
                }
                return (
                  <a
                    key={i}
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: isVisitor ? '#ffffff' : '#1f2937',
                      textDecoration: 'underline',
                      fontSize: 13,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '100%',
                    }}
                    title={att.filename}
                  >
                    📎 {att.filename || 'file'}
                  </a>
                );
              })}
            </div>
          )}
          {message.message_text ? <span>{message.message_text}</span> : null}
        </div>
        <span style={{ fontSize: 11, color: '#9ca3af', marginTop: 3, padding: '0 4px' }}>
          {message.sent_by_name ? `${message.sent_by_name} · ${label}` : label}
        </span>
      </div>
    </div>
  );
}

function relativeTime(iso: string): string {
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return '';
  const diffSec = Math.round((Date.now() - ts) / 1000);
  if (diffSec < 5) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay}d ago`;
}
