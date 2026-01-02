'use client';

import { createContext, useContext, useReducer, ReactNode } from 'react';
import type { TeamChatUser, TeamChatConversation, TeamChatMessage } from './types';

// Layout constants
export const LAYOUT = {
  MAIN_ICON: { size: 56, right: 24, bottom: 24 },
  POPUP: { width: 320, height: 450 },
  WINDOW: { width: 280, height: 400, gap: 12 },
  BUBBLE: { size: 48, gap: 8 },
  Z_INDEX: { icon: 50, popup: 53, window: 51, bubble: 49 },
  MAX_OPEN_CHATS: 4,
  MAX_TOTAL_CHATS: 6,
};

export interface OpenChat {
  id: string; // unique identifier
  conversation: TeamChatConversation | null;
  user: TeamChatUser;
  messages: TeamChatMessage[];
  unreadCount: number;
  lastMessage?: TeamChatMessage;
  // Note: position is determined by array index when rendering (first 4 are visible)
}

export interface MinimizedChat {
  id: string;
  conversation: TeamChatConversation | null;
  user: TeamChatUser;
  unreadCount: number;
  lastMessage?: TeamChatMessage;
}

interface FloatingChatState {
  openChats: OpenChat[];
  minimizedChats: MinimizedChat[];
  isListOpen: boolean;
}

type FloatingChatAction =
  | { type: 'OPEN_CHAT'; payload: { user: TeamChatUser; conversation?: TeamChatConversation | null } }
  | { type: 'MINIMIZE_CHAT'; payload: { chatId: string } }
  | { type: 'MAXIMIZE_CHAT'; payload: { chatId: string } }
  | { type: 'CLOSE_CHAT'; payload: { chatId: string } }
  | { type: 'CLOSE_ALL_CHATS' }
  | { type: 'TOGGLE_LIST' }
  | { type: 'CLOSE_LIST' }
  | { type: 'UPDATE_MESSAGES'; payload: { chatId: string; messages: TeamChatMessage[] } }
  | { type: 'ADD_MESSAGE'; payload: { chatId: string; message: TeamChatMessage } }
  | { type: 'UPDATE_CONVERSATION'; payload: { chatId: string; conversation: TeamChatConversation } }
  | { type: 'UPDATE_UNREAD'; payload: { chatId: string; unreadCount: number } }
  | { type: 'MARK_READ'; payload: { chatId: string } }
  | { type: 'CLEAR_MESSAGES'; payload: { chatId: string } };

// Generate unique chat ID from user
const getChatId = (user: TeamChatUser): string => `chat_${user.id}`;

