/**
 * Module-level emitter for backend `call_event` messages.
 *
 * The notifications socket (`useNotificationsWebSocket`) publishes every
 * `{"type": "call_event", "call": {...}}` frame here; `CallContext` subscribes
 * to detect ringall legs answered by another agent and to refresh the call
 * lists. Same pattern as `TeamChat/floatingDock.ts`: no React, so the socket
 * hook and the provider need not know about each other.
 */

export type CallEventStatus =
  | 'initiated'
  | 'ringing'
  | 'answered'
  | 'missed'
  | 'busy'
  | 'no_answer'
  | 'failed'
  | 'cancelled'
  | 'transferred'
  | 'ended'
  | 'recording'
  | 'on_hold'
  | (string & Record<never, never>);

/** Payload of a `call_event` frame (see the API contract in PLAN.md). */
export interface CallEventPayload {
  id: number;
  call_id: string;
  pbx_call_id?: string | null;
  sip_call_id?: string | null;
  status: CallEventStatus;
  direction?: 'inbound' | 'outbound' | null;
  caller_number?: string | null;
  recipient_number?: string | null;
  answered_at?: string | null;
  ended_at?: string | null;
  handled_by?: number | null;
  updated_at?: string | null;
}

type CallEventListener = (call: CallEventPayload) => void;

const listeners = new Set<CallEventListener>();

/** Accepts anything shaped like a call event; anything else is dropped. */
export function isCallEventPayload(value: unknown): value is CallEventPayload {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === 'number' && typeof v.status === 'string';
}

export function publishCallEvent(call: CallEventPayload): void {
  // Copy first: a listener may unsubscribe while we iterate.
  for (const listener of Array.from(listeners)) {
    try {
      listener(call);
    } catch (err) {
      console.error('[call-events] listener failed:', err);
    }
  }
}

/** Subscribe; returns the unsubscribe function. */
export function onCallEvent(listener: CallEventListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Test helper: drop every listener between tests. */
export function __resetCallEventsForTests(): void {
  listeners.clear();
}
