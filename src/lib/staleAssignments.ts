import type { UnifiedConversation } from "@/api/generated/interfaces";

/**
 * Pure helpers for the stale-assignment reminder popup.
 *
 * Data source is GET /api/social/conversations/?assigned=true — the current
 * user's active/in_session assigned conversations with sender names and
 * last-message timestamps.
 *
 * Widget quirk: the unified list keys widget rows by visitor_id while
 * ChatAssignment keys them by session_id, so widget rows may carry null
 * assignment fields and their action key must be derived from the
 * conversation_id slug (`widget_<connectionId>_<sessionId>`).
 */

/** Latest activity we know about: newer of last message and session start. */
export function lastActivityMs(row: UnifiedConversation): number {
  const messageMs = row.last_message?.timestamp
    ? Date.parse(row.last_message.timestamp)
    : 0;
  const sessionMs = row.session_started_at ? Date.parse(row.session_started_at) : 0;
  return Math.max(messageMs || 0, sessionMs || 0);
}

export function computeStaleChats(
  rows: UnifiedConversation[],
  thresholdMinutes: number,
  nowMs: number
): UnifiedConversation[] {
  const thresholdMs = thresholdMinutes * 60_000;
  return rows
    .filter((row) => {
      // Closed widget sessions are already over — nothing to remind about.
      if (row.platform === "widget" && row.session_ended_at) return false;
      const activity = lastActivityMs(row);
      if (!activity) return false;
      return nowMs - activity > thresholdMs;
    })
    .sort((a, b) => lastActivityMs(a) - lastActivityMs(b));
}

/**
 * Stable key for "have I already shown exactly this set of stale chats" —
 * used so dismissing the popup keeps it closed until a NEW chat goes stale.
 */
export function staleSignature(rows: UnifiedConversation[]): string {
  return rows
    .map((r) => r.conversation_id)
    .sort()
    .join("|");
}

/**
 * The (platform, conversation_id, account_id) triple the assignment
 * endpoints expect. For widget rows the assignment's conversation_id is the
 * session_id embedded in the chatId slug, not the sender_id (visitor_id).
 */
export function getAssignmentActionKey(row: UnifiedConversation): {
  platform: UnifiedConversation["platform"];
  conversation_id: string;
  account_id: string;
} {
  const conversationId =
    row.platform === "widget"
      ? row.conversation_id.split("_").slice(2).join("_")
      : row.sender_id;
  return {
    platform: row.platform,
    conversation_id: conversationId,
    account_id: row.account_id,
  };
}
