/**
 * Tests for EmailSidebarList component.
 * Verifies folder sorting, namespace filtering, display name cleaning,
 * virtual folders, active highlighting, and loading state.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockRouterPush = vi.fn();
const mockFilter = { current: "INBOX" };

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      inbox: "Inbox",
      starred: "Starred",
      drafts: "Drafts",
      views: "Views",
      assignedToMe: "Assigned to me",
      unassigned: "Unassigned",
      ticketed: "Ticketed",
      sentItems: "Sent Items",
      deletedItems: "Deleted Items",
      junk: "Junk Email",
      archive: "Archive",
    };
    return translations[key] || key;
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush, back: vi.fn() }),
  useParams: () => ({ filter: mockFilter.current }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => `/email/${mockFilter.current}`,
}));

vi.mock("@/app/(tenant)/email/_hooks/use-email-context", () => ({
  useEmailContext: () => ({
    currentConnectionId: null,
    selectedEmailIds: [],
    isEmailSidebarOpen: false,
    setIsEmailSidebarOpen: vi.fn(),
    setCurrentConnectionId: vi.fn(),
    handleToggleSelectEmail: vi.fn(),
    handleToggleSelectAllEmails: vi.fn(),
    handleClearSelection: vi.fn(),
    lastFilter: "INBOX",
  }),
}));

const mockUseEmailFolders = vi.fn();
const mockUseEmailMessages = vi.fn();

vi.mock("@/hooks/api/useSocial", () => ({
  useEmailFolders: (...args: unknown[]) => mockUseEmailFolders(...args),
  useEmailMessages: (...args: unknown[]) => mockUseEmailMessages(...args),
}));

// Mock DynamicIcon used by EmailSidebarItem
vi.mock("@/components/dynamic-icon", () => ({
  DynamicIcon: ({ name, className }: { name: string; className?: string }) =>
    React.createElement("span", { "data-testid": `icon-${name}`, className }, name),
}));

import { EmailSidebarList } from "@/app/(tenant)/email/_components/email-sidebar-list";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setupFolders(
  folders: Array<{
    name: string;
    display_name: string;
    role?: string;
    unread_count?: number;
  }> | null,
  isLoading = false
) {
  mockUseEmailFolders.mockReturnValue({
    data: folders,
    isLoading,
  });
}

function setupMessages(
  results: Array<{ folder: string }> | null,
  isLoading = false
) {
  mockUseEmailMessages.mockReturnValue({
    data: results ? { results, count: results.length } : null,
    isLoading,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("EmailSidebarList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFilter.current = "INBOX";
    setupMessages([], false);
  });

  // -----------------------------------------------------------------------
  // Loading state
  // -----------------------------------------------------------------------

  describe("loading state", () => {
    it("shows loading skeletons while folders are loading", () => {
      setupFolders(null, true);

      const { container } = render(<EmailSidebarList />);

      const skeletons = container.querySelectorAll(".animate-pulse");
      expect(skeletons.length).toBe(6);
    });
  });

  // -----------------------------------------------------------------------
  // Folder sorting
  // -----------------------------------------------------------------------

  describe("folder sorting", () => {
    it("sorts INBOX first regardless of alphabetical order", () => {
      setupFolders([
        { name: "Archive", display_name: "Archive" },
        { name: "Sent", display_name: "Sent" },
        { name: "INBOX", display_name: "INBOX" },
        { name: "Trash", display_name: "Trash" },
      ]);

      render(<EmailSidebarList />);

      const buttons = screen.getAllByRole("button");
      // First real folder button should be Inbox (INBOX display name)
      expect(buttons[0].textContent).toContain("Inbox");
    });
  });

  describe("Outlook order and roles", () => {
    it("orders Inbox, Drafts, Sent Items, Deleted Items, Junk, Archive, then custom", () => {
      setupFolders([
        { name: "Zeta", display_name: "Zeta" },
        { name: "INBOX.Archive", display_name: "Archive" },
        { name: "INBOX.Trash", display_name: "Trash" },
        { name: "Alpha", display_name: "Alpha" },
        { name: "INBOX.spam", display_name: "spam" },
        { name: "INBOX.Sent", display_name: "Sent" },
        { name: "INBOX.Drafts", display_name: "Drafts" },
        { name: "INBOX", display_name: "INBOX" },
      ]);

      render(<EmailSidebarList />);

      const labels = screen
        .getAllByRole("button")
        .map((b) => b.querySelector("span.capitalize")?.textContent);
      expect(labels.slice(0, 8)).toEqual([
        "Inbox",
        "Drafts",
        "Sent Items",
        "Deleted Items",
        "Junk Email",
        "Archive",
        "Alpha",
        "Zeta",
      ]);
    });

    it("routes role folders to their canonical DB names (Sent, Trash, drafts)", async () => {
      setupFolders([
        { name: "INBOX", display_name: "INBOX" },
        { name: "INBOX.Sent", display_name: "Sent" },
        { name: "Deleted Items", display_name: "Deleted Items" },
      ]);
      render(<EmailSidebarList />);

      screen.getByText("Sent Items").closest("button")!.click();
      expect(mockRouterPush).toHaveBeenLastCalledWith("/email/Sent");
      screen.getByText("Deleted Items").closest("button")!.click();
      expect(mockRouterPush).toHaveBeenLastCalledWith("/email/Trash");
      screen.getByText("Drafts").closest("button")!.click();
      expect(mockRouterPush).toHaveBeenLastCalledWith("/email/drafts");
    });

    it("always shows Trash and Junk even when the server lists neither", () => {
      setupFolders([{ name: "INBOX", display_name: "INBOX" }]);
      render(<EmailSidebarList />);
      expect(screen.getByText("Deleted Items")).toBeInTheDocument();
      expect(screen.getByText("Junk Email")).toBeInTheDocument();
    });

    it("shows unread_count badges from the folders endpoint", () => {
      setupFolders([
        { name: "INBOX", display_name: "INBOX", role: "inbox", unread_count: 7 },
        { name: "Sent", display_name: "Sent", role: "sent", unread_count: 3 },
        { name: "Projects", display_name: "Projects", role: "custom", unread_count: 2 },
      ]);
      render(<EmailSidebarList />);
      const byLabel = (label: string) =>
        screen
          .getAllByRole("button")
          .find((b) => b.querySelector("span.capitalize")?.textContent === label)!;
      const inbox = byLabel("Inbox");
      expect(inbox.textContent).toContain("7");
      const projects = byLabel("Projects");
      expect(projects.textContent).toContain("2");
      // No unread badge on Sent Items (Outlook).
      const sent = byLabel("Sent Items");
      expect(sent.textContent).not.toMatch(/\d/);
    });
  });

  // -----------------------------------------------------------------------
  // Namespace filtering
  // -----------------------------------------------------------------------

  describe("namespace filtering", () => {
    it("filters out namespace-only folders when children exist", () => {
      setupFolders([
        { name: "INBOX", display_name: "INBOX" },
        { name: "[Gmail]", display_name: "[Gmail]" },
        { name: "[Gmail]/Sent Mail", display_name: "Sent Mail" },
        { name: "[Gmail]/Trash", display_name: "Trash" },
      ]);

      render(<EmailSidebarList />);

      // [Gmail] should be filtered out since [Gmail]/Sent Mail exists
      const allButtons = screen.getAllByRole("button");
      const texts = allButtons.map((btn) => btn.textContent);
      expect(texts.some((t) => t === "[Gmail]")).toBe(false);
    });

    it("keeps folders that are not pure namespaces", () => {
      setupFolders([
        { name: "INBOX", display_name: "INBOX" },
        { name: "[Gmail]/Sent Mail", display_name: "Sent Mail" },
        { name: "[Gmail]/Trash", display_name: "Trash" },
      ]);

      render(<EmailSidebarList />);

      const allButtons = screen.getAllByRole("button");
      const texts = allButtons.map((btn) => btn.textContent);

      // [Gmail]/Sent Mail is the Sent role → shown as Outlook's "Sent Items"
      expect(texts.some((t) => t?.includes("Sent Items"))).toBe(true);
      expect(texts.some((t) => t?.includes("Deleted Items"))).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // Display name cleaning
  // -----------------------------------------------------------------------

  describe("display name cleaning", () => {
    it("displays 'Inbox' for INBOX folder", () => {
      setupFolders([{ name: "INBOX", display_name: "INBOX" }]);

      render(<EmailSidebarList />);

      const buttons = screen.getAllByRole("button");
      expect(buttons[0].textContent).toContain("Inbox");
    });

    it("strips [Gmail]/ prefix from folder names", () => {
      setupFolders([
        { name: "INBOX", display_name: "INBOX" },
        { name: "[Gmail]/Sent Mail", display_name: "Sent Mail" },
      ]);

      render(<EmailSidebarList />);

      const allButtons = screen.getAllByRole("button");
      const texts = allButtons.map((btn) => btn.textContent);
      expect(texts.some((t) => t?.includes("Sent Items"))).toBe(true);
      expect(texts.some((t) => t?.includes("[Gmail]"))).toBe(false);
    });

    it("strips INBOX/ prefix from subfolder names", () => {
      setupFolders([
        { name: "INBOX", display_name: "INBOX" },
        { name: "INBOX/Customers", display_name: "INBOX/Customers" },
      ]);

      render(<EmailSidebarList />);

      const allButtons = screen.getAllByRole("button");
      const texts = allButtons.map((btn) => btn.textContent);
      expect(texts.some((t) => t?.includes("Customers"))).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // Virtual folders
  // -----------------------------------------------------------------------

  describe("virtual folders", () => {
    it("always shows Starred virtual folder", () => {
      setupFolders([{ name: "INBOX", display_name: "INBOX" }]);

      render(<EmailSidebarList />);

      expect(screen.getByText("Starred")).toBeInTheDocument();
    });

    it("always shows Drafts virtual folder", () => {
      setupFolders([{ name: "INBOX", display_name: "INBOX" }]);

      render(<EmailSidebarList />);

      expect(screen.getByText("Drafts")).toBeInTheDocument();
    });

    it("shows the Views section with the conversation views", () => {
      setupFolders([{ name: "INBOX", display_name: "INBOX" }]);

      render(<EmailSidebarList />);

      expect(screen.getByText("Views")).toBeInTheDocument();
      expect(screen.getByText("Assigned to me")).toBeInTheDocument();
      expect(screen.getByText("Unassigned")).toBeInTheDocument();
      expect(screen.getByText("Ticketed")).toBeInTheDocument();
    });

    it("opens a view route when a view is clicked", () => {
      setupFolders([{ name: "INBOX", display_name: "INBOX" }]);

      render(<EmailSidebarList />);

      screen.getByText("Assigned to me").closest("button")!.click();
      expect(mockRouterPush).toHaveBeenCalledWith("/email/assigned");
    });
  });

  // -----------------------------------------------------------------------
  // Active folder highlighting
  // -----------------------------------------------------------------------

  describe("active folder highlighting", () => {
    it("marks INBOX as active when filter is INBOX", () => {
      mockFilter.current = "INBOX";
      setupFolders([
        { name: "INBOX", display_name: "INBOX" },
        { name: "Sent", display_name: "Sent" },
      ]);

      render(<EmailSidebarList />);

      const inboxButton = screen.getAllByRole("button").find((btn) =>
        btn.textContent?.includes("Inbox")
      );
      expect(inboxButton).toBeDefined();
      expect(inboxButton).toHaveAttribute("aria-current", "true");
    });

    it("does not mark non-active folders with primary color", () => {
      mockFilter.current = "INBOX";
      setupFolders([
        { name: "INBOX", display_name: "INBOX" },
        { name: "Sent", display_name: "Sent" },
      ]);

      render(<EmailSidebarList />);

      const sentButton = screen.getAllByRole("button").find((btn) =>
        btn.textContent?.includes("Sent")
      );
      expect(sentButton).toBeDefined();
      expect(sentButton).not.toHaveAttribute("aria-current");
    });

    it("marks starred as active when filter is starred", () => {
      mockFilter.current = "starred";
      setupFolders([{ name: "INBOX", display_name: "INBOX" }]);

      render(<EmailSidebarList />);

      const starredButton = screen.getAllByRole("button").find((btn) =>
        btn.textContent?.includes("Starred")
      );
      expect(starredButton).toBeDefined();
      expect(starredButton).toHaveAttribute("aria-current", "true");
    });
  });

  // -----------------------------------------------------------------------
  // Email data folder merging
  // -----------------------------------------------------------------------

  describe("email data folder merging", () => {
    it("adds folders from email data that are not in IMAP folders", () => {
      setupFolders([{ name: "INBOX", display_name: "INBOX" }]);
      setupMessages([
        { folder: "CustomFolder" },
        { folder: "CustomFolder" }, // duplicate should be deduped
      ]);

      render(<EmailSidebarList />);

      const allButtons = screen.getAllByRole("button");
      const texts = allButtons.map((btn) => btn.textContent);
      expect(texts.some((t) => t?.includes("CustomFolder"))).toBe(true);
    });

    it("does not duplicate folders already in IMAP list", () => {
      setupFolders([
        { name: "INBOX", display_name: "INBOX" },
        { name: "Sent", display_name: "Sent" },
      ]);
      setupMessages([{ folder: "Sent" }]);

      render(<EmailSidebarList />);

      const allButtons = screen.getAllByRole("button");
      const sentCount = allButtons.filter((btn) =>
        btn.textContent?.includes("Sent")
      ).length;
      // Only one Sent entry
      expect(sentCount).toBe(1);
    });
  });

  // -----------------------------------------------------------------------
  // Empty folders
  // -----------------------------------------------------------------------

  describe("empty folders", () => {
    it("still renders virtual folders when no IMAP folders exist", () => {
      setupFolders([]);

      render(<EmailSidebarList />);

      expect(screen.getByText("Starred")).toBeInTheDocument();
      expect(screen.getByText("Drafts")).toBeInTheDocument();
    });
  });
});
