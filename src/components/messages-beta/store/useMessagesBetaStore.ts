import { create } from "zustand";

import { replyPreviewLabel } from "@/lib/chatAdapter";
import type { MessageType } from "@/components/chat/types";

import type {
  ArchiveMeta,
  AssignmentTab,
  BetaPlatform,
  ChatAssignmentSlice,
  ConversationRow,
  MessagesBetaState,
  WsState,
} from "./types";

export interface MessagesBetaActions {
  reset: () => void;

  setBootstrapState: (state: MessagesBetaState["bootstrapState"]) => void;
  setArchivedListState: (state: MessagesBetaState["archivedListState"]) => void;
  /** Bulk-set the conversation list from the REST bootstrap. */
  hydrateConversations: (rows: ConversationRow[]) => void;
  /** Bulk-set the assignment slice; used during bootstrap (REST) and on assignment_update (WS). */
  patchAssignment: (chatId: string, slice: ChatAssignmentSlice | null) => void;
  patchArchive: (chatId: string, meta: ArchiveMeta | null) => void;

  hydrateMessages: (chatId: string, messages: MessageType[]) => void;
  /**
   * Append a WS message. `seedRow` is consulted when the chat isn't in
   * `conversations[]` yet (brand-new sender, or sender we never paginated
   * to) — without it, the chat would be invisible in the sidebar until the
   * next REST refresh, defeating the socket-first design.
   */
  appendMessage: (
    chatId: string,
    message: MessageType,
    isSelected: boolean,
    seedRow?: Partial<Pick<ConversationRow, "platform" | "name" | "avatar" | "accountId" | "conversationKey">>
  ) => void;
  /**
   * Insert a placeholder conversation row before its REST data exists,
   * used when the user deep-links directly to a chatId that hasn't been
   * paginated into the bootstrap list. Idempotent: if the row already
   * exists this is a no-op.
   */
  ensureConversationRow: (chatId: string, seed: Pick<ConversationRow, "platform" | "accountId" | "conversationKey" | "name">) => void;
  updateLastMessage: (chatId: string, content: string, createdAt: string) => void;
  setUnread: (chatId: string, count: number) => void;
  clearUnread: (chatId: string) => void;
  /** Bulk-clear unread for every conversation on the given platform.
   * Used to consume `read_state_update` frames with conversation_id=null
   * (the bulk "mark all read" hint emitted by mark_all_conversations_read).
   */
  clearAllUnreadForPlatform: (platform: ConversationRow["platform"]) => void;
  setReadWatermark: (chatId: string, isoTs: string) => void;
  /** Upgrade the status pip (SENT→DELIVERED→READ) on the matching messages.
   *  Matches by id OR platformMessageId; never downgrades. Driven by the
   *  `message_status` WS frame. */
  setMessagesStatus: (chatId: string, messageIds: Array<string | number>, status: string) => void;
  /** Set/clear a message's reaction emoji. Empty string clears it. Matches
   *  by id OR platformMessageId. Driven by the `reaction_update` WS frame. */
  setMessageReaction: (chatId: string, messageRef: string | number, emoji: string) => void;
  /** Patch the archive slice for every conversation on the given platform.
   * Used to consume `archive_update` frames with conversation_id=null (the
   * bulk archive-all hint).
   */
  bulkPatchArchiveForPlatform: (
    platform: ConversationRow["platform"],
    archived: boolean,
    archivedAt: string | null
  ) => void;
  setSessionEnded: (
    chatId: string,
    endedAt: string | null,
    endedBy: ConversationRow["sessionEndedBy"]
  ) => void;

  selectChat: (chatId: string | null) => void;

  /** Drop a conversation locally — used by the delete flow + (PR F) the
   *  `conversation_deleted` WS handler. Wipes the row, its messages, and
   *  every per-chat side slice. If the row was selected, deselects it. */
  removeConversation: (chatId: string) => void;

  setWsState: (state: WsState) => void;
  touchWs: () => void;

