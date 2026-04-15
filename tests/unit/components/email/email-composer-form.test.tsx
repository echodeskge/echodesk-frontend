/**
 * Tests for EmailComposerForm component.
 * Verifies form fields, CC/BCC toggle, email tag input,
 * reply/forward pre-fill, reset, and submit behavior.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPush = vi.fn();
const mockToast = vi.fn();
const mockMutateAsync = vi.fn().mockResolvedValue({});
const mockSearchParams = new URLSearchParams();

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      from: "From",
      to: "To",
      cc: "CC",
      bcc: "BCC",
      subject: "Subject",
      send: "Send",
      sending: "Sending...",
      showCcBcc: "CC/BCC",
      hideCcBcc: "Hide CC/BCC",
      recipientPlaceholder: "Add recipients...",
      ccPlaceholder: "Add CC...",
      bccPlaceholder: "Add BCC...",
      messagePlaceholder: "Write your message...",
      invalidEmail: "Invalid email",
      invalidEmailDescription: "Invalid email address",
      sent: "Email sent",
      sentDescription: "Your email has been sent",
      sendFailed: "Send failed",
      sendError: "Failed to send email",
      selectAccount: "Select account",
      showQuoted: "Show quoted text",
      hideQuoted: "Hide quoted text",
      signatureNote: "Signature will be included:",
    };
    return translations[key] || key;
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, back: vi.fn() }),
  useSearchParams: () => mockSearchParams,
  useParams: () => ({}),
  usePathname: () => "/email/compose",
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("@/hooks/api/useSocial", () => ({
  useSendEmail: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
  useEmailStatus: () => ({
    data: {
      connected: true,
      connections: [
        { id: 1, email_address: "me@example.com", display_name: "My Email" },
      ],
      connection: null,
    },
    isLoading: false,
  }),
  useEmailSignature: () => ({
    data: null,
    isLoading: false,
  }),
}));

vi.mock("@/app/(tenant)/email/_hooks/use-email-context", () => ({
  useEmailContext: () => ({
    currentConnectionId: 1,
    selectedEmailIds: [],
    isEmailSidebarOpen: false,
    setIsEmailSidebarOpen: vi.fn(),
    setCurrentConnectionId: vi.fn(),
    handleToggleSelectEmail: vi.fn(),
    handleToggleSelectAllEmails: vi.fn(),
    handleClearSelection: vi.fn(),
  }),
}));

vi.mock("@/api/axios", () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: null }),
    post: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

// Mock react-query's useQuery for original email fetching
vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    useQuery: vi.fn().mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    }),
  };
});

import { EmailComposerForm } from "@/app/(tenant)/email/_components/email-composer-form";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("EmailComposerForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset search params
    mockSearchParams.delete("reply_to");
    mockSearchParams.delete("forward");
  });

  // -----------------------------------------------------------------------
  // Field rendering
  // -----------------------------------------------------------------------

  describe("field rendering", () => {
    it("renders To field with placeholder", () => {
      render(<EmailComposerForm />);

      expect(
        screen.getByPlaceholderText("Add recipients...")
      ).toBeInTheDocument();
    });

    it("renders Subject field", () => {
      render(<EmailComposerForm />);

      expect(
        screen.getByPlaceholderText("Subject")
      ).toBeInTheDocument();
    });

    it("renders message textarea", () => {
      render(<EmailComposerForm />);

      expect(
        screen.getByPlaceholderText("Write your message...")
      ).toBeInTheDocument();
    });

    it("renders Send button", () => {
      render(<EmailComposerForm />);

      expect(screen.getByText("Send")).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // CC/BCC toggle
  // -----------------------------------------------------------------------

  describe("CC/BCC toggle", () => {
    it("does not show CC/BCC fields initially", () => {
      render(<EmailComposerForm />);

      expect(screen.queryByText("CC")).not.toBeInTheDocument();
      expect(screen.queryByText("BCC")).not.toBeInTheDocument();
    });

    it("shows CC/BCC fields when toggle is clicked", async () => {
      const user = userEvent.setup();
      render(<EmailComposerForm />);

      const toggleButton = screen.getByText("CC/BCC");
      await user.click(toggleButton);

      expect(screen.getByText("CC")).toBeInTheDocument();
      expect(screen.getByText("BCC")).toBeInTheDocument();
    });

    it("hides CC/BCC fields when toggle is clicked again", async () => {
      const user = userEvent.setup();
      render(<EmailComposerForm />);

      const toggleButton = screen.getByText("CC/BCC");
      await user.click(toggleButton); // show
      await user.click(screen.getByText("Hide CC/BCC")); // hide

      expect(screen.queryByText("CC")).not.toBeInTheDocument();
      expect(screen.queryByText("BCC")).not.toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // Email tag input
  // -----------------------------------------------------------------------

  describe("email tag input", () => {
    it("adds email badge when typing + Enter", async () => {
      const user = userEvent.setup();
      render(<EmailComposerForm />);

      const toInput = screen.getByPlaceholderText("Add recipients...");
      await user.type(toInput, "alice@example.com{Enter}");

      expect(screen.getByText("alice@example.com")).toBeInTheDocument();
    });

    it("adds email badge when typing + comma", async () => {
      const user = userEvent.setup();
      render(<EmailComposerForm />);

      const toInput = screen.getByPlaceholderText("Add recipients...");
      await user.type(toInput, "bob@example.com,");

      expect(screen.getByText("bob@example.com")).toBeInTheDocument();
    });

    it("shows toast for invalid email", async () => {
      const user = userEvent.setup();
      render(<EmailComposerForm />);

      const toInput = screen.getByPlaceholderText("Add recipients...");
      await user.type(toInput, "not-an-email{Enter}");

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Invalid email",
          variant: "destructive",
        })
      );
    });

    it("removes email badge when X is clicked", async () => {
      const user = userEvent.setup();
      render(<EmailComposerForm />);

      const toInput = screen.getByPlaceholderText("Add recipients...");
      await user.type(toInput, "alice@example.com{Enter}");

      expect(screen.getByText("alice@example.com")).toBeInTheDocument();

      // Find the X button within the badge
      const badge = screen.getByText("alice@example.com").closest(".gap-1");
      const removeButton = badge?.querySelector("svg");
      expect(removeButton).not.toBeNull();

      await user.click(removeButton!);

      expect(
        screen.queryByText("alice@example.com")
      ).not.toBeInTheDocument();
    });

    it("does not add duplicate emails", async () => {
      const user = userEvent.setup();
      render(<EmailComposerForm />);

      const toInput = screen.getByPlaceholderText("Add recipients...");
      await user.type(toInput, "alice@example.com{Enter}");
      await user.type(toInput, "alice@example.com{Enter}");

      const badges = screen.getAllByText("alice@example.com");
      expect(badges).toHaveLength(1);
    });

    it("normalizes email to lowercase", async () => {
      const user = userEvent.setup();
      render(<EmailComposerForm />);

      const toInput = screen.getByPlaceholderText("Add recipients...");
      await user.type(toInput, "Alice@Example.COM{Enter}");

      expect(
        screen.getByText("alice@example.com")
      ).toBeInTheDocument();
    });

    it("adds CC email when CC field is visible", async () => {
      const user = userEvent.setup();
      render(<EmailComposerForm />);

      // Show CC/BCC
      const toggleButton = screen.getByText("CC/BCC");
      await user.click(toggleButton);

      const ccInput = screen.getByPlaceholderText("Add CC...");
      await user.type(ccInput, "cc@example.com{Enter}");

      expect(screen.getByText("cc@example.com")).toBeInTheDocument();
    });

    it("adds BCC email when BCC field is visible", async () => {
      const user = userEvent.setup();
      render(<EmailComposerForm />);

      // Show CC/BCC
      const toggleButton = screen.getByText("CC/BCC");
      await user.click(toggleButton);

      const bccInput = screen.getByPlaceholderText("Add BCC...");
      await user.type(bccInput, "bcc@example.com{Enter}");

      expect(screen.getByText("bcc@example.com")).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // Reset button
  // -----------------------------------------------------------------------

  describe("reset button", () => {
    it("clears form when reset button is clicked", async () => {
      const user = userEvent.setup();
      render(<EmailComposerForm />);

      // Add a recipient
      const toInput = screen.getByPlaceholderText("Add recipients...");
      await user.type(toInput, "alice@example.com{Enter}");
      expect(screen.getByText("alice@example.com")).toBeInTheDocument();

      // Type in subject
      const subjectInput = screen.getByPlaceholderText("Subject");
      await user.type(subjectInput, "Test subject");

      // Click reset (it's a button with ListRestart icon)
      const resetButton = screen.getAllByRole("button").find(
        (btn) => btn.getAttribute("type") === "reset"
      );
      expect(resetButton).toBeDefined();
      await user.click(resetButton!);

      // After reset, recipient badge and subject should be cleared
      await waitFor(() => {
        expect(
          screen.queryByText("alice@example.com")
        ).not.toBeInTheDocument();
      });
    });
  });

  // -----------------------------------------------------------------------
  // Send button state
  // -----------------------------------------------------------------------

  describe("send button state", () => {
    it("renders Send button with Send icon by default", () => {
      render(<EmailComposerForm />);

      const sendButton = screen.getByText("Send").closest("button");
      expect(sendButton).not.toBeDisabled();
    });
  });

  // -----------------------------------------------------------------------
  // Connection selector
  // -----------------------------------------------------------------------

  describe("connection selector", () => {
    it("does not show connection selector for single account", () => {
      render(<EmailComposerForm />);

      expect(screen.queryByText("From")).not.toBeInTheDocument();
    });
  });
});
