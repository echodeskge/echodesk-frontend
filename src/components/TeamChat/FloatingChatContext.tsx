'use client';

import { createContext, useContext, useReducer, useMemo, ReactNode } from 'react';
import type { TeamChatUser, TeamChatConversation, TeamChatMessage } from './types';
import { DOCK, DOCK_PANEL_RIGHT } from './floatingDock';

// Layout constants (dock geometry lives in ./floatingDock and is shared with
// the PBX dialpad so the two can never overlap).
export const LAYOUT = {
  // Compact floating icon, tucked into the corner
  MAIN_ICON: { size: DOCK.SLOT_SIZE, right: DOCK.RIGHT, bottom: DOCK.BOTTOM },
  POPUP: { width: 320, height: 450 },
  WINDOW: { width: 280, height: 400, gap: DOCK.PANEL_GAP },
  BUBBLE: { size: DOCK.SLOT_SIZE, gap: DOCK.SLOT_GAP },
  Z_INDEX: {
    icon: DOCK.Z_INDEX.launcher,
    bubble: DOCK.Z_INDEX.bubble,
    window: DOCK.Z_INDEX.window,
    popup: DOCK.Z_INDEX.popup,
  },
  MAX_OPEN_CHATS: 4,
  MAX_TOTAL_CHATS: 6,
};

/** How many chat windows fit side by side next to the dock for a viewport width. */
export function computeMaxOpenChats(viewportWidth: number, reservedRight = 0): number {
  if (viewportWidth < DOCK.COMPACT_BREAKPOINT) return 1;
  // reservedRight: extra space taken beside the dock (the open dialpad popup).
  const fit = Math.floor(
    (viewportWidth - DOCK_PANEL_RIGHT - reservedRight) / (LAYOUT.WINDOW.width + LAYOUT.WINDOW.gap)
  );
  return Math.max(1, Math.min(LAYOUT.MAX_OPEN_CHATS, fit));
}

export interface OpenChat {
  id: string; // unique identifier
  conversation: TeamChatConversation | null;
  user: TeamChatUser;
  messages: TeamChatMessage[];
  unreadCount: number;
  lastMessage?: TeamChatMessage;
  // Note: position is determined by array index when rendering (last = rightmost)
}

export interface MinimizedChat {
  id: string;
  conversation: TeamChatConversation | null;
  user: TeamChatUser;
  messages: TeamChatMessage[];
  unreadCount: number;
  lastMessage?: TeamChatMessage;
}

export interface FloatingChatState {
  openChats: OpenChat[];
  minimizedChats: MinimizedChat[];
  isListOpen: boolean;
  /** Max windows shown side by side; derived from the viewport width. */
  maxOpen: number;
}

export type FloatingChatAction =
  | { type: 'OPEN_CHAT'; payload: { user: TeamChatUser; conversation?: TeamChatConversation | null } }
  | { type: 'MINIMIZE_CHAT'; payload: { chatId: string } }
  | { type: 'MAXIMIZE_CHAT'; payload: { chatId: string } }
  | { type: 'CLOSE_CHAT'; payload: { chatId: string } }
  | { type: 'CLOSE_ALL_CHATS' }
  | { type: 'TOGGLE_LIST' }
  | { type: 'CLOSE_LIST' }
  | { type: 'SET_MAX_OPEN'; payload: { maxOpen: number } }
  | { type: 'UPDATE_MESSAGES'; payload: { chatId: string; messages: TeamChatMessage[] } }
  | { type: 'ADD_MESSAGE'; payload: { chatId: string; message: TeamChatMessage } }
  | {
      type: 'RECEIVE_MESSAGE';
      payload: {
        message: TeamChatMessage;
        conversationId: number;
        /** The other participant (sender for incoming, recipient for own echoes). */
        peerId: number | null;
        currentUserId: number;
        /** Client id of the optimistic message this confirms, if any. */
        clientId?: string;
      };
    }
  | { type: 'MARK_MESSAGE_FAILED'; payload: { chatId: string; clientId: string } }
  | { type: 'REMOVE_MESSAGE'; payload: { chatId: string; clientId: string } }
  | { type: 'UPDATE_CONVERSATION'; payload: { chatId: string; conversation: TeamChatConversation } }
  | { type: 'UPDATE_UNREAD'; payload: { chatId: string; unreadCount: number } }
  | { type: 'MARK_READ'; payload: { chatId: string } }
  | { type: 'MESSAGES_READ'; payload: { messageIds: number[]; conversationId?: number | null; readBy: number } }
  | { type: 'CLEAR_MESSAGES'; payload: { chatId: string } };

