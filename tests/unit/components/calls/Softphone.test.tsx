/**
 * Softphone panel (EchoDesk Redesign) driven by a mocked CallContext value:
 * idle keypad (typing, keys, Delete / Clear, Call / Enter, hint, recents,
 * not-registered notice), the in-call views, the SIP pill, the error strip
 * and minimise vs close. Also the floating dock popup wiring.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import React, { useState } from "react";

import en from "@/i18n/messages/en.json";

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: 1 } }) }));
vi.mock("@/api/axios", () => ({ default: { get: vi.fn().mockResolvedValue({ data: { results: [] } }) } }));

import { Softphone, type SoftphoneCall } from "@/components/calls/Softphone";
import { recentNamedContacts } from "@/components/calls/useSoftphoneData";
import type { ActiveCall } from "@/contexts/CallContext";

function makeCall(overrides: Partial<SoftphoneCall> = {}): SoftphoneCall {
  return {
    activeCall: null,
    callDuration: 0,
    sipRegistered: true,
    sipConnecting: false,
    activeSipConfig: { username: "101" } as SoftphoneCall["activeSipConfig"],
    dialNumber: "",
    setDialNumber: vi.fn(),
    makeCall: vi.fn().mockResolvedValue(undefined),
    handleAcceptCall: vi.fn().mockResolvedValue(undefined),
    handleRejectCall: vi.fn().mockResolvedValue(undefined),
    handleEndCall: vi.fn().mockResolvedValue(undefined),
    handleToggleHold: vi.fn(),
    handleToggleMute: vi.fn(),
    sendDTMF: vi.fn(() => true),
    transferCall: vi.fn().mockResolvedValue(undefined),
    startAttendedTransfer: vi.fn().mockResolvedValue(undefined),
    completeTransfer: vi.fn().mockResolvedValue(undefined),
    cancelTransfer: vi.fn().mockResolvedValue(undefined),
    mergeConference: vi.fn().mockResolvedValue(undefined),
    error: "",
    ...overrides,
  };
}

const activeCall = (overrides: Partial<ActiveCall> = {}): ActiveCall => ({
  id: "c1",
  logId: 7,
  number: "+995555123456",
  callerName: "Nino Beridze",
  direction: "incoming",
  status: "active",
  duration: 0,
  transferPhase: "idle",
  consultationCall: null,
  ...overrides,
});

function renderPhone(call: SoftphoneCall, extra: Partial<React.ComponentProps<typeof Softphone>> = {}) {
  const onClose = vi.fn();
  const utils = render(
    <NextIntlClientProvider locale="en" messages={en}>
      <Softphone call={call} onClose={onClose} {...extra} />
    </NextIntlClientProvider>
  );
  return { ...utils, onClose };
}

/** Idle softphone with the dial number held in local state (like CallContext). */
function StatefulIdle({ call, matchedName }: { call: SoftphoneCall; matchedName?: string | null }) {
  const [n, setN] = useState("");
  return <Softphone call={{ ...call, dialNumber: n, setDialNumber: setN }} onClose={() => {}} matchedName={matchedName} />;
}

beforeEach(() => vi.clearAllMocks());

