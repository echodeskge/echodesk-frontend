/**
 * Tests for DialpadWidget component.
 * Verifies feature gating (ip_calling), SIP config requirement,
 * phone icon button, status indicators, missed call notification,
 * callback behavior, and dismiss functionality.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      missedCall: "Missed Call",
      callBack: "Call Back",
    };
    return translations[key] || key;
  },
}));

const mockToggleDialpad = vi.fn();
const mockSetDialNumber = vi.fn();
const mockSetIsDialpadOpen = vi.fn();
const mockClearMissedCall = vi.fn();

const mockCallContextValue = {
  activeCall: null as any,
  callDuration: 0,
  sipRegistered: false,
  sipConnecting: false,
  activeSipConfig: null as any,
  dialNumber: "",
  error: "",
  loading: false,
  isDialpadOpen: false,
  setDialNumber: mockSetDialNumber,
  makeCall: vi.fn(),
  handleAcceptCall: vi.fn(),
  handleRejectCall: vi.fn(),
  handleEndCall: vi.fn(),
  handleToggleHold: vi.fn(),
  handleToggleMute: vi.fn(),
  setError: vi.fn(),
  setIsDialpadOpen: mockSetIsDialpadOpen,
  toggleDialpad: mockToggleDialpad,
  callEndedCounter: 0,
  sendDTMF: vi.fn(),
  transferCall: vi.fn(),
  startAttendedTransfer: vi.fn(),
  completeTransfer: vi.fn(),
  cancelTransfer: vi.fn(),
  mergeConference: vi.fn(),
  missedCall: null as { number: string; time: Date } | null,
  clearMissedCall: mockClearMissedCall,
};

vi.mock("@/contexts/CallContext", () => ({
  useCall: () => mockCallContextValue,
}));

const mockAuthUser = {
  id: 1,
  is_staff: false,
  is_superuser: false,
};

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: mockAuthUser,
    token: "token",
    isAuthenticated: true,
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    checkAuth: vi.fn(),
  }),
}));

let mockUserProfile: Record<string, any> | null = null;

vi.mock("@/hooks/useUserProfile", () => ({
  useUserProfile: () => ({
    data: mockUserProfile,
    isLoading: false,
    error: null,
  }),
}));

// Mock the DialpadPopup (heavy component we don't need to test here)
vi.mock("@/components/calls/DialpadPopup", () => ({
  DialpadPopup: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="dialpad-popup">
      <button onClick={onClose}>Close Dialpad</button>
    </div>
  ),
}));

// Mock IncomingCallNotification (tested separately)
vi.mock("@/components/calls/IncomingCallNotification", () => ({
  IncomingCallNotification: () => (
    <div data-testid="incoming-call-notification" />
  ),
}));

// Mock date-fns format
vi.mock("date-fns", () => ({
  format: (date: Date, formatStr: string) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${ampm}`;
  },
}));

import DialpadWidget from "@/components/calls/DialpadWidget";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSipConfig() {
  return {
    id: 1,
    name: "Test PBX",
    sip_server: "pbx.echodesk.ge",
    sip_port: 8089,
    username: "100",
    password: "testpass",
    realm: "pbx.echodesk.ge",
    is_active: true,
    is_default: true,
    user_assignments: [],
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("DialpadWidget", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset to defaults
    mockCallContextValue.activeCall = null;
    mockCallContextValue.sipRegistered = false;
    mockCallContextValue.activeSipConfig = null;
    mockCallContextValue.isDialpadOpen = false;
    mockCallContextValue.missedCall = null;
    mockAuthUser.is_staff = false;
    mockAuthUser.is_superuser = false;
    mockUserProfile = null;
  });

  // -----------------------------------------------------------------------
  // Feature gating
  // -----------------------------------------------------------------------

  describe("feature gating", () => {
    it("returns null when user does not have ip_calling feature", () => {
      mockUserProfile = { feature_keys: [] };
      mockCallContextValue.activeSipConfig = makeSipConfig();

      const { container } = render(<DialpadWidget />);
      expect(container.firstChild).toBeNull();
    });

    it("returns null when feature_keys is missing", () => {
      mockUserProfile = {};
      mockCallContextValue.activeSipConfig = makeSipConfig();

      const { container } = render(<DialpadWidget />);
      expect(container.firstChild).toBeNull();
    });

    it("renders for staff users even without explicit ip_calling", () => {
      mockAuthUser.is_staff = true;
      mockUserProfile = { feature_keys: [] };
      mockCallContextValue.activeSipConfig = makeSipConfig();

      const { container } = render(<DialpadWidget />);
      expect(container.firstChild).not.toBeNull();
    });

    it("renders for superuser even without explicit ip_calling", () => {
      mockAuthUser.is_superuser = true;
      mockUserProfile = { feature_keys: [] };
      mockCallContextValue.activeSipConfig = makeSipConfig();

      const { container } = render(<DialpadWidget />);
      expect(container.firstChild).not.toBeNull();
    });

    it("renders when user has ip_calling in feature_keys array", () => {
      mockUserProfile = { feature_keys: ["ip_calling"] };
      mockCallContextValue.activeSipConfig = makeSipConfig();

      const { container } = render(<DialpadWidget />);
      expect(container.firstChild).not.toBeNull();
    });

    it("renders when user has ip_calling in feature_keys JSON string", () => {
      mockUserProfile = {
        feature_keys: JSON.stringify(["ip_calling", "other"]),
      };
      mockCallContextValue.activeSipConfig = makeSipConfig();

      const { container } = render(<DialpadWidget />);
      expect(container.firstChild).not.toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // SIP config requirement
  // -----------------------------------------------------------------------

  describe("SIP config requirement", () => {
    it("returns null when no SIP config is loaded", () => {
      mockAuthUser.is_staff = true;
      mockUserProfile = { feature_keys: ["ip_calling"] };
      mockCallContextValue.activeSipConfig = null;

      const { container } = render(<DialpadWidget />);
      expect(container.firstChild).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // Phone icon button
  // -----------------------------------------------------------------------

  describe("phone icon button", () => {
    beforeEach(() => {
      mockAuthUser.is_staff = true;
      mockUserProfile = { feature_keys: ["ip_calling"] };
      mockCallContextValue.activeSipConfig = makeSipConfig();
    });

    it("renders floating phone button", () => {
      render(<DialpadWidget />);

      // The button should have data-dialpad-trigger attribute
      const trigger = document.querySelector("[data-dialpad-trigger]");
      expect(trigger).not.toBeNull();
    });

    it("calls toggleDialpad when clicked", async () => {
      const user = userEvent.setup();
      render(<DialpadWidget />);

      const trigger = document.querySelector(
        "[data-dialpad-trigger]"
      ) as HTMLElement;
      await user.click(trigger);

      expect(mockToggleDialpad).toHaveBeenCalledTimes(1);
    });
  });

  // -----------------------------------------------------------------------
  // Status indicators
  // -----------------------------------------------------------------------

  describe("status indicators", () => {
    beforeEach(() => {
      mockAuthUser.is_staff = true;
      mockUserProfile = { feature_keys: ["ip_calling"] };
      mockCallContextValue.activeSipConfig = makeSipConfig();
    });

    it("shows green indicator when SIP is registered and no active call", () => {
      mockCallContextValue.sipRegistered = true;
      mockCallContextValue.activeCall = null;

      render(<DialpadWidget />);

      // Green dot indicator — find the span with bg-green-500
      const greenDot = document.querySelector(".bg-green-500");
      expect(greenDot).not.toBeNull();
    });

    it("shows red pulse indicator during active call (not ringing)", () => {
      mockCallContextValue.sipRegistered = true;
      mockCallContextValue.activeCall = {
        id: "test",
        logId: 1,
        number: "+995555123456",
        direction: "outgoing",
        status: "active",
        duration: 0,
        transferPhase: "idle",
        consultationCall: null,
      };

      render(<DialpadWidget />);

      // Red pulse dot — find the span with bg-red-500 and animate-pulse
      const redDot = document.querySelector(".bg-red-500.animate-pulse");
      expect(redDot).not.toBeNull();
    });

    it("shows ping indicator during incoming ringing", () => {
      mockCallContextValue.sipRegistered = true;
      mockCallContextValue.activeCall = {
        id: "test",
        logId: 1,
        number: "+995555123456",
        direction: "incoming",
        status: "ringing",
        duration: 0,
        transferPhase: "idle",
        consultationCall: null,
      };

      render(<DialpadWidget />);

      // Ringing has animate-ping class
      const pingDot = document.querySelector(".animate-ping");
      expect(pingDot).not.toBeNull();
    });

    it("does not show green indicator when not registered", () => {
      mockCallContextValue.sipRegistered = false;
      mockCallContextValue.activeCall = null;

      render(<DialpadWidget />);

      // Should NOT have the small green status dot
      // (The main button has bg-primary, not bg-green-500)
      const trigger = document.querySelector("[data-dialpad-trigger]");
      const greenDot = trigger?.querySelector(
        ".bg-green-500.border-2.border-background"
      );
      expect(greenDot).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // Missed call notification
  // -----------------------------------------------------------------------

  describe("missed call notification", () => {
    beforeEach(() => {
      mockAuthUser.is_staff = true;
      mockUserProfile = { feature_keys: ["ip_calling"] };
      mockCallContextValue.activeSipConfig = makeSipConfig();
    });

    it("shows missed call notification with number and time", () => {
      const missedTime = new Date(2026, 3, 15, 14, 30); // 2:30 PM
      mockCallContextValue.missedCall = {
        number: "+995555999888",
        time: missedTime,
      };

      render(<DialpadWidget />);

      expect(screen.getByText("Missed Call")).toBeInTheDocument();
      expect(screen.getByText("+995555999888")).toBeInTheDocument();
      expect(screen.getByText("2:30 PM")).toBeInTheDocument();
    });

    it("shows Call Back button", () => {
      mockCallContextValue.missedCall = {
        number: "+995555999888",
        time: new Date(),
      };

      render(<DialpadWidget />);

      expect(screen.getByText("Call Back")).toBeInTheDocument();
    });

    it("Call Back button sets dial number and opens dialpad", async () => {
      const user = userEvent.setup();
      mockCallContextValue.missedCall = {
        number: "+995555999888",
        time: new Date(),
      };

      render(<DialpadWidget />);

      await user.click(screen.getByText("Call Back"));

      expect(mockSetDialNumber).toHaveBeenCalledWith("+995555999888");
      expect(mockSetIsDialpadOpen).toHaveBeenCalledWith(true);
      expect(mockClearMissedCall).toHaveBeenCalledTimes(1);
    });

    it("dismiss button clears missed call", async () => {
      const user = userEvent.setup();
      mockCallContextValue.missedCall = {
        number: "+995555999888",
        time: new Date(),
      };

      render(<DialpadWidget />);

      // The X/dismiss button is a small button next to the missed call title
      const dismissButton = document.querySelector(
        "button.text-muted-foreground"
      ) as HTMLElement;
      expect(dismissButton).not.toBeNull();

      await user.click(dismissButton);
      expect(mockClearMissedCall).toHaveBeenCalledTimes(1);
    });

    it("does not show missed call notification when missedCall is null", () => {
      mockCallContextValue.missedCall = null;

      render(<DialpadWidget />);

      expect(screen.queryByText("Missed Call")).not.toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // DialpadPopup
  // -----------------------------------------------------------------------

  describe("dialpad popup", () => {
    beforeEach(() => {
      mockAuthUser.is_staff = true;
      mockUserProfile = { feature_keys: ["ip_calling"] };
      mockCallContextValue.activeSipConfig = makeSipConfig();
    });

    it("shows DialpadPopup when dialpad is open", () => {
      mockCallContextValue.isDialpadOpen = true;

      render(<DialpadWidget />);

      expect(screen.getByTestId("dialpad-popup")).toBeInTheDocument();
    });

    it("does not show DialpadPopup when dialpad is closed", () => {
      mockCallContextValue.isDialpadOpen = false;

      render(<DialpadWidget />);

      expect(screen.queryByTestId("dialpad-popup")).not.toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // IncomingCallNotification inclusion
  // -----------------------------------------------------------------------

  describe("IncomingCallNotification", () => {
    beforeEach(() => {
      mockAuthUser.is_staff = true;
      mockUserProfile = { feature_keys: ["ip_calling"] };
      mockCallContextValue.activeSipConfig = makeSipConfig();
    });

    it("always renders IncomingCallNotification when widget is visible", () => {
      render(<DialpadWidget />);

      expect(
        screen.getByTestId("incoming-call-notification")
      ).toBeInTheDocument();
    });
  });
});
