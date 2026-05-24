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
  /** `social_settings.chat_assignment_enabled`. When true, the All tab
   *  hides chats already assigned to ME (they live in the Assigned tab
   *  instead). Mirrors legacy chat-sidebar-list.tsx:62. */
  assignmentEnabled: boolean;
  /** `social_settings.hide_assigned_chats`. When true, the All tab ALSO
   *  hides chats assigned to OTHER agents. Admins are exempt — they
   *  always see every chat regardless of this flag, matching the backend
   *  `is_superuser or is_staff` carve-out in views.py:5559. */
  hideAssignedChats: boolean;
  /** True for staff / superuser. Skips the hide_assigned_chats filter so
   *  admins can audit every conversation in the tenant. */
  isAdmin: boolean;
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
    // Match legacy: when assignment mode is on, MY assigned chats drop
    // from All (they show in the Assigned tab). This is independent of
    // hide_assigned_chats, which controls visibility of OTHERS' chats.
    if (ctx.assignmentEnabled && isAssignedToMe(state, row.id, ctx.currentUserId)) {
      return false;
    }
    // Admins always see every chat (parity with backend's non-staff
    // carve-out in unified_conversations).
    if (!ctx.isAdmin && ctx.hideAssignedChats && isAssignedToOther(state, row.id, ctx.currentUserId)) {
      return false;
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
