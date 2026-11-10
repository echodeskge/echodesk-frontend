/**
 * IncomingCallNotification: shown only for an incoming ringing call while the
 * rail is not open; no 30 s auto-hide (U1); Accept / Decline wired; "View"
 * opens the rail.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import React from "react";

import en from "@/i18n/messages/en.json";
import ka from "@/i18n/messages/ka.json";
import type { CallActionsValue, CallStateValue } from "@/contexts/call-types";

const h = vi.hoisted(() => ({
  state: null as unknown as CallStateValue,
  actions: null as unknown as CallActionsValue,
}));

vi.mock("@/components/calls/rail/use-rail-call", () => ({
  useCallState: () => h.state,
  useCallActions: () => h.actions,
  useRailAdapterEffects: () => {},
}));

import { IncomingCallNotification } from "@/components/calls/IncomingCallNotification";
import { makeActions, makeActiveCall, makeState } from "./rail/rail-test-utils";

const closedRail = { mode: "closed" as const, prefill: null, autoDial: false };
const openRail = { mode: "open" as const, prefill: null, autoDial: false };
const ringing = (overrides = {}) => makeActiveCall({ status: "ringing", callerName: "John Doe", startTime: undefined, ...overrides });

function renderToast(locale = "en", messages: Record<string, unknown> = en) {
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <IncomingCallNotification />
    </NextIntlClientProvider>
  );
}

beforeEach(() => {
  h.state = makeState({ rail: closedRail, activeCall: ringing() });
  h.actions = makeActions();
});
afterEach(() => vi.useRealTimers());

describe("not rendered", () => {
  it.each([
    ["no active call", { activeCall: null }],
    ["outgoing", { activeCall: ringing({ direction: "outgoing" }) }],
    ["active", { activeCall: ringing({ status: "active" }) }],
    ["connecting", { activeCall: ringing({ status: "connecting" }) }],
    ["ending", { activeCall: ringing({ status: "ending" }) }],
  ])("%s", (_label, overrides) => {
    h.state = makeState({ rail: closedRail, ...overrides });
    const { container } = renderToast();
    expect(container.firstChild).toBeNull();
  });

  it("while the call rail is open (the rail has Accept / Decline; on mobile it is a full-screen sheet)", () => {
    h.state = makeState({ rail: openRail, activeCall: ringing() });
    const { container } = renderToast();
    expect(container.firstChild).toBeNull();
  });
});

describe("rendered for an incoming ringing call", () => {
  it("shows the caller name, number and direction, announced assertively", () => {
    renderToast();
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("+995555123456")).toBeInTheDocument();
    expect(screen.getByText("Incoming call")).toBeInTheDocument();
    const alert = screen.getByRole("alert");
    expect(alert).toHaveAttribute("aria-live", "assertive");
    expect(alert).toHaveAttribute("aria-label", "Incoming call from John Doe");
  });

  it("falls back to 'Unknown caller'", () => {
    h.state = makeState({ rail: closedRail, activeCall: ringing({ callerName: undefined }) });
    renderToast();
    expect(screen.getByText("Unknown caller")).toBeInTheDocument();
  });

  it("stays as long as the call rings (no 30 s auto-hide)", () => {
    vi.useFakeTimers();
    renderToast();
    act(() => {
      vi.advanceTimersByTime(31_000);
    });
    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });

  it("Accept / Decline go to CallContext", async () => {
    const user = userEvent.setup();
    renderToast();
    await user.click(screen.getByText("Accept"));
    await user.click(screen.getByText("Decline"));
    expect(h.actions.acceptCall).toHaveBeenCalledTimes(1);
    expect(h.actions.rejectCall).toHaveBeenCalledTimes(1);
  });

  it("View opens the rail", async () => {
    const user = userEvent.setup();
    renderToast();
    await user.click(screen.getByTestId("incoming-call-view"));
    expect(h.actions.openRail).toHaveBeenCalledTimes(1);
    expect(h.actions.openRail).toHaveBeenCalledWith();
  });

  it("renders in Georgian", () => {
    renderToast("ka", ka);
    expect(screen.getByText(ka.calls.accept)).toBeInTheDocument();
    expect(screen.getByText(ka.calls.decline)).toBeInTheDocument();
  });
});
