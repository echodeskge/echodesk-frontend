"use client";

import { useMemo, useState } from 'react';
import { Star } from 'lucide-react';

import type { SessionEndedBy } from './useWidgetSession';
import { pickWidgetStrings } from './widget-strings';

interface ReviewFormProps {
  brandColor: string;
  endedBy: Exclude<SessionEndedBy, null>;
  onSubmit: (rating: number, comment?: string) => Promise<void>;
  onSkip: () => void;
}

/**
 * Post-chat review prompt: 1–5 stars + optional comment + Submit / Skip.
 *
 * Shown either:
 *   - after the visitor clicks "End conversation" in `CloseConfirmDialog`
 *   - or when the agent ends the session server-side (WS pushes
 *     `session_ended` → useWidgetSession exposes `endedBy === 'agent'`).
 *
 * Once the visitor submits OR skips, the parent shell wipes localStorage
 * and posts `echodesk:close` to the host page so the iframe collapses.
 *
 * Inline copy matches the rest of the widget (PreChatForm, etc.) — the
 * iframe runs without a next-intl provider to keep the bundle small.
 */
export function ReviewForm({
  brandColor,
  endedBy,
  onSubmit,
  onSkip,
}: ReviewFormProps) {
  const t = useMemo(() => pickWidgetStrings().review, []);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const title = endedBy === 'agent' ? t.agentTitle : t.visitorTitle;

  const handleSubmit = async () => {
    if (rating < 1 || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(rating, comment.trim() || undefined);
      setSubmitted(true);
      window.setTimeout(() => onSkip(), 1500);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div
        role="status"
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          fontSize: 15,
          color: '#111827',
          textAlign: 'center',
        }}
      >
        {t.thanks}
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        padding: '20px 18px',
        overflowY: 'auto',
      }}
    >
      <div>
        <h2
          style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 600,
            color: '#111827',
          }}
        >
          {title}
        </h2>
        <p
          style={{
            margin: '6px 0 0',
            fontSize: 13,
            color: '#6b7280',
            lineHeight: 1.45,
          }}
        >
          {t.prompt}
        </p>
      </div>

      <div>
        <label
          style={{
            display: 'block',
            fontSize: 12,
            color: '#6b7280',
            marginBottom: 6,
          }}
        >
          {t.ratingLabel}
        </label>
        <div
          role="radiogroup"
          aria-label={t.ratingLabel}
          style={{ display: 'flex', gap: 4 }}
        >
          {[1, 2, 3, 4, 5].map((value) => {
            const active = (hover || rating) >= value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={rating === value}
                onClick={() => setRating(value)}
                onMouseEnter={() => setHover(value)}
                onMouseLeave={() => setHover(0)}
                disabled={submitting}
                style={{
                  background: 'transparent',
                  border: 0,
                  padding: 4,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  color: active ? '#f59e0b' : '#d1d5db',
                  transition: 'color .12s ease',
                }}
              >
                <Star
                  size={28}
                  fill={active ? '#f59e0b' : 'none'}
                  strokeWidth={1.5}
                />
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label
          htmlFor="echodesk-review-comment"
          style={{
            display: 'block',
            fontSize: 12,
            color: '#6b7280',
            marginBottom: 6,
          }}
        >
          {t.commentLabel}
        </label>
        <textarea
          id="echodesk-review-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={t.commentPlaceholder}
          rows={3}
          maxLength={1000}
          disabled={submitting}
          style={{
            width: '100%',
            border: '1px solid #e5e7eb',
            borderRadius: 10,
            padding: '8px 10px',
            fontSize: 14,
            fontFamily: 'inherit',
            color: '#111827',
            background: '#f9fafb',
            outline: 'none',
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={rating < 1 || submitting}
          style={{
            flex: 1,
            background: rating < 1 ? '#d1d5db' : brandColor,
            color: '#ffffff',
            border: 0,
            borderRadius: 10,
            padding: '10px 14px',
            fontSize: 14,
            fontWeight: 600,
            cursor: rating < 1 || submitting ? 'not-allowed' : 'pointer',
          }}
        >
          {t.submit}
        </button>
        <button
          type="button"
          onClick={onSkip}
          disabled={submitting}
          style={{
            background: 'transparent',
            color: '#6b7280',
            border: '1px solid #e5e7eb',
            borderRadius: 10,
            padding: '10px 14px',
            fontSize: 14,
            cursor: submitting ? 'not-allowed' : 'pointer',
          }}
        >
          {t.skip}
        </button>
      </div>
    </div>
  );
}