  // --- PR A: sidebar filter actions ---
  setSearchQuery: (q: string) => void;
  setPlatformFilter: (p: BetaPlatform | null) => void;
  setShowArchived: (v: boolean) => void;
  setAssignmentTab: (t: AssignmentTab) => void;

  // --- PR A: conversations pagination ---
  /** Set after a fetch — null means there is no next page. */
  setNextConversationsPage: (page: number | null) => void;
  setIsFetchingNextPage: (v: boolean) => void;
  /** Append more rows from a paginated fetch. Skips rows whose id already
   *  exists so a re-fetch (e.g. on reconnect) can't double-insert. */
  appendConversations: (rows: ConversationRow[]) => void;

  // --- PR B: thread actions ---
  /** Replace the message list for a chat from a full-history fetch. Also
   *  flips fullHistoryLoadedByChatId so the "Load older" button hides. */
  setFullHistoryForChat: (chatId: string, messages: MessageType[]) => void;
  setIsLoadingFullHistory: (v: boolean) => void;
  setMessageSearchQuery: (q: string) => void;

  // --- PR C: composer actions ---
  setReplyingTo: (
    reply: { messageId: string; text?: string; senderName?: string } | null
  ) => void;

  // --- PR E: customer profile side rail ---
  setShowClientPanel: (v: boolean) => void;

  // --- Mobile sidebar drawer ---
  setIsMobileSidebarOpen: (v: boolean) => void;
}

export type MessagesBetaStore = MessagesBetaState & MessagesBetaActions;

const initialState: MessagesBetaState = {
  conversations: [],
  messagesByChatId: {},
  selectedChatId: null,
  unreadByChatId: {},
  assignmentByChatId: {},
  archivedByChatId: {},
  readWatermarkByChatId: {},
  messagesLoaded: {},
  wsState: "idle",
  lastWsActivityAt: 0,
  bootstrapState: "pending",
  archivedListState: "pending",

  // PR A sidebar slices — defaults match the legacy page's initial render.
  searchQuery: "",
  platformFilter: null,
  showArchived: false,
  assignmentTab: "all",
  nextConversationsPage: null,
  isFetchingNextPage: false,

  // PR B thread slices.
  fullHistoryLoadedByChatId: {},
  isLoadingFullHistory: false,
  messageSearchQuery: "",

  // PR C composer slices.
  replyingTo: null,

  // PR E side-rail slice — closed by default; user opens via header toggle.
  showClientPanel: false,

  // Mobile sidebar drawer — closed by default; opens via hamburger.
  isMobileSidebarOpen: false,
};

/**
 * Sorts the conversation list desc by lastMessage.createdAt so the most
 * recent activity is on top. Stable for empty timestamps (those drop to
 * the bottom, preserving insertion order among themselves).
 */
function sortConversations(rows: ConversationRow[]): ConversationRow[] {
  return [...rows].sort((a, b) => {
    const at = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
    const bt = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
    return bt - at;
  });
}

