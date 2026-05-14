/**
 * Tests for the WS frame dispatcher. The dispatcher reads / writes through
 * the live store, so these run against a fresh store between cases.
 */
import { describe, it, expect, beforeEach } from "vitest";

import { dispatchWsFrame } from "@/components/messages-beta/store/ws-handlers";
import { useMessagesBetaStore } from "@/components/messages-beta/store/useMessagesBetaStore";
import type { ConversationRow } from "@/components/messages-beta/store/types";

const PLATFORMS = ["facebook", "instagram", "whatsapp", "widget"] as const;

function makeRow(overrides: Partial<ConversationRow> = {}): ConversationRow {
  return {
    id: "fb_p_1",
    platform: "facebook",
    accountId: "p",
    conversationKey: "fb_p_1",
    name: "Alice",
    lastMessage: { content: "hi", createdAt: "2024-06-01T10:00:00Z" },
    unreadCount: 0,
    ...overrides,
  };
}

beforeEach(() => {
  useMessagesBetaStore.getState().reset();
});

describe("dispatchWsFrame – new_message", () => {
  it("ignores messages from disabled platforms", () => {
    useMessagesBetaStore.getState().hydrateConversations([makeRow({ id: "fb_p_1" })]);
    dispatchWsFrame(
      useMessagesBetaStore.getState(),
      {
        type: "new_message",
        conversation_id: "fb_p_1",
        message: {
          id: "m1",
          platform: "tiktok",
          page_id: "p",
          sender_id: "1",
          message_text: "hello",
          timestamp: new Date().toISOString(),
        },
      },
      ["facebook"]
    );
    expect(useMessagesBetaStore.getState().messagesByChatId.fb_p_1).toBeUndefined();
  });

  it("appends a facebook incoming message to the right chat", () => {
    useMessagesBetaStore.getState().hydrateConversations([makeRow({ id: "fb_p_1" })]);
    dispatchWsFrame(
      useMessagesBetaStore.getState(),
      {
        type: "new_message",
        conversation_id: "1",
        message: {
          id: "m1",
          platform: "facebook",
          page_id: "p",
          sender_id: "1",
          message_text: "hello",
          timestamp: new Date().toISOString(),
        },
      },
      Array.from(PLATFORMS)
    );
    const msgs = useMessagesBetaStore.getState().messagesByChatId.fb_p_1;
    expect(msgs).toHaveLength(1);
    expect(msgs[0].text).toBe("hello");
    expect(msgs[0].senderId).toBe("1");
  });

  it("derives is_from_business correctly for widget (inverted is_from_visitor)", () => {
    useMessagesBetaStore.getState().hydrateConversations([
      makeRow({ id: "widget_5_session1", platform: "widget" }),
    ]);
    dispatchWsFrame(
      useMessagesBetaStore.getState(),
      {
        type: "new_message",
        conversation_id: "session1",
        message: {
          id: "m1",
          platform: "widget",
          connection_id: "5",
          session_id: "session1",
          sender_id: "session1",
          is_from_visitor: false,
          message_text: "agent reply",
          timestamp: new Date().toISOString(),
        },
      },
      Array.from(PLATFORMS)
    );
    const msgs = useMessagesBetaStore.getState().messagesByChatId.widget_5_session1;
    expect(msgs).toHaveLength(1);
    expect(msgs[0].senderId).toBe("business");
  });

  it("bumps unread when the chat isn't selected", () => {
    useMessagesBetaStore.getState().hydrateConversations([makeRow({ id: "fb_p_1" })]);
    dispatchWsFrame(
      useMessagesBetaStore.getState(),
      {
        type: "new_message",
        conversation_id: "1",
        message: {
          id: "m1",
          platform: "facebook",
          page_id: "p",
          sender_id: "1",
          message_text: "hi",
          timestamp: new Date().toISOString(),
        },
      },
      Array.from(PLATFORMS)
    );
    expect(useMessagesBetaStore.getState().unreadByChatId.fb_p_1).toBe(1);
  });

  it("does NOT bump unread when the chat is currently selected", () => {
    useMessagesBetaStore.getState().hydrateConversations([makeRow({ id: "fb_p_1" })]);
    useMessagesBetaStore.getState().selectChat("fb_p_1");
    dispatchWsFrame(
      useMessagesBetaStore.getState(),
      {
        type: "new_message",
        conversation_id: "1",
        message: {
          id: "m1",
          platform: "facebook",
          page_id: "p",
          sender_id: "1",
          message_text: "hi",
          timestamp: new Date().toISOString(),
        },
      },
      Array.from(PLATFORMS)
    );
    expect(useMessagesBetaStore.getState().unreadByChatId.fb_p_1 || 0).toBe(0);
  });
});

