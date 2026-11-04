/**
 * useEmailFolders reads C5 `folder_details` (DB name, role, counts) and
 * falls back to the plain `folders` names on an older backend.
 */
import { describe, it, expect, vi } from "vitest";

vi.mock("@/api/axios", () => ({ default: { get: vi.fn(), post: vi.fn() } }));

import { folderEntriesOf } from "@/hooks/api/useSocial";
import { buildSidebarFolders } from "@/lib/email-reading";

describe("folderEntriesOf", () => {
  it("prefers folder_details and keeps the server name for display", () => {
    const entries = folderEntriesOf({
      folders: ["INBOX", "INBOX.Archive"],
      folder_details: [
        { name: "INBOX", display_name: "INBOX", raw_name: "INBOX", role: "inbox", unread_count: 2, total_count: 5 },
        { name: "Archive", display_name: "INBOX.Archive", raw_name: "INBOX.Archive", role: "archive", unread_count: 0, total_count: 1 },
      ],
    });
    expect(entries).toEqual([
      { name: "INBOX", display_name: "INBOX", server_name: "INBOX", role: "inbox", unread_count: 2, total_count: 5 },
      { name: "Archive", display_name: "INBOX.Archive", server_name: "INBOX.Archive", role: "archive", unread_count: 0, total_count: 1 },
    ]);
    const sidebar = buildSidebarFolders(entries);
    expect(sidebar.find((f) => f.role === "inbox")?.unreadCount).toBe(2);
    expect(sidebar.find((f) => f.role === "archive")).toMatchObject({
      name: "Archive",
      serverName: "INBOX.Archive",
    });
  });

  it("falls back to the folders list on a backend without folder_details", () => {
    expect(folderEntriesOf({ folders: ["INBOX", "Sent"] })).toEqual(["INBOX", "Sent"]);
    expect(folderEntriesOf({ folders: ["INBOX"], folder_details: [] })).toEqual(["INBOX"]);
    expect(folderEntriesOf({})).toEqual([]);
  });
});
