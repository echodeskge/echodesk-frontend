/**
 * Derived views over the store. Sidebar tabs are pure functions of the store
 * slices — this is what makes cross-user updates feel instant: when an
 * `assignment_update` frame patches assignmentByChatId, the next render
 * recomputes the tab list and the chat moves/disappears without any
 * imperative "hide this chat" code.
 */
import type { BetaPlatform, ConversationRow, MessagesBetaState } from "./types";

export interface TabContext {
  currentUserId: number | null;
  hideAssignedChats: boolean;
}

/**
 * PR A additions: search + platformFilter are applied uniformly across All /
 * Assigned / Archive tabs. Centralised here so the filter semantics stay
 * consistent — adding a new filter in the future is a single edit.
 *
 * Matching rules (mirror legacy chat-sidebar-list.tsx:70–78):
 *   • search → case-insensitive substring match on name, lastMessage.content,
 *     and platform name.
 *   • platformFilter → exact platform match when set, no-op otherwise.
 */
function matchesSearchAndPlatform(
  row: ConversationRow,
  search: string,
  platformFilter: BetaPlatform | null
): boolean {
  if (platformFilter && row.platform !== platformFilter) return false;
  const q = search.trim().toLowerCase();
  if (!q) return true;
  if (row.name?.toLowerCase().includes(q)) return true;
  if (row.lastMessage?.content?.toLowerCase().includes(q)) return true;
  if (row.platform?.toLowerCase().includes(q)) return true;
  return false;
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

/**
 * The filter slice (search + platformFilter) is optional on the selector
 * input type. Real callers always pass the full store and get filtering;
 * unit tests that build a minimal state object can omit them and still
 * exercise the assignment / archive logic without rewriting every fixture.
 */
type FilterSlice = Partial<Pick<MessagesBetaState, "searchQuery" | "platformFilter">>;

export function selectAllTabConversations(
  state: Pick<MessagesBetaState, "conversations" | "assignmentByChatId" | "archivedByChatId"> & FilterSlice,
  ctx: TabContext
): ConversationRow[] {
  const search = state.searchQuery ?? "";
  const platformFilter = state.platformFilter ?? null;
  return state.conversations.filter((row) => {
    if (isArchived(state, row.id)) return false;
    // When hide_assigned_chats is on, drop chats owned by *other* agents.
    // Chats owned by me also drop from All (they show in Assigned instead).
    if (ctx.hideAssignedChats) {
      if (isAssignedToOther(state, row.id, ctx.currentUserId)) return false;
      if (isAssignedToMe(state, row.id, ctx.currentUserId)) return false;
    }
    return matchesSearchAndPlatform(row, search, platformFilter);
  });
}

export function selectAssignedTabConversations(
  state: Pick<MessagesBetaState, "conversations" | "assignmentByChatId" | "archivedByChatId"> & FilterSlice,
  ctx: TabContext
): ConversationRow[] {
  const search = state.searchQuery ?? "";
  const platformFilter = state.platformFilter ?? null;
  return state.conversations.filter((row) => {
    if (isArchived(state, row.id)) return false;
    if (!isAssignedToMe(state, row.id, ctx.currentUserId)) return false;
    return matchesSearchAndPlatform(row, search, platformFilter);
  });
}

export function selectArchivedConversations(
  state: Pick<MessagesBetaState, "conversations" | "archivedByChatId"> & FilterSlice
): ConversationRow[] {
  const search = state.searchQuery ?? "";
  const platformFilter = state.platformFilter ?? null;
  return state.conversations.filter((row) => {
    if (!isArchived(state, row.id)) return false;
    return matchesSearchAndPlatform(row, search, platformFilter);
  });
}

export function selectMessagesForChat(
  state: Pick<MessagesBetaState, "messagesByChatId">,
  chatId: string | null
) {
  if (!chatId) return [];
  return state.messagesByChatId[chatId] || [];
}
