/**
 * SoftphonePanel / DialPadView / InCallView / DtmfKeypad / ConsultationBar:
 * the idle keypad + Call, incoming Accept / Decline, the six controls with
 * their disabled rules, the status badge (incl. hold), the held state, the
 * DTMF pad, the consultation bar, Speaker / Add call availability.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React, { useState } from "react";

import type { CallActionsValue, CallStateValue } from "@/contexts/call-types";

const h = vi.hoisted(() => ({
  state: null as unknown as CallStateValue,
  actions: null as unknown as CallActionsValue,
  phoneAssignmentsList: vi.fn(),
  extensionsStatusRetrieve: vi.fn(),
}));

vi.mock("@/contexts/CallContext", () => ({
  useCallState: () => h.state,
  useCallActions: () => h.actions,
}));
vi.mock("@/api/axios", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  default: { get: vi.fn().mockResolvedValue({ data: { results: [] } }) },
}));
vi.mock("@/api/generated/api", () => ({
  phoneAssignmentsList: h.phoneAssignmentsList,
  extensionsStatusRetrieve: h.extensionsStatusRetrieve,
}));
vi.mock("@/components/calls/rail/transfer-panel", () => ({
  TransferPanel: ({ onDone }: { onDone: () => void }) => (
    <div data-testid="call-rail-transfer-panel">
      <button onClick={onDone}>done</button>
    </div>
  ),
}));

import { DialPadView, SoftphonePanel } from "@/components/calls/rail/softphone-panel";
import { callBadge } from "@/components/calls/rail/in-call-view";
import { TRANSFER_AGENTS_QUERY_KEY } from "@/components/calls/rail/use-transfer-agents";
import { recentNamedContacts } from "@/components/calls/useSoftphoneData";
import { kaMessages, makeActions, makeActiveCall, makeState, railKa, renderWithProviders } from "./rail-test-utils";

const KEY_IDS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "star", "0", "hash"].map((k) => `call-rail-key-${k}`);

/** Idle pad with the dial number in local state (what CallContext does). */
function StatefulPad({ matchedName }: { matchedName?: string | null }) {
  const [n, setN] = useState("");
  return <DialPadView value={n} onChange={setN} onCall={() => {}} matchedName={matchedName} />;
}

beforeEach(() => {
  h.state = makeState();
  h.actions = makeActions();
  h.phoneAssignmentsList.mockReset().mockResolvedValue({ count: 0, results: [] });
  h.extensionsStatusRetrieve.mockReset().mockResolvedValue({ extensions: [] });
});
afterEach(() => vi.useRealTimers());