export const useMessagesBetaStore = create<MessagesBetaStore>((set) => ({
  ...initialState,

  reset: () => set(initialState),

  setBootstrapState: (bootstrapState) => set({ bootstrapState }),
  setArchivedListState: (archivedListState) => set({ archivedListState }),

  hydrateConversations: (rows) =>
    set((state) => {
      const unread: Record<string, number> = { ...state.unreadByChatId };
      for (const r of rows) unread[r.id] = r.unreadCount;
      return {
        conversations: sortConversations(rows),
        unreadByChatId: unread,
      };
    }),

  patchAssignment: (chatId, slice) =>
    set((state) => ({
      assignmentByChatId: { ...state.assignmentByChatId, [chatId]: slice },
    })),

  patchArchive: (chatId, meta) =>
    set((state) => ({
      archivedByChatId: { ...state.archivedByChatId, [chatId]: meta },
    })),

  hydrateMessages: (chatId, messages) =>
    set((state) => ({
      messagesByChatId: { ...state.messagesByChatId, [chatId]: messages },
      messagesLoaded: { ...state.messagesLoaded, [chatId]: true },
    })),

  appendMessage: (chatId, message, isSelected, seedRow) =>
    set((state) => {
      const existing = state.messagesByChatId[chatId] || [];
      // De-dupe by id OR platformMessageId — the same frame can arrive twice
      // (tenant-group + per-conversation-group double delivery, or echo of a
      // just-sent message). Without this dupe guard we'd render doubles.
      const hasUsable = (v: unknown): v is string | number =>
        v != null && v !== "" && v !== "undefined" && v !== "null";
      const idKey = hasUsable(message.id) ? message.id : undefined;
      const pKey = hasUsable(message.platformMessageId) ? message.platformMessageId : undefined;
      if (idKey !== undefined || pKey !== undefined) {
        const dup = existing.some(
          (m) => (idKey !== undefined && m.id === idKey) || (pKey !== undefined && m.platformMessageId === pKey)
        );
        if (dup) return {};
      }

      // Resolve a reply quote against the already-loaded thread when the frame
      // only carried the id (the common live case). Mirrors the REST adapter's
      // resolution in chatAdapter.ts (convertUnifiedMessagesToMessageType).
      let finalMessage = message;
      if ((message.replyToId || message.replyToMessageId) && !message.replyToText) {
        // Match the quoted message by DB id (reply_to_id) OR platform message
        // id (reply_to_message_id) — live frames sometimes carry only one.
        const original = existing.find(
          (m) =>
            (message.replyToId != null && m.id === String(message.replyToId)) ||
            (!!message.replyToMessageId && m.platformMessageId === message.replyToMessageId)
        );
        if (original) {
          finalMessage = {
            ...message,
            replyToText: replyPreviewLabel(original),
            replyToSenderName:
              original.senderName || (original.senderId === "business" ? "You" : undefined),
          };
        }
      }

      const nextMessages = { ...state.messagesByChatId, [chatId]: [...existing, finalMessage] };

      // Update the conversation row's lastMessage + reorder to top so the
      // sidebar reflects the WS push without re-fetching the list. Match the
      // legacy attachment labels instead of bare "Image"/"File".
      const previewText =
        finalMessage.text ||
        (finalMessage.voiceMessage ? "🎵 Audio" : "") ||
        (finalMessage.images?.length
          ? finalMessage.images[0]?.type === "video"
            ? "🎬 Video"
            : "📷 Image"
          : "") ||
        (finalMessage.files?.length
          ? finalMessage.files[0]?.name && finalMessage.files[0].name !== "attachment"
            ? `📎 ${finalMessage.files[0].name}`
            : "📎 Attachment"
          : "") ||
        "";
      const lastMessage = {
        content: previewText,
        createdAt: finalMessage.createdAt.toISOString(),
      };

      const rowExists = state.conversations.some((r) => r.id === chatId);

      let updatedRows: ConversationRow[];
      if (rowExists) {
        updatedRows = state.conversations.map((row) =>
          row.id === chatId ? { ...row, lastMessage } : row
        );
      } else {
        // New sender we'd never paginated to — fabricate a minimal row from
        // the WS payload so the sidebar shows them immediately. The next
        // REST refresh (or list reconnect-resync) overwrites name / avatar
        // / metadata with the authoritative server view.
        const fabricated: ConversationRow = {
          id: chatId,
          platform: (seedRow?.platform as ConversationRow["platform"]) || (message.platform as ConversationRow["platform"]) || "facebook",
          accountId: seedRow?.accountId || "",
          conversationKey: seedRow?.conversationKey || chatId,
          name: seedRow?.name || message.senderName || "New conversation",
          avatar: seedRow?.avatar,
          lastMessage,
          unreadCount: 0,
        };
        updatedRows = [fabricated, ...state.conversations];
      }

      const unread = { ...state.unreadByChatId };
      if (!isSelected) {
        unread[chatId] = (unread[chatId] || 0) + 1;
      }

      return {
        messagesByChatId: nextMessages,
        conversations: sortConversations(updatedRows),
        unreadByChatId: unread,
      };
    }),

  ensureConversationRow: (chatId, seed) =>
    set((state) => {
      if (state.conversations.some((r) => r.id === chatId)) return {};
      const placeholder: ConversationRow = {
        id: chatId,
        platform: seed.platform,
        accountId: seed.accountId,
        conversationKey: seed.conversationKey,
        name: seed.name,
        lastMessage: null,
        unreadCount: 0,
      };
      return { conversations: sortConversations([placeholder, ...state.conversations]) };
    }),

  updateLastMessage: (chatId, content, createdAt) =>
    set((state) => {
      const updatedRows = state.conversations.map((row) =>
        row.id === chatId ? { ...row, lastMessage: { content, createdAt } } : row
      );
      return { conversations: sortConversations(updatedRows) };
    }),

  setUnread: (chatId, count) =>
    set((state) => ({
      unreadByChatId: { ...state.unreadByChatId, [chatId]: count },
    })),

  clearUnread: (chatId) =>
    set((state) => {
      if (!state.unreadByChatId[chatId]) return {};
      const next = { ...state.unreadByChatId };
      next[chatId] = 0;
      return { unreadByChatId: next };
    }),

  clearAllUnreadForPlatform: (platform) =>
    set((state) => {
      const next: Record<string, number> = { ...state.unreadByChatId };
      let changed = false;
      for (const row of state.conversations) {
        if (row.platform === platform && next[row.id]) {
          next[row.id] = 0;
          changed = true;
        }
      }
      return changed ? { unreadByChatId: next } : {};
    }),

  setReadWatermark: (chatId, isoTs) =>
    set((state) => ({
      readWatermarkByChatId: { ...state.readWatermarkByChatId, [chatId]: isoTs },
    })),

  setMessagesStatus: (chatId, messageIds, status) =>
    set((state) => {
      const existing = state.messagesByChatId[chatId];
      if (!existing || !existing.length) return {};
      const idSet = new Set(messageIds.map((m) => String(m)));
      // Rank guard so a late DELIVERED frame can't downgrade a READ pip.
      const rank: Record<string, number> = { SENT: 0, DELIVERED: 1, READ: 2 };
      const incomingRank = rank[status] ?? 0;
      let changed = false;
      const next = existing.map((m) => {
        const matches =
          idSet.has(String(m.id)) ||
          (m.platformMessageId != null && idSet.has(String(m.platformMessageId)));
        if (!matches) return m;
        if ((rank[m.status] ?? 0) >= incomingRank) return m;
        changed = true;
        return { ...m, status };
      });
      return changed
        ? { messagesByChatId: { ...state.messagesByChatId, [chatId]: next } }
        : {};
    }),

  setMessageReaction: (chatId, messageRef, emoji) =>
    set((state) => {
      const existing = state.messagesByChatId[chatId];
      if (!existing || !existing.length) return {};
      const ref = String(messageRef);
      let changed = false;
      const next = existing.map((m) => {
        const matches =
          String(m.id) === ref ||
          (m.platformMessageId != null && String(m.platformMessageId) === ref);
        if (!matches) return m;
        changed = true;
        const value = emoji || undefined;
        return { ...m, reactionEmoji: value, reaction: value };
      });
      return changed
        ? { messagesByChatId: { ...state.messagesByChatId, [chatId]: next } }
        : {};
    }),

  bulkPatchArchiveForPlatform: (platform, archived, archivedAt) =>
    set((state) => {
      const next: Record<string, ArchiveMeta | null> = { ...state.archivedByChatId };
      let changed = false;
      for (const row of state.conversations) {
        if (row.platform !== platform) continue;
        if (archived) {
          if (!next[row.id]) {
            next[row.id] = { archivedAt: archivedAt || new Date().toISOString(), byUserId: null };
            changed = true;
          }
        } else if (next[row.id]) {
          next[row.id] = null;
          changed = true;
        }
      }
      return changed ? { archivedByChatId: next } : {};
    }),

  setSessionEnded: (chatId, endedAt, endedBy) =>
    set((state) => ({
      conversations: state.conversations.map((row) =>
        row.id === chatId
          ? { ...row, sessionEndedAt: endedAt, sessionEndedBy: endedBy }
          : row
      ),
    })),

  selectChat: (chatId) => set({ selectedChatId: chatId }),

  removeConversation: (chatId) =>
    set((state) => {
      const stripFromRecord = <T,>(rec: Record<string, T>): Record<string, T> => {
        if (!(chatId in rec)) return rec;
        const next = { ...rec };
        delete next[chatId];
        return next;
      };
      return {
        conversations: state.conversations.filter((row) => row.id !== chatId),
        messagesByChatId: stripFromRecord(state.messagesByChatId),
        unreadByChatId: stripFromRecord(state.unreadByChatId),
        assignmentByChatId: stripFromRecord(state.assignmentByChatId),
        archivedByChatId: stripFromRecord(state.archivedByChatId),
        readWatermarkByChatId: stripFromRecord(state.readWatermarkByChatId),
        messagesLoaded: stripFromRecord(state.messagesLoaded),
        fullHistoryLoadedByChatId: stripFromRecord(state.fullHistoryLoadedByChatId),
        selectedChatId: state.selectedChatId === chatId ? null : state.selectedChatId,
      };
    }),

  setWsState: (wsState) => set({ wsState }),

  touchWs: () => set({ lastWsActivityAt: Date.now() }),

  // --- PR A: sidebar filter actions ---
  setSearchQuery: (q) => set({ searchQuery: q }),
  setPlatformFilter: (p) => set({ platformFilter: p }),
  setShowArchived: (v) => set({ showArchived: v }),
  setAssignmentTab: (t) => set({ assignmentTab: t }),

  // --- PR A: conversations pagination ---
  setNextConversationsPage: (page) => set({ nextConversationsPage: page }),
  setIsFetchingNextPage: (v) => set({ isFetchingNextPage: v }),
  appendConversations: (rows) =>
    set((state) => {
      if (!rows.length) return {};
      // Skip rows we already have; merge unread + carry over WS-driven
      // lastMessage state for rows we've been patching while the next page
      // was in flight.
      const existingIds = new Set(state.conversations.map((r) => r.id));
      const additions = rows.filter((r) => !existingIds.has(r.id));
      if (!additions.length) return {};
      const unread = { ...state.unreadByChatId };
      for (const r of additions) {
        // Don't clobber an unread count we've been incrementing via WS while
        // the user was scrolling; only seed when we have nothing yet.
        if (unread[r.id] == null) unread[r.id] = r.unreadCount;
      }
      return {
        conversations: sortConversations([...state.conversations, ...additions]),
        unreadByChatId: unread,
      };
    }),

  // --- PR B: thread actions ---
  setFullHistoryForChat: (chatId, messages) =>
    set((state) => ({
      messagesByChatId: { ...state.messagesByChatId, [chatId]: messages },
      messagesLoaded: { ...state.messagesLoaded, [chatId]: true },
      fullHistoryLoadedByChatId: { ...state.fullHistoryLoadedByChatId, [chatId]: true },
    })),
  setIsLoadingFullHistory: (v) => set({ isLoadingFullHistory: v }),
  setMessageSearchQuery: (q) => set({ messageSearchQuery: q }),

  // --- PR C: composer actions ---
  setReplyingTo: (reply) => set({ replyingTo: reply }),

  // --- PR E: side-rail action ---
  setShowClientPanel: (v) => set({ showClientPanel: v }),

  // --- Mobile sidebar drawer ---
  setIsMobileSidebarOpen: (v) => set({ isMobileSidebarOpen: v }),
}));