// Generate unique chat ID from user
export const chatIdForUserId = (userId: number): string => `chat_${userId}`;
export const getChatId = (user: TeamChatUser): string => chatIdForUserId(user.id);

const isOptimistic = (m: TeamChatMessage) => !!m.status;

const byCreatedAt = (a: TeamChatMessage, b: TeamChatMessage) =>
  new Date(a.created_at).getTime() - new Date(b.created_at).getTime() || a.id - b.id;

/**
 * Merge a server snapshot into the locally held messages.
 *
 * Never drops a message that arrived over the WebSocket after the snapshot
 * was taken (union by id). Optimistic messages are dropped once the server
 * copy is present (matched by client_id, or by same sender + text for a copy
 * that is new in this snapshot).
 */
export function mergeMessages(existing: TeamChatMessage[], incoming: TeamChatMessage[]): TeamChatMessage[] {
  const byId = new Map<number, TeamChatMessage>();
  const existingIds = new Set<number>();
  const optimistic: TeamChatMessage[] = [];

  for (const m of existing) {
    if (isOptimistic(m)) optimistic.push(m);
    else {
      byId.set(m.id, m);
      existingIds.add(m.id);
    }
  }
  for (const m of incoming) byId.set(m.id, m); // server copy wins

  const fresh = incoming.filter((m) => !existingIds.has(m.id));
  const keptOptimistic = optimistic.filter(
    (o) =>
      !incoming.some((m) => m.client_id && m.client_id === o.client_id) &&
      !fresh.some((m) => m.sender.id === o.sender.id && (m.text ?? '') === (o.text ?? ''))
  );

  return [...[...byId.values()].sort(byCreatedAt), ...keptOptimistic];
}

/** Append one message, deduping by id and replacing a matching optimistic copy. */
export function appendMessage(
  messages: TeamChatMessage[],
  message: TeamChatMessage,
  clientId?: string
): TeamChatMessage[] {
  const cid = clientId ?? message.client_id;
  const withoutOptimistic = cid ? messages.filter((m) => !(isOptimistic(m) && m.client_id === cid)) : messages;
  if (withoutOptimistic.some((m) => m.id === message.id && !isOptimistic(m))) {
    return withoutOptimistic.length === messages.length ? messages : withoutOptimistic;
  }
  if (cid && withoutOptimistic.length !== messages.length) {
    // Put the confirmed message where the optimistic one was.
    const idx = messages.findIndex((m) => isOptimistic(m) && m.client_id === cid);
    const next = [...withoutOptimistic];
    next.splice(idx, 0, message);
    return next;
  }
  return [...messages, message];
}

const lastOf = (messages: TeamChatMessage[]) => messages[messages.length - 1];

/**
 * Keep every chat visible: windows beyond `maxOpen` become bubbles (oldest
 * first) instead of being silently hidden, and the total cap drops the
 * oldest bubbles.
 */
function enforceLimits(state: FloatingChatState): FloatingChatState {
  let open = state.openChats;
  let minimized = state.minimizedChats;
  const maxOpen = Math.max(1, state.maxOpen);

  if (open.length > maxOpen) {
    const overflow = open.slice(0, open.length - maxOpen); // oldest = leftmost
    open = open.slice(-maxOpen);
    const overflowIds = new Set(overflow.map((c) => c.id));
    minimized = [
      ...minimized.filter((m) => !overflowIds.has(m.id)),
      ...overflow.map((c) => ({ ...c, lastMessage: lastOf(c.messages) ?? c.lastMessage })),
    ];
  }

  if (open.length + minimized.length > LAYOUT.MAX_TOTAL_CHATS) {
    minimized = minimized.slice(open.length + minimized.length - LAYOUT.MAX_TOTAL_CHATS);
  }

  if (open === state.openChats && minimized === state.minimizedChats) return state;
  return { ...state, openChats: open, minimizedChats: minimized };
}