describe("dispatchWsFrame – session_ended", () => {
  it("patches the conversation row and clears selection if matched", () => {
    useMessagesBetaStore.getState().hydrateConversations([makeRow({ id: "w1", platform: "widget" })]);
    useMessagesBetaStore.getState().selectChat("w1");

    dispatchWsFrame(
      useMessagesBetaStore.getState(),
      {
        type: "session_ended",
        conversation_id: "w1",
        ended_by: "visitor",
        ended_at: "2024-06-01T11:00:00Z",
      },
      Array.from(PLATFORMS)
    );

    const state = useMessagesBetaStore.getState();
    expect(state.conversations[0].sessionEndedAt).toBe("2024-06-01T11:00:00Z");
    expect(state.conversations[0].sessionEndedBy).toBe("visitor");
    expect(state.selectedChatId).toBeNull();
  });
});

describe("dispatchWsFrame – unknown types", () => {
  it("silently ignores unknown types instead of throwing", () => {
    expect(() =>
      dispatchWsFrame(
        useMessagesBetaStore.getState(),
        { type: "something_new_backend_added", payload: {} },
        Array.from(PLATFORMS)
      )
    ).not.toThrow();
  });
});

describe("dispatchWsFrame – assignment_update (cross-user reactivity)", () => {
  it("patches the assignment slice when a teammate claims a chat", () => {
    useMessagesBetaStore.getState().hydrateConversations([makeRow({ id: "fb_p_1" })]);
    dispatchWsFrame(
      useMessagesBetaStore.getState(),
      {
        type: "assignment_update",
        conversation_id: "fb_p_1",
        platform: "facebook",
        account_id: "p",
        assigned_user_id: 7,
        assigned_user_name: "Teammate",
        status: "in_session",
        session_started_at: "2024-06-01T10:00:00Z",
        session_ended_at: null,
        by_user_id: 7,
      },
      Array.from(PLATFORMS)
    );
    const slice = useMessagesBetaStore.getState().assignmentByChatId.fb_p_1;
    expect(slice).not.toBeNull();
    expect(slice!.assignedUserId).toBe(7);
    expect(slice!.status).toBe("in_session");
  });

  it("clears the assignment slice when assigned_user_id is null (unassign / end-session)", () => {
    useMessagesBetaStore.getState().hydrateConversations([makeRow({ id: "fb_p_1" })]);
    useMessagesBetaStore.getState().patchAssignment("fb_p_1", {
      assignedUserId: 7,
      assignedUserName: "Teammate",
      status: "in_session",
      sessionStartedAt: null,
      sessionEndedAt: null,
    });
    dispatchWsFrame(
      useMessagesBetaStore.getState(),
      {
        type: "assignment_update",
        conversation_id: "fb_p_1",
        platform: "facebook",
        account_id: "p",
        assigned_user_id: null,
        status: null,
      },
      Array.from(PLATFORMS)
    );
    expect(useMessagesBetaStore.getState().assignmentByChatId.fb_p_1).toBeNull();
  });
});

describe("dispatchWsFrame – read_state_update", () => {
  it("clears unread when conversation_id matches", () => {
    useMessagesBetaStore.getState().hydrateConversations([
      makeRow({ id: "fb_p_1", unreadCount: 3 }),
    ]);
    expect(useMessagesBetaStore.getState().unreadByChatId.fb_p_1).toBe(3);
    dispatchWsFrame(
      useMessagesBetaStore.getState(),
      {
        type: "read_state_update",
        conversation_id: "fb_p_1",
        platform: "facebook",
        unread_count: 0,
        last_read_at: "2024-06-01T11:00:00Z",
      },
      Array.from(PLATFORMS)
    );
    expect(useMessagesBetaStore.getState().unreadByChatId.fb_p_1).toBe(0);
    expect(useMessagesBetaStore.getState().readWatermarkByChatId.fb_p_1).toBe("2024-06-01T11:00:00Z");
  });

  it("bulk-clears every chat on the platform when conversation_id is null", () => {
    useMessagesBetaStore.getState().hydrateConversations([
      makeRow({ id: "fb_a", platform: "facebook", unreadCount: 2 }),
      makeRow({ id: "fb_b", platform: "facebook", unreadCount: 5 }),
      makeRow({ id: "ig_a", platform: "instagram", unreadCount: 4 }),
    ]);
    dispatchWsFrame(
      useMessagesBetaStore.getState(),
      { type: "read_state_update", conversation_id: null, platform: "facebook", unread_count: 0 },
      Array.from(PLATFORMS)
    );
    const { unreadByChatId } = useMessagesBetaStore.getState();
    expect(unreadByChatId.fb_a).toBe(0);
    expect(unreadByChatId.fb_b).toBe(0);
    // Instagram untouched — bulk hint is platform-scoped.
    expect(unreadByChatId.ig_a).toBe(4);
  });
});

