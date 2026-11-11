/**
 * Call-rail drivers for the e2e-calls specs, written against the CL-00
 * `data-testid` contract in `src/components/calls/rail/README.md` plus the
 * panel ids listed in `tests/e2e-calls/README.md` ("ids beyond the contract").
 *
 * Every wait is bounded: ring detection <= RING_TIMEOUT (15 s), the rest
 * <= ACTION_TIMEOUT (10 s). Nothing sleeps for a fixed time when there is a
 * state to wait for.
 */
import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";

/** An INVITE must reach the callee's rail within this (PLAN: <= 15 s). */
export const RING_TIMEOUT = 15_000;
/** Accept / hold / end round trips. */
export const ACTION_TIMEOUT = 10_000;
/** Registration after the rail opens (next dev + REGISTER). */
export const REGISTER_TIMEOUT = 30_000;

// ---------------------------------------------------------------------------
// locators
// ---------------------------------------------------------------------------

export const rail = (page: Page): Locator => page.getByTestId("call-rail");
export const sipPill = (page: Page): Locator => page.getByTestId("call-rail-sip");
export const statusBadge = (page: Page): Locator => page.getByTestId("call-rail-status");
export const dialInput = (page: Page): Locator => page.getByTestId("call-rail-dial");
export const callButton = (page: Page): Locator => page.getByTestId("call-rail-call");
export const acceptButton = (page: Page): Locator => page.getByTestId("call-rail-accept");
export const declineButton = (page: Page): Locator => page.getByTestId("call-rail-decline");
export const endButton = (page: Page): Locator => page.getByTestId("call-rail-end");
export const muteButton = (page: Page): Locator => page.getByTestId("call-rail-mute");
export const holdButton = (page: Page): Locator => page.getByTestId("call-rail-hold");
export const keypadButton = (page: Page): Locator => page.getByTestId("call-rail-keypad");
export const transferButton = (page: Page): Locator => page.getByTestId("call-rail-transfer");
export const answeredElsewhere = (page: Page): Locator => page.getByTestId("call-rail-answered-elsewhere");
export const timer = (page: Page): Locator => page.getByTestId("call-rail-timer");
export const errorStrip = (page: Page): Locator => page.getByTestId("call-rail-error");
/** The dock launcher (`DialpadWidget` PhoneLauncher): opens / minimises the rail. */
export const launcher = (page: Page): Locator => page.locator("[data-dialpad-trigger]");

/** `call-rail-key-<k>`: digits as is, `*` -> `star`, `#` -> `hash`. */
export function keyId(ch: string): string {
  if (ch === "*") return "call-rail-key-star";
  if (ch === "#") return "call-rail-key-hash";
  if (/^\d$/.test(ch)) return `call-rail-key-${ch}`;
  throw new Error(`Not a keypad character: ${JSON.stringify(ch)}`);
}

// ---------------------------------------------------------------------------
// registration
// ---------------------------------------------------------------------------

/** Opens the rail through the dock launcher unless it is already visible. */
export async function openRail(page: Page) {
  if (await rail(page).isVisible().catch(() => false)) return;
  await expect(launcher(page)).toBeVisible({ timeout: REGISTER_TIMEOUT });
  await launcher(page).click();
  await expect(rail(page)).toBeVisible({ timeout: ACTION_TIMEOUT });
}

export async function waitRegistered(page: Page, timeout = REGISTER_TIMEOUT) {
  await expect(sipPill(page)).toHaveAttribute("data-state", "registered", { timeout });
}

// ---------------------------------------------------------------------------
// call flow
// ---------------------------------------------------------------------------