export function floatingChatReducer(state: FloatingChatState, action: FloatingChatAction): FloatingChatState {
  switch (action.type) {
    case 'OPEN_CHAT': {
      const { user, conversation } = action.payload;
      const chatId = getChatId(user);

      // Already open - move to end (most recent = rightmost visible)
      const existingOpenIndex = state.openChats.findIndex((c) => c.id === chatId);
      if (existingOpenIndex !== -1) {
        const chat = state.openChats[existingOpenIndex];
        const newOpenChats = [
          ...state.openChats.slice(0, existingOpenIndex),
          ...state.openChats.slice(existingOpenIndex + 1),
          chat,
        ];
        return { ...state, openChats: newOpenChats, isListOpen: false };
      }

      // Minimized - maximize it, preserving messages
      const existingMinimized = state.minimizedChats.find((c) => c.id === chatId);
      if (existingMinimized) {
        return enforceLimits({
          ...state,
          openChats: [...state.openChats, { ...existingMinimized }],
          minimizedChats: state.minimizedChats.filter((c) => c.id !== chatId),
          isListOpen: false,
        });
      }

      // New chat - add to end (rightmost); limits move the oldest window to a bubble
      return enforceLimits({
        ...state,
        openChats: [
          ...state.openChats,
          {
            id: chatId,
            conversation: conversation || null,
            user,
            messages: [],
            unreadCount: 0,
          },
        ],
        isListOpen: false,
      });
    }

    case 'MINIMIZE_CHAT': {
      const { chatId } = action.payload;
      const chatToMinimize = state.openChats.find((c) => c.id === chatId);
      if (!chatToMinimize) return state;

      return {
        ...state,
        openChats: state.openChats.filter((c) => c.id !== chatId),
        minimizedChats: [
          ...state.minimizedChats,
          {
            ...chatToMinimize,
            lastMessage: lastOf(chatToMinimize.messages) ?? chatToMinimize.lastMessage,
          },
        ],
      };
    }

    case 'MAXIMIZE_CHAT': {
      const { chatId } = action.payload;
      const chatToMaximize = state.minimizedChats.find((c) => c.id === chatId);
      if (!chatToMaximize) return state;

      return enforceLimits({
        ...state,
        openChats: [...state.openChats, { ...chatToMaximize }],
        minimizedChats: state.minimizedChats.filter((c) => c.id !== chatId),
      });
    }

    case 'CLOSE_CHAT': {
      const { chatId } = action.payload;
      return {
        ...state,
        openChats: state.openChats.filter((c) => c.id !== chatId),
        minimizedChats: state.minimizedChats.filter((c) => c.id !== chatId),
      };
    }

    case 'CLOSE_ALL_CHATS': {
      return {
        ...state,
        openChats: [],
        minimizedChats: [],
      };
    }

    case 'TOGGLE_LIST': {
      return { ...state, isListOpen: !state.isListOpen };
    }

    case 'CLOSE_LIST': {
      return state.isListOpen ? { ...state, isListOpen: false } : state;
    }

    case 'SET_MAX_OPEN': {
      const maxOpen = Math.max(1, action.payload.maxOpen);
      if (maxOpen === state.maxOpen) return state;
      return enforceLimits({ ...state, maxOpen });
    }

    case 'UPDATE_MESSAGES': {
      const { chatId, messages } = action.payload;
      const update = <T extends OpenChat | MinimizedChat>(c: T): T => {
        if (c.id !== chatId) return c;
        const merged = mergeMessages(c.messages, messages);
        return { ...c, messages: merged, lastMessage: lastOf(merged) };
      };
      return {
        ...state,
        openChats: state.openChats.map(update),
        minimizedChats: state.minimizedChats.map(update),
      };
    }

    case 'ADD_MESSAGE': {
      const { chatId, message } = action.payload;
      const update = <T extends OpenChat | MinimizedChat>(c: T): T => {
        if (c.id !== chatId) return c;
        const messages = appendMessage(c.messages, message);
        return messages === c.messages ? c : { ...c, messages, lastMessage: lastOf(messages) };
      };
      return {
        ...state,
        openChats: state.openChats.map(update),
        minimizedChats: state.minimizedChats.map(update),
      };
    }

    case 'RECEIVE_MESSAGE': {
      const { message, conversationId, peerId, currentUserId, clientId } = action.payload;
      const isIncoming = message.sender.id !== currentUserId;
      const matches = (c: OpenChat | MinimizedChat) =>
        (peerId != null && c.user.id === peerId) ||
        (c.conversation != null && c.conversation.id === conversationId);

      const update = <T extends OpenChat | MinimizedChat>(c: T, countUnread: boolean): T => {
        if (!matches(c)) return c;
        const messages = appendMessage(c.messages, message, clientId);
        if (messages === c.messages) return c;
        const added = messages.length > c.messages.length;
        return {
          ...c,
          messages,
          lastMessage: lastOf(messages),
          unreadCount: countUnread && isIncoming && added ? (c.unreadCount || 0) + 1 : c.unreadCount,
        };
      };
      return {
        ...state,
        openChats: state.openChats.map((c) => update(c, false)),
        minimizedChats: state.minimizedChats.map((c) => update(c, true)),
      };
    }

    case 'MARK_MESSAGE_FAILED':
    case 'REMOVE_MESSAGE': {
      const { chatId, clientId } = action.payload;
      const remove = action.type === 'REMOVE_MESSAGE';
      const update = <T extends OpenChat | MinimizedChat>(c: T): T => {
        if (c.id !== chatId) return c;
        const messages = remove
          ? c.messages.filter((m) => !(isOptimistic(m) && m.client_id === clientId))
          : c.messages.map((m) =>
              isOptimistic(m) && m.client_id === clientId ? { ...m, status: 'failed' as const } : m
            );
        return { ...c, messages, lastMessage: lastOf(messages) };
      };
      return {
        ...state,
        openChats: state.openChats.map(update),
        minimizedChats: state.minimizedChats.map(update),
      };
    }

    case 'UPDATE_CONVERSATION': {
      const { chatId, conversation } = action.payload;
      return {
        ...state,
        openChats: state.openChats.map((c) =>
          c.id === chatId ? { ...c, conversation } : c
        ),
        minimizedChats: state.minimizedChats.map((c) =>
          c.id === chatId ? { ...c, conversation } : c
        ),
      };
    }

    case 'UPDATE_UNREAD': {
      const { chatId, unreadCount } = action.payload;
      return {
        ...state,
        openChats: state.openChats.map((c) =>
          c.id === chatId ? { ...c, unreadCount } : c
        ),
        minimizedChats: state.minimizedChats.map((c) =>
          c.id === chatId ? { ...c, unreadCount } : c
        ),
      };
    }

    case 'MARK_READ': {
      const { chatId } = action.payload;
      return {
        ...state,
        openChats: state.openChats.map((c) =>
          c.id === chatId ? { ...c, unreadCount: 0 } : c
        ),
        minimizedChats: state.minimizedChats.map((c) =>
          c.id === chatId ? { ...c, unreadCount: 0 } : c
        ),
      };
    }

    case 'MESSAGES_READ': {
      // Read receipt from the other participant: flip our sent messages to ✓✓.
      const { messageIds, conversationId, readBy } = action.payload;
      const ids = new Set(messageIds);
      const update = <T extends OpenChat | MinimizedChat>(c: T): T => {
        const inChat =
          c.user.id === readBy || (conversationId != null && c.conversation?.id === conversationId);
        if (!inChat || !c.messages.some((m) => ids.has(m.id) && !m.is_read)) return c;
        const messages = c.messages.map((m) => (ids.has(m.id) && !m.is_read ? { ...m, is_read: true } : m));
        return { ...c, messages, lastMessage: lastOf(messages) };
      };
      const openChats = state.openChats.map(update);
      const minimizedChats = state.minimizedChats.map(update);
      const changed =
        openChats.some((c, i) => c !== state.openChats[i]) ||
        minimizedChats.some((c, i) => c !== state.minimizedChats[i]);
      return changed ? { ...state, openChats, minimizedChats } : state;
    }

    case 'CLEAR_MESSAGES': {
      const { chatId } = action.payload;
      return {
        ...state,
        openChats: state.openChats.map((c) =>
          c.id === chatId ? { ...c, messages: [], lastMessage: undefined } : c
        ),
        minimizedChats: state.minimizedChats.map((c) =>
          c.id === chatId ? { ...c, messages: [], lastMessage: undefined } : c
        ),
      };
    }

    default:
      return state;
  }
}

