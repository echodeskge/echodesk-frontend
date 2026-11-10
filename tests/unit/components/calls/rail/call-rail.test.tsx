/**
 * CallRail: the desktop <aside> vs the mobile sheet, the header (SIP pill →
 * Reconnect when failed; minimise only during a call, close only when idle),
 * the error strip, the sound-blocked banner, the dock width it publishes,
 * the chat-list exclusivity and the answered-elsewhere notice.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import React from "react";

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
vi.mock("@/api/axios", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  default: { get: vi.fn().mockResolvedValue({ data: { results: [] } }) },
}));
vi.mock("@/components/calls/rail/caller-context", () => ({
  CallerContext: () => <div data-testid="call-rail-context" />,
}));

import { CallRail } from "@/components/calls/rail/call-rail";
import { __resetDockForTests, announceDockPopoverOpened, getDockState, onDockPopoverOpened } from "@/components/TeamChat/floatingDock";
import { installMatchMedia, kaMessages, makeActions, makeActiveCall, makeState, railEn, railKa, renderWithProviders } from "./rail-test-utils";

beforeEach(() => {
  __resetDockForTests();
  installMatchMedia(1280);
  h.state = makeState();
  h.actions = makeActions();
  h.access.canUseSoftphone = true;
});
afterEach(() => vi.useRealTimers());

describe("CallRail — mount rules", () => {
  it("renders nothing while closed or minimised", () => {
    h.state = makeState({ rail: { mode: "closed", prefill: null, autoDial: false } });
    const { rerender } = renderWithProviders(<CallRail />);
    expect(screen.queryByTestId("call-rail")).toBeNull();
    h.state = makeState({ rail: { mode: "minimised", prefill: null, autoDial: false }, activeCall: makeActiveCall() });
    rerender(<CallRail />);
    expect(screen.queryByTestId("call-rail")).toBeNull();
  });

  it("renders nothing without softphone access", () => {
    h.access.canUseSoftphone = false;
    renderWithProviders(<CallRail />);
    expect(screen.queryByTestId("call-rail")).toBeNull();
  });

  it("is a 320px <aside> on desktop and publishes its width to the dock", () => {
    const { unmount } = renderWithProviders(<CallRail />);
    const rail = screen.getByTestId("call-rail");
    expect(rail.tagName).toBe("ASIDE");
    expect(rail).toHaveAttribute("data-layout", "rail");
    expect(rail.className).toContain("w-[320px]");
    expect(rail.className).toContain("shrink-0");
    expect(rail.className).toContain("border-l");
    expect(rail.className).toContain("bg-muted/35");
    expect(getDockState().railWidth).toBe(320);
    unmount();
    expect(getDockState().railWidth).toBe(0);
  });

  it("becomes a full-screen sheet with a back button at 390px and takes no dock width", async () => {
    installMatchMedia(390);
    renderWithProviders(<CallRail />);
    const rail = screen.getByTestId("call-rail");
    await waitFor(() => expect(rail).toHaveAttribute("data-layout", "sheet"));
    expect(rail.className).toContain("fixed");
    expect(rail.className).toContain("inset-0");
    expect(rail.className).toContain("z-[47]");
    expect(rail).toHaveAttribute("role", "dialog");
    expect(getDockState().railWidth).toBe(0);
    fireEvent.click(screen.getByTestId("call-rail-back"));
    expect(h.actions.closeRail).toHaveBeenCalledTimes(1);
  });

  it("announces the dialpad popover when opened for dialling and closes when the chat list opens", () => {
    const seen: string[] = [];
    onDockPopoverOpened((o) => seen.push(o));
    renderWithProviders(<CallRail />);
    expect(seen).toEqual(["dialpad"]);
    act(() => announceDockPopoverOpened("chat-list"));
    expect(h.actions.closeRail).toHaveBeenCalledTimes(1);
  });

  it("stays open when the chat list opens during a call", () => {
    h.state = makeState({ activeCall: makeActiveCall() });
    renderWithProviders(<CallRail />);
    act(() => announceDockPopoverOpened("chat-list"));
    expect(h.actions.closeRail).not.toHaveBeenCalled();
  });

  it("Escape closes the idle rail but not a call", () => {
    const { rerender } = renderWithProviders(<CallRail />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(h.actions.closeRail).toHaveBeenCalledTimes(1);
    h.state = makeState({ activeCall: makeActiveCall() });
    rerender(<CallRail />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(h.actions.closeRail).toHaveBeenCalledTimes(1);
  });
});

describe("CallRail — header", () => {
  it("shows the SIP pill with the extension and Close while idle (no minimise)", () => {
    renderWithProviders(<CallRail />);
    const pill = screen.getByTestId("call-rail-sip");
    expect(pill).toHaveAttribute("data-state", "registered");
    expect(pill).toHaveTextContent("Registered");
    expect(pill).toHaveTextContent("ext 101");
    expect(screen.queryByTestId("call-rail-minimise")).toBeNull();
    fireEvent.click(screen.getByTestId("call-rail-close"));
    expect(h.actions.closeRail).toHaveBeenCalledTimes(1);
  });

  it("shows Minimise (not Close) during a call", () => {
    h.state = makeState({ activeCall: makeActiveCall() });
    renderWithProviders(<CallRail />);
    expect(screen.queryByTestId("call-rail-close")).toBeNull();
    fireEvent.click(screen.getByTestId("call-rail-minimise"));
    expect(h.actions.minimiseRail).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("call-rail-context")).toBeInTheDocument();
  });

  it.each(["failed", "offline"] as const)("the SIP pill becomes a Reconnect button when %s", (sipState) => {
    h.state = makeState({ sipState });
    renderWithProviders(<CallRail />);
    const pill = screen.getByTestId("call-rail-sip");
    expect(pill.tagName).toBe("BUTTON");
    expect(pill).toHaveAttribute("data-state", sipState);
    expect(pill).toHaveTextContent("Reconnect");
    fireEvent.click(pill);
    expect(h.actions.reconnect).toHaveBeenCalledTimes(1);
  });

  it("connecting / reconnecting blink, off is muted", () => {
    h.state = makeState({ sipState: "reconnecting" });
    const { rerender } = renderWithProviders(<CallRail />);
    expect(screen.getByTestId("call-rail-sip")).toHaveTextContent("Reconnecting…");
    expect(screen.getByTestId("call-rail-sip").querySelector(".motion-safe\\:animate-ed-blink")).not.toBeNull();
    h.state = makeState({ sipState: "off", activeSipConfig: null });
    rerender(<CallRail />);
    expect(screen.getByTestId("call-rail-sip")).toHaveTextContent("No phone line");
    expect(screen.getByTestId("call-rail-sip").tagName).toBe("SPAN");
  });
});

describe("CallRail — strips and banners", () => {
  it("translates CallError keys and dismisses through clearError", () => {
    h.state = makeState({ error: { key: "sip486" } });
    // `calls.errors.*` is owned by CL-01, so the key is supplied here next to the rail catalog.
    renderWithProviders(<CallRail />, { messages: { calls: { rail: railEn, errors: { sip486: "The line is busy" } } } });
    const strip = screen.getByRole("alert");
    expect(strip).toHaveTextContent("The line is busy");
    fireEvent.click(strip.querySelector("button")!);
    expect(h.actions.clearError).toHaveBeenCalledTimes(1);
  });

  it("falls back to the legacy message text, then to a generic line", () => {
    h.state = makeState({ error: { key: "legacy", params: { message: "Call failed: busy" } } });
    const { rerender } = renderWithProviders(<CallRail />);
    expect(screen.getByRole("alert")).toHaveTextContent("Call failed: busy");
    h.state = makeState({ error: { key: "nope" } });
    rerender(<CallRail />);
    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong with the call.");
  });

  it("shows the sound-blocked banner with an Enable sound button", () => {
    h.state = makeState({ soundBlocked: true });
    renderWithProviders(<CallRail />);
    expect(screen.getByTestId("call-rail-sound-blocked")).toHaveTextContent("The browser blocked the ringtone.");
    fireEvent.click(screen.getByTestId("call-rail-enable-sound"));
    expect(h.actions.unlockSound).toHaveBeenCalledTimes(1);
  });

  it("renders in Georgian without Latin UI text", () => {
    h.state = makeState({ soundBlocked: true, sipState: "failed" });
    renderWithProviders(<CallRail />, { locale: "ka", messages: kaMessages });
    expect(screen.getByTestId("call-rail-sip")).toHaveTextContent(railKa.reconnect);
    expect(screen.getByTestId("call-rail-sound-blocked")).toHaveTextContent(railKa.soundBlocked);
    expect(screen.getByTestId("call-rail-enable-sound")).toHaveTextContent(railKa.enableSound);
    expect(screen.getByRole("button", { name: railKa.close })).toBeInTheDocument();
    expect(screen.getByTestId("call-rail-call")).toHaveTextContent(railKa.call);
  });
});

describe("CallRail — answered elsewhere", () => {
  it("shows 'Answered by {agent}' for 3 s after the sibling leg is torn down, then idle", () => {
    vi.useFakeTimers();
    h.state = makeState({ activeCall: makeActiveCall({ status: "ringing", answeredElsewhere: true, answeredBy: "Ana Lomidze" }) });
    const { rerender } = renderWithProviders(<CallRail />);
    expect(screen.getByTestId("call-rail-answered-elsewhere")).toHaveTextContent("Answered by Ana Lomidze");
    expect(screen.queryByTestId("call-rail-accept")).toBeNull();

    // The PBX CANCEL clears the call; the notice stays until the timer ends.
    h.state = makeState({ activeCall: null });
    rerender(<CallRail />);
    expect(screen.getByTestId("call-rail-answered-elsewhere")).toBeInTheDocument();
    expect(screen.getByTestId("call-rail")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.queryByTestId("call-rail-answered-elsewhere")).toBeNull();
    expect(screen.getByTestId("call-rail-idle")).toBeInTheDocument();
  });

  it("uses the generic line when the agent is unknown", () => {
    h.state = makeState({ activeCall: makeActiveCall({ status: "ringing", answeredElsewhere: true }) });
    renderWithProviders(<CallRail />);
    expect(screen.getByTestId("call-rail-answered-elsewhere")).toHaveTextContent("Answered by another agent");
  });
});
