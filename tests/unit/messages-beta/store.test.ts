/**
 * Tests for the /messages-beta zustand store + selectors.
 *
 * The cross-user reactivity story is the headline thing this page is built
 * to fix, so most of these tests verify selectors recompute correctly when
 * the assignment / archive slices change — without any list mutation.
 */
import { describe, it, expect, beforeEach } from "vitest";

import {
  selectAllTabConversations,
  selectArchivedConversations,
  selectAssignedTabConversations,
} from "@/components/messages-beta/store/selectors";
import { useMessagesBetaStore } from "@/components/messages-beta/store/useMessagesBetaStore";
import type {
  ConversationRow,
  ChatAssignmentSlice,
} from "@/components/messages-beta/store/types";

function makeRow(overrides: Partial<ConversationRow> = {}): ConversationRow {
  return {
    id: "fb_p_1",
    platform: "facebook",
    accountId: "p",
    conversationKey: "fb_p_1",
    name: "Alice",
    avatar: undefined,
    lastMessage: { content: "hi", createdAt: "2024-06-01T10:00:00Z" },
    unreadCount: 0,
    ...overrides,
  };
}

function makeAssignment(userId: number, status: ChatAssignmentSlice["status"] = "active"): ChatAssignmentSlice {
  return {
    assignedUserId: userId,
    assignedUserName: `User ${userId}`,
    status,
    sessionStartedAt: null,
    sessionEndedAt: null,
  };
}

beforeEach(() => {
  useMessagesBetaStore.getState().reset();
});

describe("MessagesBetaStore – hydration", () => {
  it("hydrateConversations sorts desc by lastMessage.createdAt", () => {
    const old = makeRow({ id: "a", lastMessage: { content: "old", createdAt: "2024-01-01T10:00:00Z" } });
    const newer = makeRow({ id: "b", lastMessage: { content: "new", createdAt: "2024-12-01T10:00:00Z" } });
    useMessagesBetaStore.getState().hydrateConversations([old, newer]);
    expect(useMessagesBetaStore.getState().conversations.map((r) => r.id)).toEqual(["b", "a"]);
  });

  it("hydrateConversations seeds unreadByChatId", () => {
    useMessagesBetaStore.getState().hydrateConversations([
      makeRow({ id: "a", unreadCount: 0 }),
      makeRow({ id: "b", unreadCount: 5 }),
    ]);
    expect(useMessagesBetaStore.getState().unreadByChatId).toEqual({ a: 0, b: 5 });
  });
});

