/**
 * List header bulk actions: failures close the confirm dialog and tell the
 * user (e.g. 403 for delete/restore without send permission).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import type { EmailMessage } from "@/hooks/api/useSocial";

const mutate = vi.fn();
const toast = vi.fn();
const clearSelection = vi.fn();

vi.mock("next-intl", () => ({
  useTranslations: (ns: string) => (key: string) => `${ns}.${key}`,
}));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));
vi.mock("@/hooks/api/useSocial", () => ({
  useEmailAction: () => ({ mutate, isPending: false }),
}));
vi.mock("@/app/(tenant)/email/_hooks/use-email-context", () => ({
  useEmailContext: () => ({
    selectedEmailIds: [1, 2],
    handleToggleSelectAllEmails: vi.fn(),
    handleClearSelection: clearSelection,
  }),
}));

import { EmailListContentHeader } from "@/app/(tenant)/email/_components/email-list-content-header";

const emails = [{ id: 1 }, { id: 2 }] as EmailMessage[];

describe("EmailListContentHeader bulk actions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("closes the confirm dialog and shows an error when bulk delete fails", async () => {
    mutate.mockImplementation((_v, opts) => opts?.onError?.(new Error("403")));
    const user = userEvent.setup();
    render(<EmailListContentHeader emails={emails} filter="INBOX" />);

    await user.click(screen.getByRole("button", { name: "email.list.emailActions" }));
    await user.click(screen.getByRole("menuitem", { name: "email.list.delete" }));
    fireEvent.click(screen.getByRole("button", { name: "common.delete" }));

    expect(mutate).toHaveBeenCalledWith(
      { message_ids: [1, 2], action: "delete" },
      expect.any(Object)
    );
    expect(toast).toHaveBeenCalledWith({
      title: "email.list.deleteFailed",
      variant: "destructive",
    });
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(clearSelection).not.toHaveBeenCalled();
  });

  it("shows a generic error when bulk restore fails", async () => {
    mutate.mockImplementation((_v, opts) => opts?.onError?.(new Error("403")));
    const user = userEvent.setup();
    render(<EmailListContentHeader emails={emails} filter="Trash" />);

    await user.click(screen.getByRole("button", { name: "email.list.emailActions" }));
    await user.click(screen.getByRole("menuitem", { name: "email.list.restore" }));
    expect(toast).toHaveBeenCalledWith({
      title: "email.view.actionFailed",
      variant: "destructive",
    });
  });
});
