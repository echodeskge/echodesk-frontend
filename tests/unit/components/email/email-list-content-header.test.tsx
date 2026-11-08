/**
 * Design list toolbar: select-all, search + Unread toggle, or "N selected"
 * with bulk Mark as read / Archive / Delete. Failures close the confirm
 * dialog and tell the user (e.g. 403 for delete/restore without send permission).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import type { EmailMessage } from "@/hooks/api/useSocial";

const mutate = vi.fn();
const moveMutateAsync = vi.fn();
const toast = vi.fn();
const clearSelection = vi.fn();
const toggleAll = vi.fn();
const push = vi.fn();
let selected: number[] = [1, 2];
let search = "";
let folderData: Array<{ name: string; display_name: string }> = [];

vi.mock("next-intl", () => ({
  useTranslations: (ns: string) => (key: string, params?: Record<string, unknown>) =>
    params ? `${ns}.${key}:${JSON.stringify(params)}` : `${ns}.${key}`,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/email/INBOX",
  useSearchParams: () => new URLSearchParams(search),
}));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));
vi.mock("@/hooks/useDebounce", () => ({ useDebounce: (v: string) => v }));
vi.mock("@/hooks/api/useSocial", () => ({
  useEmailAction: () => ({ mutate, isPending: false }),
  useMoveEmail: () => ({ mutateAsync: moveMutateAsync, isPending: false }),
  useEmailFolders: () => ({ data: folderData, isLoading: false }),
}));
vi.mock("@/app/(tenant)/email/_hooks/use-email-context", () => ({
  useEmailContext: () => ({
    selectedEmailIds: selected,
    handleToggleSelectAllEmails: toggleAll,
    handleClearSelection: clearSelection,
    currentConnectionId: 1,
  }),
}));

import { EmailListContentHeader } from "@/app/(tenant)/email/_components/email-list-content-header";

const emails = [
  { id: 1, message_id: "<1@x>", folder: "INBOX", connection_id: 1 },
  { id: 2, message_id: "<2@x>", folder: "INBOX", connection_id: 1 },
] as EmailMessage[];

describe("EmailListContentHeader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selected = [1, 2];
    search = "";
    folderData = [
      { name: "INBOX", display_name: "INBOX" },
      { name: "INBOX.Archive", display_name: "Archive" },
    ];
  });

  it("closes the confirm dialog and shows an error when bulk delete fails", async () => {
    mutate.mockImplementation((_v, opts) => opts?.onError?.(new Error("403")));
    render(<EmailListContentHeader emails={emails} filter="INBOX" />);

    fireEvent.click(screen.getByRole("button", { name: "email.list.delete" }));
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

  it("shows a generic error when bulk restore fails", () => {
    mutate.mockImplementation((_v, opts) => opts?.onError?.(new Error("403")));
    render(<EmailListContentHeader emails={emails} filter="Trash" />);

    fireEvent.click(screen.getByRole("button", { name: "email.list.restore" }));
    expect(toast).toHaveBeenCalledWith({
      title: "email.view.actionFailed",
      variant: "destructive",
    });
  });

  it("shows the selection count and marks the selection read", () => {
    mutate.mockImplementation((_v, opts) => opts?.onSuccess?.());
    render(<EmailListContentHeader emails={emails} filter="INBOX" />);

    expect(screen.getByText('email.list.selectedCount:{"count":2}')).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "email.list.markAsRead" }));
    expect(mutate).toHaveBeenCalledWith({ message_ids: [1, 2], action: "mark_read" }, expect.any(Object));
    expect(clearSelection).toHaveBeenCalled();
  });

  it("archives the selection into the mailbox's archive folder", async () => {
    moveMutateAsync.mockResolvedValue({});
    render(<EmailListContentHeader emails={emails} filter="INBOX" />);

    fireEvent.click(screen.getByRole("button", { name: "email.view.archive" }));
    await vi.waitFor(() => expect(moveMutateAsync).toHaveBeenCalledTimes(2));
    expect(moveMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ message_id: "<1@x>", source_folder: "INBOX", target_folder: "Archive" })
    );
  });

  it("shows search and the Unread toggle without a selection", async () => {
    selected = [];
    render(<EmailListContentHeader emails={emails} filter="INBOX" />);

    expect(screen.getByRole("searchbox", { name: "email.list.search" })).toBeInTheDocument();
    const toggle = screen.getByRole("button", { name: /email\.list\.unread/ });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    await userEvent.setup().click(toggle);
    expect(push).toHaveBeenCalledWith("/email/INBOX?unread=1");
  });

  it("turns the Unread toggle off again", () => {
    selected = [];
    search = "unread=1";
    render(<EmailListContentHeader emails={emails} filter="INBOX" />);

    const toggle = screen.getByRole("button", { name: /email\.list\.unread/ });
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(toggle);
    expect(push).toHaveBeenCalledWith("/email/INBOX");
  });

  it("select-all reports a partial selection as mixed", () => {
    selected = [1];
    render(<EmailListContentHeader emails={emails} filter="INBOX" />);
    const box = screen.getByRole("checkbox", { name: "email.list.selectAll" });
    expect(box).toHaveAttribute("aria-checked", "mixed");
    fireEvent.click(box);
    expect(toggleAll).toHaveBeenCalledWith([1, 2]);
  });
});