describe("MessagesBetaStore – appendMessage", () => {
  it("appends to messagesByChatId and reorders the conversation to top", () => {
    const a = makeRow({ id: "a", lastMessage: { content: "old a", createdAt: "2024-01-01T10:00:00Z" } });
    const b = makeRow({ id: "b", lastMessage: { content: "old b", createdAt: "2024-02-01T10:00:00Z" } });
    useMessagesBetaStore.getState().hydrateConversations([a, b]);
    expect(useMessagesBetaStore.getState().conversations[0].id).toBe("b");

    useMessagesBetaStore.getState().appendMessage(
      "a",
      {
        id: "m1",
        senderId: "x",
        text: "newer than b",
        status: "DELIVERED",
        createdAt: new Date("2024-12-01T10:00:00Z"),
      },
      /* isSelected */ false
    );

    const { conversations, messagesByChatId, unreadByChatId } = useMessagesBetaStore.getState();
    expect(conversations[0].id).toBe("a");
    expect(conversations[0].lastMessage?.content).toBe("newer than b");
    expect(messagesByChatId.a).toHaveLength(1);
    expect(unreadByChatId.a).toBe(1);
  });

  it("does NOT bump unread when the chat is currently selected", () => {
    useMessagesBetaStore.getState().hydrateConversations([makeRow({ id: "a" })]);
    useMessagesBetaStore.getState().selectChat("a");
    useMessagesBetaStore.getState().appendMessage(
      "a",
      { id: "m1", senderId: "x", text: "hi", status: "DELIVERED", createdAt: new Date() },
      /* isSelected */ true
    );
    expect(useMessagesBetaStore.getState().unreadByChatId.a).toBeFalsy();
  });

  it("dedupes by message id (catches double WS delivery)", () => {
    useMessagesBetaStore.getState().hydrateConversations([makeRow({ id: "a" })]);
    const msg = {
      id: "m1",
      senderId: "x",
      text: "hi",
      status: "DELIVERED",
      createdAt: new Date(),
    } as const;
    useMessagesBetaStore.getState().appendMessage("a", msg, false);
    useMessagesBetaStore.getState().appendMessage("a", msg, false);
    expect(useMessagesBetaStore.getState().messagesByChatId.a).toHaveLength(1);
  });

  it("fabricates a conversation row when a WS message arrives for an unknown chat", () => {
    // Bootstrap had no row for fb_p_99 — simulating a brand-new sender or
    // a sender that wasn't on page 1 of the conversation list.
    useMessagesBetaStore.getState().hydrateConversations([]);
    useMessagesBetaStore.getState().appendMessage(
      "fb_p_99",
      {
        id: "m1",
        senderId: "99",
        text: "hi",
        status: "DELIVERED",
        createdAt: new Date("2024-12-01T10:00:00Z"),
        senderName: "New Sender",
        platform: "facebook",
      },
      false,
      {
        platform: "facebook",
        accountId: "p",
        conversationKey: "99",
        name: "New Sender",
      }
    );
    const state = useMessagesBetaStore.getState();
    const row = state.conversations.find((c) => c.id === "fb_p_99");
    expect(row).toBeTruthy();
    expect(row!.name).toBe("New Sender");
    expect(row!.platform).toBe("facebook");
    expect(row!.accountId).toBe("p");
    expect(row!.lastMessage?.content).toBe("hi");
    expect(state.unreadByChatId.fb_p_99).toBe(1);
  });

  it("ensureConversationRow creates a placeholder once, idempotent", () => {
    useMessagesBetaStore.getState().hydrateConversations([]);
    useMessagesBetaStore.getState().ensureConversationRow("fb_p_42", {
      platform: "facebook",
      accountId: "p",
      conversationKey: "42",
      name: "Loading…",
    });
    expect(useMessagesBetaStore.getState().conversations).toHaveLength(1);
    // Second call must NOT duplicate.
    useMessagesBetaStore.getState().ensureConversationRow("fb_p_42", {
      platform: "facebook",
      accountId: "p",
      conversationKey: "42",
      name: "Loading…",
    });
    expect(useMessagesBetaStore.getState().conversations).toHaveLength(1);
  });

  it("dedupes by platformMessageId when DB id isn't usable", () => {
    useMessagesBetaStore.getState().hydrateConversations([makeRow({ id: "a" })]);
    const base = {
      senderId: "x",
      text: "hi",
      status: "DELIVERED",
      createdAt: new Date(),
      platformMessageId: "mid_abc",
    } as const;
    useMessagesBetaStore.getState().appendMessage("a", { id: "", ...base }, false);
    useMessagesBetaStore.getState().appendMessage("a", { id: "undefined", ...base }, false);
    expect(useMessagesBetaStore.getState().messagesByChatId.a).toHaveLength(1);
  });
});

describe("MessagesBetaStore – patchAssignment + cross-user selectors", () => {
  const ME = 1;
  const TEAMMATE = 2;

  it("All tab hides chats assigned to others when hide_assigned_chats is on", () => {
    useMessagesBetaStore.getState().hydrateConversations([
      makeRow({ id: "a" }),
      makeRow({ id: "b" }),
    ]);
    useMessagesBetaStore.getState().patchAssignment("b", makeAssignment(TEAMMATE));

    const state = useMessagesBetaStore.getState();
    const ctx = { currentUserId: ME, hideAssignedChats: true };
    expect(selectAllTabConversations(state, ctx).map((r) => r.id)).toEqual(["a"]);
  });

  it("All tab hides chats assigned to ME (they belong in Assigned tab)", () => {
    useMessagesBetaStore.getState().hydrateConversations([
      makeRow({ id: "a" }),
      makeRow({ id: "b" }),
    ]);
    useMessagesBetaStore.getState().patchAssignment("a", makeAssignment(ME));
    const state = useMessagesBetaStore.getState();
    const ctx = { currentUserId: ME, hideAssignedChats: true };
    expect(selectAllTabConversations(state, ctx).map((r) => r.id)).toEqual(["b"]);
  });

  it("All tab keeps everything when hide_assigned_chats is OFF", () => {
    useMessagesBetaStore.getState().hydrateConversations([
      makeRow({ id: "a" }),
      makeRow({ id: "b" }),
      makeRow({ id: "c" }),
    ]);
    useMessagesBetaStore.getState().patchAssignment("a", makeAssignment(ME));
    useMessagesBetaStore.getState().patchAssignment("b", makeAssignment(TEAMMATE));
    const state = useMessagesBetaStore.getState();
    const ctx = { currentUserId: ME, hideAssignedChats: false };
    expect(selectAllTabConversations(state, ctx).map((r) => r.id).sort()).toEqual(["a", "b", "c"]);
  });

  it("Assigned tab only shows chats assigned to ME", () => {
    useMessagesBetaStore.getState().hydrateConversations([
      makeRow({ id: "a" }),
      makeRow({ id: "b" }),
      makeRow({ id: "c" }),
    ]);
    useMessagesBetaStore.getState().patchAssignment("a", makeAssignment(ME));
    useMessagesBetaStore.getState().patchAssignment("b", makeAssignment(TEAMMATE));
    const state = useMessagesBetaStore.getState();
    const ctx = { currentUserId: ME, hideAssignedChats: true };
    expect(selectAssignedTabConversations(state, ctx).map((r) => r.id)).toEqual(["a"]);
  });

  it("Cross-user reactivity: patching assignmentByChatId reshuffles teammate's view", () => {
    // Initial state: chat X is unassigned. ME and TEAMMATE both see it in All.
    useMessagesBetaStore.getState().hydrateConversations([makeRow({ id: "x" })]);
    const ctx = { currentUserId: ME, hideAssignedChats: true };
    expect(selectAllTabConversations(useMessagesBetaStore.getState(), ctx).map((r) => r.id)).toEqual(["x"]);

    // TEAMMATE assigns X to themselves. We receive the assignment_update
    // frame and patch the slice. ME's All tab should drop X immediately
    // without any other action.
    useMessagesBetaStore.getState().patchAssignment("x", makeAssignment(TEAMMATE));
    expect(selectAllTabConversations(useMessagesBetaStore.getState(), ctx)).toEqual([]);
    expect(selectAssignedTabConversations(useMessagesBetaStore.getState(), ctx)).toEqual([]);

    // TEAMMATE transfers X to ME. Re-patch and ME's Assigned tab now owns it.
    useMessagesBetaStore.getState().patchAssignment("x", makeAssignment(ME));
    expect(selectAllTabConversations(useMessagesBetaStore.getState(), ctx)).toEqual([]);
    expect(selectAssignedTabConversations(useMessagesBetaStore.getState(), ctx).map((r) => r.id)).toEqual(["x"]);
  });
});

