import { create } from "zustand";

import type { MessageType } from "@/components/chat/types";

import type {
  ArchiveMeta,
  ChatAssignmentSlice,
  ConversationRow,
  MessagesBetaState,
  WsState,
} from "./types";

export interface MessagesBetaActions {
  reset: () => void;

  setBootstrapState: (state: MessagesBetaState["bootstrapState"]) => void;
  /** Bulk-set the conversation list from the REST bootstrap. */
  hydrateConversations: (rows: ConversationRow[]) => void;
  /** Bulk-set the assignment slice; used during bootstrap (REST) and on assignment_update (WS). */
  patchAssignment: (chatId: string, slice: ChatAssignmentSlice | null) => void;
  patchArchive: (chatId: string, meta: ArchiveMeta | null) => void;

  hydrateMessages: (chatId: string, messages: MessageType[]) => void;
  appendMessage: (chatId: string, message: MessageType, isSelected: boolean) => void;
  updateLastMessage: (chatId: string, content: string, createdAt: string) => void;
  setUnread: (chatId: string, count: number) => void;
  clearUnread: (chatId: string) => void;
  setReadWatermark: (chatId: string, isoTs: string) => void;
  setSessionEnded: (
    chatId: string,
    endedAt: string | null,
    endedBy: ConversationRow["sessionEndedBy"]
  ) => void;

  selectChat: (chatId: string | null) => void;

  setWsState: (state: WsState) => void;
  touchWs: () => void;
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

  appendMessage: (chatId, message, isSelected) =>
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

      const nextMessages = { ...state.messagesByChatId, [chatId]: [...existing, message] };

      // Update the conversation row's lastMessage + reorder to top so the
      // sidebar reflects the WS push without re-fetching the list.
      const previewText =
        message.text || (message.images && "Image") || (message.files && "File") || "";
      const updatedRows = state.conversations.map((row) =>
        row.id === chatId
          ? {
              ...row,
              lastMessage: { content: previewText, createdAt: message.createdAt.toISOString() },
            }
          : row
      );

      // If chat wasn't in our list yet (first ever message), we don't fabricate
      // a row here — the REST bootstrap or list refetch will hand us a row
      // with name/avatar/etc. Until then the message sits in messagesByChatId
      // waiting for its parent row.
      const conversations = updatedRows.some((r) => r.id === chatId)
        ? sortConversations(updatedRows)
        : updatedRows;

      const unread = { ...state.unreadByChatId };
      if (!isSelected) {
        unread[chatId] = (unread[chatId] || 0) + 1;
      }

      return {
        messagesByChatId: nextMessages,
        conversations,
        unreadByChatId: unread,
      };
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

  setReadWatermark: (chatId, isoTs) =>
    set((state) => ({
      readWatermarkByChatId: { ...state.readWatermarkByChatId, [chatId]: isoTs },
    })),

  setSessionEnded: (chatId, endedAt, endedBy) =>
    set((state) => ({
      conversations: state.conversations.map((row) =>
        row.id === chatId
          ? { ...row, sessionEndedAt: endedAt, sessionEndedBy: endedBy }
          : row
      ),
    })),

  selectChat: (chatId) => set({ selectedChatId: chatId }),

  setWsState: (wsState) => set({ wsState }),

  touchWs: () => set({ lastWsActivityAt: Date.now() }),
}));
