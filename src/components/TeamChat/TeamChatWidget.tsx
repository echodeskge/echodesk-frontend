'use client';

import { useState, useCallback, useEffect, useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { TeamChatIcon } from './TeamChatIcon';
import { ConversationListPopup } from './ConversationListPopup';
import { FloatingChatWindow } from './FloatingChatWindow';
import { MinimizedChatBubble } from './MinimizedChatBubble';
import {
  FloatingChatProvider,
  useFloatingChat,
  computeMaxOpenChats,
  chatIdForUserId,
} from './FloatingChatContext';
import {
  DOCK,
  announceDockPopoverOpened,
  onDockPopoverOpened,
  useDialpadPanelOpen,
} from './floatingDock';
import { useTeamChatWebSocket, type SentMessageMeta } from './useTeamChatWebSocket';
import {
  teamChatKeys,
  fetchConversationWithUser,
  useTeamChatUsers,
  useTeamChatConversations,
  useTeamChatUnreadCount,
  useSendTeamChatMessage,
  useMarkConversationRead,
  useClearChatHistory,
  useHideChatForMe,
} from './useTeamChatApi';
import type { TeamChatUser, TeamChatMessage, TeamChatConversation } from './types';
import { getNotificationSound } from '@/utils/notificationSound';

interface TeamChatWidgetProps {
  currentUserId: number;
}

/** A WS send not confirmed within this window is treated as lost. */
const SEND_ACK_TIMEOUT_MS = 8000;

let optimisticSeq = 0;
const newClientId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const subscribeResize = (cb: () => void) => {
  window.addEventListener('resize', cb);
  return () => window.removeEventListener('resize', cb);
};

function useViewportWidth() {
  return useSyncExternalStore(subscribeResize, () => window.innerWidth, () => 1280);
}

/** Conversation id of a message from any server shape (WS uses conversation_id, REST conversation). */
const messageConversationId = (message: TeamChatMessage, fallback?: number) =>
  message.conversation_id ?? (message as unknown as { conversation?: number }).conversation ?? fallback ?? -1;

function TeamChatWidgetInner({ currentUserId }: TeamChatWidgetProps) {
  const {
    state,
    toggleList,
    closeList,
    setMaxOpen,
    addMessage,
    receiveMessage,
    markMessageFailed,
    removeMessage,
    updateMessages,
    updateConversation,
    updateUnread,
    markRead,
    messagesRead,
    clearMessages,
  } = useFloatingChat();
  const queryClient = useQueryClient();

  // Latest state for async callbacks (WS frames, fetch results, timers).
  const stateRef = useRef(state);
  useLayoutEffect(() => {
    stateRef.current = state;
  }, [state]);

  const [typingUsers, setTypingUsers] = useState<Map<number, string>>(new Map());

  // Responsive layout: how many windows fit, and compact mode on phones.
  const viewportWidth = useViewportWidth();
  const isCompact = viewportWidth < DOCK.COMPACT_BREAKPOINT;

  // When the dialpad popup is open, panels open to its left so it never
  // covers the chat being typed in.
  const dialpadPanelOpen = useDialpadPanelOpen();
  const panelShift = dialpadPanelOpen && !isCompact ? DOCK.DIALPAD_PANEL_WIDTH + DOCK.PANEL_GAP : 0;

  // Windows that no longer fit (incl. while shifted left by the dialpad
  // popup) become bubbles instead of running off the left edge.
  useEffect(() => {
    setMaxOpen(computeMaxOpenChats(viewportWidth, panelShift));
  }, [viewportWidth, panelShift, setMaxOpen]);

  // The chat list and the dialpad popup are mutually exclusive.
  useEffect(() => {
    if (state.isListOpen) announceDockPopoverOpened('chat-list');
  }, [state.isListOpen]);
  useEffect(
    () =>
      onDockPopoverOpened((opened) => {
        if (opened === 'dialpad') closeList();
      }),
    [closeList]
  );

  // Determine if we need to fetch full data (when list is open or has active chats)
  const hasActiveChats = state.openChats.length > 0 || state.minimizedChats.length > 0;
  const shouldFetchFullData = state.isListOpen || hasActiveChats;

  // API hooks - defer users and conversations until widget is opened
  const { data: users = [] } = useTeamChatUsers({ enabled: shouldFetchFullData });
  const { data: conversations = [], refetch: refetchConversations } = useTeamChatConversations({ enabled: shouldFetchFullData });
  const { data: unreadCount = 0, refetch: refetchUnreadCount } = useTeamChatUnreadCount();
  const sendMessageMutation = useSendTeamChatMessage();
  const { mutate: markConversationRead } = useMarkConversationRead();
  const clearHistoryMutation = useClearChatHistory();
  const hideChatMutation = useHideChatForMe();

  // ---------------------------------------------------------------------
  // History loading: every chat (open or minimized) loads its own history
  // once, straight from the server (never a stale cache). Closing a chat
  // forgets it, so reopening always reloads.
  // ---------------------------------------------------------------------
  const loadedChatsRef = useRef<Set<string>>(new Set());

  const loadChat = useCallback(
    async (user: TeamChatUser) => {
      const chatId = chatIdForUserId(user.id);
      try {
        const conversation = await queryClient.fetchQuery({
          queryKey: teamChatKeys.conversationWithUser(user.id),
          queryFn: () => fetchConversationWithUser(user.id),
          staleTime: 0,
        });
        const current = stateRef.current;
        const isOpen = current.openChats.some((c) => c.id === chatId);
        const isMinimized = current.minimizedChats.some((c) => c.id === chatId);
        if (!isOpen && !isMinimized) return; // closed meanwhile

        updateConversation(chatId, conversation);
        // Merges with anything that arrived over the WebSocket meanwhile.
        updateMessages(chatId, conversation.messages || []);

        if (conversation.unread_count > 0) {
          if (isOpen) {
            markConversationRead(conversation.id);
            markRead(chatId);
          } else {
            updateUnread(chatId, conversation.unread_count);
          }
        }
      } catch (error) {
        loadedChatsRef.current.delete(chatId); // retry on next change
        console.error('Failed to load team chat conversation:', error);
      }
    },
    [queryClient, updateConversation, updateMessages, markConversationRead, markRead, updateUnread]
  );

  useEffect(() => {
    const chats = [...state.openChats, ...state.minimizedChats];
    const present = new Set(chats.map((c) => c.id));
    loadedChatsRef.current.forEach((id) => {
      if (!present.has(id)) loadedChatsRef.current.delete(id);
    });
    chats.forEach((chat) => {
      if (!loadedChatsRef.current.has(chat.id)) {
        loadedChatsRef.current.add(chat.id);
        void loadChat(chat.user);
      }
    });
  }, [state.openChats, state.minimizedChats, loadChat]);

  // A chat that becomes visible (opened / maximized) with unread messages is read.
  useEffect(() => {
    state.openChats.forEach((chat) => {
      if (chat.unreadCount > 0) {
        markRead(chat.id);
        if (chat.conversation) markConversationRead(chat.conversation.id);
      }
    });
  }, [state.openChats, markRead, markConversationRead]);

  // After a reconnect, catch up on everything missed while offline.
  const resyncAllChats = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: teamChatKeys.all });
    const current = stateRef.current;
    [...current.openChats, ...current.minimizedChats].forEach((chat) => {
      void loadChat(chat.user);
    });
  }, [queryClient, loadChat]);

  // ---------------------------------------------------------------------
  // Sending: optimistic message + ack timeout
  // ---------------------------------------------------------------------
  const pendingTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const clearPendingTimer = useCallback((clientId?: string) => {
    if (!clientId) return;
    const timer = pendingTimersRef.current.get(clientId);
    if (timer) {
      clearTimeout(timer);
      pendingTimersRef.current.delete(clientId);
    }
  }, []);

  useEffect(() => {
    const timers = pendingTimersRef.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, []);

  const keepCacheFresh = useCallback(
    (peerId: number | null, message: TeamChatMessage) => {
      if (peerId == null) return;
      queryClient.setQueryData<TeamChatConversation>(teamChatKeys.conversationWithUser(peerId), (old) => {
        if (!old) return old;
        const messages = old.messages || [];
        return {
          ...old,
          last_message: message,
          messages: messages.some((m) => m.id === message.id) ? messages : [...messages, message],
        };
      });
    },
    [queryClient]
  );

  // WebSocket
  const {
    isConnected,
    onlineUsers,
    sendMessage: wsSendMessage,
    sendTyping,
    sendReadReceipt,
    reconnectNow,
  } = useTeamChatWebSocket({
    onNewMessage: (message: TeamChatMessage, conversationId: number, meta?: SentMessageMeta) => {
      const isOwn = message.sender.id === currentUserId;
      // Own echoes are matched by recipient, so they show up even before the
      // window knows its conversation id.
      const peerId = isOwn ? meta?.recipientId ?? null : message.sender.id;
      clearPendingTimer(meta?.clientId);

      // Play team chat sound for messages from other users
      if (!isOwn) {
        getNotificationSound().play('teamChat');
      }

      receiveMessage({ message, conversationId, peerId, currentUserId, clientId: meta?.clientId });

      // Mark as read right away if the chat is open on screen
      if (!isOwn) {
        const isOpen = stateRef.current.openChats.some(
          (c) => c.user.id === peerId || c.conversation?.id === conversationId
        );
        if (isOpen) sendReadReceipt([message.id], conversationId);
      }

      keepCacheFresh(peerId, message);

      // Refetch conversations to update last message
      refetchConversations();
      refetchUnreadCount();
    },
    onSendError: (pending) => {
      clearPendingTimer(pending.clientId);
      if (pending.clientId && pending.recipientId != null) {
        markMessageFailed(chatIdForUserId(pending.recipientId), pending.clientId);
      }
    },
    onReadReceipt: (messageIds, readBy, conversationId) => {
      // The other participant read our messages: flip them to ✓✓.
      if (Array.isArray(messageIds) && messageIds.length) {
        messagesRead(messageIds, conversationId, readBy);
      }
    },
    onReconnect: resyncAllChats,
    onTypingIndicator: (userId, userName, isTyping) => {
      setTypingUsers((prev) => {
        const next = new Map(prev);
        if (isTyping) {
          next.set(userId, userName);
        } else {
          next.delete(userId);
        }
        return next;
      });
    },
  });

  const sendViaRest = async (
    userId: number,
    payload: { text: string; file?: File; messageType?: string; voiceDuration?: number },
    clientId?: string
  ) => {
    const chatId = chatIdForUserId(userId);
    const chat = [...stateRef.current.openChats, ...stateRef.current.minimizedChats].find((c) => c.id === chatId);
    try {
      const message: TeamChatMessage = await sendMessageMutation.mutateAsync({
        recipient_id: userId,
        conversation_id: chat?.conversation?.id,
        text: payload.text,
        message_type: payload.messageType,
        file: payload.file,
        voice_duration: payload.voiceDuration,
      });
      // Show the stored message immediately; no refetch round-trip.
      receiveMessage({
        message,
        conversationId: messageConversationId(message, chat?.conversation?.id),
        peerId: userId,
        currentUserId,
        clientId,
      });
      keepCacheFresh(userId, message);
    } catch (error) {
      console.error('Failed to send message:', error);
      if (clientId) markMessageFailed(chatId, clientId);
    }
  };

  const handleSendMessage = async (
    userId: number,
    text: string,
    file?: File,
    messageType?: string,
    voiceDuration?: number
  ) => {
    // Files and voice notes go over REST
    if (file) {
      await sendViaRest(userId, { text, file, messageType, voiceDuration });
      return;
    }

    // Text: show it instantly as pending, confirm via the WS echo
    const chatId = chatIdForUserId(userId);
    const clientId = newClientId();
    addMessage(chatId, {
      id: -++optimisticSeq,
      conversation_id: -1,
      sender: { id: currentUserId, email: '', full_name: '', is_online: true },
      message_type: 'text',
      text,
      is_read: false,
      created_at: new Date().toISOString(),
      client_id: clientId,
      status: 'pending',
    });

    if (wsSendMessage(userId, text, 'text', clientId)) {
      pendingTimersRef.current.set(
        clientId,
        setTimeout(() => {
          pendingTimersRef.current.delete(clientId);
          // No echo: the socket is probably half-open. Flag the message for
          // retry and get a fresh connection (the reconnect resyncs history).
          markMessageFailed(chatId, clientId);
          reconnectNow();
        }, SEND_ACK_TIMEOUT_MS)
      );
      return;
    }

    // Socket down: fall back to REST
    await sendViaRest(userId, { text }, clientId);
  };

  const handleRetryMessage = (userId: number, message: TeamChatMessage) => {
    if (message.client_id) removeMessage(chatIdForUserId(userId), message.client_id);
    void handleSendMessage(userId, message.text || '');
  };

  const handleTyping = (userId: number, isTyping: boolean) => {
    sendTyping(userId, isTyping);
  };

  const getTypingUser = (userId: number): string | null => {
    return typingUsers.get(userId) || null;
  };

  const handleClearHistory = async (conversationId: number) => {
    try {
      await clearHistoryMutation.mutateAsync(conversationId);
      // Find the chat with this conversation and clear its messages locally
      [...state.openChats, ...state.minimizedChats]
        .filter((c) => c.conversation?.id === conversationId)
        .forEach((c) => clearMessages(c.id));
      refetchConversations();
    } catch (error) {
      console.error('Failed to clear chat history:', error);
    }
  };

  const handleDeleteChat = async (conversationId: number) => {
    try {
      await hideChatMutation.mutateAsync(conversationId);
      refetchConversations();
      refetchUnreadCount();
    } catch (error) {
      console.error('Failed to delete chat:', error);
    }
  };

  // The reducer keeps openChats within maxOpen; slice is only a safety net.
  const visibleChats = state.openChats.slice(-Math.max(1, state.maxOpen));

  return (
    <>
      {/* Main Icon */}
      <TeamChatIcon
        unreadCount={unreadCount}
        onClick={toggleList}
        isOpen={state.isListOpen}
      />

      {/* Conversation List Popup */}
      <ConversationListPopup
        users={users}
        conversations={conversations}
        onlineUsers={onlineUsers}
        isConnected={isConnected}
        rightOffset={panelShift}
      />

      {/* Floating Chat Windows */}
      {visibleChats.map((chat, idx, arr) => (
        <FloatingChatWindow
          key={chat.id}
          chat={chat}
          index={arr.length - 1 - idx} // Reverse index: last item = 0 (rightmost)
          rightOffset={panelShift}
          isCompact={isCompact}
          currentUserId={currentUserId}
          isOnline={onlineUsers.has(chat.user.id)}
          typingUser={getTypingUser(chat.user.id)}
          onSendMessage={handleSendMessage}
          onRetryMessage={handleRetryMessage}
          onTyping={handleTyping}
          onClearHistory={handleClearHistory}
          isClearingHistory={clearHistoryMutation.isPending}
          onDeleteChat={handleDeleteChat}
          isDeletingChat={hideChatMutation.isPending}
        />
      ))}

      {/* Minimized Chat Bubbles */}
      {state.minimizedChats.map((chat, index) => (
        <MinimizedChatBubble
          key={chat.id}
          chat={chat}
          index={index}
          isOnline={onlineUsers.has(chat.user.id)}
        />
      ))}
    </>
  );
}

export function TeamChatWidget({ currentUserId }: TeamChatWidgetProps) {
  return (
    <FloatingChatProvider>
      <TeamChatWidgetInner currentUserId={currentUserId} />
    </FloatingChatProvider>
  );
}
