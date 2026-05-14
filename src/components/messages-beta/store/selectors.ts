/**
 * Derived views over the store. Sidebar tabs are pure functions of the store
 * slices — this is what makes cross-user updates feel instant: when an
 * `assignment_update` frame patches assignmentByChatId, the next render
 * recomputes the tab list and the chat moves/disappears without any
 * imperative "hide this chat" code.
 */
import type { ConversationRow, MessagesBetaState } from "./types";

export interface TabContext {
  currentUserId: number | null;
  hideAssignedChats: boolean;
}

function isAssignedToOther(
  state: Pick<MessagesBetaState, "assignmentByChatId">,
  chatId: string,
  currentUserId: number | null
): boolean {
  const slice = state.assignmentByChatId[chatId];
  if (!slice || !slice.assignedUserId) return false;
  return currentUserId == null || slice.assignedUserId !== currentUserId;
}

function isAssignedToMe(
  state: Pick<MessagesBetaState, "assignmentByChatId">,
  chatId: string,
  currentUserId: number | null
): boolean {
  if (currentUserId == null) return false;
  const slice = state.assignmentByChatId[chatId];
  return !!slice && slice.assignedUserId === currentUserId;
}

function isArchived(
  state: Pick<MessagesBetaState, "archivedByChatId">,
  chatId: string
): boolean {
  return !!state.archivedByChatId[chatId];
}

export function selectAllTabConversations(
  state: Pick<MessagesBetaState, "conversations" | "assignmentByChatId" | "archivedByChatId">,
  ctx: TabContext
): ConversationRow[] {
  return state.conversations.filter((row) => {
    if (isArchived(state, row.id)) return false;
    // When hide_assigned_chats is on, drop chats owned by *other* agents.
    // Chats owned by me also drop from All (they show in Assigned instead).
    if (ctx.hideAssignedChats) {
      if (isAssignedToOther(state, row.id, ctx.currentUserId)) return false;
      if (isAssignedToMe(state, row.id, ctx.currentUserId)) return false;
    }
    return true;
  });
}

export function selectAssignedTabConversations(
  state: Pick<MessagesBetaState, "conversations" | "assignmentByChatId" | "archivedByChatId">,
  ctx: TabContext
): ConversationRow[] {
  return state.conversations.filter((row) => {
    if (isArchived(state, row.id)) return false;
    return isAssignedToMe(state, row.id, ctx.currentUserId);
  });
}

export function selectArchivedConversations(
  state: Pick<MessagesBetaState, "conversations" | "archivedByChatId">
): ConversationRow[] {
  return state.conversations.filter((row) => isArchived(state, row.id));
}

export function selectMessagesForChat(
  state: Pick<MessagesBetaState, "messagesByChatId">,
  chatId: string | null
) {
  if (!chatId) return [];
  return state.messagesByChatId[chatId] || [];
}