describe("idle dial pad", () => {
  it("renders the display, the 12 keys with letters and a disabled Call", () => {
    renderWithProviders(<SoftphonePanel />);
    expect(screen.getByTestId("call-rail-idle")).toBeInTheDocument();
    expect(screen.getByTestId("call-rail-dial")).toHaveAttribute("placeholder", "Enter a number");
    const keys = within(screen.getByRole("group", { name: "Dial pad" })).getAllByRole("button");
    expect(keys.map((k) => k.getAttribute("data-testid"))).toEqual(KEY_IDS);
    expect(keys[1]).toHaveTextContent("2ABC");
    expect(keys[10]).toHaveTextContent("0+");
    expect(keys[0].className).toContain("h-[52px]");
    expect(screen.getByTestId("call-rail-call")).toBeDisabled();
    expect(screen.getByTestId("call-rail-call").className).toContain("rounded-full");
    expect(screen.getByTestId("call-rail-call").className).toContain("bg-ed-green");
  });

  it("keys append to the number; Delete and Clear edit it", async () => {
    const user = userEvent.setup();
    renderWithProviders(<StatefulPad />);
    const input = screen.getByTestId("call-rail-dial");
    await user.click(screen.getByTestId("call-rail-key-5"));
    await user.click(screen.getByTestId("call-rail-key-9"));
    await user.click(screen.getByTestId("call-rail-key-hash"));
    await user.click(screen.getByTestId("call-rail-key-star"));
    expect(input).toHaveValue("59#*");
    await user.click(screen.getByRole("button", { name: "Delete digit" }));
    expect(input).toHaveValue("59#");
    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(input).toHaveValue("");
  });

  it("typing keeps only dial characters and goes to setDialNumber", () => {
    renderWithProviders(<SoftphonePanel />);
    fireEvent.change(screen.getByTestId("call-rail-dial"), { target: { value: "+995 (555) abc-12*#" } });
    expect(h.actions.setDialNumber).toHaveBeenCalledWith("+995 555 12*#");
  });

  it("Call and Enter place the call with the dialled number", async () => {
    const user = userEvent.setup();
    h.state = makeState({ dialNumber: "555123" });
    renderWithProviders(<SoftphonePanel />);
    await user.click(screen.getByTestId("call-rail-call"));
    expect(h.actions.makeCall).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(screen.getByTestId("call-rail-dial"), { key: "Enter" });
    expect(h.actions.makeCall).toHaveBeenCalledTimes(2);
  });

  it("cannot place a call while SIP is not registered and says why", () => {
    h.state = makeState({ dialNumber: "555123", sipState: "connecting" });
    renderWithProviders(<SoftphonePanel />);
    expect(screen.getByTestId("call-rail-call")).toBeDisabled();
    fireEvent.keyDown(screen.getByTestId("call-rail-dial"), { key: "Enter" });
    expect(h.actions.makeCall).not.toHaveBeenCalled();
    expect(screen.getByTestId("call-rail-not-registered")).toHaveTextContent("SIP is not registered");
  });

  it("hints the matched contact, else 'Unknown number', else nothing", () => {
    const { unmount } = renderWithProviders(<DialPadView value="" onChange={() => {}} onCall={() => {}} />);
    expect(screen.getByTestId("call-rail-dial-hint")).toHaveTextContent("");
    unmount();
    const r2 = renderWithProviders(<DialPadView value="555123456" onChange={() => {}} onCall={() => {}} />);
    expect(screen.getByTestId("call-rail-dial-hint")).toHaveTextContent("Unknown number");
    r2.unmount();
    renderWithProviders(<DialPadView value="555123456" onChange={() => {}} onCall={() => {}} matchedName="Nino Beridze" />);
    expect(screen.getByTestId("call-rail-dial-hint")).toHaveTextContent("Nino Beridze");
  });

  it("lists up to three recents in 36px rows; clicking one fills the number", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithProviders(
      <DialPadView
        value=""
        onChange={onChange}
        onCall={() => {}}
        recents={[
          { name: "Nino Beridze", number: "+995555000111" },
          { name: "Giorgi K", number: "+995599000222" },
          { name: "ACME", number: "+995322000333" },
          { name: "Fourth", number: "+995322000444" },
        ]}
      />
    );
    const rows = screen.getAllByTestId("call-rail-recent");
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent("NBNino Beridze+995555000111");
    expect(rows[0].className).toContain("h-9");
    await user.click(rows[1]);
    expect(onChange).toHaveBeenCalledWith("+995599000222");
  });
});

describe("callBadge", () => {
  it("maps call states to the design's badge", () => {
    expect(callBadge("incoming", "ringing")).toEqual({ key: "badgeIncoming", tone: "ringing" });
    expect(callBadge("outgoing", "connecting")).toEqual({ key: "badgeCalling", tone: "ringing" });
    expect(callBadge("outgoing", "ringing")).toEqual({ key: "badgeCalling", tone: "ringing" });
    expect(callBadge("incoming", "active", true)).toEqual({ key: "badgeOnHold", tone: "held" });
    expect(callBadge("incoming", "active")).toEqual({ key: "badgeConnected", tone: "active" });
    expect(callBadge("incoming", "ending")).toEqual({ key: "badgeEnding", tone: "ending" });
  });
});

