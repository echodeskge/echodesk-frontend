'use client';

import { useState, useCallback, useEffect } from 'react';
import { X, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TeamChatIcon } from './TeamChatIcon';
import { UserList } from './UserList';
import { ChatWindow } from './ChatWindow';
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

interface TeamChatWidgetProps {
  currentUserId: number;
}

export function TeamChatWidget({ currentUserId }: TeamChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<TeamChatUser | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<TeamChatConversation | null>(null);
  const [messages, setMessages] = useState<TeamChatMessage[]>([]);
  const [typingUser, setTypingUser] = useState<string | null>(null);

  // API hooks
  const { data: users = [] } = useTeamChatUsers();
  const { data: conversations = [], refetch: refetchConversations } = useTeamChatConversations();
  const { data: unreadCount = 0, refetch: refetchUnreadCount } = useTeamChatUnreadCount();
  const sendMessageMutation = useSendTeamChatMessage();
  const markReadMutation = useMarkConversationRead();

  // Get conversation with selected user
  const { data: conversationWithUser, refetch: refetchConversationWithUser } =
    useTeamChatConversationWithUser(selectedUser?.id || null);

  // WebSocket
  const {
    isConnected,
    onlineUsers,
    sendMessage: wsSendMessage,
    sendTyping,
    sendReadReceipt,
  } = useTeamChatWebSocket({
    onNewMessage: (message, conversationId) => {
      // Add message to current conversation if it matches
      if (
        selectedConversation?.id === conversationId ||
        (conversationWithUser && conversationWithUser.id === conversationId)
      ) {
        setMessages((prev) => {
          // Avoid duplicates
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });

        // Mark as read if from other user
        if (message.sender.id !== currentUserId) {
          sendReadReceipt([message.id], conversationId);
        }
      }

      // Refetch conversations to update last message
      refetchConversations();
      refetchUnreadCount();
    },
    onTypingIndicator: (userId, userName, isTyping) => {
      if (selectedUser?.id === userId || selectedConversation?.other_participant?.id === userId) {
        setTypingUser(isTyping ? userName : null);
      }
    },
    onReadReceipt: (messageIds, readBy, conversationId) => {
      if (readBy !== currentUserId) {
        setMessages((prev) =>
          prev.map((m) =>
            messageIds.includes(m.id) ? { ...m, is_read: true } : m
          )
        );
      }
    },
    onUserOnline: () => {
      // Online status is handled by the hook's state
    },
  });

  // Load messages when conversation changes
  useEffect(() => {
    if (conversationWithUser) {
      setSelectedConversation(conversationWithUser);
      setMessages(conversationWithUser.messages || []);

      // Mark as read
      if (conversationWithUser.unread_count > 0) {
        markReadMutation.mutate(conversationWithUser.id);
      }
    }
  }, [conversationWithUser]);

  const handleSelectUser = (user: TeamChatUser) => {
    setSelectedUser(user);
    setMessages([]);
    refetchConversationWithUser();
  };

  const handleSelectConversation = (conversation: TeamChatConversation) => {
    setSelectedConversation(conversation);
    setSelectedUser(conversation.other_participant);
    setMessages(conversation.messages || []);

    if (conversation.unread_count > 0) {
      markReadMutation.mutate(conversation.id);
    }
  };

  const handleBack = () => {
    setSelectedUser(null);
    setSelectedConversation(null);
    setMessages([]);
    setTypingUser(null);
    refetchConversations();
  };

  const handleSendMessage = async (
    text: string,
    file?: File,
    messageType?: string,
    voiceDuration?: number
  ) => {
    if (!selectedUser) return;

    // Try WebSocket first for text messages
    if (!file && wsSendMessage(selectedUser.id, text)) {
      // Message will be added via WebSocket callback
      return;
    }

    // Fall back to REST API for file uploads
    try {
      await sendMessageMutation.mutateAsync({
        recipient_id: selectedUser.id,
        conversation_id: selectedConversation?.id,
        text,
        message_type: messageType,
        file,
        voice_duration: voiceDuration,
      });
      refetchConversationWithUser();
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleTyping = (isTyping: boolean) => {
    if (selectedUser) {
      sendTyping(selectedUser.id, isTyping);
    }
  };

  return (
    <>
      {/* Floating Icon */}
      <TeamChatIcon
        unreadCount={unreadCount}
        onClick={() => setIsOpen(!isOpen)}
        isOpen={isOpen}
      />

      {/* Chat Popup */}
      {isOpen && (
        <Card
          className={cn(
            'fixed z-50 w-[360px] h-[500px] shadow-2xl flex flex-col overflow-hidden',
            'bottom-24 right-6',
            'animate-in slide-in-from-bottom-4 fade-in duration-200'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b bg-primary text-primary-foreground">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <span className="font-semibold">Team Chat</span>
              {!isConnected && (
                <span className="text-xs bg-yellow-500/20 text-yellow-200 px-2 py-0.5 rounded">
                  Connecting...
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {selectedUser ? (
              <ChatWindow
                conversation={selectedConversation}
                recipient={selectedUser}
                messages={messages}
                currentUserId={currentUserId}
                isOnline={onlineUsers.has(selectedUser.id)}
                typingUser={typingUser}
                onBack={handleBack}
                onSendMessage={handleSendMessage}
                onTyping={handleTyping}
              />
            ) : (
              <UserList
                users={users}
                conversations={conversations}
                onlineUsers={onlineUsers}
                onSelectUser={handleSelectUser}
                onSelectConversation={handleSelectConversation}
              />
            )}
          </div>
        </Card>
      )}
    </>
  );
}
