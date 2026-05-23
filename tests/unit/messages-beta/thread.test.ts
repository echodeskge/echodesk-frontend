/**
 * Tests for PR B thread additions: full-history slice, message search slice,
 * and WS reply-quote thread-through on new_message frames.
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
    conversationKey: "1",
    name: "Alice",
    lastMessage: null,
    unreadCount: 0,
    ...overrides,
  };
}

beforeEach(() => {
  useMessagesBetaStore.getState().reset();
});

describe("store – full-history slice (PR B)", () => {
  it("setFullHistoryForChat replaces messages and flips fullHistoryLoadedByChatId", () => {
    useMessagesBetaStore.getState().hydrateConversations([makeRow({ id: "fb_p_1" })]);
    useMessagesBetaStore.getState().setFullHistoryForChat("fb_p_1", [
      { id: "h1", senderId: "1", text: "history 1", status: "DELIVERED", createdAt: new Date("2024-01-01T10:00:00Z") },
      { id: "h2", senderId: "1", text: "history 2", status: "DELIVERED", createdAt: new Date("2024-01-02T10:00:00Z") },
    ]);
    const state = useMessagesBetaStore.getState();
    expect(state.messagesByChatId.fb_p_1).toHaveLength(2);
    expect(state.fullHistoryLoadedByChatId.fb_p_1).toBe(true);
    expect(state.messagesLoaded.fb_p_1).toBe(true);
  });

  it("setIsLoadingFullHistory toggles the spinner flag", () => {
    expect(useMessagesBetaStore.getState().isLoadingFullHistory).toBe(false);
    useMessagesBetaStore.getState().setIsLoadingFullHistory(true);
    expect(useMessagesBetaStore.getState().isLoadingFullHistory).toBe(true);
    useMessagesBetaStore.getState().setIsLoadingFullHistory(false);
    expect(useMessagesBetaStore.getState().isLoadingFullHistory).toBe(false);
  });
});

describe("store – messageSearchQuery slice (PR B)", () => {
  it("setMessageSearchQuery persists on the store", () => {
    useMessagesBetaStore.getState().setMessageSearchQuery("order #42");
    expect(useMessagesBetaStore.getState().messageSearchQuery).toBe("order #42");
  });
});

describe("dispatchWsFrame – new_message threads through reply-quote fields (PR B)", () => {
  it("populates replyToMessageId + replyToId on the appended message", () => {
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
          message_text: "thanks for the quote",
          timestamp: new Date().toISOString(),
          reply_to_message_id: "mid_original",
          reply_to_id: 42,
        },
      },
      Array.from(PLATFORMS)
    );
    const msgs = useMessagesBetaStore.getState().messagesByChatId.fb_p_1;
    expect(msgs).toHaveLength(1);
    expect(msgs[0].replyToMessageId).toBe("mid_original");
    expect(msgs[0].replyToId).toBe(42);
  });

  it("leaves reply fields undefined when the WS frame omits them", () => {
    useMessagesBetaStore.getState().hydrateConversations([makeRow({ id: "fb_p_1" })]);
    dispatchWsFrame(
      useMessagesBetaStore.getState(),
      {
        type: "new_message",
        conversation_id: "1",
        message: {
          id: "m2",
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
    expect(msgs[0].replyToMessageId).toBeUndefined();
    expect(msgs[0].replyToId).toBeUndefined();
  });
});
