'use client';

import { useState, useCallback, useEffect } from 'react';
import { TeamChatIcon } from './TeamChatIcon';
import { ConversationListPopup } from './ConversationListPopup';
import { FloatingChatWindow } from './FloatingChatWindow';
import { MinimizedChatBubble } from './MinimizedChatBubble';
import { FloatingChatProvider, useFloatingChat, LAYOUT } from './FloatingChatContext';
import { useTeamChatWebSocket } from './useTeamChatWebSocket';
import {
  useTeamChatUsers,
  useTeamChatConversations,
  useTeamChatConversationWithUser,
  useTeamChatUnreadCount,
  useSendTeamChatMessage,
  useMarkConversationRead,
} from './useTeamChatApi';
import type { TeamChatUser, TeamChatMessage, TeamChatConversation } from './types';
import { getNotificationSound } from '@/utils/notificationSound';

interface TeamChatWidgetProps {
  currentUserId: number;
}

function TeamChatWidgetInner({ currentUserId }: TeamChatWidgetProps) {
  const {
    state,
    toggleList,
    addMessage,
    updateMessages,
    updateConversation,
    updateUnread,
    markRead,
    getChatIdFromUser,
  } = useFloatingChat();

  const [typingUsers, setTypingUsers] = useState<Map<number, string>>(new Map());
  const [activeUserId, setActiveUserId] = useState<number | null>(null);

  // API hooks
  const { data: users = [] } = useTeamChatUsers();
  const { data: conversations = [], refetch: refetchConversations } = useTeamChatConversations();
  const { data: unreadCount = 0, refetch: refetchUnreadCount } = useTeamChatUnreadCount();
  const sendMessageMutation = useSendTeamChatMessage();
  const markReadMutation = useMarkConversationRead();

  // Get conversation with currently active user (for loading messages)
  const { data: conversationWithUser, refetch: refetchConversationWithUser } =
    useTeamChatConversationWithUser(activeUserId);

  // WebSocket
  const {
    isConnected,
    onlineUsers,
    sendMessage: wsSendMessage,
    sendTyping,
    sendReadReceipt,
  } = useTeamChatWebSocket({
    onNewMessage: (message, conversationId) => {
      // Find which chat this message belongs to
      const senderId = message.sender.id;
      const otherUserId = senderId === currentUserId ? null : senderId;

      // Play team chat sound for messages from other users
      if (message.sender.id !== currentUserId) {
        getNotificationSound().play('teamChat');
      }

      // Add to any open chat that involves this user
      state.openChats.forEach((chat) => {
        if (
          chat.user.id === otherUserId ||
          (chat.conversation && chat.conversation.id === conversationId)
        ) {
          const chatId = getChatIdFromUser(chat.user);
          addMessage(chatId, message);

          // Mark as read if from other user
          if (message.sender.id !== currentUserId) {
            sendReadReceipt([message.id], conversationId);
          }
        }
      });

      // Update unread for minimized chats
      state.minimizedChats.forEach((chat) => {
        if (
          chat.user.id === otherUserId ||
          (chat.conversation && chat.conversation.id === conversationId)
        ) {
          const chatId = getChatIdFromUser(chat.user);
          if (message.sender.id !== currentUserId) {
            updateUnread(chatId, (chat.unreadCount || 0) + 1);
          }
          addMessage(chatId, message);
        }
      });

      // Refetch conversations to update last message
      refetchConversations();
      refetchUnreadCount();
    },
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
    onReadReceipt: (messageIds, readBy, conversationId) => {
      // Could update read status on messages if needed
    },
    onUserOnline: () => {
      // Online status is handled by the hook's state
    },
  });

  // Load messages when opening a chat
  useEffect(() => {
    if (conversationWithUser && activeUserId) {
      const user = state.openChats.find((c) => c.user.id === activeUserId)?.user;
      if (user) {
        const chatId = getChatIdFromUser(user);
        updateMessages(chatId, conversationWithUser.messages || []);
        updateConversation(chatId, conversationWithUser);

        // Mark as read
        if (conversationWithUser.unread_count > 0) {
          markReadMutation.mutate(conversationWithUser.id);
          markRead(chatId);
        }
      }
    }
  }, [conversationWithUser, activeUserId]);

  // Load messages when a new chat is opened
  useEffect(() => {
    state.openChats.forEach((chat) => {
      if (chat.messages.length === 0 && !chat.conversation?.messages) {
        setActiveUserId(chat.user.id);
        refetchConversationWithUser();
      }
    });
  }, [state.openChats.length]);

  const handleSendMessage = async (
    userId: number,
    text: string,
    file?: File,
    messageType?: string,
    voiceDuration?: number
  ) => {
    // Try WebSocket first for text messages
    if (!file && wsSendMessage(userId, text)) {
      // Message will be added via WebSocket callback
      return;
    }

    // Fall back to REST API for file uploads
    try {
      const chat = state.openChats.find((c) => c.user.id === userId);
      await sendMessageMutation.mutateAsync({
        recipient_id: userId,
        conversation_id: chat?.conversation?.id,
        text,
        message_type: messageType,
        file,
        voice_duration: voiceDuration,
      });

      // Reload conversation to get the new message
      setActiveUserId(userId);
      refetchConversationWithUser();
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleTyping = (userId: number, isTyping: boolean) => {
    sendTyping(userId, isTyping);
  };

  const getTypingUser = (userId: number): string | null => {
    return typingUsers.get(userId) || null;
  };

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
      />

      {/* Floating Chat Windows - only show last 4 (visible ones) */}
      {state.openChats
        .slice(-LAYOUT.MAX_OPEN_CHATS) // Take last 4 chats
        .map((chat, idx, arr) => (
          <FloatingChatWindow
            key={chat.id}
            chat={chat}
            index={arr.length - 1 - idx} // Reverse index: last item = 0 (rightmost)
            currentUserId={currentUserId}
            isOnline={onlineUsers.has(chat.user.id)}
            typingUser={getTypingUser(chat.user.id)}
            onSendMessage={handleSendMessage}
            onTyping={handleTyping}
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
