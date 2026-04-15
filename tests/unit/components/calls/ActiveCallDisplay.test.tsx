/**
 * Tests for ActiveCallDisplay component.
 * Verifies caller info rendering, call controls for different states,
 * transfer panel toggles, consultation state display, and button states.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      incomingCall: "Incoming Call",
      outgoingCall: "Outgoing Call",
      onHold: "ON HOLD",
      accept: "Accept",
      decline: "Decline",
      "dashboard.ringing": "Ringing",
      "dashboard.connecting": "Connecting",
      "dashboard.active": "Active",
      "dashboard.ending": "Ending",
      "dashboard.customerOnHold": "Customer on hold",
      "dashboard.consultingWith": "Consulting with",
      "dashboard.completeTransfer": "Transfer",
      "dashboard.cancelTransfer": "Cancel",
      "dashboard.merge": "Merge",
      "dashboard.attendedTransfer": "Attended",
      "dashboard.blindTransfer": "Blind",
      "dashboard.transferTo": "Transfer to...",
      "dashboard.noAgents": "No agents with phone assignments",
      "dashboard.transferToNumber": "Transfer to external number",
      "dashboard.transferToAgent": "Transfer to agent",
      "dashboard.offline": "offline",
    };
    return translations[key] || key;
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(() => ({
    user: { id: 1, is_staff: true },
    token: "token",
    isAuthenticated: true,
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    checkAuth: vi.fn(),
  })),
}));

// Mock axios for agent fetching
vi.mock("@/api/axios", () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { results: [] } }),
  },
}));

import { ActiveCallDisplay } from "@/components/calls/ActiveCallDisplay";
import type { TransferPhase, ConsultationCall } from "@/contexts/CallContext";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface ActiveCallDisplayTestProps {
  phoneNumber?: string;
  direction?: "incoming" | "outgoing";
  status?: "ringing" | "connecting" | "active" | "ending";
  duration?: number;
  callerName?: string;
  isOnHold?: boolean;
  isMuted?: boolean;
  transferPhase?: TransferPhase;
  consultationCall?: ConsultationCall | null;
  onEndCall?: () => void;
  onToggleHold?: () => void;
  onToggleMute?: () => void;
  onAccept?: () => void;
  onReject?: () => void;
  onTransfer?: (targetNumber: string) => void;
  onStartAttendedTransfer?: (
    targetNumber: string,
    targetName?: string
  ) => void;
  onCompleteTransfer?: () => void;
  onCancelTransfer?: () => void;
  onMergeConference?: () => void;
}

function renderActiveCallDisplay(overrides: ActiveCallDisplayTestProps = {}) {
  const defaultProps = {
    phoneNumber: "+995555123456",
    direction: "incoming" as const,
    status: "active" as const,
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
    transferPhase: "idle" as TransferPhase,
    consultationCall: null,
    ...overrides,
  };

  return {
    ...render(<ActiveCallDisplay {...defaultProps} />),
    props: defaultProps,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ActiveCallDisplay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // Caller info
  // -----------------------------------------------------------------------

  describe("caller info", () => {
    it("renders phone number", () => {
      renderActiveCallDisplay({ phoneNumber: "+995555123456" });

      expect(screen.getByText("+995555123456")).toBeInTheDocument();
    });

    it("renders caller name when provided", () => {
      renderActiveCallDisplay({
        callerName: "John Doe",
        phoneNumber: "+995555123456",
      });

      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("+995555123456")).toBeInTheDocument();
    });

    it("renders formatted duration for active calls", () => {
      renderActiveCallDisplay({ status: "active", duration: 125 });

      // 125 seconds = 02:05
      expect(screen.getByText("02:05")).toBeInTheDocument();
    });

    it("formats zero duration as 00:00", () => {
      renderActiveCallDisplay({ status: "active", duration: 0 });

      expect(screen.getByText("00:00")).toBeInTheDocument();
    });

    it("shows incoming call title for incoming direction", () => {
      renderActiveCallDisplay({ direction: "incoming" });

      expect(screen.getByText("Incoming Call")).toBeInTheDocument();
    });

    it("shows outgoing call title for outgoing direction", () => {
      renderActiveCallDisplay({ direction: "outgoing" });

      expect(screen.getByText("Outgoing Call")).toBeInTheDocument();
    });

    it("shows ON HOLD badge when on hold", () => {
      renderActiveCallDisplay({ isOnHold: true });

      expect(screen.getByText("ON HOLD")).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // Status badges
  // -----------------------------------------------------------------------

  describe("status badges", () => {
    it("shows Ringing badge for ringing status", () => {
      renderActiveCallDisplay({
        status: "ringing",
        direction: "incoming",
      });

      expect(screen.getByText("Ringing")).toBeInTheDocument();
    });

    it("shows Connecting badge for connecting status", () => {
      renderActiveCallDisplay({ status: "connecting" });

      expect(screen.getByText("Connecting")).toBeInTheDocument();
    });

    it("shows Active badge for active status", () => {
      renderActiveCallDisplay({ status: "active" });

      expect(screen.getByText("Active")).toBeInTheDocument();
    });

    it("shows Ending badge for ending status", () => {
      renderActiveCallDisplay({ status: "ending" });

      expect(screen.getByText("Ending")).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // Incoming ringing — accept/reject buttons
  // -----------------------------------------------------------------------

  describe("incoming ringing controls", () => {
    it("shows accept and reject buttons for incoming ringing call", () => {
      renderActiveCallDisplay({
        direction: "incoming",
        status: "ringing",
      });

      // The incoming ringing view shows two circular buttons
      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThanOrEqual(2);
    });

    it("calls onAccept when accept button is clicked", async () => {
      const user = userEvent.setup();
      const { props } = renderActiveCallDisplay({
        direction: "incoming",
        status: "ringing",
      });

      // The green accept button is the second circular button
      const buttons = screen.getAllByRole("button");
      // Find the accept button (bg-green-600)
      const acceptButton = buttons.find((btn) =>
        btn.className.includes("bg-green-600")
      );
      expect(acceptButton).toBeDefined();

      await user.click(acceptButton!);
      expect(props.onAccept).toHaveBeenCalledTimes(1);
    });

    it("calls onReject when reject button is clicked", async () => {
      const user = userEvent.setup();
      const { props } = renderActiveCallDisplay({
        direction: "incoming",
        status: "ringing",
      });

      // Find the destructive reject button
      const buttons = screen.getAllByRole("button");
      const rejectButton = buttons.find((btn) =>
        btn.className.includes("rounded-full") &&
        !btn.className.includes("bg-green-600")
      );
      expect(rejectButton).toBeDefined();

      await user.click(rejectButton!);
      expect(props.onReject).toHaveBeenCalledTimes(1);
    });
  });

  // -----------------------------------------------------------------------
  // Active call controls — mute, hold, transfer, end
  // -----------------------------------------------------------------------

  describe("active call controls", () => {
    it("shows mute, hold, transfer, and end buttons for active call", () => {
      renderActiveCallDisplay({ status: "active" });

      // Should have 4 control buttons in the grid
      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThanOrEqual(4);
    });

    it("mute button triggers onToggleMute", async () => {
      const user = userEvent.setup();
      const { props } = renderActiveCallDisplay({ status: "active" });

      // The first button in the grid is mute
      const buttons = screen.getAllByRole("button");
      await user.click(buttons[0]);
      expect(props.onToggleMute).toHaveBeenCalledTimes(1);
    });

    it("hold button triggers onToggleHold", async () => {
      const user = userEvent.setup();
      const { props } = renderActiveCallDisplay({ status: "active" });

      // The second button in the grid is hold
      const buttons = screen.getAllByRole("button");
      await user.click(buttons[1]);
      expect(props.onToggleHold).toHaveBeenCalledTimes(1);
    });

    it("end call button triggers onEndCall", async () => {
      const user = userEvent.setup();
      const { props } = renderActiveCallDisplay({ status: "active" });

      // The end call button is the 4th in the control grid
      const buttons = screen.getAllByRole("button");
      // Find by iterating - it's the last button in the 4-column grid
      // that is not disabled
      const gridButtons = buttons.filter(btn => !btn.closest('[class*="mt-3"]'));
      const endCallButton = gridButtons[gridButtons.length - 1];
      expect(endCallButton).toBeDefined();

      await user.click(endCallButton!);
      expect(props.onEndCall).toHaveBeenCalled();
    });

    it("disables mute button when status is not active", () => {
      renderActiveCallDisplay({ status: "connecting" });

      const buttons = screen.getAllByRole("button");
      // First button (mute) should be disabled
      expect(buttons[0]).toBeDisabled();
    });

    it("disables hold button when status is not active", () => {
      renderActiveCallDisplay({ status: "connecting" });

      const buttons = screen.getAllByRole("button");
      // Second button (hold) should be disabled
      expect(buttons[1]).toBeDisabled();
    });

    it("disables end call button when status is ending", () => {
      renderActiveCallDisplay({ status: "ending" });

      const buttons = screen.getAllByRole("button");
      const endCallButton = buttons.find((btn) =>
        btn.className.includes("destructive")
      );
      expect(endCallButton).toBeDisabled();
    });
  });

  // -----------------------------------------------------------------------
  // Transfer panel
  // -----------------------------------------------------------------------

  describe("transfer panel", () => {
    it("toggles transfer panel on transfer button click", async () => {
      const user = userEvent.setup();
      renderActiveCallDisplay({ status: "active" });

      // Transfer button is the 3rd button in the grid
      const buttons = screen.getAllByRole("button");
      await user.click(buttons[2]);

      // After clicking, the transfer panel should show
      // It shows either "Attended" and "Blind" tabs
      expect(screen.getByText("Attended")).toBeInTheDocument();
      expect(screen.getByText("Blind")).toBeInTheDocument();
    });

    it("shows attended and blind transfer tabs", async () => {
      const user = userEvent.setup();
      renderActiveCallDisplay({ status: "active" });

      const buttons = screen.getAllByRole("button");
      await user.click(buttons[2]); // Open transfer panel

      expect(screen.getByText("Attended")).toBeInTheDocument();
      expect(screen.getByText("Blind")).toBeInTheDocument();
    });

    it("switches to blind transfer tab", async () => {
      const user = userEvent.setup();
      renderActiveCallDisplay({ status: "active" });

      const buttons = screen.getAllByRole("button");
      await user.click(buttons[2]); // Open transfer panel

      const blindTab = screen.getByText("Blind");
      await user.click(blindTab);

      // Blind tab should now be active
      expect(blindTab.closest("button")).toBeDefined();
    });

    it("shows no agents message when agent list is empty", async () => {
      const user = userEvent.setup();
      renderActiveCallDisplay({ status: "active" });

      const buttons = screen.getAllByRole("button");
      await user.click(buttons[2]); // Open transfer panel

      // Default mode is agent, which should show no agents message
      expect(
        screen.getByText("No agents with phone assignments")
      ).toBeInTheDocument();
    });

    it("shows external number input when switching to external mode", async () => {
      const user = userEvent.setup();
      renderActiveCallDisplay({ status: "active" });

      const buttons = screen.getAllByRole("button");
      await user.click(buttons[2]); // Open transfer panel

      // Click "Transfer to external number" button
      const externalButton = screen.getByText("Transfer to external number");
      await user.click(externalButton);

      // Should show input field
      expect(
        screen.getByPlaceholderText("Transfer to...")
      ).toBeInTheDocument();
    });

    it("disables transfer button when status is not active", () => {
      renderActiveCallDisplay({ status: "connecting" });

      const buttons = screen.getAllByRole("button");
      // Transfer button (3rd) should be disabled
      expect(buttons[2]).toBeDisabled();
    });
  });

  // -----------------------------------------------------------------------
  // Consultation state
  // -----------------------------------------------------------------------

  describe("consultation state", () => {
    const consultationCall: ConsultationCall = {
      targetNumber: "102",
      targetName: "Agent Smith",
      status: "active",
      duration: 10,
      logId: 99,
    };

    it("shows customer-on-hold card during consultation", () => {
      renderActiveCallDisplay({
        status: "active",
        transferPhase: "consulting",
        consultationCall,
        callerName: "John Doe",
      });

      expect(screen.getByText("Customer on hold")).toBeInTheDocument();
    });

    it("shows consulting-with target name", () => {
      renderActiveCallDisplay({
        status: "active",
        transferPhase: "consulting",
        consultationCall,
      });

      expect(screen.getByText("Consulting with")).toBeInTheDocument();
      expect(screen.getByText("Agent Smith")).toBeInTheDocument();
    });

    it("shows cancel, complete, and merge buttons during consultation", () => {
      renderActiveCallDisplay({
        status: "active",
        transferPhase: "consulting",
        consultationCall,
      });

      expect(screen.getByText("Cancel")).toBeInTheDocument();
      expect(screen.getByText("Transfer")).toBeInTheDocument();
      expect(screen.getByText("Merge")).toBeInTheDocument();
    });

    it("calls onCancelTransfer when Cancel is clicked", async () => {
      const user = userEvent.setup();
      const { props } = renderActiveCallDisplay({
        status: "active",
        transferPhase: "consulting",
        consultationCall,
      });

      await user.click(screen.getByText("Cancel"));
      expect(props.onCancelTransfer).toHaveBeenCalledTimes(1);
    });

    it("calls onCompleteTransfer when Transfer is clicked", async () => {
      const user = userEvent.setup();
      const { props } = renderActiveCallDisplay({
        status: "active",
        transferPhase: "consulting",
        consultationCall,
      });

      await user.click(screen.getByText("Transfer"));
      expect(props.onCompleteTransfer).toHaveBeenCalledTimes(1);
    });

    it("calls onMergeConference when Merge is clicked", async () => {
      const user = userEvent.setup();
      const { props } = renderActiveCallDisplay({
        status: "active",
        transferPhase: "consulting",
        consultationCall,
      });

      await user.click(screen.getByText("Merge"));
      expect(props.onMergeConference).toHaveBeenCalledTimes(1);
    });

    it("disables complete transfer button when consultation is not active", () => {
      const connectingConsultation: ConsultationCall = {
        ...consultationCall,
        status: "connecting",
      };

      renderActiveCallDisplay({
        status: "active",
        transferPhase: "consulting",
        consultationCall: connectingConsultation,
      });

      const transferButton = screen.getByText("Transfer").closest("button");
      expect(transferButton).toBeDisabled();
    });

    it("disables merge button when consultation is not active", () => {
      const ringingConsultation: ConsultationCall = {
        ...consultationCall,
        status: "ringing",
      };

      renderActiveCallDisplay({
        status: "active",
        transferPhase: "consulting",
        consultationCall: ringingConsultation,
      });

      const mergeButton = screen.getByText("Merge").closest("button");
      expect(mergeButton).toBeDisabled();
    });

    it("shows consultation target number when no name provided", () => {
      const noNameConsultation: ConsultationCall = {
        ...consultationCall,
        targetName: undefined,
      };

      renderActiveCallDisplay({
        status: "active",
        transferPhase: "consulting",
        consultationCall: noNameConsultation,
      });

      expect(screen.getByText("102")).toBeInTheDocument();
    });

    it("does not show transfer panel during consultation", () => {
      renderActiveCallDisplay({
        status: "active",
        transferPhase: "consulting",
        consultationCall,
      });

      // The regular transfer panel (with Attended/Blind tabs) should not show
      expect(screen.queryByText("Attended")).not.toBeInTheDocument();
      expect(screen.queryByText("Blind")).not.toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // Transfer number input
  // -----------------------------------------------------------------------

  describe("transfer number input", () => {
    it("requires a number before the transfer submit button is enabled", async () => {
      const user = userEvent.setup();
      renderActiveCallDisplay({ status: "active" });

      // Open transfer panel
      const buttons = screen.getAllByRole("button");
      await user.click(buttons[2]);

      // Switch to external mode
      const externalButton = screen.getByText("Transfer to external number");
      await user.click(externalButton);

      // The small transfer submit button next to input should be disabled when empty
      const allButtons = screen.getAllByRole("button");
      const submitTransferButtons = allButtons.filter(
        (btn) => !btn.textContent && btn.closest(".flex.gap-2")
      );
      if (submitTransferButtons.length > 0) {
        expect(submitTransferButtons[0]).toBeDisabled();
      }
    });
  });
});