describe("Softphone — idle", () => {
  it("renders the display, the 12 keys with letters and a disabled Call", () => {
    renderPhone(makeCall());
    expect(screen.getByTestId("softphone-idle")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Phone number" })).toHaveAttribute("placeholder", "Enter a number");
    const keys = within(screen.getByRole("group", { name: "Dial pad" })).getAllByRole("button");
    expect(keys.map((k) => k.getAttribute("data-dial-key"))).toEqual(["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"]);
    expect(keys[1]).toHaveTextContent("2ABC");
    expect(keys[10]).toHaveTextContent("0+");
    expect(screen.getByTestId("softphone-call")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Delete digit" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Clear" })).toBeDisabled();
  });

  it("keys append to the number; Delete and Clear edit it", async () => {
    const user = userEvent.setup();
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <StatefulIdle call={makeCall()} />
      </NextIntlClientProvider>
    );
    const input = screen.getByRole("textbox", { name: "Phone number" });
    await user.click(screen.getByText("5"));
    await user.click(screen.getByText("9"));
    await user.click(screen.getByText("#"));
    expect(input).toHaveValue("59#");
    await user.click(screen.getByRole("button", { name: "Delete digit" }));
    expect(input).toHaveValue("59");
    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(input).toHaveValue("");
  });

  it("typing keeps only dial characters", () => {
    const call = makeCall();
    renderPhone(call);
    fireEvent.change(screen.getByRole("textbox", { name: "Phone number" }), { target: { value: "+995 (555) abc-12*#" } });
    expect(call.setDialNumber).toHaveBeenCalledWith("+995 555 12*#");
  });

  it("Call and Enter place the call", async () => {
    const user = userEvent.setup();
    const call = makeCall({ dialNumber: "555123" });
    renderPhone(call);
    await user.click(screen.getByTestId("softphone-call"));
    expect(call.makeCall).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Phone number" }), { key: "Enter" });
    expect(call.makeCall).toHaveBeenCalledTimes(2);
  });

  it("cannot place a call while SIP is not registered and says why", () => {
    const call = makeCall({ dialNumber: "555123", sipRegistered: false });
    renderPhone(call);
    expect(screen.getByTestId("softphone-call")).toBeDisabled();
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Phone number" }), { key: "Enter" });
    expect(call.makeCall).not.toHaveBeenCalled();
    expect(screen.getByTestId("softphone-not-registered")).toHaveTextContent("SIP is not registered");
  });

  it("hints the matched contact, else 'Unknown number', else nothing", () => {
    const { unmount } = renderPhone(makeCall());
    expect(screen.getByTestId("dial-hint")).toHaveTextContent("");
    unmount();
    const r2 = renderPhone(makeCall({ dialNumber: "555123456" }));
    expect(screen.getByTestId("dial-hint")).toHaveTextContent("Unknown number");
    r2.unmount();
    renderPhone(makeCall({ dialNumber: "555123456" }), { matchedName: "Nino Beridze" });
    expect(screen.getByTestId("dial-hint")).toHaveTextContent("Nino Beridze");
  });

  it("lists up to three recents; clicking one fills the number", async () => {
    const user = userEvent.setup();
    const call = makeCall();
    renderPhone(call, {
      recents: [
        { name: "Nino Beridze", number: "+995555000111" },
        { name: "Giorgi K", number: "+995599000222" },
        { name: "ACME", number: "+995322000333" },
        { name: "Fourth", number: "+995322000444" },
      ],
    });
    const rows = screen.getAllByTestId("softphone-recent");
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent("NBNino Beridze+995555000111");
    await user.click(rows[1]);
    expect(call.setDialNumber).toHaveBeenCalledWith("+995599000222");
    expect(call.makeCall).not.toHaveBeenCalled();
  });

  it("header: SIP pill with the extension and a Close button", async () => {
    const user = userEvent.setup();
    const { onClose } = renderPhone(makeCall());
    const pill = screen.getByTestId("sip-status");
    expect(pill).toHaveAttribute("data-sip-state", "registered");
    expect(pill).toHaveTextContent("Registered");
    expect(pill).toHaveTextContent("ext 101");
    await user.click(screen.getByRole("button", { name: "Close phone" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("SIP pill states: connecting blinks, disconnected is destructive", () => {
    const { unmount } = renderPhone(makeCall({ sipRegistered: false, sipConnecting: true }));
    expect(screen.getByTestId("sip-status")).toHaveAttribute("data-sip-state", "connecting");
    expect(screen.getByTestId("sip-status").querySelector(".motion-safe\\:animate-ed-blink")).not.toBeNull();
    unmount();
    renderPhone(makeCall({ sipRegistered: false }));
    expect(screen.getByTestId("sip-status")).toHaveAttribute("data-sip-state", "disconnected");
    expect(screen.getByTestId("sip-status").querySelector(".bg-destructive")).not.toBeNull();
  });

  it("shows CallContext errors as an alert", () => {
    renderPhone(makeCall({ error: "Call failed: busy" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Call failed: busy");
  });
});

describe("Softphone — in call", () => {
  it("outgoing: calling state with Cancel wired to end the call", async () => {
    const user = userEvent.setup();
    const call = makeCall({ activeCall: activeCall({ direction: "outgoing", status: "connecting", callerName: undefined }) });
    renderPhone(call);
    expect(screen.getByTestId("softphone-in-call")).toHaveAttribute("data-call-status", "connecting");
    expect(screen.getByTestId("call-status-badge")).toHaveTextContent("Calling…");
    await user.click(screen.getByTestId("softphone-end"));
    expect(call.handleEndCall).toHaveBeenCalledTimes(1);
  });

  it("incoming: Accept / Decline wired to CallContext", async () => {
    const user = userEvent.setup();
    const call = makeCall({ activeCall: activeCall({ status: "ringing" }) });
    renderPhone(call);
    await user.click(screen.getByTestId("softphone-accept"));
    await user.click(screen.getByTestId("softphone-decline"));
    expect(call.handleAcceptCall).toHaveBeenCalledTimes(1);
    expect(call.handleRejectCall).toHaveBeenCalledTimes(1);
  });

  it("active: timer from callDuration, mute / hold / DTMF wired", async () => {
    const user = userEvent.setup();
    const call = makeCall({ callDuration: 83, activeCall: activeCall() });
    renderPhone(call);
    expect(screen.getByTestId("call-timer")).toHaveTextContent("01:23");
    await user.click(screen.getByTestId("softphone-mute"));
    await user.click(screen.getByTestId("softphone-hold"));
    await user.click(screen.getByTestId("softphone-keypad"));
    await user.click(within(screen.getByTestId("softphone-dtmf")).getByText("5"));
    expect(call.handleToggleMute).toHaveBeenCalledTimes(1);
    expect(call.handleToggleHold).toHaveBeenCalledTimes(1);
    expect(call.sendDTMF).toHaveBeenCalledWith("5");
  });

  it("consultation buttons swallow rejections (CallContext reports them via error)", async () => {
    const user = userEvent.setup();
    const call = makeCall({
      cancelTransfer: vi.fn().mockRejectedValue(new Error("nope")),
      activeCall: activeCall({ transferPhase: "consulting", consultationCall: { targetNumber: "102", status: "active", duration: 0 } }),
    });
    renderPhone(call);
    await user.click(within(screen.getByTestId("softphone-consultation")).getByRole("button", { name: /Cancel/ }));
    expect(call.cancelTransfer).toHaveBeenCalledTimes(1);
  });

  it("the header button minimises (call keeps running) instead of closing", async () => {
    const user = userEvent.setup();
    const { onClose } = renderPhone(makeCall({ activeCall: activeCall() }));
    expect(screen.queryByRole("button", { name: "Close phone" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Minimize phone" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("caller details only for a logged call", async () => {
    const user = userEvent.setup();
    const onShowDetails = vi.fn();
    const { unmount } = renderPhone(makeCall({ activeCall: activeCall({ logId: 0 }) }), { onShowDetails });
    expect(screen.queryByTestId("softphone-details")).toBeNull();
    unmount();
    renderPhone(makeCall({ activeCall: activeCall() }), { onShowDetails });
    await user.click(screen.getByTestId("softphone-details"));
    expect(onShowDetails).toHaveBeenCalledTimes(1);
  });
});

describe("recentNamedContacts", () => {
  it("keeps the latest unique named numbers (the other party's number)", () => {
    const logs = [
      { id: 1, direction: "inbound" as const, caller_number: "+995555000111", recipient_number: "100", client_name: "Nino" },
      { id: 2, direction: "outbound" as const, caller_number: "100", recipient_number: "+995 555 000 111", client_name: "Nino" },
      { id: 3, direction: "inbound" as const, caller_number: "+995599", recipient_number: "100", client_name: null },
      { id: 4, direction: "outbound" as const, caller_number: "100", recipient_number: "+995322", client_name: "ACME" },
      { id: 5, direction: "inbound" as const, caller_number: "+995511", recipient_number: "100", client_name: "Levan" },
      { id: 6, direction: "inbound" as const, caller_number: "+995522", recipient_number: "100", client_name: "Extra" },
    ];
    expect(recentNamedContacts(logs)).toEqual([
      { name: "Nino", number: "+995555000111" },
      { name: "ACME", number: "+995322" },
      { name: "Levan", number: "+995511" },
    ]);
  });
});
