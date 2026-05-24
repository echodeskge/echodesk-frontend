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

  it("WhatsApp media: rewrites Meta CDN URL through /api/social/whatsapp-media proxy", () => {
    useMessagesBetaStore.getState().hydrateConversations([
      makeRow({ id: "wa_waba1_995551234567", platform: "whatsapp", accountId: "waba1" }),
    ]);
    dispatchWsFrame(
      useMessagesBetaStore.getState(),
      {
        type: "new_message",
        conversation_id: "995551234567",
        message: {
          id: "m1",
          platform: "whatsapp",
          waba_id: "waba1",
          from_number: "995551234567",
          attachments: [
            { type: "image", media_id: "META_MEDIA_999", url: "https://scontent.fbcdn.net/blocked.jpg" },
          ],
          timestamp: new Date().toISOString(),
        },
      },
      Array.from(PLATFORMS)
    );
    const msgs = useMessagesBetaStore.getState().messagesByChatId.wa_waba1_995551234567;
    expect(msgs[0].images).toBeDefined();
    // Proxy URL — not the raw Meta CDN URL.
    expect(msgs[0].images?.[0].url).toContain("/api/social/whatsapp-media/META_MEDIA_999/?waba_id=waba1");
    expect(msgs[0].images?.[0].url).not.toContain("scontent.fbcdn.net");
  });

  it("video attachment lands in images[] with type:'video' (player route in MessageBubble)", () => {
    useMessagesBetaStore.getState().hydrateConversations([
      makeRow({ id: "wa_waba1_995551234567", platform: "whatsapp", accountId: "waba1" }),
    ]);
    dispatchWsFrame(
      useMessagesBetaStore.getState(),
      {
        type: "new_message",
        conversation_id: "995551234567",
        message: {
          id: "m2",
          platform: "whatsapp",
          waba_id: "waba1",
          from_number: "995551234567",
          attachments: [{ type: "video", media_id: "VID_42", url: "ignored" }],
          timestamp: new Date().toISOString(),
        },
      },
      Array.from(PLATFORMS)
    );
    const msgs = useMessagesBetaStore.getState().messagesByChatId.wa_waba1_995551234567;
    const vidMsg = msgs.find((m) => m.id === "m2");
    expect(vidMsg?.images?.[0].type).toBe("video");
    expect(vidMsg?.images?.[0].url).toContain("/api/social/whatsapp-media/VID_42/?waba_id=waba1");
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

  it("routes an UNPREFIXED conversation_id via (platform, account_id) → prefixed store key", () => {
    // Backend sometimes emits the platform-side conversation key
    // (sender_id, from_number, session_id) without the prefix the store
    // uses. The handler must resolve to the prefixed chat id via
    // (platform, account_id, conversation_id) so the row actually updates.
    useMessagesBetaStore.getState().hydrateConversations([
      makeRow({ id: "widget_5_sess-abc", platform: "widget", accountId: "5", conversationKey: "sess-abc" }),
    ]);
    useMessagesBetaStore.getState().selectChat("widget_5_sess-abc");

    dispatchWsFrame(
      useMessagesBetaStore.getState(),
      {
        type: "session_ended",
        conversation_id: "sess-abc",
        platform: "widget",
        account_id: "5",
        ended_by: "agent",
        ended_at: "2024-06-01T11:30:00Z",
      },
      Array.from(PLATFORMS)
    );

    const state = useMessagesBetaStore.getState();
    expect(state.conversations[0].sessionEndedAt).toBe("2024-06-01T11:30:00Z");
    expect(state.conversations[0].sessionEndedBy).toBe("agent");
    expect(state.selectedChatId).toBeNull();
  });
});

