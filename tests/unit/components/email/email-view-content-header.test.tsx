/**
 * Tests for EmailViewContentHeader component.
 *
 * The "მიმღები" (To) line always shows the recipient's email address, never the
 * sender-provided display name — that name comes from each sender's own address
 * book, so it's inconsistent across messages (one carries a label, another
 * doesn't). The address is stable. This guards that behavior.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = { to: "To" };
    return translations[key] || key;
  },
}));

import { EmailViewContentHeader } from "@/app/(tenant)/email/_components/email-view-content-header";
import type { EmailMessage } from "@/hooks/api/useSocial";

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

describe("EmailViewContentHeader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the recipient address, NOT the sender-provided display name", () => {
    // The 4136 case: sender's address book labelled us "Amanati Info".
    const email = makeEmail({
      to_emails: [{ name: "Amanati Info", email: "info@amanati.ge" }],
    });

    render(<EmailViewContentHeader email={email} />);

    expect(screen.getByText(/info@amanati\.ge/)).toBeInTheDocument();
    expect(screen.queryByText(/Amanati Info/)).not.toBeInTheDocument();
  });

  it("shows the recipient address when the sender sent no name", () => {
    // The 4138 case: no display name in the To header.
    const email = makeEmail({
      to_emails: [{ name: "", email: "info@amanati.ge" }],
    });

    render(<EmailViewContentHeader email={email} />);

    expect(screen.getByText(/info@amanati\.ge/)).toBeInTheDocument();
  });

  it("joins multiple recipients by address", () => {
    const email = makeEmail({
      to_emails: [
        { name: "Alice", email: "alice@example.com" },
        { email: "bob@example.com" },
      ],
    });

    render(<EmailViewContentHeader email={email} />);

    expect(
      screen.getByText(/alice@example\.com, bob@example\.com/)
    ).toBeInTheDocument();
    expect(screen.queryByText(/Alice/)).not.toBeInTheDocument();
  });

  it("still shows the sender's display name (unchanged)", () => {
    const email = makeEmail({ from_name: "Jane Sender" });

    render(<EmailViewContentHeader email={email} />);

    expect(screen.getByText("Jane Sender")).toBeInTheDocument();
  });
});
