/**
 * Click-to-call for phone numbers shown outside the softphone (Clients rail,
 * ticket customer section, ...).
 *
 * `enabled` when this user may use the softphone (`useCallingAccess`) and it
 * is registered; `call(number)` then opens the call rail with the number
 * prefilled (no auto-dial: the agent confirms with the Call button). When
 * disabled, callers render a plain `tel:` link (`telHref`) instead.
 */
import { useCallback, useMemo } from "react";
import { useCallingAccess } from "@/lib/calling-access";
import { useCallActions, useCallState } from "@/contexts/CallContext";

export interface ClickToCall {
  enabled: boolean;
  /** Opens the rail with the sanitised number; a number without digits is ignored. */
  call: (number: string) => void;
}

/**
 * Keeps a leading `+`, digits, `*` and `#`; drops spaces, dashes, dots and
 * brackets; turns a `00` international prefix into `+`.
 */
export function sanitizeDialNumber(raw: string | null | undefined): string {
  const trimmed = (raw ?? "").trim();
  const plus = trimmed.startsWith("+");
  const body = trimmed.replace(/[^\d*#]/g, "");
  if (!body) return "";
  if (plus) return `+${body}`;
  if (body.startsWith("00") && body.length > 2) return `+${body.slice(2)}`;
  return body;
}

/** `tel:` href for the fallback link. */
export function telHref(number: string | null | undefined): string {
  return `tel:${sanitizeDialNumber(number)}`;
}

export function useClickToCall(): ClickToCall {
  const { canUseSoftphone } = useCallingAccess();
  const { sipState } = useCallState();
  const { openRail } = useCallActions();

  const enabled = canUseSoftphone && sipState === "registered";

  const call = useCallback(
    (number: string) => {
      const sanitized = sanitizeDialNumber(number);
      if (!sanitized) return;
      openRail({ number: sanitized, autoDial: false });
    },
    [openRail]
  );

  return useMemo(() => ({ enabled, call }), [enabled, call]);
}
