"use client";

import { type FormEvent, useState } from 'react';

import type { WidgetConfig } from './widget-api';

interface PreChatFormProps {
  config: WidgetConfig;
  onSubmit: (data: { name?: string; email?: string }) => Promise<void> | void;
  isSubmitting?: boolean;
}

export function PreChatForm({ config, onSubmit, isSubmitting }: PreChatFormProps) {
  const brand = config.brand_color || '#2A2B7D';
  const form = config.pre_chat_form || {};
  const nameRequired = Boolean(form.name_required);
  const emailRequired = Boolean(form.email_required);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setValidationError(null);

    if (nameRequired && !name.trim()) {
      setValidationError('Please enter your name.');
      return;
    }
    if (emailRequired && !email.trim()) {
      setValidationError('Please enter your email.');
      return;
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setValidationError('Please enter a valid email address.');
      return;
    }

    await onSubmit({
      name: name.trim() || undefined,
      email: email.trim() || undefined,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        padding: '20px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        height: '100%',
        background: '#ffffff',
      }}
    >
      <div>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#111827' }}>
          Before we start
        </h2>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>
          Tell us a little about yourself so we can reply even if we miss you live.
        </p>
      </div>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 12, color: '#374151' }}>
          Name {nameRequired && <span style={{ color: '#ef4444' }}>*</span>}
        </span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          style={inputStyle}
        />
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 12, color: '#374151' }}>
          Email {emailRequired && <span style={{ color: '#ef4444' }}>*</span>}
        </span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          style={inputStyle}
        />
      </label>

      {validationError && (
        <div style={{ color: '#ef4444', fontSize: 12 }}>{validationError}</div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        style={{
          marginTop: 4,
          background: isSubmitting ? '#9ca3af' : brand,
          color: '#fff',
          border: 0,
          borderRadius: 10,
          padding: '10px 14px',
          fontSize: 14,
          fontWeight: 600,
          cursor: isSubmitting ? 'not-allowed' : 'pointer',
        }}
      >
        {isSubmitting ? 'Starting…' : 'Start chatting'}
      </button>
    </form>
  );
}

const inputStyle: React.CSSProperties = {
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  padding: '8px 10px',
  fontSize: 14,
  background: '#ffffff',
  color: '#111827',
  outline: 'none',
  fontFamily: 'inherit',
};
