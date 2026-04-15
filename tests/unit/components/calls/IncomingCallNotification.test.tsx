/**
 * Tests for IncomingCallNotification component.
 * Verifies conditional rendering, caller info display, accept/reject buttons,
 * auto-dismiss after 30 seconds, and translated text usage.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      incomingCall: "Incoming Call",
      accept: "Accept",
      decline: "Decline",
      "callDetail.viewDetails": "View caller details",
    };
    return translations[key] || key;
  },
}));

const mockHandleAcceptCall = vi.fn();
const mockHandleRejectCall = vi.fn();

const mockCallContextValue = {
  activeCall: null as any,
  callDuration: 0,
  sipRegistered: false,
  sipConnecting: false,
  activeSipConfig: null,
  dialNumber: "",
  error: "",
  loading: false,
  isDialpadOpen: false,
  setDialNumber: vi.fn(),
  makeCall: vi.fn(),
  handleAcceptCall: mockHandleAcceptCall,
  handleRejectCall: mockHandleRejectCall,
  handleEndCall: vi.fn(),
  handleToggleHold: vi.fn(),
  handleToggleMute: vi.fn(),
  setError: vi.fn(),
  setIsDialpadOpen: vi.fn(),
  toggleDialpad: vi.fn(),
  callEndedCounter: 0,
  sendDTMF: vi.fn(),
  transferCall: vi.fn(),
  startAttendedTransfer: vi.fn(),
  completeTransfer: vi.fn(),
  cancelTransfer: vi.fn(),
  mergeConference: vi.fn(),
  missedCall: null,
  clearMissedCall: vi.fn(),
};

vi.mock("@/contexts/CallContext", () => ({
  useCall: () => mockCallContextValue,
}));

const mockOpenSidebar = vi.fn();
vi.mock("@/contexts/IncomingCallSidebarContext", () => ({
  useIncomingCallSidebar: () => ({
    isOpen: false,
    callLogId: null,
    phoneNumber: null,
    clientName: null,
    openSidebar: mockOpenSidebar,
    closeSidebar: vi.fn(),
  }),
}));

import { IncomingCallNotification } from "@/components/calls/IncomingCallNotification";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeIncomingRingingCall(overrides: Record<string, any> = {}) {
  return {
    id: "test-call-1",
    logId: 42,
    number: "+995555123456",
    callerName: "John Doe",
    direction: "incoming" as const,
    status: "ringing" as const,
    duration: 0,
    transferPhase: "idle" as const,
    consultationCall: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("IncomingCallNotification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();

    // Reset to no active call
    mockCallContextValue.activeCall = null;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // -----------------------------------------------------------------------
  // Conditional rendering — not shown
  // -----------------------------------------------------------------------

  describe("not rendered", () => {
    it("returns null when no active call", () => {
      mockCallContextValue.activeCall = null;

      const { container } = render(<IncomingCallNotification />);
      expect(container.firstChild).toBeNull();
    });

    it("returns null when call is outgoing", () => {
      mockCallContextValue.activeCall = makeIncomingRingingCall({
        direction: "outgoing",
      });

      const { container } = render(<IncomingCallNotification />);
      expect(container.firstChild).toBeNull();
    });

    it("returns null when call is not ringing (active)", () => {
      mockCallContextValue.activeCall = makeIncomingRingingCall({
        status: "active",
      });

      const { container } = render(<IncomingCallNotification />);
      expect(container.firstChild).toBeNull();
    });

    it("returns null when call is not ringing (connecting)", () => {
      mockCallContextValue.activeCall = makeIncomingRingingCall({
        status: "connecting",
      });

      const { container } = render(<IncomingCallNotification />);
      expect(container.firstChild).toBeNull();
    });

    it("returns null when call is not ringing (ending)", () => {
      mockCallContextValue.activeCall = makeIncomingRingingCall({
        status: "ending",
      });

      const { container } = render(<IncomingCallNotification />);
      expect(container.firstChild).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // Rendered when incoming + ringing
  // -----------------------------------------------------------------------

  describe("shows when incoming and ringing", () => {
    it("renders the notification card", () => {
      mockCallContextValue.activeCall = makeIncomingRingingCall();

      render(<IncomingCallNotification />);

      // The notification should be visible
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    it("shows caller name", () => {
      mockCallContextValue.activeCall = makeIncomingRingingCall({
        callerName: "Jane Smith",
      });

      render(<IncomingCallNotification />);

      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    });

    it("shows phone number", () => {
      mockCallContextValue.activeCall = makeIncomingRingingCall({
        number: "+995574303444",
      });

      render(<IncomingCallNotification />);

      expect(screen.getByText("+995574303444")).toBeInTheDocument();
    });

    it("shows 'Incoming Call' when no caller name", () => {
      mockCallContextValue.activeCall = makeIncomingRingingCall({
        callerName: undefined,
      });

      render(<IncomingCallNotification />);

      expect(screen.getByText("Incoming Call")).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // Accept / Decline buttons
  // -----------------------------------------------------------------------

  describe("accept and decline buttons", () => {
    it("renders Accept button", () => {
      mockCallContextValue.activeCall = makeIncomingRingingCall();

      render(<IncomingCallNotification />);

      expect(screen.getByText("Accept")).toBeInTheDocument();
    });

    it("renders Decline button", () => {
      mockCallContextValue.activeCall = makeIncomingRingingCall();

      render(<IncomingCallNotification />);

      expect(screen.getByText("Decline")).toBeInTheDocument();
    });

    it("calls handleAcceptCall when Accept is clicked", async () => {
      const user = userEvent.setup();
      mockCallContextValue.activeCall = makeIncomingRingingCall();

      render(<IncomingCallNotification />);

      await user.click(screen.getByText("Accept"));

      expect(mockHandleAcceptCall).toHaveBeenCalledTimes(1);
    });

    it("calls handleRejectCall when Decline is clicked", async () => {
      const user = userEvent.setup();
      mockCallContextValue.activeCall = makeIncomingRingingCall();

      render(<IncomingCallNotification />);

      await user.click(screen.getByText("Decline"));

      expect(mockHandleRejectCall).toHaveBeenCalledTimes(1);
    });
  });

  // -----------------------------------------------------------------------
  // Auto-dismiss after 30 seconds
  // -----------------------------------------------------------------------

  describe("auto-dismiss", () => {
    it("auto-dismisses after 30 seconds", () => {
      vi.useFakeTimers();
      mockCallContextValue.activeCall = makeIncomingRingingCall();

      const { container } = render(<IncomingCallNotification />);

      // Should be visible initially
      expect(screen.getByText("John Doe")).toBeInTheDocument();

      // Advance past 30 seconds
      act(() => {
        vi.advanceTimersByTime(30100);
      });

      // After auto-dismiss, the component should return null
      expect(container.firstChild).toBeNull();

      vi.useRealTimers();
    });

    it("does not auto-dismiss before 30 seconds", () => {
      vi.useFakeTimers();
      mockCallContextValue.activeCall = makeIncomingRingingCall();

      render(<IncomingCallNotification />);

      // Advance 29 seconds
      act(() => {
        vi.advanceTimersByTime(29000);
      });

      // Should still be visible
      expect(screen.getByText("John Doe")).toBeInTheDocument();

      vi.useRealTimers();
    });
  });

  // -----------------------------------------------------------------------
  // Translation usage
  // -----------------------------------------------------------------------

  describe("uses translated text", () => {
    it("uses t('accept') for accept button text", () => {
      mockCallContextValue.activeCall = makeIncomingRingingCall();

      render(<IncomingCallNotification />);

      // Our mock translates 'accept' to 'Accept'
      expect(screen.getByText("Accept")).toBeInTheDocument();
    });

    it("uses t('decline') for decline button text", () => {
      mockCallContextValue.activeCall = makeIncomingRingingCall();

      render(<IncomingCallNotification />);

      expect(screen.getByText("Decline")).toBeInTheDocument();
    });

    it("uses t('incomingCall') as fallback when no caller name", () => {
      mockCallContextValue.activeCall = makeIncomingRingingCall({
        callerName: undefined,
      });

      render(<IncomingCallNotification />);

      expect(screen.getByText("Incoming Call")).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // View details button
  // -----------------------------------------------------------------------

  describe("view details button", () => {
    it("renders view details button", () => {
      mockCallContextValue.activeCall = makeIncomingRingingCall();

      render(<IncomingCallNotification />);

      const viewDetailsButton = screen.getByTitle("View caller details");
      expect(viewDetailsButton).toBeInTheDocument();
    });

    it("calls openSidebar with call info when view details is clicked", async () => {
      const user = userEvent.setup();
      mockCallContextValue.activeCall = makeIncomingRingingCall({
        logId: 42,
        number: "+995555123456",
        callerName: "John Doe",
      });

      render(<IncomingCallNotification />);

      const viewDetailsButton = screen.getByTitle("View caller details");
      await user.click(viewDetailsButton);

      expect(mockOpenSidebar).toHaveBeenCalledWith(
        42,
        "+995555123456",
        "John Doe"
      );
    });
  });
});
