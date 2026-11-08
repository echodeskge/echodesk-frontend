/**
 * ActiveCallDisplay (softphone "in call" view, EchoDesk Redesign): caller
 * identity, status badge per state, ringing halo, Accept / Decline, the
 * Mute / Hold / Keypad / Transfer controls, DTMF pad, transfer box (agents,
 * attended vs blind, external number), the consultation controls and End.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import React from "react";

import en from "@/i18n/messages/en.json";
import ka from "@/i18n/messages/ka.json";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(() => ({ user: { id: 1, is_staff: true } })),
}));

const mockGet = vi.hoisted(() => vi.fn());
vi.mock("@/api/axios", () => ({ default: { get: mockGet } }));

import { ActiveCallDisplay, callBadge } from "@/components/calls/ActiveCallDisplay";
import type { TransferPhase, ConsultationCall } from "@/contexts/CallContext";

type Props = React.ComponentProps<typeof ActiveCallDisplay>;

function renderCall(overrides: Partial<Props> = {}, messages: Record<string, unknown> = en, locale = "en") {
  const props: Props = {
    phoneNumber: "+995555123456",
    direction: "incoming",
    status: "active",
    duration: 45,
    onEndCall: vi.fn(),
    onToggleHold: vi.fn(),
    onToggleMute: vi.fn(),
    onAccept: vi.fn(),
    onReject: vi.fn(),
    onTransfer: vi.fn(),
    onStartAttendedTransfer: vi.fn(),
    onCompleteTransfer: vi.fn(),
    onCancelTransfer: vi.fn(),
    onMergeConference: vi.fn(),
    onSendDTMF: vi.fn(() => true),
    transferPhase: "idle" as TransferPhase,
    consultationCall: null,
    ...overrides,
  };
  return {
    ...render(
      <NextIntlClientProvider locale={locale} messages={messages}>
        <ActiveCallDisplay {...props} />
      </NextIntlClientProvider>
    ),
    props,
  };
}

const assignments = {
  data: {
    results: [
      { id: 1, user: 1, user_name: "Me", extension: "100", phone_number: "" },
      { id: 2, user: 2, user_name: "Ana Lomidze", extension: "102", phone_number: "" },
      { id: 3, user: 3, user_name: "Luka Tsiklauri", extension: "103", phone_number: "" },
    ],
  },
};
const extStatus = { data: { extensions: [{ extension: "102", status: "online" }, { extension: "103", status: "offline" }] } };

beforeEach(() => {
  vi.clearAllMocks();
  mockGet.mockImplementation((url: string) =>
    Promise.resolve(url.startsWith("/api/extensions/status") ? extStatus : assignments)
  );
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

describe("ActiveCallDisplay", () => {
  describe("identity", () => {
    it("shows the number as the name and 'Unknown caller' when there is no name", () => {
      renderCall();
      expect(screen.getByText("+995555123456")).toBeInTheDocument();
      expect(screen.getByText("Unknown caller")).toBeInTheDocument();
      expect(screen.getByTestId("call-avatar")).toHaveTextContent("#");
    });

    it("shows name, number and initials for a known caller", () => {
      renderCall({ callerName: "John Doe" });
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("+995555123456")).toBeInTheDocument();
      expect(screen.getByTestId("call-avatar")).toHaveTextContent("JD");
    });

    it("formats the timer as mm:ss while active", () => {
      renderCall({ duration: 125 });
      expect(screen.getByTestId("call-timer")).toHaveTextContent("02:05");
    });

    it("shows 'ringing' / 'calling' instead of a timer before the call connects", () => {
      const { unmount } = renderCall({ status: "ringing" });
      expect(screen.getByTestId("call-timer")).toHaveTextContent("ringing");
      unmount();
      renderCall({ status: "connecting", direction: "outgoing" });
      expect(screen.getByTestId("call-timer")).toHaveTextContent("calling");
    });

    it("labels the direction", () => {
      const { unmount } = renderCall({ direction: "incoming" });
      expect(screen.getByText("Incoming call")).toBeInTheDocument();
      unmount();
      renderCall({ direction: "outgoing" });
      expect(screen.getByText("Outgoing call")).toBeInTheDocument();
    });

    it("rings the avatar (green for incoming, foreground for outgoing) only while ringing", () => {
      const { unmount } = renderCall({ status: "ringing" });
      const avatar = screen.getByTestId("call-avatar");
      expect(avatar.className).toContain("motion-safe:animate-ed-ring");
      expect(avatar.style.getPropertyValue("--ring-c")).toBe("var(--green)");
      unmount();
      renderCall({ status: "connecting", direction: "outgoing" });
      expect(screen.getByTestId("call-avatar").style.getPropertyValue("--ring-c")).toBe("var(--foreground)");
    });

    it("does not ring once connected", () => {
      renderCall({ status: "active" });
      expect(screen.getByTestId("call-avatar").className).not.toContain("animate-ed-ring");
    });
  });

  describe("status badge", () => {
    it.each([
      [{ status: "ringing" as const }, "Incoming"],
      [{ status: "connecting" as const, direction: "outgoing" as const }, "Calling…"],
      [{ status: "active" as const }, "Connected"],
      [{ status: "active" as const, isOnHold: true }, "On hold"],
      [{ status: "ending" as const }, "Ending…"],
    ])("%o → %s", (props, label) => {
      renderCall(props);
      const badge = screen.getByTestId("call-status-badge");
      expect(badge).toHaveTextContent(label);
      expect(badge).toHaveAttribute("aria-live", "polite");
    });
  });

  describe("incoming ringing", () => {
    it("shows Decline and Accept instead of the controls", async () => {
      const user = userEvent.setup();
      const { props } = renderCall({ status: "ringing" });
      expect(screen.queryByTestId("softphone-mute")).toBeNull();
      expect(screen.queryByTestId("softphone-end")).toBeNull();
      await user.click(screen.getByTestId("softphone-accept"));
      expect(props.onAccept).toHaveBeenCalledTimes(1);
      await user.click(screen.getByTestId("softphone-decline"));
      expect(props.onReject).toHaveBeenCalledTimes(1);
    });

    it("an outgoing call that is still ringing shows the controls and Cancel", () => {
      renderCall({ status: "connecting", direction: "outgoing" });
      expect(screen.queryByTestId("softphone-accept")).toBeNull();
      expect(screen.getByTestId("softphone-end")).toHaveTextContent("Cancel");
      expect(screen.getByTestId("softphone-mute")).toBeDisabled();
    });
  });

  describe("controls", () => {
    it("wires Mute, Hold and End", async () => {
      const user = userEvent.setup();
      const { props } = renderCall();
      await user.click(screen.getByTestId("softphone-mute"));
      await user.click(screen.getByTestId("softphone-hold"));
      await user.click(screen.getByTestId("softphone-end"));
      expect(props.onToggleMute).toHaveBeenCalledTimes(1);
      expect(props.onToggleHold).toHaveBeenCalledTimes(1);
      expect(props.onEndCall).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId("softphone-end")).toHaveTextContent("End call");
    });

    it("reflects mute / hold as pressed toggles with swapped labels", () => {
      renderCall({ isMuted: true, isOnHold: true });
      expect(screen.getByTestId("softphone-mute")).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByTestId("softphone-mute")).toHaveTextContent("Unmute");
      expect(screen.getByTestId("softphone-hold")).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByTestId("softphone-hold")).toHaveTextContent("Resume");
    });

    it("disables the controls unless the call is active", () => {
      renderCall({ status: "ending" });
      for (const id of ["softphone-mute", "softphone-hold", "softphone-keypad", "softphone-transfer"]) {
        expect(screen.getByTestId(id)).toBeDisabled();
      }
      expect(screen.getByTestId("softphone-end")).toBeDisabled();
    });

    it("disables Keypad without a DTMF handler and Transfer without a transfer handler", () => {
      renderCall({ onSendDTMF: undefined, onTransfer: undefined });
      expect(screen.getByTestId("softphone-keypad")).toBeDisabled();
      expect(screen.getByTestId("softphone-transfer")).toBeDisabled();
    });
  });

  describe("DTMF keypad", () => {
    it("sends tones and shows the last ones sent", async () => {
      const user = userEvent.setup();
      const { props } = renderCall();
      await user.click(screen.getByTestId("softphone-keypad"));
      const pad = screen.getByTestId("softphone-dtmf");
      expect(within(pad).getByText("Tones are sent to the IVR")).toBeInTheDocument();
      await user.click(within(pad).getByText("1"));
      await user.click(within(pad).getByText("#"));
      expect(props.onSendDTMF).toHaveBeenNthCalledWith(1, "1");
      expect(props.onSendDTMF).toHaveBeenNthCalledWith(2, "#");
      expect(within(pad).getByText("Sent: 1#")).toBeInTheDocument();
    });

    it("keypad and transfer are mutually exclusive", async () => {
      const user = userEvent.setup();
      renderCall();
      await user.click(screen.getByTestId("softphone-keypad"));
      expect(screen.getByTestId("softphone-dtmf")).toBeInTheDocument();
      await user.click(screen.getByTestId("softphone-transfer"));
      expect(screen.queryByTestId("softphone-dtmf")).toBeNull();
      expect(screen.getByTestId("softphone-transfer-box")).toBeInTheDocument();
      expect(screen.getByTestId("softphone-keypad")).toHaveAttribute("aria-pressed", "false");
    });
  });

  describe("transfer box", () => {
    it("lists agents (own user excluded) with online state; offline agents are disabled", async () => {
      const user = userEvent.setup();
      renderCall();
      await user.click(screen.getByTestId("softphone-transfer"));
      const rows = await screen.findAllByTestId("transfer-agent");
      expect(rows).toHaveLength(2);
      expect(rows[0]).toHaveTextContent("Ana Lomidze");
      expect(rows[0]).toHaveTextContent("ext 102");
      expect(rows[0]).toBeEnabled();
      expect(rows[1]).toBeDisabled();
      expect(screen.queryByText("Me")).toBeNull();
    });

    it("attended (default) starts a consultation with the agent", async () => {
      const user = userEvent.setup();
      const { props } = renderCall();
      await user.click(screen.getByTestId("softphone-transfer"));
      expect(screen.getByRole("radio", { name: "Attended" })).toHaveAttribute("aria-checked", "true");
      await user.click((await screen.findAllByTestId("transfer-agent"))[0]);
      expect(props.onStartAttendedTransfer).toHaveBeenCalledWith("102", "Ana Lomidze");
      expect(props.onTransfer).not.toHaveBeenCalled();
      expect(screen.queryByTestId("softphone-transfer-box")).toBeNull();
    });

    it("blind transfers straight to the agent", async () => {
      const user = userEvent.setup();
      const { props } = renderCall();
      await user.click(screen.getByTestId("softphone-transfer"));
      await user.click(screen.getByRole("radio", { name: "Blind" }));
      await user.click((await screen.findAllByTestId("transfer-agent"))[0]);
      expect(props.onTransfer).toHaveBeenCalledWith("102");
      expect(props.onStartAttendedTransfer).not.toHaveBeenCalled();
    });

    it("shows the empty message when nobody has a phone", async () => {
      const user = userEvent.setup();
      mockGet.mockResolvedValue({ data: { results: [] } });
      renderCall();
      await user.click(screen.getByTestId("softphone-transfer"));
      expect(await screen.findByText("No agents with phone assignments")).toBeInTheDocument();
    });

    it("transfers to an external number (button and Enter)", async () => {
      const user = userEvent.setup();
      const { props } = renderCall();
      await user.click(screen.getByTestId("softphone-transfer"));
      await user.click(screen.getByRole("radio", { name: "Blind" }));
      await user.click(screen.getByText("Transfer to a number"));
      expect(screen.getByTestId("transfer-submit")).toBeDisabled();
      await user.type(screen.getByPlaceholderText("Number to transfer to"), "555000");
      await user.click(screen.getByTestId("transfer-submit"));
      expect(props.onTransfer).toHaveBeenCalledWith("555000");

      // Reopening keeps the chosen mode (external number, blind).
      await user.click(screen.getByTestId("softphone-transfer"));
      await user.type(screen.getByPlaceholderText("Number to transfer to"), "777{Enter}");
      await waitFor(() => expect(props.onTransfer).toHaveBeenCalledWith("777"));
    });

    it("is not offered during a consultation", () => {
      renderCall({ transferPhase: "consulting", consultationCall: { targetNumber: "102", status: "ringing", duration: 0 } });
      expect(screen.getByTestId("softphone-transfer")).toBeDisabled();
    });
  });

  describe("consultation (attended transfer)", () => {
    const consult = (status: ConsultationCall["status"], targetName?: string): Partial<Props> => ({
      callerName: "John Doe",
      isOnHold: true,
      transferPhase: "consulting",
      consultationCall: { targetNumber: "102", targetName, status, duration: 0 },
    });

    it("shows the held customer and who is being consulted", () => {
      renderCall(consult("active", "Agent Smith"));
      const box = screen.getByTestId("softphone-consultation");
      expect(within(box).getByText("Customer on hold")).toBeInTheDocument();
      expect(within(box).getByText("John Doe")).toBeInTheDocument();
      expect(within(box).getByText("Consulting with")).toBeInTheDocument();
      expect(within(box).getByText("Agent Smith")).toBeInTheDocument();
      expect(within(box).getByText("Connected")).toBeInTheDocument();
    });

    it("falls back to the target number", () => {
      renderCall(consult("ringing"));
      expect(within(screen.getByTestId("softphone-consultation")).getByText("102")).toBeInTheDocument();
    });

    it("wires Cancel, Transfer and Merge", async () => {
      const user = userEvent.setup();
      const { props } = renderCall(consult("active"));
      const box = screen.getByTestId("softphone-consultation");
      await user.click(within(box).getByRole("button", { name: /Cancel/ }));
      await user.click(within(box).getByRole("button", { name: /Transfer/ }));
      await user.click(within(box).getByRole("button", { name: /Merge/ }));
      expect(props.onCancelTransfer).toHaveBeenCalledTimes(1);
      expect(props.onCompleteTransfer).toHaveBeenCalledTimes(1);
      expect(props.onMergeConference).toHaveBeenCalledTimes(1);
    });

    it("only allows Transfer / Merge once the consulted agent answered", () => {
      renderCall(consult("connecting"));
      const box = screen.getByTestId("softphone-consultation");
      expect(within(box).getByRole("button", { name: /Transfer/ })).toBeDisabled();
      expect(within(box).getByRole("button", { name: /Merge/ })).toBeDisabled();
      expect(within(box).getByRole("button", { name: /Cancel/ })).toBeEnabled();
    });
  });

  it("offers caller details when a handler is given", async () => {
    const user = userEvent.setup();
    const onShowDetails = vi.fn();
    renderCall({ onShowDetails });
    await user.click(screen.getByRole("button", { name: "Caller details" }));
    expect(onShowDetails).toHaveBeenCalledTimes(1);
  });

  it("renders in Georgian", () => {
    renderCall({ status: "ringing" }, ka, "ka");
    expect(screen.getByText(ka.calls.phone.accept)).toBeInTheDocument();
    expect(screen.getByText(ka.calls.phone.decline)).toBeInTheDocument();
    expect(screen.getByTestId("call-status-badge")).toHaveTextContent(ka.calls.phone.badgeIncoming);
  });
});
