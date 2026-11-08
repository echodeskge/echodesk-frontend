/**
 * Reading-pane toolbar: Delete (confirmed; moves to Trash, permanent in
 * Trash), Restore in Trash, Archive and Move to folder.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { EmailMessage } from "@/hooks/api/useSocial";

const push = vi.fn();
const actionMutate = vi.fn();
const moveMutate = vi.fn();
const toast = vi.fn();
let folderData: Array<{ name: string; display_name: string }> = [];

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
let listOrder: number[] = [];
vi.mock("@/app/(tenant)/email/_hooks/use-email-context", () => ({
  useEmailContext: () => ({ listOrder }),
}));
vi.mock("@/app/(tenant)/email/_components/email-assign-menu", () => ({
  EmailAssignMenu: () => <span data-testid="assign-menu" />,
}));
vi.mock("@/app/(tenant)/email/_components/email-create-ticket-button", () => ({
  EmailCreateTicketButton: () => <span data-testid="create-ticket" />,
}));
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));
vi.mock("@/hooks/api/useSocial", () => ({
  useEmailAction: () => ({ mutate: actionMutate, isPending: false }),
  useMoveEmail: () => ({ mutate: moveMutate, isPending: false }),
  useEmailFolders: () => ({ data: folderData, isLoading: false }),
}));

import { EmailViewContentActions } from "@/app/(tenant)/email/_components/email-view-content-actions";

function email(overrides: Partial<EmailMessage> = {}): EmailMessage {
  return {
    id: 7,
    message_id: "<m7@x>",
    folder: "INBOX",
    is_starred: false,
    connection_id: 1,
    ...overrides,
  } as EmailMessage;
}

describe("EmailViewContentActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listOrder = [];
    folderData = [
      { name: "INBOX", display_name: "INBOX" },
      { name: "INBOX.Archive", display_name: "Archive" },
      { name: "INBOX.Sent", display_name: "Sent" },
      { name: "Projects", display_name: "Projects" },
    ];
  });

  it("confirms before deleting and explains the move to Deleted Items", () => {
    actionMutate.mockImplementation((_v, opts) => opts?.onSuccess?.());
    render(<EmailViewContentActions email={email()} filter="INBOX" />);

    fireEvent.click(screen.getByRole("button", { name: "deleteEmail" }));
    expect(actionMutate).not.toHaveBeenCalled();
    expect(screen.getByText("deleteDialogDescription")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "delete" }));
    expect(actionMutate).toHaveBeenCalledWith(
      { message_ids: [7], action: "delete" },
      expect.any(Object)
    );
    expect(push).toHaveBeenCalledWith("/email/INBOX");
  });

  it("offers Restore and permanent delete in Trash", () => {
    actionMutate.mockImplementation((_v, opts) => opts?.onSuccess?.());
    render(<EmailViewContentActions email={email({ folder: "Trash" })} filter="Trash" />);

    fireEvent.click(screen.getByRole("button", { name: /restore/ }));
    expect(actionMutate).toHaveBeenCalledWith(
      { message_ids: [7], action: "restore" },
      expect.any(Object)
    );

    fireEvent.click(screen.getByRole("button", { name: "deletePermanently" }));
    expect(screen.getByText("permanentDeleteDialogTitle")).toBeInTheDocument();
  });

  it("archives into the canonical Archive DB folder of the owning mailbox", () => {
    render(<EmailViewContentActions email={email()} filter="INBOX" />);
    fireEvent.click(screen.getByRole("button", { name: /archive/ }));
    expect(moveMutate).toHaveBeenCalledWith(
      {
        message_id: "<m7@x>",
        source_folder: "INBOX",
        target_folder: "Archive",
        connection_id: 1,
      },
      expect.any(Object)
    );
  });

  it("targets a custom-named special-use folder by its DB name", async () => {
    const user = userEvent.setup();
    folderData = [
      { name: "INBOX", display_name: "INBOX" },
      // folder_details: Georgian \Junk folder stored under DB name "Junk".
      { name: "Junk", display_name: "უსარგებლო", role: "junk", server_name: "უსარგებლო" } as never,
    ];
    render(<EmailViewContentActions email={email()} filter="INBOX" />);
    await user.click(screen.getByRole("button", { name: /moveTo/ }));
    await user.click(screen.getByRole("menuitem", { name: "junk" }));
    expect(moveMutate).toHaveBeenCalledWith(
      expect.objectContaining({ target_folder: "Junk", connection_id: 1 }),
      expect.any(Object)
    );
  });

  it("hides Archive when the mailbox has no archive folder", () => {
    folderData = [{ name: "INBOX", display_name: "INBOX" }];
    render(<EmailViewContentActions email={email()} filter="INBOX" />);
    expect(screen.queryByRole("button", { name: /^archive$/ })).toBeNull();
  });

  it("moves to a folder picked from the Move to menu", async () => {
    const user = userEvent.setup();
    render(<EmailViewContentActions email={email({ folder: "Sent" })} filter="Sent" />);
    await user.click(screen.getByRole("button", { name: /moveTo/ }));
    // Current folder (Sent) and Drafts are not offered.
    expect(screen.queryByRole("menuitem", { name: "sentItems" })).toBeNull();
    expect(screen.queryByRole("menuitem", { name: "drafts" })).toBeNull();
    await user.click(screen.getByRole("menuitem", { name: "Projects" }));
    expect(moveMutate).toHaveBeenCalledWith(
      {
        message_id: "<m7@x>",
        source_folder: "Sent",
        target_folder: "Projects",
        connection_id: 1,
      },
      expect.any(Object)
    );
  });

  it("shows Move to inbox instead of Archive for an archived message", () => {
    render(<EmailViewContentActions email={email({ folder: "INBOX.Archive" })} filter="INBOX.Archive" />);
    expect(screen.queryByRole("button", { name: /^archive$/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /moveToInbox/ }));
    expect(moveMutate).toHaveBeenCalledWith(
      expect.objectContaining({ source_folder: "INBOX.Archive", target_folder: "INBOX" }),
      expect.any(Object)
    );
  });

  it("opens the newer / older conversation from the list order", () => {
    listOrder = [3, 7, 9];
    render(<EmailViewContentActions email={email()} filter="INBOX" />);
    fireEvent.click(screen.getByRole("button", { name: "newer" }));
    expect(push).toHaveBeenLastCalledWith("/email/INBOX/3");
    fireEvent.click(screen.getByRole("button", { name: "older" }));
    expect(push).toHaveBeenLastCalledWith("/email/INBOX/9");
  });

  it("disables newer / older at the ends of the list", () => {
    listOrder = [7];
    render(<EmailViewContentActions email={email()} filter="INBOX" />);
    expect(screen.getByRole("button", { name: "newer" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "older" })).toBeDisabled();
  });

  it("renders the assign and create-ticket controls", () => {
    render(<EmailViewContentActions email={email()} filter="INBOX" />);
    expect(screen.getByTestId("assign-menu")).toBeInTheDocument();
    expect(screen.getByTestId("create-ticket")).toBeInTheDocument();
  });
});
