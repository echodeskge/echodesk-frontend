/**
 * Tests for PR A sidebar additions: search + platformFilter applied to the
 * three tab selectors, plus pagination append/dedupe semantics.
 */
import { describe, it, expect, beforeEach } from "vitest";

import {
  selectAllTabConversations,
  selectArchivedConversations,
  selectAssignedTabConversations,
} from "@/components/messages-beta/store/selectors";
import { useMessagesBetaStore } from "@/components/messages-beta/store/useMessagesBetaStore";
import type { ConversationRow } from "@/components/messages-beta/store/types";

function makeRow(overrides: Partial<ConversationRow> = {}): ConversationRow {
  return {
    id: "fb_p_1",
    platform: "facebook",
    accountId: "p",
    conversationKey: "1",
    name: "Alice",
    lastMessage: { content: "hi", createdAt: "2024-06-01T10:00:00Z" },
    unreadCount: 0,
    ...overrides,
  };
}

beforeEach(() => {
  useMessagesBetaStore.getState().reset();
});

describe("selectors – search + platformFilter (PR A)", () => {
  const ME = 1;
  const ctx = { currentUserId: ME, assignmentEnabled: false, hideAssignedChats: false };

  it("All tab: searchQuery matches against name", () => {
    useMessagesBetaStore.getState().hydrateConversations([
      makeRow({ id: "a", name: "Alice" }),
      makeRow({ id: "b", name: "Bob" }),
    ]);
    useMessagesBetaStore.getState().setSearchQuery("ali");
    const state = useMessagesBetaStore.getState();
    expect(selectAllTabConversations(state, ctx).map((r) => r.id)).toEqual(["a"]);
  });

  it("All tab: searchQuery matches against lastMessage.content", () => {
    useMessagesBetaStore.getState().hydrateConversations([
      makeRow({ id: "a", lastMessage: { content: "order #42 update", createdAt: "2024-06-01T10:00:00Z" } }),
      makeRow({ id: "b", lastMessage: { content: "hello there", createdAt: "2024-06-01T10:00:00Z" } }),
    ]);
    useMessagesBetaStore.getState().setSearchQuery("order");
    const state = useMessagesBetaStore.getState();
    expect(selectAllTabConversations(state, ctx).map((r) => r.id)).toEqual(["a"]);
  });

  it("All tab: searchQuery matches against platform name", () => {
    useMessagesBetaStore.getState().hydrateConversations([
      makeRow({ id: "a", platform: "facebook" }),
      makeRow({ id: "b", platform: "whatsapp" }),
    ]);
    useMessagesBetaStore.getState().setSearchQuery("WHATS");
    const state = useMessagesBetaStore.getState();
    expect(selectAllTabConversations(state, ctx).map((r) => r.id)).toEqual(["b"]);
  });

  it("platformFilter narrows All tab to the chosen platform", () => {
    useMessagesBetaStore.getState().hydrateConversations([
      makeRow({ id: "a", platform: "facebook" }),
      makeRow({ id: "b", platform: "instagram" }),
      makeRow({ id: "c", platform: "whatsapp" }),
    ]);
    useMessagesBetaStore.getState().setPlatformFilter("instagram");
    const state = useMessagesBetaStore.getState();
    expect(selectAllTabConversations(state, ctx).map((r) => r.id)).toEqual(["b"]);
  });

  it("Assigned tab also applies search + platform", () => {
    useMessagesBetaStore.getState().hydrateConversations([
      makeRow({ id: "a", name: "Alice", platform: "facebook" }),
      makeRow({ id: "b", name: "Alex", platform: "instagram" }),
    ]);
    useMessagesBetaStore.getState().patchAssignment("a", {
      assignedUserId: ME, assignedUserName: "Me", status: "in_session",
      sessionStartedAt: null, sessionEndedAt: null,
    });
    useMessagesBetaStore.getState().patchAssignment("b", {
      assignedUserId: ME, assignedUserName: "Me", status: "in_session",
      sessionStartedAt: null, sessionEndedAt: null,
    });
    useMessagesBetaStore.getState().setPlatformFilter("instagram");
    const state = useMessagesBetaStore.getState();
    expect(selectAssignedTabConversations(state, ctx).map((r) => r.id)).toEqual(["b"]);
  });

  it("Archive tab also applies search + platform", () => {
    useMessagesBetaStore.getState().hydrateConversations([
      makeRow({ id: "a", name: "Alice", platform: "facebook" }),
      makeRow({ id: "b", name: "Bob", platform: "whatsapp" }),
    ]);
    useMessagesBetaStore.getState().patchArchive("a", { archivedAt: new Date().toISOString(), byUserId: 1 });
    useMessagesBetaStore.getState().patchArchive("b", { archivedAt: new Date().toISOString(), byUserId: 1 });
    useMessagesBetaStore.getState().setSearchQuery("bob");
    const state = useMessagesBetaStore.getState();
    expect(selectArchivedConversations(state).map((r) => r.id)).toEqual(["b"]);
  });

  it("Selectors without the filter slice on the input still work (back-compat)", () => {
    useMessagesBetaStore.getState().hydrateConversations([
      makeRow({ id: "a" }),
      makeRow({ id: "b" }),
    ]);
    // Mimic the unit-test pattern that passes a minimal hand-built state.
    const minimal = {
      conversations: useMessagesBetaStore.getState().conversations,
      assignmentByChatId: {},
      archivedByChatId: {},
    };
    expect(selectAllTabConversations(minimal, ctx).map((r) => r.id).sort()).toEqual(["a", "b"]);
  });
});