describe("incoming ringing", () => {
  it("shows the ringing halo, Accept / Decline (64px, radius 12) and no controls", async () => {
    const user = userEvent.setup();
    h.state = makeState({ activeCall: makeActiveCall({ status: "ringing", startTime: undefined }) });
    renderWithProviders(<SoftphonePanel />);
    expect(screen.getByTestId("call-rail-in-call")).toHaveAttribute("data-call-status", "ringing");
    expect(screen.getByText("Incoming call")).toBeInTheDocument();
    const badge = screen.getByTestId("call-rail-status");
    expect(badge).toHaveTextContent("Incoming");
    expect(badge).toHaveAttribute("data-status", "ringing");
    expect(badge.querySelector(".motion-safe\\:animate-ed-blink-slow")).not.toBeNull();
    const avatar = screen.getByTestId("call-rail-avatar");
    expect(avatar).toHaveTextContent("NB");
    expect(avatar.className).toContain("h-[84px]");
    expect(avatar.className).toContain("motion-safe:animate-ed-ring");
    expect(avatar.style.getPropertyValue("--ring-c")).toBe("var(--green)");
    expect(screen.getByTestId("call-rail-timer")).toHaveTextContent("ringing");
    expect(screen.queryByTestId("call-rail-mute")).toBeNull();
    expect(screen.queryByTestId("call-rail-end")).toBeNull();

    const accept = screen.getByTestId("call-rail-accept");
    expect(accept.className).toContain("h-16");
    expect(accept.className).toContain("rounded-xl");
    await user.click(accept);
    await user.click(screen.getByTestId("call-rail-decline"));
    expect(h.actions.acceptCall).toHaveBeenCalledTimes(1);
    expect(h.actions.rejectCall).toHaveBeenCalledTimes(1);
  });

  it("outgoing ringing shows 'calling', the foreground halo, disabled controls and Cancel", async () => {
    const user = userEvent.setup();
    h.state = makeState({ activeCall: makeActiveCall({ direction: "outgoing", status: "connecting", callerName: undefined, startTime: undefined }) });
    renderWithProviders(<SoftphonePanel />);
    expect(screen.getByText("Outgoing call")).toBeInTheDocument();
    expect(screen.getByTestId("call-rail-status")).toHaveTextContent("Calling…");
    expect(screen.getByTestId("call-rail-timer")).toHaveTextContent("calling");
    expect(screen.getByTestId("call-rail-avatar").style.getPropertyValue("--ring-c")).toBe("var(--foreground)");
    expect(screen.getByText("Unknown caller")).toBeInTheDocument();
    expect(screen.queryByTestId("call-rail-accept")).toBeNull();
    for (const id of ["call-rail-mute", "call-rail-hold", "call-rail-keypad", "call-rail-transfer", "call-rail-add", "call-rail-speaker"]) {
      expect(screen.getByTestId(id)).toBeDisabled();
    }
    const end = screen.getByTestId("call-rail-end");
    expect(end).toHaveTextContent("Cancel");
    expect(end.className).toContain("h-12");
    await user.click(end);
    expect(h.actions.endCall).toHaveBeenCalledTimes(1);
  });
});

