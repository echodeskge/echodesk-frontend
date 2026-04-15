/**
 * Tests for EmailListRowDesktop component.
 * Verifies rendering of sender info, subject, dates, star toggle,
 * checkbox selection, navigation, and dropdown actions.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPush = vi.fn();
const mockMutate = vi.fn();
const mockToggleSelectEmail = vi.fn();

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      selectEmail: "Select email",
      starEmail: "Star email",
      unstarEmail: "Unstar email",
      noSubject: "(No subject)",
      moreActions: "More actions",
      markAsRead: "Mark as read",
      markAsUnread: "Mark as unread",
      delete: "Delete",
    };
    return translations[key] || key;
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, back: vi.fn() }),
  useParams: () => ({ filter: "INBOX" }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/email/INBOX",
}));

vi.mock("@/hooks/api/useSocial", () => ({
  useEmailAction: () => ({ mutate: mockMutate, isPending: false }),
}));

vi.mock("@/app/(tenant)/email/_hooks/use-email-context", () => ({
  useEmailContext: () => ({
    handleToggleSelectEmail: mockToggleSelectEmail,
    selectedEmailIds: [],
    currentConnectionId: null,
    isEmailSidebarOpen: false,
    setIsEmailSidebarOpen: vi.fn(),
    setCurrentConnectionId: vi.fn(),
    handleToggleSelectAllEmails: vi.fn(),
    handleClearSelection: vi.fn(),
  }),
}));

import { EmailListRowDesktop } from "@/app/(tenant)/email/_components/email-list-row-desktop";
import type { EmailMessage } from "@/hooks/api/useSocial";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEmailMessage(
  overrides: Partial<EmailMessage> = {}
): EmailMessage {
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
    is_read: false,
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

function renderRow(
  emailOverrides: Partial<EmailMessage> = {},
  props: { filter?: string; isSelected?: boolean } = {}
) {
  const email = makeEmailMessage(emailOverrides);
  // Wrap in a table structure since the component renders <TableRow>
  return {
    ...render(
      <table>
        <tbody>
          <EmailListRowDesktop
            email={email}
            filter={props.filter ?? "INBOX"}
            isSelected={props.isSelected ?? false}
          />
        </tbody>
      </table>
    ),
    email,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("EmailListRowDesktop", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // Rendering
  // -----------------------------------------------------------------------

  describe("rendering", () => {
    it("renders sender name", () => {
      renderRow({ from_name: "Alice Smith" });

      expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    });

    it("renders sender email when no name provided", () => {
      renderRow({ from_name: "", from_email: "alice@example.com" });

      expect(screen.getByText("alice@example.com")).toBeInTheDocument();
    });

    it("renders subject", () => {
      renderRow({ subject: "Important meeting" });

      expect(screen.getByText("Important meeting")).toBeInTheDocument();
    });

    it("shows '(No subject)' for empty subject", () => {
      renderRow({ subject: "" });

      expect(screen.getByText("(No subject)")).toBeInTheDocument();
    });

    it("renders formatted date", () => {
      renderRow({ timestamp: "2025-01-15T10:00:00Z" });

      // formatDate uses date-fns format "PP" which outputs locale-specific date
      const dateCell = screen.getByText(/Jan/);
      expect(dateCell).toBeInTheDocument();
    });

    it("renders sender avatar with initials", () => {
      renderRow({ from_name: "John Doe" });

      expect(screen.getByText("JD")).toBeInTheDocument();
    });

    it("renders initials from email when name is empty", () => {
      renderRow({ from_name: "", from_email: "test@example.com" });

      // getInitials("test@example.com") returns "TE" (first 2 chars of single word)
      expect(screen.getByText("TE")).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // Star icon
  // -----------------------------------------------------------------------

  describe("star icon", () => {
    it("shows star button with 'Star email' label when not starred", () => {
      renderRow({ is_starred: false });

      expect(
        screen.getByLabelText("Star email")
      ).toBeInTheDocument();
    });

    it("shows star button with 'Unstar email' label when starred", () => {
      renderRow({ is_starred: true });

      expect(
        screen.getByLabelText("Unstar email")
      ).toBeInTheDocument();
    });

    it("calls emailAction mutate with star when clicking unstarred email", async () => {
      const user = userEvent.setup();
      const { email } = renderRow({ is_starred: false });

      const starButton = screen.getByLabelText("Star email");
      await user.click(starButton);

      expect(mockMutate).toHaveBeenCalledWith({
        message_ids: [email.id],
        action: "star",
      });
    });

    it("calls emailAction mutate with unstar when clicking starred email", async () => {
      const user = userEvent.setup();
      const { email } = renderRow({ is_starred: true });

      const starButton = screen.getByLabelText("Unstar email");
      await user.click(starButton);

      expect(mockMutate).toHaveBeenCalledWith({
        message_ids: [email.id],
        action: "unstar",
      });
    });
  });

  // -----------------------------------------------------------------------
  // Checkbox selection
  // -----------------------------------------------------------------------

  describe("checkbox selection", () => {
    it("renders checkbox with select email label", () => {
      renderRow();

      expect(
        screen.getByLabelText("Select email")
      ).toBeInTheDocument();
    });

    it("calls handleToggleSelectEmail when checkbox is clicked", async () => {
      const user = userEvent.setup();
      const { email } = renderRow();

      const checkbox = screen.getByLabelText("Select email");
      await user.click(checkbox);

      expect(mockToggleSelectEmail).toHaveBeenCalledWith(email.id);
    });

    it("checkbox click does not trigger row navigation", async () => {
      const user = userEvent.setup();
      renderRow();

      const checkbox = screen.getByLabelText("Select email");
      await user.click(checkbox);

      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // Row click navigation
  // -----------------------------------------------------------------------

  describe("row click navigation", () => {
    it("navigates to email detail on row click", async () => {
      const user = userEvent.setup();
      renderRow({ id: 42 });

      const row = screen.getByRole("row");
      await user.click(row);

      expect(mockPush).toHaveBeenCalledWith("/email/INBOX/42");
    });

    it("marks unread email as read when navigating", async () => {
      const user = userEvent.setup();
      const { email } = renderRow({ is_read: false, id: 7 });

      const row = screen.getByRole("row");
      await user.click(row);

      expect(mockMutate).toHaveBeenCalledWith({
        message_ids: [7],
        action: "mark_read",
      });
    });

    it("does not call mark_read when email is already read", async () => {
      const user = userEvent.setup();
      renderRow({ is_read: true, id: 7 });

      const row = screen.getByRole("row");
      await user.click(row);

      // Should navigate but not call mark_read
      expect(mockPush).toHaveBeenCalled();
      expect(mockMutate).not.toHaveBeenCalled();
    });

    it("encodes filter parameter in URL", async () => {
      const user = userEvent.setup();
      renderRow({ id: 5 }, { filter: "[Gmail]/All Mail" });

      const row = screen.getByRole("row");
      await user.click(row);

      expect(mockPush).toHaveBeenCalledWith(
        "/email/%5BGmail%5D%2FAll%20Mail/5"
      );
    });
  });

  // -----------------------------------------------------------------------
  // Read/unread styling
  // -----------------------------------------------------------------------

  describe("read/unread styling", () => {
    it("applies standalone bg-muted class for read emails", () => {
      renderRow({ is_read: true });

      const row = screen.getByRole("row");
      // Split into individual classes to check for standalone "bg-muted"
      // (not "hover:bg-muted/50" or "data-[state=selected]:bg-muted")
      const classes = row.className.split(/\s+/);
      expect(classes).toContain("bg-muted");
    });

    it("does not apply standalone bg-muted class for unread emails", () => {
      renderRow({ is_read: false });

      const row = screen.getByRole("row");
      const classes = row.className.split(/\s+/);
      expect(classes).not.toContain("bg-muted");
    });
  });

  // -----------------------------------------------------------------------
  // Dropdown menu
  // -----------------------------------------------------------------------

  describe("dropdown menu", () => {
    it("renders more actions button", () => {
      renderRow();

      expect(
        screen.getByLabelText("More actions")
      ).toBeInTheDocument();
    });

    it("shows mark as read option for unread email", async () => {
      const user = userEvent.setup();
      renderRow({ is_read: false });

      const menuButton = screen.getByLabelText("More actions");
      await user.click(menuButton);

      expect(screen.getByText("Mark as read")).toBeInTheDocument();
    });

    it("shows mark as unread option for read email", async () => {
      const user = userEvent.setup();
      renderRow({ is_read: true });

      const menuButton = screen.getByLabelText("More actions");
      await user.click(menuButton);

      expect(screen.getByText("Mark as unread")).toBeInTheDocument();
    });

    it("shows delete option", async () => {
      const user = userEvent.setup();
      renderRow();

      const menuButton = screen.getByLabelText("More actions");
      await user.click(menuButton);

      expect(screen.getByText("Delete")).toBeInTheDocument();
    });

    it("menu button click does not trigger row navigation", async () => {
      const user = userEvent.setup();
      renderRow();

      const menuButton = screen.getByLabelText("More actions");
      await user.click(menuButton);

      expect(mockPush).not.toHaveBeenCalled();
    });
  });
});
