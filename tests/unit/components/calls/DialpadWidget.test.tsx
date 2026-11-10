/**
 * DialpadWidget: the phone launcher (visibility, states, dock offset next to
 * the call rail), the missed-call toast ("Call back" opens the rail with the
 * number) and the toast stack. The softphone itself is the call rail.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import React from "react";

import en from "@/i18n/messages/en.json";
import type { CallActionsValue, CallStateValue } from "@/contexts/call-types";

const h = vi.hoisted(() => ({
  state: null as unknown as CallStateValue,
  actions: null as unknown as CallActionsValue,
  access: { canUseSoftphone: true, canViewCalls: true, tenantHasCalling: true, userHasCalling: true },
}));

vi.mock("@/components/calls/rail/use-rail-call", () => ({
  useCallState: () => h.state,
  useCallActions: () => h.actions,
  useRailAdapterEffects: () => {},
}));
vi.mock("@/lib/calling-access", () => ({ useCallingAccess: () => h.access }));
vi.mock("@/components/calls/IncomingCallNotification", () => ({
  IncomingCallNotification: () => <div data-testid="incoming-call-notification" />,
}));

import DialpadWidget from "@/components/calls/DialpadWidget";
import { __resetDockForTests, getDockState, setCallRailWidth } from "@/components/TeamChat/floatingDock";
import { makeActions, makeActiveCall, makeState } from "./rail/rail-test-utils";

const closedRail = { mode: "closed" as const, prefill: null, autoDial: false };
const openRail = { mode: "open" as const, prefill: null, autoDial: false };

function renderWidget() {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <DialpadWidget />
    </NextIntlClientProvider>
  );
}

const trigger = () => document.querySelector("[data-dialpad-trigger]") as HTMLElement;

beforeEach(() => {
  __resetDockForTests();
  h.state = makeState({ rail: closedRail });
  h.actions = makeActions();
  h.access.canUseSoftphone = true;
});

describe("visibility", () => {
  it("renders nothing without softphone access", () => {
    h.access.canUseSoftphone = false;
    const { container } = renderWidget();
    expect(container.firstChild).toBeNull();
    expect(getDockState().dialpadPresent).toBe(false);
  });

  it("renders nothing without a SIP config", () => {
    h.state = makeState({ rail: closedRail, activeSipConfig: null });
    const { container } = renderWidget();
    expect(container.firstChild).toBeNull();
  });

  it("publishes its presence to the dock while visible", () => {
    const { unmount } = renderWidget();
    expect(trigger()).not.toBeNull();
    expect(getDockState().dialpadPresent).toBe(true);
    unmount();
    expect(getDockState().dialpadPresent).toBe(false);
  });
});

describe("launcher", () => {
  it("opens the rail when closed", async () => {
    const user = userEvent.setup();
    renderWidget();
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
    await user.click(trigger());
    expect(h.actions.openRail).toHaveBeenCalledTimes(1);
    expect(h.actions.closeRail).not.toHaveBeenCalled();
  });

  it("closes the open rail when idle and minimises it during a call", async () => {
    const user = userEvent.setup();
    h.state = makeState({ rail: openRail });
    const { rerender } = renderWidget();
    expect(trigger()).toHaveAttribute("aria-expanded", "true");
    expect(trigger()).toHaveAccessibleName("Close phone · Ready for calls");
    await user.click(trigger());
    expect(h.actions.closeRail).toHaveBeenCalledTimes(1);

    h.state = makeState({ rail: openRail, activeCall: makeActiveCall() });
    rerender(
      <NextIntlClientProvider locale="en" messages={en}>
        <DialpadWidget />
      </NextIntlClientProvider>
    );
    await user.click(trigger());
    expect(h.actions.minimiseRail).toHaveBeenCalledTimes(1);
    expect(h.actions.closeRail).toHaveBeenCalledTimes(1);
  });

  it("sits left of the open call rail (dock offset)", () => {
    renderWidget();
    expect(trigger().style.right).toBe("12px");
    act(() => setCallRailWidth(320));
    expect(trigger().style.right).toBe("332px");
  });

  it("shows the green ready dot when registered and idle", () => {
    renderWidget();
    expect(trigger()).toHaveAttribute("data-phone-state", "ready");
    expect(screen.getByTestId("phone-ready-dot")).toHaveClass("bg-ed-green");
    expect(trigger()).toHaveAccessibleName("Open phone · Ready for calls");
  });

  it("turns green with a red dot during a call and rings on an incoming call", () => {
    h.state = makeState({ rail: closedRail, activeCall: makeActiveCall({ direction: "outgoing" }) });
    const { unmount } = renderWidget();
    expect(trigger()).toHaveAttribute("data-phone-state", "in-call");
    expect(trigger()).toHaveClass("bg-ed-green");
    expect(screen.getByTestId("phone-in-call-dot")).toHaveClass("bg-destructive");
    unmount();

    h.state = makeState({ rail: closedRail, activeCall: makeActiveCall({ status: "ringing" }) });
    renderWidget();
    expect(trigger()).toHaveAttribute("data-phone-state", "ringing");
    expect(trigger().className).toContain("motion-safe:animate-ed-ring");
    expect(trigger().style.getPropertyValue("--ring-c")).toBe("var(--green)");
  });

  it("is offline when SIP is not registered", () => {
    h.state = makeState({ rail: closedRail, sipState: "failed" });
    renderWidget();
    expect(trigger()).toHaveAttribute("data-phone-state", "offline");
    expect(screen.queryByTestId("phone-ready-dot")).toBeNull();
    expect(trigger()).toHaveAccessibleName("Open phone · Not registered");
  });

  it("counts missed calls on a destructive badge until the rail is opened", () => {
    h.state = makeState({ rail: closedRail, missedCall: { number: "+995555999888", time: new Date(2026, 3, 15, 14, 30) } });
    const { rerender } = renderWidget();
    expect(screen.getByTestId("phone-missed-badge")).toHaveTextContent("1");
    expect(screen.queryByTestId("phone-ready-dot")).toBeNull();

    h.state = makeState({ rail: closedRail, missedCall: { number: "+995555111222", time: new Date(2026, 3, 15, 14, 40) } });
    rerender(
      <NextIntlClientProvider locale="en" messages={en}>
        <DialpadWidget />
      </NextIntlClientProvider>
    );
    expect(screen.getByTestId("phone-missed-badge")).toHaveTextContent("2");
    expect(trigger()).toHaveAccessibleName("Open phone · Ready for calls · 2 missed calls");

    h.state = makeState({ rail: openRail, missedCall: h.state.missedCall });
    rerender(
      <NextIntlClientProvider locale="en" messages={en}>
        <DialpadWidget />
      </NextIntlClientProvider>
    );
    expect(screen.queryByTestId("phone-missed-badge")).toBeNull();
  });
});

describe("missed-call toast", () => {
  const missed = { number: "+995555999888", time: new Date(2026, 3, 15, 14, 30) };

  it("shows the number and time", () => {
    h.state = makeState({ rail: closedRail, missedCall: missed });
    renderWidget();
    expect(screen.getByText("Missed call")).toBeInTheDocument();
    expect(screen.getByText("+995555999888 · 14:30")).toBeInTheDocument();
    expect(screen.getByTestId("missed-call-toast")).toHaveAttribute("role", "status");
  });

  it("Call back opens the rail with the number and clears the missed call", async () => {
    const user = userEvent.setup();
    h.state = makeState({ rail: closedRail, missedCall: missed });
    renderWidget();
    await user.click(screen.getByText("Call back"));
    expect(h.actions.openRail).toHaveBeenCalledWith({ number: "+995555999888" });
    expect(h.actions.clearMissedCall).toHaveBeenCalledTimes(1);
  });

  it("Dismiss clears the missed call", async () => {
    const user = userEvent.setup();
    h.state = makeState({ rail: closedRail, missedCall: missed });
    renderWidget();
    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(h.actions.clearMissedCall).toHaveBeenCalledTimes(1);
  });

  it("stacks the incoming-call and missed-call toasts in one top-right column", () => {
    h.state = makeState({ rail: closedRail, missedCall: missed });
    renderWidget();
    const stack = screen.getByTestId("call-toasts");
    expect(stack.className).toContain("fixed");
    expect(stack.className).toContain("flex-col");
    expect(stack).toContainElement(screen.getByTestId("incoming-call-notification"));
    const toast = screen.getByTestId("missed-call-toast");
    expect(stack).toContainElement(toast);
    expect(toast.className).not.toContain("fixed");
  });

  it("is absent without a missed call", () => {
    renderWidget();
    expect(screen.queryByText("Missed call")).toBeNull();
  });
});
