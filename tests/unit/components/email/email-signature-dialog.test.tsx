/**
 * Tests for the per-mailbox Signature dialog in EmailConnection: it shows the
 * EFFECTIVE signature (the workspace default when the mailbox inherits it),
 * saves onto the connection, and exposes the workspace default editor.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

const mockUpdateConnection = vi.fn().mockResolvedValue({});
let mockConnections: Array<Record<string, unknown>> = [];

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/components/email/EmailUserAssignmentDialog", () => ({
  EmailUserAssignmentDialog: () => null,
}));

vi.mock("@/hooks/api/useSocial", () => {
  const mutation = () => ({ mutateAsync: vi.fn(), mutate: vi.fn(), isPending: false });
  return {
  useEmailStatus: () => ({
    data: { connected: true, connections: mockConnections, connection: null },
    isLoading: false,
    refetch: vi.fn(),
  }),
  useConnectEmail: mutation,
  useDisconnectEmail: mutation,
  useSyncEmail: mutation,
  useReactivateEmailConnection: mutation,
  useUpdateEmailConnection: () => ({
    mutateAsync: mockUpdateConnection,
    isPending: false,
  }),
  useEmailSignature: () => ({
    data: {
      id: 1,
      sender_name: "Amanati",
      signature_html: "<p>Workspace sig</p>",
      signature_text: "Workspace sig",
      is_enabled: true,
      include_on_reply: true,
    },
    isLoading: false,
  }),
  useUpdateEmailSignature: mutation,
  };
});

import { EmailConnection } from "@/components/EmailConnection";

const baseConnection = {
  id: 7,
  email_address: "info@amanati.ge",
  display_name: "Info",
  imap_server: "mail.amanati.ge",
  imap_port: 993,
  imap_use_ssl: true,
  smtp_server: "mail.amanati.ge",
  smtp_port: 587,
  smtp_use_tls: true,
  smtp_use_ssl: false,
  username: "info@amanati.ge",
  is_active: true,
  last_sync_at: null,
  last_sync_error: "",
  auto_disabled_at: null,
  sync_folder: "INBOX",
  sync_days_back: 30,
  connected_at: "2026-01-01T00:00:00Z",
  signature_enabled: false,
  signature_html: "",
  signature_text: "",
  assigned_users: [],
};

async function openSignatureDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /^signature/ }));
  return screen.findByRole("dialog");
}

describe("EmailConnection signature dialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prefills the inherited workspace signature with a note, and saving stores it on the mailbox", async () => {
    mockConnections = [
      {
        ...baseConnection,
        effective_signature: {
          source: "tenant",
          is_enabled: true,
          include_on_reply: true,
          signature_html: "<p>Workspace sig</p>",
          signature_text: "Workspace sig",
        },
      },
    ];
    const user = userEvent.setup();
    render(<EmailConnection />);

    expect(screen.getByTestId("signature-indicator")).toBeInTheDocument();

    const dialog = await openSignatureDialog(user);
    expect(within(dialog).getByTestId("signature-inherited-note")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("htmlLabel")).toHaveValue("<p>Workspace sig</p>");
    expect(within(dialog).getByLabelText("textLabel")).toHaveValue("Workspace sig");

    await user.click(within(dialog).getByRole("button", { name: "saveForMailbox" }));
    await waitFor(() =>
      expect(mockUpdateConnection).toHaveBeenCalledWith({
        connection_id: 7,
        signature_enabled: true,
        signature_html: "<p>Workspace sig</p>",
        signature_text: "Workspace sig",
      })
    );
  });

  it("lets a mailbox with its own signature go back to the workspace default", async () => {
    mockConnections = [
      {
        ...baseConnection,
        signature_enabled: true,
        signature_html: "<b>Own</b>",
        effective_signature: {
          source: "connection",
          is_enabled: true,
          include_on_reply: true,
          signature_html: "<b>Own</b>",
          signature_text: "",
        },
      },
    ];
    const user = userEvent.setup();
    render(<EmailConnection />);

    const dialog = await openSignatureDialog(user);
    expect(within(dialog).queryByTestId("signature-inherited-note")).not.toBeInTheDocument();
    expect(within(dialog).getByLabelText("htmlLabel")).toHaveValue("<b>Own</b>");

    await user.click(within(dialog).getByRole("button", { name: "useWorkspace" }));
    await waitFor(() =>
      expect(mockUpdateConnection).toHaveBeenCalledWith({
        connection_id: 7,
        signature_enabled: false,
      })
    );
  });

  it("hides the indicator when no signature applies", () => {
    mockConnections = [
      {
        ...baseConnection,
        effective_signature: {
          source: "none",
          is_enabled: false,
          include_on_reply: false,
          signature_html: "",
          signature_text: "",
        },
      },
    ];
    render(<EmailConnection />);
    expect(screen.queryByTestId("signature-indicator")).not.toBeInTheDocument();
  });

  it("exposes the workspace default signature editor in a tab", async () => {
    mockConnections = [{ ...baseConnection }];
    const user = userEvent.setup();
    render(<EmailConnection />);

    const dialog = await openSignatureDialog(user);
    await user.click(within(dialog).getByRole("tab", { name: "tabWorkspace" }));
    expect(await within(dialog).findByText("wsTitle")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("wsIncludeOnReply")).toBeInTheDocument();
  });
});