describe("store – appendConversations (PR A)", () => {
  it("appends new rows, dedupes by id, sorts desc by lastMessage", () => {
    useMessagesBetaStore.getState().hydrateConversations([
      makeRow({ id: "a", lastMessage: { content: "old", createdAt: "2024-01-01T10:00:00Z" } }),
    ]);
    useMessagesBetaStore.getState().appendConversations([
      makeRow({ id: "a", lastMessage: { content: "would clobber", createdAt: "2099-01-01T10:00:00Z" } }), // duplicate → skipped
      makeRow({ id: "b", lastMessage: { content: "newer", createdAt: "2024-12-01T10:00:00Z" } }),
    ]);
    const { conversations } = useMessagesBetaStore.getState();
    expect(conversations.map((r) => r.id)).toEqual(["b", "a"]);
    // Existing row 'a' kept its original lastMessage — append doesn't overwrite.
    expect(conversations.find((r) => r.id === "a")?.lastMessage?.content).toBe("old");
  });

  it("does NOT clobber an unread count already incremented via WS", () => {
    useMessagesBetaStore.getState().hydrateConversations([]);
    // Simulate a WS new_message setting unread before the next page arrives.
    useMessagesBetaStore.getState().setUnread("c", 5);
    useMessagesBetaStore.getState().appendConversations([
      makeRow({ id: "c", unreadCount: 0 }),
    ]);
    expect(useMessagesBetaStore.getState().unreadByChatId.c).toBe(5);
  });

  it("seeds unread from the appended row when no prior value", () => {
    useMessagesBetaStore.getState().hydrateConversations([]);
    useMessagesBetaStore.getState().appendConversations([
      makeRow({ id: "c", unreadCount: 3 }),
    ]);
    expect(useMessagesBetaStore.getState().unreadByChatId.c).toBe(3);
  });

  it("no-op when given an empty list or only duplicates", () => {
    useMessagesBetaStore.getState().hydrateConversations([makeRow({ id: "a" })]);
    const before = useMessagesBetaStore.getState().conversations;
    useMessagesBetaStore.getState().appendConversations([]);
    useMessagesBetaStore.getState().appendConversations([makeRow({ id: "a" })]);
    expect(useMessagesBetaStore.getState().conversations).toBe(before);
  });
});

describe("store – sidebar action slices (PR A)", () => {
  it("setSearchQuery / setPlatformFilter / setShowArchived / setAssignmentTab persist on the store", () => {
    useMessagesBetaStore.getState().setSearchQuery("hello");
    useMessagesBetaStore.getState().setPlatformFilter("whatsapp");
    useMessagesBetaStore.getState().setShowArchived(true);
    useMessagesBetaStore.getState().setAssignmentTab("assigned");
    const s = useMessagesBetaStore.getState();
    expect(s.searchQuery).toBe("hello");
    expect(s.platformFilter).toBe("whatsapp");
    expect(s.showArchived).toBe(true);
    expect(s.assignmentTab).toBe("assigned");
  });
});