describe("dispatchWsFrame – archive_update", () => {
  it("moves a chat into the archive map when archived=true", () => {
    useMessagesBetaStore.getState().hydrateConversations([makeRow({ id: "fb_p_1" })]);
    dispatchWsFrame(
      useMessagesBetaStore.getState(),
      {
        type: "archive_update",
        conversation_id: "fb_p_1",
        platform: "facebook",
        archived: true,
        archived_at: "2024-06-01T12:00:00Z",
        by_user_id: 1,
      },
      Array.from(PLATFORMS)
    );
    const meta = useMessagesBetaStore.getState().archivedByChatId.fb_p_1;
    expect(meta).not.toBeNull();
    expect(meta!.archivedAt).toBe("2024-06-01T12:00:00Z");
    expect(meta!.byUserId).toBe(1);
  });

  it("clears the archive entry when archived=false (unarchive)", () => {
    useMessagesBetaStore.getState().hydrateConversations([makeRow({ id: "fb_p_1" })]);
    useMessagesBetaStore.getState().patchArchive("fb_p_1", {
      archivedAt: "2024-06-01T12:00:00Z",
      byUserId: 1,
    });
    dispatchWsFrame(
      useMessagesBetaStore.getState(),
      { type: "archive_update", conversation_id: "fb_p_1", platform: "facebook", archived: false },
      Array.from(PLATFORMS)
    );
    expect(useMessagesBetaStore.getState().archivedByChatId.fb_p_1).toBeNull();
  });

  it("bulk-archives every conversation on the platform when conversation_id is null", () => {
    useMessagesBetaStore.getState().hydrateConversations([
      makeRow({ id: "fb_a", platform: "facebook" }),
      makeRow({ id: "fb_b", platform: "facebook" }),
      makeRow({ id: "ig_a", platform: "instagram" }),
    ]);
    dispatchWsFrame(
      useMessagesBetaStore.getState(),
      {
        type: "archive_update",
        conversation_id: null,
        platform: "facebook",
        archived: true,
        archived_at: "2024-06-01T12:00:00Z",
      },
      Array.from(PLATFORMS)
    );
    const { archivedByChatId } = useMessagesBetaStore.getState();
    expect(archivedByChatId.fb_a).not.toBeNull();
    expect(archivedByChatId.fb_b).not.toBeNull();
    // Instagram untouched.
    expect(archivedByChatId.ig_a).toBeFalsy();
  });
});

describe("dispatchWsFrame – cross-user reactivity end-to-end", () => {
  it("teammate-claims-chat hides it from my All tab + adds it nowhere visible (other user owns it)", async () => {
    const { selectAllTabConversations, selectAssignedTabConversations } = await import(
      "@/components/messages-beta/store/selectors"
    );
    useMessagesBetaStore.getState().hydrateConversations([makeRow({ id: "fb_p_1" })]);
    const ME = 1;
    const TEAMMATE = 2;
    const ctx = { currentUserId: ME, hideAssignedChats: true };

    dispatchWsFrame(
      useMessagesBetaStore.getState(),
      {
        type: "assignment_update",
        conversation_id: "fb_p_1",
        platform: "facebook",
        assigned_user_id: TEAMMATE,
        assigned_user_name: "Bob",
        status: "in_session",
      },
      Array.from(PLATFORMS)
    );
    const state = useMessagesBetaStore.getState();
    expect(selectAllTabConversations(state, ctx)).toEqual([]);
    expect(selectAssignedTabConversations(state, ctx)).toEqual([]);
  });
});