describe("active call", () => {
  it("timer from startTime, six 60px controls in a 3-col grid, Mute / Hold / DTMF / End wired", async () => {
    const user = userEvent.setup();
    h.state = makeState({ activeCall: makeActiveCall() });
    renderWithProviders(<SoftphonePanel />);
    expect(screen.getByTestId("call-rail-timer")).toHaveTextContent("01:23");
    expect(screen.getByTestId("call-rail-status")).toHaveTextContent("Connected");
    expect(screen.getByTestId("call-rail-status")).not.toHaveAttribute("data-hold");
    expect(screen.getByTestId("call-rail-avatar").className).not.toContain("animate-ed-ring");

    const mute = screen.getByTestId("call-rail-mute");
    expect(mute.className).toContain("h-[60px]");
    expect(mute.className).toContain("rounded-[10px]");
    expect(mute.parentElement?.className).toContain("grid-cols-3");
    expect(mute.parentElement?.querySelectorAll("button")).toHaveLength(6);

    await user.click(mute);
    await user.click(screen.getByTestId("call-rail-hold"));
    await user.click(screen.getByTestId("call-rail-keypad"));
    const pad = screen.getByTestId("call-rail-dtmf");
    expect(within(pad).getByTestId("call-rail-dtmf-sent")).toHaveTextContent("Tones are sent to the IVR");
    await user.click(within(pad).getByTestId("call-rail-key-5"));
    await user.click(within(pad).getByTestId("call-rail-key-hash"));
    expect(h.actions.sendDTMF).toHaveBeenNthCalledWith(1, "5");
    expect(h.actions.sendDTMF).toHaveBeenNthCalledWith(2, "#");
    expect(within(pad).getByTestId("call-rail-dtmf-sent")).toHaveTextContent("Sent: 5#");
    expect(within(pad).getByTestId("call-rail-key-1").className).toContain("h-9");
    expect(h.actions.toggleMute).toHaveBeenCalledTimes(1);
    expect(h.actions.toggleHold).toHaveBeenCalledTimes(1);

    await user.click(screen.getByTestId("call-rail-end"));
    expect(h.actions.endCall).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("call-rail-end")).toHaveTextContent("End call");
  });

  it("keypad and transfer are mutually exclusive", async () => {
    const user = userEvent.setup();
    h.state = makeState({ activeCall: makeActiveCall() });
    renderWithProviders(<SoftphonePanel />);
    await user.click(screen.getByTestId("call-rail-keypad"));
    expect(screen.getByTestId("call-rail-dtmf")).toBeInTheDocument();
    expect(screen.getByTestId("call-rail-keypad")).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByTestId("call-rail-transfer"));
    expect(screen.queryByTestId("call-rail-dtmf")).toBeNull();
    expect(screen.getByTestId("call-rail-transfer-panel")).toBeInTheDocument();
    expect(screen.getByTestId("call-rail-keypad")).toHaveAttribute("aria-pressed", "false");
    await user.click(screen.getByText("done"));
    expect(screen.queryByTestId("call-rail-transfer-panel")).toBeNull();
  });

  it("held: On hold badge (orange), Resume pressed, hold flag on the status", () => {
    h.state = makeState({ activeCall: makeActiveCall({ isOnHold: true, isMuted: true }) });
    renderWithProviders(<SoftphonePanel />);
    const badge = screen.getByTestId("call-rail-status");
    expect(badge).toHaveTextContent("On hold");
    expect(badge).toHaveAttribute("data-hold", "true");
    expect(badge.className).toContain("bg-[#fd7e1420]");
    expect(badge.className).toContain("text-[#c2410c]");
    expect(screen.getByTestId("call-rail-hold")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("call-rail-hold")).toHaveTextContent("Resume");
    expect(screen.getByTestId("call-rail-mute")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("call-rail-mute")).toHaveTextContent("Unmute");
  });

  it("Add call stays disabled with the coming-soon title", () => {
    h.state = makeState({ activeCall: makeActiveCall() });
    renderWithProviders(<SoftphonePanel />);
    const add = screen.getByTestId("call-rail-add");
    expect(add).toBeDisabled();
    expect(add).toHaveAttribute("title", "Conference coming soon");
  });

  it("Speaker is disabled without setSinkId and opens the output picker with it", async () => {
    const user = userEvent.setup();
    h.state = makeState({ activeCall: makeActiveCall() });
    const { unmount } = renderWithProviders(<SoftphonePanel />);
    expect(screen.getByTestId("call-rail-speaker")).toBeDisabled();
    expect(screen.getByTestId("call-rail-speaker")).toHaveAttribute("title", "This browser can't switch the audio output");
    unmount();

    const proto = HTMLMediaElement.prototype as unknown as { setSinkId?: () => Promise<void> };
    proto.setSinkId = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        enumerateDevices: vi.fn().mockResolvedValue([
          { kind: "audiooutput", deviceId: "default", label: "" },
          { kind: "audiooutput", deviceId: "hp", label: "Headphones" },
          { kind: "audioinput", deviceId: "mic", label: "Mic" },
        ]),
      },
    });
    try {
      renderWithProviders(<SoftphonePanel />);
      const speaker = screen.getByTestId("call-rail-speaker");
      expect(speaker).toBeEnabled();
      await user.click(speaker);
      const devices = await screen.findAllByTestId("call-rail-output-device");
      expect(devices.map((d) => d.textContent)).toEqual(["Default output", "Headphones"]);
      await user.click(devices[1]);
      expect(devices[1]).toHaveAttribute("aria-checked", "true");
    } finally {
      delete proto.setSinkId;
    }
  });

  it("disables the controls (and End) while ending", () => {
    h.state = makeState({ activeCall: makeActiveCall({ status: "ending" }) });
    renderWithProviders(<SoftphonePanel />);
    expect(screen.getByTestId("call-rail-status")).toHaveTextContent("Ending…");
    for (const id of ["call-rail-mute", "call-rail-hold", "call-rail-keypad", "call-rail-transfer", "call-rail-end"]) {
      expect(screen.getByTestId(id)).toBeDisabled();
    }
  });
});

describe("consultation (attended transfer)", () => {
  const consulting = (status: "connecting" | "ringing" | "active", targetName?: string) =>
    makeState({
      activeCall: makeActiveCall({
        isOnHold: true,
        transferPhase: "consulting",
        consultationCall: { targetNumber: "102", targetName, status },
      }),
    });

  it("shows the held customer, who is being consulted, and disables Transfer", () => {
    h.state = consulting("active", "Agent Smith");
    renderWithProviders(<SoftphonePanel />);
    const bar = screen.getByTestId("call-rail-consultation");
    expect(within(bar).getByText("Customer on hold")).toBeInTheDocument();
    expect(within(bar).getByText("Nino Beridze")).toBeInTheDocument();
    expect(within(bar).getByText("Consulting with")).toBeInTheDocument();
    expect(within(bar).getByText("Agent Smith")).toBeInTheDocument();
    expect(within(bar).getByTestId("call-rail-consultation-status")).toHaveAttribute("data-status", "active");
    expect(screen.getByTestId("call-rail-transfer")).toBeDisabled();
  });

  it("falls back to the target number and only enables Complete / Merge once answered", () => {
    h.state = consulting("ringing");
    renderWithProviders(<SoftphonePanel />);
    const bar = screen.getByTestId("call-rail-consultation");
    expect(within(bar).getByText("102")).toBeInTheDocument();
    expect(within(bar).getByTestId("call-rail-consultation-status")).toHaveTextContent("Ringing");
    expect(screen.getByTestId("call-rail-consult-complete")).toBeDisabled();
    expect(screen.getByTestId("call-rail-consult-merge")).toBeDisabled();
    expect(screen.getByTestId("call-rail-consult-cancel")).toBeEnabled();
  });

  it("wires Cancel, Complete and Merge and swallows their rejections", async () => {
    const user = userEvent.setup();
    h.state = consulting("active");
    h.actions = makeActions({ cancelTransfer: vi.fn().mockRejectedValue(new Error("nope")) });
    renderWithProviders(<SoftphonePanel />);
    await user.click(screen.getByTestId("call-rail-consult-cancel"));
    await user.click(screen.getByTestId("call-rail-consult-complete"));
    await user.click(screen.getByTestId("call-rail-consult-merge"));
    expect(h.actions.cancelTransfer).toHaveBeenCalledTimes(1);
    expect(h.actions.completeTransfer).toHaveBeenCalledTimes(1);
    expect(h.actions.mergeConference).toHaveBeenCalledTimes(1);
  });
});

