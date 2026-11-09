"use client";

/**
 * J / K on the detail page: next / previous ticket (plan §3 Detail header).
 *
 * Ignored when:
 * - any modifier is held (Shift, Ctrl, Alt, Meta), so browser and OS
 *   shortcuts and capital letters typed elsewhere keep working;
 * - focus is in an input, textarea, select or contenteditable element
 *   (title, description, composer, pickers);
 * - a dialog, alert dialog or menu is open;
 * - the key event was already handled, or an IME composition is running.
 */
import { useEffect, useRef } from "react";

export interface TicketHotkeys {
  onNext?: () => void;
  onPrev?: () => void;
  enabled?: boolean;
}

const OPEN_LAYER =
  '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"], [role="menu"][data-state="open"], [role="dialog"]:not([data-state]), [role="alertdialog"]:not([data-state])';

export function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || typeof el.closest !== "function") return false;
  if (el.isContentEditable) return true;
  return !!el.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="textbox"], [role="combobox"]');
}

export function hasOpenLayer(doc: Document = document): boolean {
  return !!doc.querySelector(OPEN_LAYER);
}

export function useTicketHotkeys({ onNext, onPrev, enabled = true }: TicketHotkeys): void {
  const ref = useRef({ onNext, onPrev });
  useEffect(() => {
    ref.current = { onNext, onPrev };
  });

  useEffect(() => {
    if (!enabled || typeof document === "undefined") return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing) return;
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      // `code` too, so a Georgian keyboard layout (ჯ / კ) still works.
      const key = e.key === "j" || e.code === "KeyJ" ? "j" : e.key === "k" || e.code === "KeyK" ? "k" : null;
      if (!key) return;
      if (isTypingTarget(e.target) || isTypingTarget(document.activeElement)) return;
      if (hasOpenLayer()) return;
      const handler = key === "j" ? ref.current.onNext : ref.current.onPrev;
      if (!handler) return;
      e.preventDefault();
      handler();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}
