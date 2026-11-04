/**
 * Tests for the chat sidebar ComposeEmailDialog: the effective signature is
 * inserted into the editable body, user text is HTML-escaped, and the
 * signature_included flag tells the backend not to append another one.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

const mockSend = vi.fn().mockResolvedValue({});
const mockToast = vi.fn();
let mockConnections: Array<Record<string, unknown>> = [];

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("@/hooks/api/useSocial", () => ({
  useSendEmail: () => ({ mutateAsync: mockSend, isPending: false }),
  useEmailStatus: () => ({
    data: { connected: true, connections: mockConnections, connection: null },
  }),
  useEmailSignature: () => ({ data: null }),
}));

import { ComposeEmailDialog } from "@/components/email/ComposeEmailDialog";

async function fillAndSend(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByPlaceholderText("recipientPlaceholder"), "alice@example.com{Enter}");
  await user.type(screen.getByPlaceholderText("subjectPlaceholder"), "Hi");
  await user.type(screen.getByPlaceholderText("messagePlaceholder"), "x <y> & z");
  await user.click(screen.getByRole("button", { name: "send" }));
}

describe("ComposeEmailDialog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("inserts the effective signature and sends signature_included", async () => {
    mockConnections = [
      {
        id: 1,
        email_address: "me@example.com",
        display_name: "Me",
        effective_signature: {
          source: "tenant",
          is_enabled: true,
          include_on_reply: false,
          signature_html: "<p>Team <b>Amanati</b></p>",
          signature_text: "",
        },
      },
    ];
    const user = userEvent.setup();
    render(<ComposeEmailDialog open onOpenChange={vi.fn()} />);

    const sig = await screen.findByTestId("compose-signature");
    expect(sig.innerHTML).toContain("<b>Amanati</b>");

    await fillAndSend(user);
    await waitFor(() => expect(mockSend).toHaveBeenCalled());
    const payload = mockSend.mock.calls[0][0];
    expect(payload.signature_included).toBe(true);
    expect(payload.body_html).toContain("x &lt;y&gt; &amp; z");
    expect(payload.body_html).toContain("<b>Amanati</b>");
    expect(payload.connection_id).toBe(1);
  });

  it("keeps the legacy behaviour when the backend has no effective_signature", async () => {
    mockConnections = [{ id: 1, email_address: "me@example.com", display_name: "Me" }];
    const user = userEvent.setup();
    render(<ComposeEmailDialog open onOpenChange={vi.fn()} />);
    expect(screen.queryByTestId("compose-signature")).not.toBeInTheDocument();

    await fillAndSend(user);
    await waitFor(() => expect(mockSend).toHaveBeenCalled());
    const payload = mockSend.mock.calls[0][0];
    expect(payload.signature_included).toBeUndefined();
    expect(payload.body_html).toBe("<div>x &lt;y&gt; &amp; z</div>");
  });

  it("warns when the server refused some recipients", async () => {
    mockConnections = [{ id: 1, email_address: "me@example.com", display_name: "Me" }];
    mockSend.mockResolvedValueOnce({ status: "success", refused_recipients: ["bad@x.example"], warnings: [] });
    const user = userEvent.setup();
    render(<ComposeEmailDialog open onOpenChange={vi.fn()} />);
    await fillAndSend(user);
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "sentWithProblems", variant: "destructive" })
      )
    );
    expect(mockToast).not.toHaveBeenCalledWith(expect.objectContaining({ title: "sent" }));
  });
});
