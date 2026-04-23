"use client";

import { Phone } from 'lucide-react';

interface CallButtonProps {
  brandColor: string;
  disabled?: boolean;
  disabledReason?: string;
  onClick: () => void;
}

/**
 * Small circular "start a voice call" button rendered inside the widget
 * header. Styled to match the paperclip button in the Composer — same 40×40
 * footprint, lucide icon, solid brand color.
 *
 * Disabled when the visitor hasn't sent their first message yet (no session
 * exists, so we have no session_id to mint SIP credentials with). Parent
 * should hide this component entirely when `config.voice_enabled === false`.
 */
export function CallButton({ brandColor, disabled, disabledReason, onClick }: CallButtonProps) {
  return (
    <button
      type="button"
      aria-label="Start voice call"
      title={disabled ? disabledReason || 'Call unavailable' : 'Start voice call'}
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? 'rgba(255,255,255,.18)' : 'rgba(255,255,255,.22)',
        color: '#ffffff',
        border: 0,
        borderRadius: 999,
        width: 32,
        height: 32,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'background .12s ease, opacity .12s ease',
        marginRight: 6,
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,.32)';
      }}
      onMouseLeave={(e) => {
        if (disabled) return;
        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,.22)';
      }}
    >
      {/* Brand color lives on the overlay; header button uses a translucent
          white pill so it reads cleanly against the colored header. The
          brandColor prop is accepted for future theming consistency. */}
      <Phone size={16} aria-hidden="true" />
      <span style={{ position: 'absolute', left: -9999 }}>
        Start voice call ({brandColor})
      </span>
    </button>
  );
}