export const initialFloatingChatState: FloatingChatState = {
  openChats: [],
  minimizedChats: [],
  isListOpen: false,
  maxOpen: LAYOUT.MAX_OPEN_CHATS,
};

interface FloatingChatActions {
  openChat: (user: TeamChatUser, conversation?: TeamChatConversation | null) => void;
  minimizeChat: (chatId: string) => void;
  maximizeChat: (chatId: string) => void;
  closeChat: (chatId: string) => void;
  closeAllChats: () => void;
  toggleList: () => void;
  closeList: () => void;
  setMaxOpen: (maxOpen: number) => void;
  updateMessages: (chatId: string, messages: TeamChatMessage[]) => void;
  addMessage: (chatId: string, message: TeamChatMessage) => void;
  receiveMessage: (payload: Extract<FloatingChatAction, { type: 'RECEIVE_MESSAGE' }>['payload']) => void;
  markMessageFailed: (chatId: string, clientId: string) => void;
  removeMessage: (chatId: string, clientId: string) => void;
  updateConversation: (chatId: string, conversation: TeamChatConversation) => void;
  updateUnread: (chatId: string, unreadCount: number) => void;
  markRead: (chatId: string) => void;
  messagesRead: (messageIds: number[], conversationId: number | null | undefined, readBy: number) => void;
  clearMessages: (chatId: string) => void;
  getChatIdFromUser: (user: TeamChatUser) => string;
}