/** Types a number on the idle keypad and presses Call. */
export async function dial(page: Page, number: string) {
  await openRail(page);
  await expect(dialInput(page)).toBeVisible({ timeout: ACTION_TIMEOUT });
  for (const ch of number) await page.getByTestId(keyId(ch)).click();
  // The input may format what was typed; compare dial characters only.
  await expect.poll(async () => (await dialInput(page).inputValue()).replace(/[^\d*#+]/g, "")).toBe(number);
  await callButton(page).click();
  // The rail leaves idle as soon as the INVITE is sent.
  await expect(statusBadge(page)).toBeVisible({ timeout: ACTION_TIMEOUT });
}

/** Waits for an incoming INVITE: the Accept button appears while `ringing`. */
export async function waitIncoming(page: Page, timeout = RING_TIMEOUT) {
  await expect(acceptButton(page)).toBeVisible({ timeout });
  await expect(statusBadge(page)).toHaveAttribute("data-status", "ringing");
}

/** The caller's leg is ringing (180) or still connecting. */
export async function waitOutgoingRinging(page: Page, timeout = RING_TIMEOUT) {
  await expect(statusBadge(page)).toHaveAttribute("data-status", /^(ringing|connecting)$/, { timeout });
}

export async function waitActive(page: Page, timeout = ACTION_TIMEOUT) {
  await expect(statusBadge(page)).toHaveAttribute("data-status", "active", { timeout });
}

export async function accept(page: Page) {
  await acceptButton(page).click();
  await waitActive(page);
}

export async function decline(page: Page) {
  await declineButton(page).click();
  await expectIdle(page);
}

/** Idle = no call: the dial input is back and no status badge is shown. */
export async function expectIdle(page: Page, timeout = ACTION_TIMEOUT) {
  await expect(dialInput(page)).toBeVisible({ timeout });
  await expect(statusBadge(page)).toHaveCount(0);
}

export async function endCall(page: Page) {
  await endButton(page).click();
  await expectIdle(page);
}

/**
 * Best-effort cleanup: ends or declines whatever the rail is doing and waits
 * for idle, swallowing every error (the page may already be closed).
 */
export async function hangUp(page: Page) {
  if (page.isClosed()) return;
  try {
    for (let i = 0; i < 3; i++) {
      if (await endButton(page).isVisible().catch(() => false)) {
        await endButton(page).click({ timeout: 2_000 }).catch(() => {});
      } else if (await declineButton(page).isVisible().catch(() => false)) {
        await declineButton(page).click({ timeout: 2_000 }).catch(() => {});
      } else if (await page.getByTestId("call-rail-consult-cancel").isVisible().catch(() => false)) {
        await page.getByTestId("call-rail-consult-cancel").click({ timeout: 2_000 }).catch(() => {});
      } else {
        break;
      }
      await expect(statusBadge(page)).toHaveCount(0, { timeout: ACTION_TIMEOUT }).catch(() => {});
    }
  } catch {
    // nothing to clean up
  }
}

/** Reads the mono timer and asserts it advanced by at least one second. */
export async function expectTimerRunning(page: Page) {
  await expect(timer(page)).toHaveText(/\d\d:\d\d/, { timeout: ACTION_TIMEOUT });
  const first = (await timer(page).textContent()) ?? "";
  await expect(timer(page)).not.toHaveText(first, { timeout: 5_000 });
}

// ---------------------------------------------------------------------------
// dev-only SIP test hook (CL-01, NEXT_PUBLIC_CALLS_TEST_HOOK=1)
// ---------------------------------------------------------------------------

/** Shape of `window.__echodeskSip`; documented in tests/e2e-calls/README.md. */
export interface SipHookSnapshot {
  localSdp: string | null;
  senderTrackEnabled: boolean | null;
  state: Record<string, unknown>;
}

declare global {
  interface Window {
    __echodeskSip?: {
      getLocalSdp(): string | null;
      getSenderTrackEnabled(): boolean | null;
      getState(): Record<string, unknown>;
    };
  }
}

export async function sipHook(page: Page): Promise<SipHookSnapshot> {
  return page.evaluate(() => {
    const hook = window.__echodeskSip;
    if (!hook) {
      throw new Error("window.__echodeskSip is missing: start next dev with NEXT_PUBLIC_CALLS_TEST_HOOK=1");
    }
    return {
      localSdp: hook.getLocalSdp(),
      senderTrackEnabled: hook.getSenderTrackEnabled(),
      state: hook.getState(),
    };
  });
}

/** Direction attribute of the audio m-line in the current local description. */
export function sdpDirection(sdp: string | null): "sendrecv" | "sendonly" | "recvonly" | "inactive" | null {
  if (!sdp) return null;
  const audio = sdp.slice(sdp.indexOf("m=audio"));
  const m = audio.match(/^a=(sendrecv|sendonly|recvonly|inactive)\s*$/m);
  return (m?.[1] as "sendrecv" | "sendonly" | "recvonly" | "inactive" | undefined) ?? null;
}
