"use client";

import { X } from 'lucide-react';

import type { WidgetConfig } from './widget-api';

interface HeaderProps {
  config: WidgetConfig | null;
  onClose: () => void;
}

export function Header({ config, onClose }: HeaderProps) {
  const brand = config?.brand_color || '#2A2B7D';
  const online = config?.is_online ?? true;

  return (
    <div
      style={{
        background: brand,
        color: '#fff',
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          aria-hidden="true"
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            background: online ? '#22c55e' : '#f59e0b',
            boxShadow: online ? '0 0 0 3px rgba(34,197,94,.25)' : undefined,
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>
            {online ? 'We are online' : 'Leave us a message'}
          </span>
          <span style={{ opacity: 0.85, fontSize: 12 }}>
            {online ? 'We typically reply within a few minutes' : 'We reply as soon as we are back'}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close chat"
        style={{
          background: 'transparent',
          border: 0,
          color: '#fff',
          cursor: 'pointer',
          padding: 6,
          borderRadius: 6,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0.85,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.opacity = '1';
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,.12)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.opacity = '0.85';
          (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
        }}
      >
        <X size={18} />
      </button>
    </div>
  );
}