interface FloatingChatContextValue extends FloatingChatActions {
  state: FloatingChatState;
}

const FloatingChatContext = createContext<FloatingChatContextValue | null>(null);

export function FloatingChatProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(floatingChatReducer, initialFloatingChatState);

  // Stable action creators so consumers can use them in effect/callback deps.
  const actions = useMemo<FloatingChatActions>(
    () => ({
      openChat: (user, conversation) =>
        dispatch({ type: 'OPEN_CHAT', payload: { user, conversation } }),
      minimizeChat: (chatId) =>
        dispatch({ type: 'MINIMIZE_CHAT', payload: { chatId } }),
      maximizeChat: (chatId) =>
        dispatch({ type: 'MAXIMIZE_CHAT', payload: { chatId } }),
      closeChat: (chatId) =>
        dispatch({ type: 'CLOSE_CHAT', payload: { chatId } }),
      closeAllChats: () => dispatch({ type: 'CLOSE_ALL_CHATS' }),
      toggleList: () => dispatch({ type: 'TOGGLE_LIST' }),
      closeList: () => dispatch({ type: 'CLOSE_LIST' }),
      setMaxOpen: (maxOpen) =>
        dispatch({ type: 'SET_MAX_OPEN', payload: { maxOpen } }),
      updateMessages: (chatId, messages) =>
        dispatch({ type: 'UPDATE_MESSAGES', payload: { chatId, messages } }),
      addMessage: (chatId, message) =>
        dispatch({ type: 'ADD_MESSAGE', payload: { chatId, message } }),
      receiveMessage: (payload) =>
        dispatch({ type: 'RECEIVE_MESSAGE', payload }),
      markMessageFailed: (chatId, clientId) =>
        dispatch({ type: 'MARK_MESSAGE_FAILED', payload: { chatId, clientId } }),
      removeMessage: (chatId, clientId) =>
        dispatch({ type: 'REMOVE_MESSAGE', payload: { chatId, clientId } }),
      updateConversation: (chatId, conversation) =>
        dispatch({ type: 'UPDATE_CONVERSATION', payload: { chatId, conversation } }),
      updateUnread: (chatId, unreadCount) =>
        dispatch({ type: 'UPDATE_UNREAD', payload: { chatId, unreadCount } }),
      markRead: (chatId) =>
        dispatch({ type: 'MARK_READ', payload: { chatId } }),
      messagesRead: (messageIds, conversationId, readBy) =>
        dispatch({ type: 'MESSAGES_READ', payload: { messageIds, conversationId, readBy } }),
      clearMessages: (chatId) =>
        dispatch({ type: 'CLEAR_MESSAGES', payload: { chatId } }),
      getChatIdFromUser: getChatId,
    }),
    []
  );

  const value = useMemo<FloatingChatContextValue>(() => ({ state, ...actions }), [state, actions]);

  return (
    <FloatingChatContext.Provider value={value}>
      {children}
    </FloatingChatContext.Provider>
  );
}

export function useFloatingChat() {
  const context = useContext(FloatingChatContext);
  if (!context) {
    throw new Error('useFloatingChat must be used within FloatingChatProvider');
  }
  return context;
}
