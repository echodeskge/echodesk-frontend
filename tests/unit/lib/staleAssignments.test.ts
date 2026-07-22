/**
 * Tests for the stale-assignment reminder helpers.
 *
 * Widget quirk covered here: unified rows are keyed by visitor_id while
 * assignments are keyed by session_id, so widget action keys come from the
 * conversation_id slug and widget assignment fields may be null.
 */
import { describe, it, expect } from "vitest";

import type { UnifiedConversation } from "@/api/generated/interfaces";
import {
  computeStaleChats,
  getAssignmentActionKey,
  lastActivityMs,
  staleSignature,
} from "@/lib/staleAssignments";

const NOW = Date.parse("2026-07-22T12:00:00Z");
const MINUTES = 60_000;

function makeConversation(
  overrides: Partial<UnifiedConversation> = {}
): UnifiedConversation {
  return {
    conversation_id: "fb_page_1_cust_1",
    platform: "facebook",
    sender_id: "cust_1",
    sender_name: "Alice",
    last_message: {
      id: "1",
      text: "hello",
      timestamp: "2026-07-22T11:30:00Z",
      is_from_business: false,
      platform_message_id: "mid_1",
    },
    message_count: 1,
    unread_count: 0,
    account_name: "Test Page",
    account_id: "page_1",
    assignment_status: "in_session",
    session_started_at: "2026-07-22T11:00:00Z",
    ...overrides,
  };
}

describe("computeStaleChats", () => {
  it("keeps chats older than the threshold, drops fresh ones", () => {
    const stale = makeConversation({
      conversation_id: "old",
      last_message: {
        ...makeConversation().last_message,
        timestamp: new Date(NOW - 90 * MINUTES).toISOString(),
      },
      session_started_at: new Date(NOW - 120 * MINUTES).toISOString(),
    });
    const fresh = makeConversation({
      conversation_id: "fresh",
      last_message: {
        ...makeConversation().last_message,
        timestamp: new Date(NOW - 10 * MINUTES).toISOString(),
      },
    });

    const result = computeStaleChats([stale, fresh], 60, NOW);
    expect(result.map((r) => r.conversation_id)).toEqual(["old"]);
  });

  it("a recent session start keeps a chat fresh even if the last message is old", () => {
    const row = makeConversation({
      last_message: {
        ...makeConversation().last_message,
        timestamp: new Date(NOW - 300 * MINUTES).toISOString(),
      },
      session_started_at: new Date(NOW - 5 * MINUTES).toISOString(),
    });
    expect(computeStaleChats([row], 60, NOW)).toEqual([]);
  });

  it("null session_started_at (widget enrichment gap) falls back to message time", () => {
    const row = makeConversation({
      session_started_at: undefined,
      last_message: {
        ...makeConversation().last_message,
        timestamp: new Date(NOW - 90 * MINUTES).toISOString(),
      },
    });
    expect(computeStaleChats([row], 60, NOW)).toHaveLength(1);
  });

  it("excludes widget rows whose session already ended", () => {
    const row = makeConversation({
      platform: "widget",
      conversation_id: "widget_3_sess_1",
      session_ended_at: new Date(NOW - 30 * MINUTES).toISOString(),
      last_message: {
        ...makeConversation().last_message,
        timestamp: new Date(NOW - 90 * MINUTES).toISOString(),
      },
    });
    expect(computeStaleChats([row], 60, NOW)).toEqual([]);
  });

  it("sorts oldest activity first", () => {
    const older = makeConversation({
      conversation_id: "older",
      session_started_at: undefined,
      last_message: {
        ...makeConversation().last_message,
        timestamp: new Date(NOW - 200 * MINUTES).toISOString(),
      },
    });
    const newer = makeConversation({
      conversation_id: "newer",
      session_started_at: undefined,
      last_message: {
        ...makeConversation().last_message,
        timestamp: new Date(NOW - 90 * MINUTES).toISOString(),
      },
    });
    const result = computeStaleChats([newer, older], 60, NOW);
    expect(result.map((r) => r.conversation_id)).toEqual(["older", "newer"]);
  });
});

describe("lastActivityMs", () => {
  it("returns the newer of message time and session start", () => {
    const row = makeConversation({
      last_message: {
        ...makeConversation().last_message,
        timestamp: "2026-07-22T10:00:00Z",
      },
      session_started_at: "2026-07-22T11:00:00Z",
    });
    expect(lastActivityMs(row)).toBe(Date.parse("2026-07-22T11:00:00Z"));
  });
});

describe("staleSignature", () => {
  it("is order-independent", () => {
    const a = makeConversation({ conversation_id: "a" });
    const b = makeConversation({ conversation_id: "b" });
    expect(staleSignature([a, b])).toBe(staleSignature([b, a]));
  });
});

describe("getAssignmentActionKey", () => {
  it("uses sender_id for non-widget platforms", () => {
    const row = makeConversation();
    expect(getAssignmentActionKey(row)).toEqual({
      platform: "facebook",
      conversation_id: "cust_1",
      account_id: "page_1",
    });
  });

  it("derives the widget session_id from the conversation slug (multi-underscore safe)", () => {
    const row = makeConversation({
      platform: "widget",
      conversation_id: "widget_3_abc_def",
      sender_id: "visitor_9",
      account_id: "3",
    });
    expect(getAssignmentActionKey(row)).toEqual({
      platform: "widget",
      conversation_id: "abc_def",
      account_id: "3",
    });
  });
});
