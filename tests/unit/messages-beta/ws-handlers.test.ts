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

  it("accepts (no-op) the PR3/PR4 event types so an early backend broadcast doesn't crash", () => {
    expect(() => {
      dispatchWsFrame(
        useMessagesBetaStore.getState(),
        { type: "assignment_update", conversation_id: "x" },
        Array.from(PLATFORMS)
      );
      dispatchWsFrame(
        useMessagesBetaStore.getState(),
        { type: "read_state_update", conversation_id: "x" },
        Array.from(PLATFORMS)
      );
      dispatchWsFrame(
        useMessagesBetaStore.getState(),
        { type: "archive_update", conversation_id: "x" },
        Array.from(PLATFORMS)
      );
    }).not.toThrow();
  });
});