describe("answered elsewhere", () => {
  const assignments = {
    count: 2,
    results: [
      { id: 1, user: 1, user_name: "Me", extension: "100", phone_number: "" },
      { id: 2, user: 2, user_name: "Ana Lomidze", extension: "102", phone_number: "" },
    ],
  };
  const notice = (handledBy: number | null) => ({ callId: "c1", number: "+995555123456", handledBy, time: new Date() });

  it("names the agent from the phone assignments (handled_by -> user_name)", async () => {
    h.phoneAssignmentsList.mockResolvedValue(assignments);
    h.state = makeState({ activeCall: null, answeredElsewhereNotice: notice(2) });
    renderWithProviders(<SoftphonePanel />);
    expect(await screen.findByText("Answered by Ana Lomidze")).toBeInTheDocument();
    expect(h.phoneAssignmentsList).toHaveBeenCalledWith(true);
  });

  it("reuses the transfer panel's cache without a request", () => {
    const { queryClient } = renderWithProviders(<div />);
    queryClient.setQueryData(TRANSFER_AGENTS_QUERY_KEY, { assignments: assignments.results, onlineExtensions: [] });
    h.state = makeState({ activeCall: null, answeredElsewhereNotice: notice(2) });
    renderWithProviders(<SoftphonePanel />, { queryClient });
    expect(screen.getByTestId("call-rail-answered-elsewhere")).toHaveTextContent("Answered by Ana Lomidze");
    expect(h.phoneAssignmentsList).not.toHaveBeenCalled();
  });

  it("falls back to the generic line when the event carried no agent or the agent is unknown", async () => {
    h.phoneAssignmentsList.mockResolvedValue(assignments);
    h.state = makeState({ activeCall: null, answeredElsewhereNotice: notice(null) });
    const first = renderWithProviders(<SoftphonePanel />);
    expect(screen.getByTestId("call-rail-answered-elsewhere")).toHaveTextContent("Answered by another agent");
    expect(h.phoneAssignmentsList).not.toHaveBeenCalled();
    first.unmount();

    h.state = makeState({ activeCall: null, answeredElsewhereNotice: notice(9) });
    renderWithProviders(<SoftphonePanel />);
    await waitFor(() => expect(h.phoneAssignmentsList).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId("call-rail-answered-elsewhere")).toHaveTextContent("Answered by another agent");
  });

  it("names the agent in Georgian", async () => {
    h.phoneAssignmentsList.mockResolvedValue(assignments);
    h.state = makeState({ activeCall: null, answeredElsewhereNotice: notice(2) });
    renderWithProviders(<SoftphonePanel />, { locale: "ka", messages: kaMessages });
    expect(await screen.findByText(railKa.answeredBy.replace("{agent}", "Ana Lomidze"))).toBeInTheDocument();
  });
});

describe("Georgian", () => {
  it("renders the in-call view in Georgian", () => {
    h.state = makeState({ activeCall: makeActiveCall({ status: "ringing" }) });
    renderWithProviders(<SoftphonePanel />, { locale: "ka", messages: kaMessages });
    expect(screen.getByTestId("call-rail-accept")).toHaveTextContent(railKa.accept);
    expect(screen.getByTestId("call-rail-decline")).toHaveTextContent(railKa.decline);
    expect(screen.getByTestId("call-rail-status")).toHaveTextContent(railKa.badgeIncoming);
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
