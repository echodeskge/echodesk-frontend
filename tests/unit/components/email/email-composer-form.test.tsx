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
const mockCreateDraft = vi.fn();
const mockUpdateDraft = vi.fn().mockResolvedValue({});
const mockDeleteDraft = vi.fn();
let mockConnections: Array<Record<string, unknown>> = [];
let mockOriginalEmail: Record<string, unknown> | undefined;
let mockDraft: Record<string, unknown> | undefined;

const DEFAULT_CONNECTIONS = [
  { id: 1, email_address: "me@example.com", display_name: "My Email" },
];

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
      replyAll: "Reply all",
    };
    return translations[key] || key;
  },
  useLocale: () => "en",
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn() }),
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
      connections: mockConnections,
      connection: null,
    },
    isLoading: false,
  }),
  useEmailSignature: () => ({
    data: null,
    isLoading: false,
  }),
  useEmailDraft: (id: number | null) => ({
    data: id !== null ? mockDraft : undefined,
    isError: false,
  }),
  useCreateEmailDraft: () => ({ mutateAsync: mockCreateDraft }),
  useUpdateEmailDraft: () => ({ mutateAsync: mockUpdateDraft }),
  useDeleteEmailDraft: () => ({ mutate: mockDeleteDraft }),
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
    useQuery: vi.fn((opts: { enabled?: boolean }) => ({
      data: opts?.enabled === false ? undefined : mockOriginalEmail,
      isLoading: false,
      error: null,
    })),
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
    mockSearchParams.delete("reply_all");
    mockSearchParams.delete("forward");
    mockSearchParams.delete("draft");
    mockConnections = DEFAULT_CONNECTIONS;
    mockOriginalEmail = undefined;
    mockDraft = undefined;
    mockCreateDraft.mockResolvedValue({ id: 77 });
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

  describe("discard button", () => {
    it("asks for confirmation, then clears the form", async () => {
      const user = userEvent.setup();
      render(<EmailComposerForm />);

      // Add a recipient
      const toInput = screen.getByPlaceholderText("Add recipients...");
      await user.type(toInput, "alice@example.com{Enter}");
      expect(screen.getByText("alice@example.com")).toBeInTheDocument();

      // Type in subject
      const subjectInput = screen.getByPlaceholderText("Subject");
      await user.type(subjectInput, "Test subject");

      await user.click(screen.getByRole("button", { name: "discard" }));

      // Nothing is cleared until the user confirms
      expect(screen.getByText("discardTitle")).toBeInTheDocument();
      expect(screen.getByText("alice@example.com")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "discardConfirm" }));

      // After discarding, recipient badge and subject should be cleared
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

  // -----------------------------------------------------------------------
  // Attachments
  // -----------------------------------------------------------------------

  describe("attachments", () => {
    it("renders the attachment dropzone", () => {
      render(<EmailComposerForm />);

      expect(
        screen.getByText("dragOrClick")
      ).toBeInTheDocument();
    });

    it("includes selected files in the send payload", async () => {
      const user = userEvent.setup();
      const { container } = render(<EmailComposerForm />);

      await user.type(
        screen.getByPlaceholderText("Add recipients..."),
        "alice@example.com{Enter}"
      );
      await user.type(screen.getByPlaceholderText("Subject"), "Hello");
      await user.type(
        screen.getByPlaceholderText("Write your message..."),
        "Body text"
      );

      const fileInput = container.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      expect(fileInput).not.toBeNull();

      const file = new File(["data"], "report.pdf", {
        type: "application/pdf",
      });
      await user.upload(fileInput, file);

      expect(screen.getByText("filesSelected")).toBeInTheDocument();

      await user.click(screen.getByText("Send").closest("button")!);

      await waitFor(() =>
        expect(mockMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({ attachments: [file] })
        )
      );
    });

    it("sends no attachments when none are selected", async () => {
      const user = userEvent.setup();
      render(<EmailComposerForm />);

      await user.type(
        screen.getByPlaceholderText("Add recipients..."),
        "alice@example.com{Enter}"
      );
      await user.type(screen.getByPlaceholderText("Subject"), "Hello");
      await user.type(
        screen.getByPlaceholderText("Write your message..."),
        "Body text"
      );

      await user.click(screen.getByText("Send").closest("button")!);

      await waitFor(() =>
        expect(mockMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({ attachments: undefined })
        )
      );
    });
  });

  // -----------------------------------------------------------------------
  // Outlook-style signature / reply / forward / drafts
  // -----------------------------------------------------------------------

  const TENANT_SIG_CONNECTION = {
    id: 1,
    email_address: "me@example.com",
    display_name: "My Email",
    effective_signature: {
      source: "tenant",
      is_enabled: true,
      include_on_reply: true,
      signature_html: "<p>Best,<br/><b>Amanati</b></p>",
      signature_text: "Best, Amanati",
    },
  };

  const ORIGINAL = {
    id: 42,
    connection_id: 1,
    connection_email: "me@example.com",
    folder: "INBOX",
    from_email: "client@acme.com",
    from_name: "Client",
    reply_to: "support@acme.com",
    to_emails: [{ email: "me@example.com" }, { email: "boss@acme.com" }],
    cc_emails: [{ email: "cc@acme.com" }],
    subject: "Invoice",
    body_html: "<p>Original <b>html</b></p><script>alert(1)</script>",
    body_text: "Original html",
    timestamp: "2026-11-01T10:00:00Z",
    is_from_business: false,
    attachments: [
      { filename: "invoice.pdf", content_type: "application/pdf", url: "/x", size: 2048 },
    ],
  };

  async function fillAndSend(user: ReturnType<typeof userEvent.setup>, text = "Body text") {
    await user.type(screen.getByPlaceholderText("Write your message..."), text);
    await user.click(screen.getByText("Send").closest("button")!);
  }

  describe("signature", () => {
    it("inserts the effective (workspace) signature into the body and sends signature_included", async () => {
      mockConnections = [TENANT_SIG_CONNECTION];
      const user = userEvent.setup();
      render(<EmailComposerForm />);

      const sig = await screen.findByTestId("compose-signature");
      expect(sig.innerHTML).toContain("<b>Amanati</b>");

      await user.type(screen.getByPlaceholderText("Add recipients..."), "alice@example.com{Enter}");
      await user.type(screen.getByPlaceholderText("Subject"), "Hello");
      await fillAndSend(user, "a < b & c");

      await waitFor(() => expect(mockMutateAsync).toHaveBeenCalled());
      const payload = mockMutateAsync.mock.calls[0][0];
      expect(payload.signature_included).toBe(true);
      expect(payload.body_html).toContain("a &lt; b &amp; c");
      expect(payload.body_html).toContain("<b>Amanati</b>");
      expect(payload.body_text).toMatch(/Best,\s+Amanati/);
    });

    it("does not insert a signature or send signature_included on a legacy backend", async () => {
      const user = userEvent.setup();
      render(<EmailComposerForm />);
      expect(screen.queryByTestId("compose-signature")).not.toBeInTheDocument();

      await user.type(screen.getByPlaceholderText("Add recipients..."), "alice@example.com{Enter}");
      await user.type(screen.getByPlaceholderText("Subject"), "Hello");
      await fillAndSend(user);

      await waitFor(() => expect(mockMutateAsync).toHaveBeenCalled());
      expect(mockMutateAsync.mock.calls[0][0].signature_included).toBeUndefined();
    });

    it("can remove the signature before sending", async () => {
      mockConnections = [TENANT_SIG_CONNECTION];
      const user = userEvent.setup();
      render(<EmailComposerForm />);
      await screen.findByTestId("compose-signature");
      await user.click(screen.getByRole("button", { name: "removeSignature" }));
      expect(screen.queryByTestId("compose-signature")).not.toBeInTheDocument();

      await user.type(screen.getByPlaceholderText("Add recipients..."), "alice@example.com{Enter}");
      await user.type(screen.getByPlaceholderText("Subject"), "Hello");
      await fillAndSend(user);
      await waitFor(() => expect(mockMutateAsync).toHaveBeenCalled());
      const payload = mockMutateAsync.mock.calls[0][0];
      expect(payload.signature_included).toBe(true);
      expect(payload.body_html).not.toContain("Amanati");
    });
  });

  describe("reply / reply all / forward", () => {
    it("replies to Reply-To, quotes the original below the signature and stays on the conversation", async () => {
      mockConnections = [TENANT_SIG_CONNECTION];
      mockOriginalEmail = ORIGINAL;
      mockSearchParams.set("reply_to", "42");
      const user = userEvent.setup();
      render(<EmailComposerForm />);

      expect(await screen.findByText("support@acme.com")).toBeInTheDocument();
      expect(screen.queryByText("boss@acme.com")).not.toBeInTheDocument();
      expect(screen.getByPlaceholderText("Subject")).toHaveValue("Re: Invoice");
      // The untrusted original is shown in a sandboxed iframe, not the app DOM.
      const quote = screen.getByTestId("compose-quote");
      const frame = quote.querySelector("iframe")!;
      expect(frame).not.toBeNull();
      expect(frame.getAttribute("sandbox")).not.toContain("allow-scripts");
      expect(quote.querySelector("b")).toBeNull();
      const doc = frame.getAttribute("srcdoc") || "";
      expect(doc).toContain("<b>html</b>");
      expect(doc).not.toContain("<script>");

      await fillAndSend(user, "Thanks");
      await waitFor(() => expect(mockMutateAsync).toHaveBeenCalled());
      const payload = mockMutateAsync.mock.calls[0][0];
      expect(payload.reply_to_message_id).toBe(42);
      expect(payload.forward_message_id).toBeUndefined();
      const html: string = payload.body_html;
      expect(html.indexOf("Amanati")).toBeGreaterThan(html.indexOf("Thanks"));
      expect(html.indexOf("data-echodesk-quote")).toBeGreaterThan(html.indexOf("Amanati"));
      await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/email/INBOX/42"));
    });

    it("blocks remote images of the quoted original in the preview", async () => {
      mockOriginalEmail = {
        ...ORIGINAL,
        body_html:
          '<p>Hi</p><img src="https://tracker.example/pixel.gif">' +
          '<a style="position:fixed;inset:0;z-index:9999" href="https://evil.example">x</a>',
      };
      mockSearchParams.set("reply_to", "42");
      render(<EmailComposerForm />);
      const quote = await screen.findByTestId("compose-quote");
      expect(quote.querySelector("img")).toBeNull();
      expect(quote.querySelector("a")).toBeNull();
      const doc = quote.querySelector("iframe")!.getAttribute("srcdoc") || "";
      const parsed = new DOMParser().parseFromString(doc, "text/html");
      expect(parsed.querySelector("img")?.getAttribute("src")).toBeFalsy();
      expect(doc).toContain("Content-Security-Policy");
    });

    it("reply all addresses everyone except our own mailbox", async () => {
      mockOriginalEmail = ORIGINAL;
      mockSearchParams.set("reply_all", "42");
      render(<EmailComposerForm />);

      expect(await screen.findByText("support@acme.com")).toBeInTheDocument();
      expect(screen.getByText("boss@acme.com")).toBeInTheDocument();
      expect(screen.getByText("cc@acme.com")).toBeInTheDocument();
      expect(screen.queryByText("me@example.com")).not.toBeInTheDocument();
    });

    it("forward sends forward_message_id and lists the original attachments", async () => {
      mockOriginalEmail = ORIGINAL;
      mockSearchParams.set("forward", "42");
      const user = userEvent.setup();
      render(<EmailComposerForm />);

      expect(await screen.findByText("invoice.pdf")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Subject")).toHaveValue("Fwd: Invoice");

      await user.type(screen.getByPlaceholderText("Add recipients..."), "bob@example.com{Enter}");
      await user.click(screen.getByText("Send").closest("button")!);
      await waitFor(() => expect(mockMutateAsync).toHaveBeenCalled());
      const payload = mockMutateAsync.mock.calls[0][0];
      expect(payload.forward_message_id).toBe(42);
      expect(payload.reply_to_message_id).toBeUndefined();
    });
  });

  describe("drafts", () => {
    it("autosaves (create, then patch) and sends draft_id", async () => {
      const user = userEvent.setup();
      render(<EmailComposerForm />);

      await user.type(screen.getByPlaceholderText("Subject"), "Draft subject");
      await waitFor(() => expect(mockCreateDraft).toHaveBeenCalledTimes(1), { timeout: 4000 });
      expect(mockCreateDraft.mock.calls[0][0]).toMatchObject({
        subject: "Draft subject",
        connection: 1,
        is_forward: false,
      });

      await user.type(screen.getByPlaceholderText("Add recipients..."), "alice@example.com{Enter}");
      await waitFor(() => expect(mockUpdateDraft).toHaveBeenCalled(), { timeout: 4000 });
      expect(mockUpdateDraft.mock.calls[0][0].id).toBe(77);
      expect(mockCreateDraft).toHaveBeenCalledTimes(1);

      await fillAndSend(user);
      await waitFor(() => expect(mockMutateAsync).toHaveBeenCalled());
      expect(mockMutateAsync.mock.calls[0][0].draft_id).toBe(77);
    }, 15000);

    it("opens an EmailDraft into the composer", async () => {
      mockSearchParams.set("draft", "5");
      mockDraft = {
        id: 5,
        connection: 1,
        to_emails: [{ email: "dana@example.com" }],
        cc_emails: [],
        bcc_emails: [],
        subject: "Saved subject",
        body_text: "Saved body",
        body_html: "<div>Saved body</div>",
        reply_to_message: null,
        is_forward: false,
        is_reply_all: false,
      };
      const user = userEvent.setup();
      render(<EmailComposerForm />);

      expect(await screen.findByText("dana@example.com")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Subject")).toHaveValue("Saved subject");
      expect(screen.getByPlaceholderText("Write your message...")).toHaveValue("Saved body");

      await user.click(screen.getByText("Send").closest("button")!);
      await waitFor(() => expect(mockMutateAsync).toHaveBeenCalled());
      expect(mockMutateAsync.mock.calls[0][0].draft_id).toBe(5);
    });

    it("does not re-insert a signature the user removed before the draft was saved", async () => {
      mockConnections = [TENANT_SIG_CONNECTION];
      mockSearchParams.set("draft", "6");
      mockDraft = {
        id: 6,
        connection: 1,
        to_emails: [{ email: "dana@example.com" }],
        cc_emails: [],
        bcc_emails: [],
        subject: "No sig",
        body_text: "Body",
        body_html: '<div>Body</div><div data-echodesk-signature="none"></div>',
        reply_to_message: null,
        is_forward: false,
        is_reply_all: false,
      };
      render(<EmailComposerForm />);
      expect(await screen.findByText("dana@example.com")).toBeInTheDocument();
      expect(screen.queryByTestId("compose-signature")).not.toBeInTheDocument();
    });

    it("still gives a mobile draft without any signature block the mailbox signature", async () => {
      mockConnections = [TENANT_SIG_CONNECTION];
      mockSearchParams.set("draft", "7");
      mockDraft = {
        id: 7,
        connection: 1,
        to_emails: [{ email: "dana@example.com" }],
        cc_emails: [],
        bcc_emails: [],
        subject: "Mobile",
        body_text: "Body",
        body_html: "<div>Body</div>",
        reply_to_message: null,
        is_forward: false,
        is_reply_all: false,
      };
      render(<EmailComposerForm />);
      expect(await screen.findByTestId("compose-signature")).toBeInTheDocument();
    });

    it("saves an explicit no-signature marker after the signature is removed", async () => {
      mockConnections = [TENANT_SIG_CONNECTION];
      const user = userEvent.setup();
      render(<EmailComposerForm />);
      await screen.findByTestId("compose-signature");
      await user.click(screen.getByRole("button", { name: "removeSignature" }));
      await user.type(screen.getByPlaceholderText("Subject"), "Draft subject");
      await waitFor(() => expect(mockCreateDraft).toHaveBeenCalled(), { timeout: 4000 });
      const saved = mockCreateDraft.mock.calls.at(-1)![0];
      expect(saved.body_html).toContain('data-echodesk-signature="none"');
      expect(saved.body_html).not.toContain("Amanati");
    }, 10000);

    it("discarding a saved draft deletes it", async () => {
      mockSearchParams.set("draft", "5");
      mockDraft = {
        id: 5,
        connection: 1,
        to_emails: ["dana@example.com"],
        cc_emails: [],
        bcc_emails: [],
        subject: "Saved subject",
        body_text: "Saved body",
        body_html: "",
        reply_to_message: null,
        is_forward: false,
        is_reply_all: false,
      };
      const user = userEvent.setup();
      render(<EmailComposerForm />);
      await screen.findByText("dana@example.com");

      await user.click(screen.getByRole("button", { name: "discard" }));
      await user.click(screen.getByRole("button", { name: "discardConfirm" }));
      expect(mockDeleteDraft).toHaveBeenCalledWith(5);
    });
  });

  describe("send result", () => {
    async function compose(user: ReturnType<typeof userEvent.setup>) {
      await user.type(screen.getByPlaceholderText("Add recipients..."), "alice@example.com{Enter}");
      await user.type(screen.getByPlaceholderText("Subject"), "Hello");
      await fillAndSend(user);
    }

    it("warns about refused recipients and warnings of a partial send", async () => {
      mockMutateAsync.mockResolvedValueOnce({
        status: "success",
        refused_recipients: ["bad@nowhere.example"],
        warnings: ["The email was sent but could not be saved to the Sent folder in EchoDesk."],
      });
      const user = userEvent.setup();
      render(<EmailComposerForm />);
      await compose(user);
      await waitFor(() =>
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({ title: "sentWithProblems", variant: "destructive" })
        )
      );
      const { description } = mockToast.mock.calls.at(-1)![0];
      expect(description).toContain("refusedRecipients");
      expect(description).toContain("could not be saved");
      expect(mockToast).not.toHaveBeenCalledWith(expect.objectContaining({ title: "Email sent" }));
    });

    it("shows the backend's error details when sending fails", async () => {
      mockMutateAsync.mockRejectedValueOnce({
        response: {
          status: 502,
          data: { error: "The mail server rejected the message.", details: "552 Message too large" },
        },
      });
      const user = userEvent.setup();
      render(<EmailComposerForm />);
      await compose(user);
      await waitFor(() =>
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Send failed",
            description: expect.stringContaining("552 Message too large"),
          })
        )
      );
    });
  });
});
