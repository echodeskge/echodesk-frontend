/**
 * Short-lived registry of recently-ended chat ids, used to suppress the
 * rating-request `new_message` echo from resurrecting the chat in the
 * sidebar right after a user ends a session.
 *
 * Why this exists (mirrors MessagesChat.tsx:270-330): when an agent ends a
 * widget session or assignment session, the backend sends a rating-request
 * message back to the customer. That message echoes through the WS
 * `new_message` group, and beta's `appendMessage` would fabricate a fresh
 * row for the now-archived chat — making it briefly reappear in the All
 * tab before the `archive_update` frame catches up.
 *
 * The block window is 60s in legacy. Beyond that, the chat is either
 * truly closed (and stays out) or genuinely active again (and should
 * reappear if the customer messages back).
 *
 * Module-level Set + timestamp map keeps this side-concern out of the
 * Zustand store, which would have to special-case the block on every
 * read. The dispatcher just consults this module before fabricating a
 * placeholder row.
 */
const END_SESSION_BLOCK_MS = 60_000;

const endedAt = new Map<string, number>();

/** Mark a chat as just-ended. Called from the End Session UX. */
export function registerEndedChat(chatId: string): void {
  endedAt.set(chatId, Date.now());
}

/** True when a WS new_message for this chat should be suppressed (window open). */
export function isInEndSessionBlockWindow(chatId: string): boolean {
  const ts = endedAt.get(chatId);
  if (ts == null) return false;
  if (Date.now() - ts > END_SESSION_BLOCK_MS) {
    endedAt.delete(chatId); // GC stale entry on read
    return false;
  }
  return true;
}

/** Test-only: clear the block registry between cases. */
export function _resetEndSessionBlockRegistry(): void {
  endedAt.clear();
}
