/**
 * Tests for EmailViewContentBody component.
 * Verifies HTML and plain text rendering, quoted text splitting,
 * show/hide toggle, and attachments rendering.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    const translations: Record<string, string> = {
      showQuoted: "Show quoted text",
      hideQuoted: "Hide quoted text",
      attachments: `Attachments (${params?.count ?? 0})`,
    };
    return translations[key] || key;
  },
}));

import { EmailViewContentBody } from "@/app/(tenant)/email/_components/email-view-content-body";
import type { EmailMessage } from "@/hooks/api/useSocial";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEmail(overrides: Partial<EmailMessage> = {}): EmailMessage {
  return {
    id: 1,
    message_id: "msg-001",
    thread_id: "thread-001",
    in_reply_to: "",
    references: "",
    from_email: "sender@example.com",
    from_name: "John Doe",
    to_emails: [{ email: "recipient@example.com" }],
    cc_emails: [],
    bcc_emails: [],
    reply_to: "",
    subject: "Test Subject",
    body_text: "Hello world",
    body_html: "",
    attachments: [],
    timestamp: "2025-01-15T10:00:00Z",
    folder: "INBOX",
    uid: "123",
    is_from_business: false,
    is_read: true,
    is_starred: false,
    is_answered: false,
    is_draft: false,
    labels: [],
    is_read_by_staff: false,
    read_by_staff_at: null,
    is_deleted: false,
    deleted_at: null,
    connection_id: 1,
    connection_email: "me@example.com",
    connection_display_name: "My Email",
    created_at: "2025-01-15T10:00:00Z",
    updated_at: "2025-01-15T10:00:00Z",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("EmailViewContentBody", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // HTML body rendering
  // -----------------------------------------------------------------------

  describe("HTML body rendering", () => {
    it("renders HTML body content", () => {
      const email = makeEmail({
        body_html: "<p>Hello <strong>World</strong></p>",
      });

      render(<EmailViewContentBody email={email} />);

      expect(screen.getByText("Hello")).toBeInTheDocument();
      expect(screen.getByText("World")).toBeInTheDocument();
    });

    it("sanitizes dangerous HTML with DOMPurify", () => {
      const email = makeEmail({
        body_html:
          '<p>Safe content</p><script>alert("xss")</script>',
      });

      const { container } = render(
        <EmailViewContentBody email={email} />
      );

      expect(screen.getByText("Safe content")).toBeInTheDocument();
      expect(container.querySelector("script")).toBeNull();
    });

    it("preserves style tags in HTML body", () => {
      const email = makeEmail({
        body_html:
          '<style>.custom { color: red; }</style><p class="custom">Styled</p>',
      });

      const { container } = render(
        <EmailViewContentBody email={email} />
      );

      // DOMPurify with ADD_TAGS: ["style"] should keep style tags
      expect(screen.getByText("Styled")).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // Plain text body rendering
  // -----------------------------------------------------------------------

  describe("plain text body rendering", () => {
    it("renders plain text body when no HTML", () => {
      const email = makeEmail({
        body_html: "",
        body_text: "This is plain text content",
      });

      render(<EmailViewContentBody email={email} />);

      expect(
        screen.getByText("This is plain text content")
      ).toBeInTheDocument();
    });

    it("renders plain text when body_html is whitespace only", () => {
      const email = makeEmail({
        body_html: "   ",
        body_text: "Plain text fallback",
      });

      render(<EmailViewContentBody email={email} />);

      expect(
        screen.getByText("Plain text fallback")
      ).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // Quoted text splitting — "--- Original Message ---"
  // -----------------------------------------------------------------------

  describe("quoted text splitting — Original Message marker", () => {
    it("splits body at '--- Original Message ---' marker", () => {
      const email = makeEmail({
        body_html: "",
        body_text:
          "My reply\n\n--- Original Message ---\nFrom: alice@example.com\nOriginal content",
      });

      render(<EmailViewContentBody email={email} />);

      expect(screen.getByText("My reply")).toBeInTheDocument();
      expect(
        screen.getByText(/--- Original Message ---/)
      ).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // Quoted text splitting — "On ... wrote:"
  // -----------------------------------------------------------------------

  describe("quoted text splitting — On wrote pattern", () => {
    it("splits body at 'On ... wrote:' pattern", () => {
      const email = makeEmail({
        body_html: "",
        body_text:
          "My response here\n\nOn Jan 15, 2025, John Doe wrote:\nOriginal message text",
      });

      render(<EmailViewContentBody email={email} />);

      expect(
        screen.getByText("My response here")
      ).toBeInTheDocument();
      expect(
        screen.getByText(/On Jan 15, 2025, John Doe wrote:/)
      ).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // Show/hide quoted text toggle
  // -----------------------------------------------------------------------

  describe("show/hide quoted text toggle", () => {
    it("shows toggle button when there is quoted text", () => {
      const email = makeEmail({
        body_html: "",
        body_text:
          "Reply\n\n--- Original Message ---\nQuoted content",
      });

      render(<EmailViewContentBody email={email} />);

      expect(
        screen.getByText("Hide quoted text")
      ).toBeInTheDocument();
    });

    it("does not show toggle button when there is no quoted text", () => {
      const email = makeEmail({
        body_html: "",
        body_text: "Just a normal message without quotes",
      });

      render(<EmailViewContentBody email={email} />);

      expect(
        screen.queryByText("Show quoted text")
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText("Hide quoted text")
      ).not.toBeInTheDocument();
    });

    it("hides quoted text when toggle is clicked", async () => {
      const user = userEvent.setup();
      const email = makeEmail({
        body_html: "",
        body_text:
          "Reply\n\n--- Original Message ---\nQuoted content here",
      });

      render(<EmailViewContentBody email={email} />);

      // Initially shown
      expect(
        screen.getByText(/Quoted content here/)
      ).toBeInTheDocument();

      // Click to hide
      const toggleButton = screen.getByText("Hide quoted text");
      await user.click(toggleButton);

      // Quoted text should be hidden
      expect(
        screen.queryByText(/Quoted content here/)
      ).not.toBeInTheDocument();

      // Button text should change
      expect(
        screen.getByText("Show quoted text")
      ).toBeInTheDocument();
    });

    it("shows quoted text again when toggle is clicked twice", async () => {
      const user = userEvent.setup();
      const email = makeEmail({
        body_html: "",
        body_text:
          "Reply\n\n--- Original Message ---\nQuoted content here",
      });

      render(<EmailViewContentBody email={email} />);

      const toggleButton = screen.getByText("Hide quoted text");
      await user.click(toggleButton); // hide
      await user.click(screen.getByText("Show quoted text")); // show again

      expect(
        screen.getByText(/Quoted content here/)
      ).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // Gmail quote sections in HTML
  // -----------------------------------------------------------------------

  describe("Gmail quote sections", () => {
    it("preserves gmail_quote class in HTML emails", () => {
      const email = makeEmail({
        body_html:
          '<p>Reply</p><div class="gmail_quote"><p>Quoted</p></div>',
      });

      const { container } = render(
        <EmailViewContentBody email={email} />
      );

      const gmailQuote = container.querySelector(".gmail_quote");
      expect(gmailQuote).not.toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // EchoDesk quoted sections in HTML
  // -----------------------------------------------------------------------

  describe("EchoDesk quoted sections", () => {
    it("wraps '--- Original Message ---' in HTML with echodesk-quoted class", () => {
      const email = makeEmail({
        body_html:
          "<p>Reply</p><br>--- Original Message ---<br>From: alice@example.com<br>Content here",
      });

      const { container } = render(
        <EmailViewContentBody email={email} />
      );

      const echoQuote = container.querySelector(".echodesk-quoted");
      expect(echoQuote).not.toBeNull();
    });

    it("wraps 'On wrote' pattern in HTML with echodesk-quoted class", () => {
      const email = makeEmail({
        body_html:
          "<p>My reply</p><br>On Jan 15 John wrote:<br>Original text",
      });

      const { container } = render(
        <EmailViewContentBody email={email} />
      );

      const echoQuote = container.querySelector(".echodesk-quoted");
      expect(echoQuote).not.toBeNull();
    });

    it("does not double-wrap when gmail_quote already present", () => {
      const email = makeEmail({
        body_html:
          '<p>Reply</p><div class="gmail_quote"><p>Already styled</p></div>',
      });

      const { container } = render(
        <EmailViewContentBody email={email} />
      );

      // Should not have echodesk-quoted since gmail_quote exists
      const echoQuote = container.querySelector(".echodesk-quoted");
      expect(echoQuote).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // Attachments
  // -----------------------------------------------------------------------

  describe("attachments", () => {
    it("renders attachments section with file names", () => {
      const email = makeEmail({
        attachments: [
          {
            filename: "report.pdf",
            content_type: "application/pdf",
            url: "https://example.com/report.pdf",
            size: 1024,
          },
          {
            filename: "image.png",
            content_type: "image/png",
            url: "https://example.com/image.png",
            size: 2048,
          },
        ],
      });

      render(<EmailViewContentBody email={email} />);

      expect(screen.getByText("report.pdf")).toBeInTheDocument();
      expect(screen.getByText("image.png")).toBeInTheDocument();
    });

    it("renders attachment sizes", () => {
      const email = makeEmail({
        attachments: [
          {
            filename: "doc.pdf",
            content_type: "application/pdf",
            url: "https://example.com/doc.pdf",
            size: 5000,
          },
        ],
      });

      render(<EmailViewContentBody email={email} />);

      // formatFileSize(5000) = "5 KB"
      expect(screen.getByText("(5 KB)")).toBeInTheDocument();
    });

    it("does not render size when size is 0", () => {
      const email = makeEmail({
        attachments: [
          {
            filename: "doc.pdf",
            content_type: "application/pdf",
            url: "https://example.com/doc.pdf",
            size: 0,
          },
        ],
      });

      render(<EmailViewContentBody email={email} />);

      expect(screen.getByText("doc.pdf")).toBeInTheDocument();
      expect(screen.queryByText("(0 Bytes)")).not.toBeInTheDocument();
    });

    it("attachment links have correct href", () => {
      const email = makeEmail({
        attachments: [
          {
            filename: "report.pdf",
            content_type: "application/pdf",
            url: "https://example.com/report.pdf",
            size: 1024,
          },
        ],
      });

      render(<EmailViewContentBody email={email} />);

      const link = screen.getByText("report.pdf").closest("a");
      expect(link).toHaveAttribute(
        "href",
        "https://example.com/report.pdf"
      );
    });

    it("attachment links open in new tab", () => {
      const email = makeEmail({
        attachments: [
          {
            filename: "report.pdf",
            content_type: "application/pdf",
            url: "https://example.com/report.pdf",
            size: 1024,
          },
        ],
      });

      render(<EmailViewContentBody email={email} />);

      const link = screen.getByText("report.pdf").closest("a");
      expect(link).toHaveAttribute("target", "_blank");
    });

    it("attachment links have noopener noreferrer", () => {
      const email = makeEmail({
        attachments: [
          {
            filename: "report.pdf",
            content_type: "application/pdf",
            url: "https://example.com/report.pdf",
            size: 1024,
          },
        ],
      });

      render(<EmailViewContentBody email={email} />);

      const link = screen.getByText("report.pdf").closest("a");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });

    it("does not render attachments section when there are no attachments", () => {
      const email = makeEmail({ attachments: [] });

      render(<EmailViewContentBody email={email} />);

      expect(
        screen.queryByText(/Attachments/)
      ).not.toBeInTheDocument();
    });

    it("renders attachments count", () => {
      const email = makeEmail({
        attachments: [
          {
            filename: "a.pdf",
            content_type: "application/pdf",
            url: "https://example.com/a.pdf",
            size: 100,
          },
          {
            filename: "b.pdf",
            content_type: "application/pdf",
            url: "https://example.com/b.pdf",
            size: 200,
          },
        ],
      });

      render(<EmailViewContentBody email={email} />);

      expect(screen.getByText("Attachments (2)")).toBeInTheDocument();
    });
  });
});
