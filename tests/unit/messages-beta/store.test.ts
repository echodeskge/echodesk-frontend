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
    const ctx = { currentUserId: ME, assignmentEnabled: true, hideAssignedChats: true, isAdmin: false };
    expect(selectAllTabConversations(state, ctx).map((r) => r.id)).toEqual(["a"]);
  });

  it("All tab hides chats assigned to ME (they belong in Assigned tab)", () => {
    useMessagesBetaStore.getState().hydrateConversations([
      makeRow({ id: "a" }),
      makeRow({ id: "b" }),
    ]);
    useMessagesBetaStore.getState().patchAssignment("a", makeAssignment(ME));
    const state = useMessagesBetaStore.getState();
    const ctx = { currentUserId: ME, assignmentEnabled: true, hideAssignedChats: true, isAdmin: false };
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
    const ctx = { currentUserId: ME, assignmentEnabled: false, hideAssignedChats: false, isAdmin: false };
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
    const ctx = { currentUserId: ME, assignmentEnabled: true, hideAssignedChats: true, isAdmin: false };
    expect(selectAssignedTabConversations(state, ctx).map((r) => r.id)).toEqual(["a"]);
  });

  it("Cross-user reactivity: patching assignmentByChatId reshuffles teammate's view", () => {
    // Initial state: chat X is unassigned. ME and TEAMMATE both see it in All.
    useMessagesBetaStore.getState().hydrateConversations([makeRow({ id: "x" })]);
    const ctx = { currentUserId: ME, assignmentEnabled: true, hideAssignedChats: true, isAdmin: false };
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

describe("MessagesBetaStore – assignmentEnabled vs hideAssignedChats (PR I)", () => {
  const ME = 1;
  const TEAMMATE = 2;

  it("assignmentEnabled=true alone hides MY chat from All but keeps OTHERS' visible", () => {
    // chat_assignment_enabled=true, hide_assigned_chats=false → matches the
    // legacy frontend filter (hide my chats only). Backend still surfaces
    // others' chats since hide_assigned_chats is off.
    useMessagesBetaStore.getState().hydrateConversations([
      makeRow({ id: "mine" }),
      makeRow({ id: "theirs" }),
      makeRow({ id: "unassigned" }),
    ]);
    useMessagesBetaStore.getState().patchAssignment("mine", makeAssignment(ME));
    useMessagesBetaStore.getState().patchAssignment("theirs", makeAssignment(TEAMMATE));
    const ctx = { currentUserId: ME, assignmentEnabled: true, hideAssignedChats: false, isAdmin: false };
    expect(
      selectAllTabConversations(useMessagesBetaStore.getState(), ctx)
        .map((r) => r.id)
        .sort()
    ).toEqual(["theirs", "unassigned"]);
  });

  it("hideAssignedChats=true alone hides OTHERS' chats but keeps MINE visible (defensive: backend should also gate)", () => {
    // Mostly a defensive shape — in practice hide_assigned_chats implies
    // chat_assignment_enabled at the settings UI level. But the slices are
    // independent on the wire, and the selector should match each flag's
    // semantics 1:1 so a malformed combination doesn't surprise us.
    useMessagesBetaStore.getState().hydrateConversations([
      makeRow({ id: "mine" }),
      makeRow({ id: "theirs" }),
    ]);
    useMessagesBetaStore.getState().patchAssignment("mine", makeAssignment(ME));
    useMessagesBetaStore.getState().patchAssignment("theirs", makeAssignment(TEAMMATE));
    const ctx = { currentUserId: ME, assignmentEnabled: false, hideAssignedChats: true, isAdmin: false };
    expect(
      selectAllTabConversations(useMessagesBetaStore.getState(), ctx).map((r) => r.id)
    ).toEqual(["mine"]);
  });

  it("both flags ON: All tab is the unassigned-only intersection", () => {
    useMessagesBetaStore.getState().hydrateConversations([
      makeRow({ id: "mine" }),
      makeRow({ id: "theirs" }),
      makeRow({ id: "unassigned" }),
    ]);
    useMessagesBetaStore.getState().patchAssignment("mine", makeAssignment(ME));
    useMessagesBetaStore.getState().patchAssignment("theirs", makeAssignment(TEAMMATE));
    const ctx = { currentUserId: ME, assignmentEnabled: true, hideAssignedChats: true, isAdmin: false };
    expect(
      selectAllTabConversations(useMessagesBetaStore.getState(), ctx).map((r) => r.id)
    ).toEqual(["unassigned"]);
  });

  it("isAdmin=true bypasses hide_assigned_chats: admin sees others' assigned chats in All", () => {
    // Mirrors backend views.py:5559 — admins audit every conversation,
    // including those assigned to other agents, regardless of the
    // tenant-level hide_assigned_chats flag.
    useMessagesBetaStore.getState().hydrateConversations([
      makeRow({ id: "theirs" }),
      makeRow({ id: "unassigned" }),
    ]);
    useMessagesBetaStore.getState().patchAssignment("theirs", makeAssignment(TEAMMATE));
    const ctxAdmin = {
      currentUserId: ME,
      assignmentEnabled: true,
      hideAssignedChats: true,
      isAdmin: true,
    };
    expect(
      selectAllTabConversations(useMessagesBetaStore.getState(), ctxAdmin)
        .map((r) => r.id)
        .sort()
    ).toEqual(["theirs", "unassigned"]);
  });

  it("both flags OFF: All tab shows everything regardless of assignment", () => {
    useMessagesBetaStore.getState().hydrateConversations([
      makeRow({ id: "mine" }),
      makeRow({ id: "theirs" }),
      makeRow({ id: "unassigned" }),
    ]);
    useMessagesBetaStore.getState().patchAssignment("mine", makeAssignment(ME));
    useMessagesBetaStore.getState().patchAssignment("theirs", makeAssignment(TEAMMATE));
    const ctx = { currentUserId: ME, assignmentEnabled: false, hideAssignedChats: false, isAdmin: false };
    expect(
      selectAllTabConversations(useMessagesBetaStore.getState(), ctx)
        .map((r) => r.id)
        .sort()
    ).toEqual(["mine", "theirs", "unassigned"]);
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
    const ctx = { currentUserId: 1, assignmentEnabled: false, hideAssignedChats: false, isAdmin: false };
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

describe("MessagesBetaStore – showClientPanel (PR E side rail)", () => {
  it("defaults to false and flips with setShowClientPanel", () => {
    const s = useMessagesBetaStore.getState();
    expect(s.showClientPanel).toBe(false);
    s.setShowClientPanel(true);
    expect(useMessagesBetaStore.getState().showClientPanel).toBe(true);
    useMessagesBetaStore.getState().setShowClientPanel(false);
    expect(useMessagesBetaStore.getState().showClientPanel).toBe(false);
  });

  it("reset() wipes showClientPanel back to false", () => {
    useMessagesBetaStore.getState().setShowClientPanel(true);
    useMessagesBetaStore.getState().reset();
    expect(useMessagesBetaStore.getState().showClientPanel).toBe(false);
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
