import { socialAssignmentsStatusRetrieve } from "@/api/generated/api";

import type { ConversationRow } from "./types";
import { useMessagesBetaStore } from "./useMessagesBetaStore";

/**
 * Resolve the archive (History) state of a deep-linked chat.
 *
 * Archived chats are excluded from the active conversations list, so a
 * deep-linked row fabricated by `ensureConversationRow` has no entry in
 * `archivedByChatId` (`undefined` = never fetched, vs `null` = known
 * active). Without this check an archived chat masquerades as active in
 * the All tab.
 *
 * On success:
 *  - archived → switch the sidebar to the History view (only if the chat
 *    is still selected and we're not already there) and patch the meta so
 *    the row lands in the History list with a correct Restore header.
 *  - not archived → patch `null` so the state is known-active.
 *
 * A WS `archive_update` that lands mid-flight wins — it is fresher than
 * our snapshot. On fetch failure we leave the state untouched (today's
 * behavior: the chat shows in All).
 */
export async function resolveDeepLinkArchiveState(
  chatId: string,
  row: Pick<ConversationRow, "platform" | "accountId" | "conversationKey">
): Promise<void> {
  try {
    const status = await socialAssignmentsStatusRetrieve(
      row.accountId,
      row.conversationKey,
      row.platform
    );

    const state = useMessagesBetaStore.getState();
    if (state.archivedByChatId[chatId] !== undefined) return;

    if (status.is_archived) {
      if (state.selectedChatId === chatId && !state.showArchived) {
        state.setShowArchived(true);
      }
      state.patchArchive(chatId, {
        archivedAt: status.archived_at ?? new Date().toISOString(),
        byUserId: status.archived_by_id ?? null,
      });
    } else {
      state.patchArchive(chatId, null);
    }
  } catch (err) {
    console.warn("[messages-beta] archive-status check failed:", err);
  }
}