describe("MessagesBetaStore – archive", () => {
  it("Archive tab includes only archived rows; active inbox excludes them", () => {
    useMessagesBetaStore.getState().hydrateConversations([
      makeRow({ id: "a" }),
      makeRow({ id: "b" }),
    ]);
    useMessagesBetaStore.getState().patchArchive("b", { archivedAt: new Date().toISOString(), byUserId: 1 });
    const state = useMessagesBetaStore.getState();
    const ctx = { currentUserId: 1, hideAssignedChats: false };
    expect(selectAllTabConversations(state, ctx).map((r) => r.id)).toEqual(["a"]);
    expect(selectArchivedConversations(state).map((r) => r.id)).toEqual(["b"]);
  });
});

describe("MessagesBetaStore – session ended", () => {
  it("setSessionEnded patches the conversation row in place", () => {
    useMessagesBetaStore.getState().hydrateConversations([makeRow({ id: "a", platform: "widget" })]);
    useMessagesBetaStore.getState().setSessionEnded("a", "2024-06-01T11:00:00Z", "visitor");
    const row = useMessagesBetaStore.getState().conversations[0];
    expect(row.sessionEndedAt).toBe("2024-06-01T11:00:00Z");
    expect(row.sessionEndedBy).toBe("visitor");
  });
});

describe("MessagesBetaStore – removeConversation (PR D delete flow)", () => {
  it("strips the row and every per-chat side slice; deselects if active", () => {
    const s = useMessagesBetaStore.getState();
    s.hydrateConversations([makeRow({ id: "a" }), makeRow({ id: "b" })]);
    s.hydrateMessages("a", []);
    s.patchAssignment("a", makeAssignment(7));
    s.patchArchive("a", { archivedAt: "2024-06-01T10:00:00Z", byUserId: 7 });
    s.setReadWatermark("a", "2024-06-01T10:00:00Z");
    s.setFullHistoryForChat("a", []);
    s.setUnread("a", 3);
    s.selectChat("a");

    s.removeConversation("a");

    const after = useMessagesBetaStore.getState();
    expect(after.conversations.map((r) => r.id)).toEqual(["b"]);
    expect(after.messagesByChatId["a"]).toBeUndefined();
    expect(after.assignmentByChatId["a"]).toBeUndefined();
    expect(after.archivedByChatId["a"]).toBeUndefined();
    expect(after.readWatermarkByChatId["a"]).toBeUndefined();
    expect(after.messagesLoaded["a"]).toBeUndefined();
    expect(after.fullHistoryLoadedByChatId["a"]).toBeUndefined();
    expect(after.unreadByChatId["a"]).toBeUndefined();
    expect(after.selectedChatId).toBeNull();
  });

  it("leaves selection alone when removing a non-selected chat", () => {
    const s = useMessagesBetaStore.getState();
    s.hydrateConversations([makeRow({ id: "a" }), makeRow({ id: "b" })]);
    s.selectChat("b");

    s.removeConversation("a");

    expect(useMessagesBetaStore.getState().selectedChatId).toBe("b");
  });
});
