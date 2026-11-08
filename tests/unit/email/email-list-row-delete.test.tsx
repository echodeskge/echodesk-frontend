/**
 * Row-level delete (trash icon) in the email inbox list.
 * Clicking the trash must not open the email, must ask for confirmation,
 * and must call the shared email action mutation with action "delete".
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { EmailMessage } from "@/hooks/api/useSocial";

const push = vi.fn();
const mutate = vi.fn();
const toast = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, back: vi.fn() }),
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));
vi.mock("@/hooks/api/useSocial", () => ({
  useEmailAction: () => ({ mutate, isPending: false }),
}));
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast }),
}));
vi.mock("@/app/(tenant)/email/_hooks/use-email-context", () => ({
  useEmailContext: () => ({ handleToggleSelectEmail: vi.fn() }),
}));

import { EmailListRow } from "@/app/(tenant)/email/_components/email-list-row";

const email = {
  id: 42,
  from_email: "a@example.com",
  from_name: "Alice",
  subject: "Hello",
  timestamp: "2026-11-01T10:00:00Z",
  is_read: true,
  is_starred: false,
  is_answered: false,
} as unknown as EmailMessage;

function renderRow(filter = "INBOX", overrides: Partial<EmailMessage> = {}) {
  return render(
    <ul>
      <EmailListRow
        email={{ ...email, ...overrides }}
        filter={filter}
        isSelected={false}
      />
    </ul>
  );
}

describe("EmailListRow trash button", () => {
  beforeEach(() => {
    push.mockReset();
    mutate.mockReset();
  });

  it("opens a confirmation dialog without navigating to the email", () => {
    renderRow();
    fireEvent.click(screen.getByRole("button", { name: "deleteEmail" }));

    expect(screen.getByText("deleteDialogTitle")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
    expect(mutate).not.toHaveBeenCalled();
  });

  it("deletes the email with the shared action mutation on confirm", () => {
    mutate.mockImplementation((_vars, opts) => opts?.onSuccess?.());
    renderRow();
    fireEvent.click(screen.getByRole("button", { name: "deleteEmail" }));
    fireEvent.click(screen.getByRole("button", { name: "delete" }));

    expect(mutate).toHaveBeenCalledWith(
      { message_ids: [42], action: "delete" },
      expect.any(Object)
    );
    expect(toast).toHaveBeenCalledWith({ title: "emailDeleted" });
    expect(push).not.toHaveBeenCalled();
  });

  it("does not delete when cancelled", () => {
    renderRow();
    fireEvent.click(screen.getByRole("button", { name: "deleteEmail" }));
    fireEvent.click(screen.getByRole("button", { name: "cancel" }));

    expect(mutate).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("explains the message moves to Deleted Items outside Trash", () => {
    renderRow();
    fireEvent.click(screen.getByRole("button", { name: "deleteEmail" }));
    expect(screen.getByText("deleteDialogDescription")).toBeInTheDocument();
    expect(screen.queryByText("permanentDeleteDialogTitle")).toBeNull();
  });

  it("asks for permanent deletion inside Trash", () => {
    mutate.mockImplementation((_vars, opts) => opts?.onSuccess?.());
    renderRow("Trash", { folder: "Trash" } as Partial<EmailMessage>);
    fireEvent.click(screen.getByRole("button", { name: "deleteEmail" }));

    expect(screen.getByText("permanentDeleteDialogTitle")).toBeInTheDocument();
    expect(screen.getByText("permanentDeleteDialogDescription")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "deletePermanently" }));
    expect(mutate).toHaveBeenCalledWith(
      { message_ids: [42], action: "delete" },
      expect.any(Object)
    );
    expect(toast).toHaveBeenCalledWith({ title: "emailPermanentlyDeleted" });
  });
});
