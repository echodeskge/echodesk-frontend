/**
 * Tests for the Drafts folder: EmailDraft rows open in the composer by draft
 * id and delete the draft — they are never treated as EmailMessage ids.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

const mockPush = vi.fn();
const mockDeleteDraft = vi.fn();
const mockEmailAction = vi.fn();

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/hooks/api/useSocial", () => ({
  useDeleteEmailDraft: () => ({ mutate: mockDeleteDraft, isPending: false }),
  useEmailAction: () => ({ mutate: mockEmailAction, isPending: false }),
}));

import { EmailDraftList } from "@/app/(tenant)/email/_components/email-draft-list";
import type { EmailDraft } from "@/hooks/api/useSocial";

const draft = {
  id: 12,
  connection: 1,
  to_emails: [{ email: "dana@example.com" }],
  cc_emails: [],
  bcc_emails: [],
  subject: "Quote for March",
  body_text: "",
  body_html: "",
  attachments: [],
  is_reply_all: false,
  is_forward: false,
  reply_to_message: null,
  reply_to_subject: null,
  created_by: 1,
  created_by_name: "Me",
  created_at: "2026-11-01T10:00:00Z",
  updated_at: "2026-11-01T10:00:00Z",
} as EmailDraft;

describe("EmailDraftList", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows recipients and subject", () => {
    render(<EmailDraftList drafts={[draft]} />);
    expect(screen.getByText("dana@example.com")).toBeInTheDocument();
    expect(screen.getByText("Quote for March")).toBeInTheDocument();
  });

  it("opens the draft in the composer by its draft id", async () => {
    const user = userEvent.setup();
    render(<EmailDraftList drafts={[draft]} />);
    await user.click(screen.getByText("Quote for March"));
    expect(mockPush).toHaveBeenCalledWith("/email/compose?draft=12");
    expect(mockPush).not.toHaveBeenCalledWith(expect.stringMatching(/^\/email\/drafts\/12/));
  });

  it("deletes the draft (not an EmailMessage) after confirmation", async () => {
    const user = userEvent.setup();
    render(<EmailDraftList drafts={[draft]} />);
    await user.click(screen.getByRole("button", { name: "deleteDraft" }));
    expect(mockDeleteDraft).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "delete" }));
    expect(mockDeleteDraft).toHaveBeenCalledWith(12, expect.any(Object));
    expect(mockEmailAction).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