function floatingChatReducer(state: FloatingChatState, action: FloatingChatAction): FloatingChatState {
  switch (action.type) {
    case 'OPEN_CHAT': {
      const { user, conversation } = action.payload;
      const chatId = getChatId(user);

      // Check if already open - move to front (most recent = rightmost visible)
      const existingOpenIndex = state.openChats.findIndex((c) => c.id === chatId);
      if (existingOpenIndex !== -1) {
        // Move to end of array (will be position 0, rightmost)
        const chat = state.openChats[existingOpenIndex];
        const newOpenChats = [
          ...state.openChats.slice(0, existingOpenIndex),
          ...state.openChats.slice(existingOpenIndex + 1),
          chat,
        ];
        return { ...state, openChats: newOpenChats, isListOpen: false };
      }

      // Check if minimized - if so, maximize it
      const existingMinimized = state.minimizedChats.find((c) => c.id === chatId);
      if (existingMinimized) {
        const newMinimizedChats = state.minimizedChats.filter((c) => c.id !== chatId);
        // Add to end of openChats (rightmost position)
        const newOpenChats = [
          ...state.openChats,
          {
            id: chatId,
            conversation: existingMinimized.conversation,
            user: existingMinimized.user,
            messages: [],
            unreadCount: existingMinimized.unreadCount,
            lastMessage: existingMinimized.lastMessage,
          },
        ];

        return {
          ...state,
          openChats: newOpenChats,
          minimizedChats: newMinimizedChats,
          isListOpen: false,
        };
      }

      // New chat - check total limit (open + minimized)
      const totalChats = state.openChats.length + state.minimizedChats.length;
      let newMinimizedChats = [...state.minimizedChats];

      if (totalChats >= LAYOUT.MAX_TOTAL_CHATS) {
        // Remove oldest minimized chat if any, otherwise remove oldest open
        if (newMinimizedChats.length > 0) {
          newMinimizedChats = newMinimizedChats.slice(1);
        } else {
          // Remove oldest open chat
          return {
            ...state,
            openChats: [
              ...state.openChats.slice(1),
              {
                id: chatId,
                conversation: conversation || null,
                user,
                messages: [],
                unreadCount: 0,
              },
            ],
            isListOpen: false,
          };
        }
      }

      // Add new chat to end (rightmost position when visible)
      const newOpenChats = [
        ...state.openChats,
        {
          id: chatId,
          conversation: conversation || null,
          user,
          messages: [],
          unreadCount: 0,
        },
      ];

      return {
        ...state,
        openChats: newOpenChats,
        minimizedChats: newMinimizedChats,
        isListOpen: false,
      };
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
            id: chatToMinimize.id,
            conversation: chatToMinimize.conversation,
            user: chatToMinimize.user,
            unreadCount: chatToMinimize.unreadCount,
            lastMessage: chatToMinimize.messages[chatToMinimize.messages.length - 1],
          },
        ],
      };
    }

    case 'MAXIMIZE_CHAT': {
      const { chatId } = action.payload;
      const chatToMaximize = state.minimizedChats.find((c) => c.id === chatId);
      if (!chatToMaximize) return state;

      // Remove from minimized, add to end of open chats
      const newMinimizedChats = state.minimizedChats.filter((c) => c.id !== chatId);
      const newOpenChats = [
        ...state.openChats,
        {
          id: chatId,
          conversation: chatToMaximize.conversation,
          user: chatToMaximize.user,
          messages: [],
          unreadCount: chatToMaximize.unreadCount,
          lastMessage: chatToMaximize.lastMessage,
        },
      ];

      return {
        ...state,
        openChats: newOpenChats,
        minimizedChats: newMinimizedChats,
      };
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
      return { ...state, isListOpen: false };
    }

    case 'UPDATE_MESSAGES': {
      const { chatId, messages } = action.payload;
      return {
        ...state,
        openChats: state.openChats.map((c) =>
          c.id === chatId
            ? { ...c, messages, lastMessage: messages[messages.length - 1] }
            : c
        ),
      };
    }

    case 'ADD_MESSAGE': {
      const { chatId, message } = action.payload;
      return {
        ...state,
        openChats: state.openChats.map((c) =>
          c.id === chatId
            ? {
                ...c,
                messages: c.messages.some((m) => m.id === message.id)
                  ? c.messages
                  : [...c.messages, message],
                lastMessage: message,
              }
            : c
        ),
        minimizedChats: state.minimizedChats.map((c) =>
          c.id === chatId ? { ...c, lastMessage: message } : c
        ),
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

    case 'CLEAR_MESSAGES': {
      const { chatId } = action.payload;
      return {
        ...state,
        openChats: state.openChats.map((c) =>
          c.id === chatId ? { ...c, messages: [], lastMessage: undefined } : c
        ),
        minimizedChats: state.minimizedChats.map((c) =>
          c.id === chatId ? { ...c, lastMessage: undefined } : c
        ),
      };
    }

    default:
      return state;
  }
}

const initialState: FloatingChatState = {
  openChats: [],
  minimizedChats: [],
  isListOpen: false,
};

interface FloatingChatContextValue {
  state: FloatingChatState;
  openChat: (user: TeamChatUser, conversation?: TeamChatConversation | null) => void;
  minimizeChat: (chatId: string) => void;
  maximizeChat: (chatId: string) => void;
  closeChat: (chatId: string) => void;
  closeAllChats: () => void;
  toggleList: () => void;
  closeList: () => void;
  updateMessages: (chatId: string, messages: TeamChatMessage[]) => void;
  addMessage: (chatId: string, message: TeamChatMessage) => void;
  updateConversation: (chatId: string, conversation: TeamChatConversation) => void;
  updateUnread: (chatId: string, unreadCount: number) => void;
  markRead: (chatId: string) => void;
  clearMessages: (chatId: string) => void;
  getChatIdFromUser: (user: TeamChatUser) => string;
}

const FloatingChatContext = createContext<FloatingChatContextValue | null>(null);

export function FloatingChatProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(floatingChatReducer, initialState);

  const value: FloatingChatContextValue = {
    state,
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
    updateMessages: (chatId, messages) =>
      dispatch({ type: 'UPDATE_MESSAGES', payload: { chatId, messages } }),
    addMessage: (chatId, message) =>
      dispatch({ type: 'ADD_MESSAGE', payload: { chatId, message } }),
    updateConversation: (chatId, conversation) =>
      dispatch({ type: 'UPDATE_CONVERSATION', payload: { chatId, conversation } }),
    updateUnread: (chatId, unreadCount) =>
      dispatch({ type: 'UPDATE_UNREAD', payload: { chatId, unreadCount } }),
    markRead: (chatId) =>
      dispatch({ type: 'MARK_READ', payload: { chatId } }),
    clearMessages: (chatId) =>
      dispatch({ type: 'CLEAR_MESSAGES', payload: { chatId } }),
    getChatIdFromUser: getChatId,
  };

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