describe("dispatchWsFrame – conversation_update + read_receipt routing", () => {
  it("conversation_update lands on the prefixed chat id from (platform, account_id)", () => {
    useMessagesBetaStore.getState().hydrateConversations([
      makeRow({ id: "fb_pageA_42", platform: "facebook", accountId: "pageA", conversationKey: "42" }),
    ]);
    dispatchWsFrame(
      useMessagesBetaStore.getState(),
      {
        type: "conversation_update",
        conversation_id: "42",
        platform: "facebook",
        account_id: "pageA",
        last_message: { text: "Patched preview", timestamp: "2024-06-01T12:00:00Z" },
      },
      Array.from(PLATFORMS)
    );
    const row = useMessagesBetaStore.getState().conversations[0];
    expect(row.lastMessage?.content).toBe("Patched preview");
    expect(row.lastMessage?.createdAt).toBe("2024-06-01T12:00:00Z");
  });

  it("read_receipt watermark lands on prefixed key, not raw conversation_id", () => {
    useMessagesBetaStore.getState().hydrateConversations([
      makeRow({ id: "fb_pageA_42", platform: "facebook", accountId: "pageA", conversationKey: "42" }),
    ]);
    dispatchWsFrame(
      useMessagesBetaStore.getState(),
      {
        type: "read_receipt",
        conversation_id: "42",
        platform: "facebook",
        account_id: "pageA",
        timestamp: "2024-06-01T12:05:00Z",
      },
      Array.from(PLATFORMS)
    );
    const watermarks = useMessagesBetaStore.getState().readWatermarkByChatId;
    expect(watermarks.fb_pageA_42).toBe("2024-06-01T12:05:00Z");
    // Crucially: NOT keyed by the raw "42".
    expect(watermarks["42"]).toBeUndefined();
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

describe("dispatchWsFrame – end-session block window (60s)", () => {
  it("suppresses a new_message echo that would fabricate a row for a recently-ended chat", async () => {
    const { registerEndedChat, _resetEndSessionBlockRegistry } = await import(
      "@/components/messages-beta/end-session-block"
    );
    _resetEndSessionBlockRegistry();

    // Pre-condition: the chat is NOT in the conversation list (legacy
    // simulates the End Session having already stripped the row + the
    // server-side archive having propagated).
    useMessagesBetaStore.getState().hydrateConversations([]);
    registerEndedChat("fb_p_999");

    dispatchWsFrame(
      useMessagesBetaStore.getState(),
      {
        type: "new_message",
        conversation_id: "999",
        message: {
          id: "rating_request",
          platform: "facebook",
          page_id: "p",
          sender_id: "999",
          message_text: "Thanks for chatting! How would you rate us?",
          is_from_page: true,
          timestamp: new Date().toISOString(),
        },
      },
      Array.from(PLATFORMS)
    );
    expect(useMessagesBetaStore.getState().conversations).toEqual([]);
    expect(useMessagesBetaStore.getState().messagesByChatId.fb_p_999).toBeUndefined();
  });

  it("still appends to an existing row even within the block window (chat re-resurrected by an in-flight reply is OK)", async () => {
    const { registerEndedChat, _resetEndSessionBlockRegistry } = await import(
      "@/components/messages-beta/end-session-block"
    );
    _resetEndSessionBlockRegistry();

    useMessagesBetaStore.getState().hydrateConversations([makeRow({ id: "fb_p_999" })]);
    registerEndedChat("fb_p_999");

    dispatchWsFrame(
      useMessagesBetaStore.getState(),
      {
        type: "new_message",
        conversation_id: "999",
        message: {
          id: "m_late",
          platform: "facebook",
          page_id: "p",
          sender_id: "999",
          message_text: "wait one more thing",
          timestamp: new Date().toISOString(),
        },
      },
      Array.from(PLATFORMS)
    );
    // Existing row → block doesn't suppress; legacy treats this as the
    // customer continuing the conversation past end-session.
    expect(useMessagesBetaStore.getState().messagesByChatId.fb_p_999).toHaveLength(1);
  });
});

describe("dispatchWsFrame – conversation_deleted (PR F)", () => {
  it("per-chat frame removes the matching row and leaves siblings alone", () => {
    useMessagesBetaStore.getState().hydrateConversations([
      makeRow({ id: "fb_p_1", conversationKey: "1", accountId: "p" }),
      makeRow({ id: "fb_p_2", conversationKey: "2", accountId: "p" }),
    ]);
    dispatchWsFrame(
      useMessagesBetaStore.getState(),
      {
        type: "conversation_deleted",
        platform: "facebook",
        conversation_id: "1",
        account_id: "p",
      },
      Array.from(PLATFORMS)
    );
    const remaining = useMessagesBetaStore.getState().conversations.map((r) => r.id);
    expect(remaining).toEqual(["fb_p_2"]);
  });

  it("per-chat frame with no account_id removes every row matching (platform, conversationKey)", () => {
    // Same customer on two FB pages — the backend's soft delete is loose
    // by sender_id, so the broadcast intentionally drops both.
    useMessagesBetaStore.getState().hydrateConversations([
      makeRow({ id: "fb_pageA_42", conversationKey: "42", accountId: "pageA" }),
      makeRow({ id: "fb_pageB_42", conversationKey: "42", accountId: "pageB" }),
      makeRow({ id: "fb_pageA_99", conversationKey: "99", accountId: "pageA" }),
    ]);
    dispatchWsFrame(
      useMessagesBetaStore.getState(),
      {
        type: "conversation_deleted",
        platform: "facebook",
        conversation_id: "42",
        account_id: null,
      },
      Array.from(PLATFORMS)
    );
    const remaining = useMessagesBetaStore.getState().conversations.map((r) => r.id);
    expect(remaining).toEqual(["fb_pageA_99"]);
  });

  it("bulk frame (conversation_id null) wipes every row on the platform only", () => {
    useMessagesBetaStore.getState().hydrateConversations([
      makeRow({ id: "fb_p_1", platform: "facebook" }),
      makeRow({ id: "fb_p_2", platform: "facebook" }),
      makeRow({ id: "ig_a_1", platform: "instagram", accountId: "a", conversationKey: "1" }),
    ]);
    dispatchWsFrame(
      useMessagesBetaStore.getState(),
      {
        type: "conversation_deleted",
        platform: "facebook",
        conversation_id: null,
        account_id: null,
      },
      Array.from(PLATFORMS)
    );
    const remaining = useMessagesBetaStore.getState().conversations.map((r) => r.id);
    expect(remaining).toEqual(["ig_a_1"]);
  });

  it("bulk frame for a disabled platform is a no-op", () => {
    useMessagesBetaStore.getState().hydrateConversations([
      makeRow({ id: "fb_p_1", platform: "facebook" }),
    ]);
    dispatchWsFrame(
      useMessagesBetaStore.getState(),
      {
        type: "conversation_deleted",
        platform: "tiktok",
        conversation_id: null,
        account_id: null,
      },
      Array.from(PLATFORMS)
    );
    expect(useMessagesBetaStore.getState().conversations.map((r) => r.id)).toEqual(["fb_p_1"]);
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
    const ctx = { currentUserId: ME, assignmentEnabled: true, hideAssignedChats: true, isAdmin: false };

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

describe("dispatchWsFrame – message_status + reaction_update", () => {
  it("message_status read frame upgrades the matching outgoing bubbles' pips", () => {
    useMessagesBetaStore.getState().hydrateConversations([
      makeRow({ id: "fb_pageA_42", platform: "facebook", accountId: "pageA", conversationKey: "42" }),
    ]);
    useMessagesBetaStore.getState().hydrateMessages("fb_pageA_42", [
      { id: "11", senderId: "business", text: "hi", status: "SENT", createdAt: new Date() },
      { id: "12", senderId: "business", text: "yo", status: "SENT", createdAt: new Date() },
    ] as never);

    dispatchWsFrame(
      useMessagesBetaStore.getState(),
      {
        type: "message_status",
        platform: "facebook",
        account_id: "pageA",
        conversation_id: "42",
        message_ids: ["11"],
        status: "read",
      },
      Array.from(PLATFORMS)
    );

    const msgs = useMessagesBetaStore.getState().messagesByChatId.fb_pageA_42;
    expect(msgs.find((m) => m.id === "11")?.status).toBe("READ");
    expect(msgs.find((m) => m.id === "12")?.status).toBe("SENT");
  });

  it("reaction_update frame sets the bubble's reactionEmoji", () => {
    useMessagesBetaStore.getState().hydrateConversations([
      makeRow({ id: "wa_w1_995", platform: "whatsapp", accountId: "w1", conversationKey: "995" }),
    ]);
    useMessagesBetaStore.getState().hydrateMessages("wa_w1_995", [
      { id: "1", senderId: "x", text: "hi", status: "DELIVERED", createdAt: new Date(), platformMessageId: "wamid.X" },
    ] as never);

    dispatchWsFrame(
      useMessagesBetaStore.getState(),
      {
        type: "reaction_update",
        platform: "whatsapp",
        account_id: "w1",
        conversation_id: "995",
        message_id: "wamid.X",
        reaction_emoji: "🔥",
      },
      Array.from(PLATFORMS)
    );

    expect(useMessagesBetaStore.getState().messagesByChatId["wa_w1_995"][0].reactionEmoji).toBe("🔥");
  });
});
