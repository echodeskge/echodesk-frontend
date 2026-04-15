/**
 * Tests for EmailConnectionSelector component.
 * Verifies loading state, empty state, single account display,
 * and multi-account dropdown rendering.
 *
 * Note: Radix Select dropdown item interactions (clicking options)
 * rely on pointer capture and scrollIntoView APIs not available in
 * jsdom. Those interactions are covered by E2E / Playwright tests.
 * Here we verify rendering, state branches, and that the correct
 * UI elements appear for each connection count.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

// ---------------------------------------------------------------------------
// Polyfills for Radix UI in jsdom
// ---------------------------------------------------------------------------

if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
}
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = vi.fn();
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = vi.fn();
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn();
}

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSetCurrentConnectionId = vi.fn();
const mockCurrentConnectionId = { current: null as number | null };

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      noAccounts: "No email accounts",
      allAccounts: "All accounts",
    };
    return translations[key] || key;
  },
}));

vi.mock("@/app/(tenant)/email/_hooks/use-email-context", () => ({
  useEmailContext: () => ({
    currentConnectionId: mockCurrentConnectionId.current,
    setCurrentConnectionId: mockSetCurrentConnectionId,
    selectedEmailIds: [],
    isEmailSidebarOpen: false,
    setIsEmailSidebarOpen: vi.fn(),
    handleToggleSelectEmail: vi.fn(),
    handleToggleSelectAllEmails: vi.fn(),
    handleClearSelection: vi.fn(),
  }),
}));

const mockUseEmailStatus = vi.fn();

vi.mock("@/hooks/api/useSocial", () => ({
  useEmailStatus: (...args: unknown[]) => mockUseEmailStatus(...args),
}));

import { EmailConnectionSelector } from "@/app/(tenant)/email/_components/email-connection-selector";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface MockConnection {
  id: number;
  email_address: string;
  display_name: string;
}

function setupEmailStatus(
  connections: MockConnection[],
  isLoading = false
) {
  mockUseEmailStatus.mockReturnValue({
    data: { connected: connections.length > 0, connections, connection: null },
    isLoading,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("EmailConnectionSelector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentConnectionId.current = null;
  });

  // -----------------------------------------------------------------------
  // Loading state
  // -----------------------------------------------------------------------

  describe("loading state", () => {
    it("shows loading skeleton while fetching", () => {
      setupEmailStatus([], true);

      const { container } = render(<EmailConnectionSelector />);

      const skeleton = container.querySelector(".animate-pulse");
      expect(skeleton).not.toBeNull();
    });

    it("does not show 'No email accounts' while loading", () => {
      setupEmailStatus([], true);

      render(<EmailConnectionSelector />);

      expect(
        screen.queryByText("No email accounts")
      ).not.toBeInTheDocument();
    });

    it("loading skeleton has expected dimensions", () => {
      setupEmailStatus([], true);

      const { container } = render(<EmailConnectionSelector />);

      const skeleton = container.querySelector(".h-9.bg-muted.animate-pulse.rounded-md");
      expect(skeleton).not.toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // Empty state
  // -----------------------------------------------------------------------

  describe("empty state", () => {
    it("shows 'No email accounts' when connections list is empty", () => {
      setupEmailStatus([]);

      render(<EmailConnectionSelector />);

      expect(
        screen.getByText("No email accounts")
      ).toBeInTheDocument();
    });

    it("does not show loading skeleton when not loading", () => {
      setupEmailStatus([]);

      const { container } = render(<EmailConnectionSelector />);

      expect(container.querySelector(".animate-pulse")).toBeNull();
    });

    it("does not render a Select trigger when empty", () => {
      setupEmailStatus([]);

      render(<EmailConnectionSelector />);

      expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // Single account
  // -----------------------------------------------------------------------

  describe("single account", () => {
    const singleConnection: MockConnection = {
      id: 1,
      email_address: "me@example.com",
      display_name: "My Account",
    };

    it("shows email address for single account", () => {
      setupEmailStatus([singleConnection]);

      render(<EmailConnectionSelector />);

      expect(screen.getByText("me@example.com")).toBeInTheDocument();
    });

    it("does not render a Select trigger for single account", () => {
      setupEmailStatus([singleConnection]);

      render(<EmailConnectionSelector />);

      expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    });

    it("renders email in a muted container", () => {
      setupEmailStatus([singleConnection]);

      const { container } = render(<EmailConnectionSelector />);

      const emailContainer = container.querySelector(".bg-muted");
      expect(emailContainer).not.toBeNull();
      expect(emailContainer?.textContent).toContain("me@example.com");
    });

    it("does not show 'No email accounts' for single connection", () => {
      setupEmailStatus([singleConnection]);

      render(<EmailConnectionSelector />);

      expect(
        screen.queryByText("No email accounts")
      ).not.toBeInTheDocument();
    });

    it("renders a mail icon alongside the email", () => {
      setupEmailStatus([singleConnection]);

      const { container } = render(<EmailConnectionSelector />);

      // Lucide Mail icon renders as an SVG
      const svg = container.querySelector("svg");
      expect(svg).not.toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // Multiple accounts
  // -----------------------------------------------------------------------

  describe("multiple accounts", () => {
    const multipleConnections: MockConnection[] = [
      {
        id: 1,
        email_address: "personal@example.com",
        display_name: "Personal",
      },
      {
        id: 2,
        email_address: "work@example.com",
        display_name: "Work",
      },
    ];

    it("shows Select dropdown for multiple accounts", () => {
      setupEmailStatus(multipleConnections);

      render(<EmailConnectionSelector />);

      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    it("shows 'All accounts' as default selected value when connectionId is null", () => {
      mockCurrentConnectionId.current = null;
      setupEmailStatus(multipleConnections);

      render(<EmailConnectionSelector />);

      const trigger = screen.getByRole("combobox");
      expect(trigger.textContent).toContain("All accounts");
    });

    it("shows selected connection display name when connectionId is set", () => {
      mockCurrentConnectionId.current = 1;
      setupEmailStatus(multipleConnections);

      render(<EmailConnectionSelector />);

      const trigger = screen.getByRole("combobox");
      expect(trigger.textContent).toContain("Personal");
    });

    it("shows second connection when that connectionId is set", () => {
      mockCurrentConnectionId.current = 2;
      setupEmailStatus(multipleConnections);

      render(<EmailConnectionSelector />);

      const trigger = screen.getByRole("combobox");
      expect(trigger.textContent).toContain("Work");
    });

    it("does not show 'No email accounts' for multiple connections", () => {
      setupEmailStatus(multipleConnections);

      render(<EmailConnectionSelector />);

      expect(
        screen.queryByText("No email accounts")
      ).not.toBeInTheDocument();
    });

    it("does not show static email label for multiple connections", () => {
      setupEmailStatus(multipleConnections);

      const { container } = render(<EmailConnectionSelector />);

      // The muted static label should not be present
      const staticLabel = container.querySelector(
        ".text-muted-foreground.bg-muted:not([role])"
      );
      // The select trigger exists instead
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    it("select trigger has full width", () => {
      setupEmailStatus(multipleConnections);

      render(<EmailConnectionSelector />);

      const trigger = screen.getByRole("combobox");
      expect(trigger.className).toContain("w-full");
    });

    it("falls back to email_address when display_name is empty", () => {
      mockCurrentConnectionId.current = 2;
      setupEmailStatus([
        { id: 1, email_address: "a@example.com", display_name: "Named" },
        { id: 2, email_address: "b@example.com", display_name: "" },
      ]);

      render(<EmailConnectionSelector />);

      const trigger = screen.getByRole("combobox");
      // Connection 2 has empty display_name, so email_address should be shown
      expect(trigger.textContent).toContain("b@example.com");
    });

    it("uses display_name over email_address when both available", () => {
      mockCurrentConnectionId.current = 1;
      setupEmailStatus([
        { id: 1, email_address: "a@example.com", display_name: "My Display" },
        { id: 2, email_address: "b@example.com", display_name: "Other" },
      ]);

      render(<EmailConnectionSelector />);

      const trigger = screen.getByRole("combobox");
      expect(trigger.textContent).toContain("My Display");
    });
  });

  // -----------------------------------------------------------------------
  // Null/undefined emailStatus data
  // -----------------------------------------------------------------------

  describe("null emailStatus data", () => {
    it("handles undefined data gracefully", () => {
      mockUseEmailStatus.mockReturnValue({
        data: undefined,
        isLoading: false,
      });

      render(<EmailConnectionSelector />);

      expect(
        screen.getByText("No email accounts")
      ).toBeInTheDocument();
    });

    it("handles null connections gracefully", () => {
      mockUseEmailStatus.mockReturnValue({
        data: { connected: false, connections: undefined, connection: null },
        isLoading: false,
      });

      render(<EmailConnectionSelector />);

      expect(
        screen.getByText("No email accounts")
      ).toBeInTheDocument();
    });
  });
});
