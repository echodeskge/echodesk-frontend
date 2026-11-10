'use client';

import { useSyncExternalStore } from 'react';

/**
 * Shared bottom-right "dock" layout.
 *
 * The team chat launcher, the PBX phone launcher and the minimized chat
 * bubbles all live in one vertical column in the bottom-right corner. Chat
 * windows and the conversation list open to the LEFT of that column so they
 * never cover a launcher or a bubble.
 *
 * The call rail (`components/calls/rail`) is a static 320px column at the
 * right edge of the layout on desktop. While it is open the whole dock moves
 * left by its width: every floating element reads `useDockRight()` /
 * `useDockPanelRight()` instead of the raw constants.
 *
 * Every floating element reads its position from here instead of repeating
 * numbers by hand, so the pieces can never drift onto the same slot again.
 */
export const DOCK = {
  /** Launcher / bubble diameter */
  SLOT_SIZE: 36,
  /** Vertical gap between slots in the column */
  SLOT_GAP: 6,
  /** Distance of the column from the right edge */
  RIGHT: 12,
  /** Distance of the first slot from the bottom edge */
  BOTTOM: 12,
  /** Gap between the column and panels opened beside it */
  PANEL_GAP: 12,
  /** Width of the call rail column (desktop); the dock shifts by it while open */
  CALL_RAIL_WIDTH: 320,
  /** Below this viewport width panels switch to a compact full-width layout */
  COMPACT_BREAKPOINT: 640,
  /**
   * Stacking layer. Everything in the dock sits ABOVE page content but BELOW
   * the app's modal layer (shadcn Dialog / AlertDialog / Sheet use z-50), so
   * dialogs and the incoming-call sheet always cover the dock. Bubbles sit
   * above the launchers so a bubble can never be hidden behind one.
   */
  Z_INDEX: { launcher: 40, bubble: 41, window: 45, popup: 46 },
} as const;

/** `bottom` (px) of slot `i` in the dock column. 0 = team chat icon. */
export const dockSlotBottom = (i: number) => DOCK.BOTTOM + i * (DOCK.SLOT_SIZE + DOCK.SLOT_GAP);

/** `right` (px) of the first panel opened beside the dock column (rail closed). */
export const DOCK_PANEL_RIGHT = DOCK.RIGHT + DOCK.SLOT_SIZE + DOCK.PANEL_GAP;

/**
 * Space the dock column takes from the right edge of the viewport. Content
 * that sits at the bottom-right of a screen (composer Send buttons, pagers,
 * toasts) pads by this so a launcher never covers it. The CSS variable
 * `--fab-safe-right` and the `pe-fab-safe` utility (globals.css) mirror it.
 */
export const FAB_SAFE_RIGHT = DOCK_PANEL_RIGHT;

/** Slot index the dialpad launcher occupies (directly above the chat icon). */
export const DIALPAD_SLOT = 1;

/** First slot index available for minimized chat bubbles. */
export const firstBubbleSlot = (hasDialpad: boolean) => (hasDialpad ? DIALPAD_SLOT + 1 : 1);

/** CSS max-height that keeps a panel anchored at `bottom` fully on screen. */
export const panelMaxHeight = (bottom: number) => `calc(100dvh - ${bottom}px - 16px)`;

// ---------------------------------------------------------------------------
// Tiny external store so the phone launcher / call rail (rendered outside
// FloatingChatProvider) and the team chat widget can see each other.
// ---------------------------------------------------------------------------

export type DockPopover = 'chat-list' | 'dialpad';

/** Width the open call rail takes at the right edge (0 while closed / mobile sheet). */
export type CallRailWidth = 0 | typeof DOCK.CALL_RAIL_WIDTH;

interface DockState {
  /** The phone launcher is rendered (ip_calling + SIP config present). */
  dialpadPresent: boolean;
  /** Width of the open call rail column; the dock shifts left by it. */
  railWidth: CallRailWidth;
}

let dockState: DockState = { dialpadPresent: false, railWidth: 0 };
const subscribers = new Set<() => void>();
const popoverListeners = new Set<(opened: DockPopover) => void>();

function setDockState(patch: Partial<DockState>) {
  const next = { ...dockState, ...patch };
  if (next.dialpadPresent === dockState.dialpadPresent && next.railWidth === dockState.railWidth) {
    return;
  }
  dockState = next;
  subscribers.forEach((fn) => fn());
}

export const setDialpadPresent = (present: boolean) => setDockState({ dialpadPresent: present });
export const setCallRailWidth = (width: CallRailWidth) => setDockState({ railWidth: width });

const subscribe = (cb: () => void) => {
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
  };
};

export const getDockState = () => dockState;

export function useDialpadPresent() {
  return useSyncExternalStore(subscribe, () => dockState.dialpadPresent, () => false);
}

export function useCallRailWidth(): CallRailWidth {
  return useSyncExternalStore(subscribe, () => dockState.railWidth, () => 0);
}

/** `right` (px) of the dock column: `DOCK.RIGHT` plus the open call rail. */
export function useDockRight() {
  return DOCK.RIGHT + useCallRailWidth();
}

/** `right` (px) of the first panel beside the dock column, shifted by the open call rail. */
export function useDockPanelRight() {
  return DOCK_PANEL_RIGHT + useCallRailWidth();
}

/**
 * Announce that a dock popover opened. Other popovers subscribed through
 * `onDockPopoverOpened` close themselves, so the chat list and the idle call
 * rail (opened for dialling) are mutually exclusive.
 */
export function announceDockPopoverOpened(opened: DockPopover) {
  popoverListeners.forEach((fn) => fn(opened));
}

export function onDockPopoverOpened(listener: (opened: DockPopover) => void) {
  popoverListeners.add(listener);
  return () => {
    popoverListeners.delete(listener);
  };
}

/** Test helper: reset module state between tests. */
export function __resetDockForTests() {
  dockState = { dialpadPresent: false, railWidth: 0 };
  subscribers.clear();
  popoverListeners.clear();
}
