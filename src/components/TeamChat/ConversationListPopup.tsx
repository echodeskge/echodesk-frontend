'use client';

import { useState, useMemo } from 'react';
import { Search, User, X, Users, XCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LAYOUT, useFloatingChat } from './FloatingChatContext';
import type { TeamChatUser, TeamChatConversation } from './types';

interface ConversationListPopupProps {
  users: TeamChatUser[];
  conversations: TeamChatConversation[];
  onlineUsers: Map<number, string>;
  isConnected: boolean;
}

export function ConversationListPopup({
  users,
  conversations,
  onlineUsers,
  isConnected,
}: ConversationListPopupProps) {
  const { state, openChat, closeList, closeAllChats } = useFloatingChat();
  const [searchQuery, setSearchQuery] = useState('');

  // Filter users and conversations based on search
  // All hooks must be called before any early returns
  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users;
    const query = searchQuery.toLowerCase();
    return users.filter(
      (user) =>
        user.full_name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  const filteredConversations = useMemo(() => {
    if (!searchQuery) return conversations;
    const query = searchQuery.toLowerCase();
    return conversations.filter((conv) => {
      const otherParticipant = conv.other_participant;
      if (!otherParticipant) return false;
      return (
        otherParticipant.full_name.toLowerCase().includes(query) ||
        otherParticipant.email.toLowerCase().includes(query)
      );
    });
  }, [conversations, searchQuery]);

  // Early return after all hooks
  if (!state.isListOpen) return null;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isUserOnline = (userId: number) => {
    return onlineUsers.has(userId);
  };

  const handleSelectUser = (user: TeamChatUser) => {
    openChat(user);
  };

  const handleSelectConversation = (conversation: TeamChatConversation) => {
    if (conversation.other_participant) {
      openChat(conversation.other_participant, conversation);
    }
  };

  return (
    <Card
      className={cn(
        'fixed shadow-2xl flex flex-col overflow-hidden',
        'animate-in slide-in-from-bottom-4 fade-in duration-200'
      )}
      style={{
        right: LAYOUT.MAIN_ICON.right,
        bottom: LAYOUT.MAIN_ICON.bottom + LAYOUT.MAIN_ICON.size + 12,
        width: LAYOUT.POPUP.width,
        height: LAYOUT.POPUP.height,
        zIndex: LAYOUT.Z_INDEX.popup,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-primary text-primary-foreground shrink-0">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <span className="font-semibold">Team Chat</span>
          {!isConnected && (
            <span className="text-xs bg-yellow-500/20 text-yellow-200 px-2 py-0.5 rounded">
              Connecting...
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {(state.openChats.length > 0 || state.minimizedChats.length > 0) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-primary-foreground hover:bg-primary-foreground/10"
              onClick={closeAllChats}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Close All
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10"
            onClick={closeList}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="p-3 border-b shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        {/* Recent Conversations */}
        {filteredConversations.length > 0 && (
          <div className="p-2">
            <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase">
              Recent Chats
            </div>
            {filteredConversations.map((conversation) => {
              const other = conversation.other_participant;
              if (!other) return null;

              return (
                <button
                  key={conversation.id}
                  onClick={() => handleSelectConversation(conversation)}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(other.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    {isUserOnline(other.id) && (
                      <span className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-background" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm truncate">
                        {other.full_name}
                      </span>
                      {conversation.unread_count > 0 && (
                        <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-red-500 rounded-full">
                          {conversation.unread_count}
                        </span>
                      )}
                    </div>
                    {conversation.last_message && (
                      <p className="text-xs text-muted-foreground truncate">
                        {typeof conversation.last_message === 'string'
                          ? conversation.last_message
                          : conversation.last_message.text || '[Attachment]'}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* All Users */}
        <div className="p-2">
          <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase">
            Team Members
          </div>
          {filteredUsers.map((user) => (
            <button
              key={user.id}
              onClick={() => handleSelectUser(user)}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors"
            >
              <div className="relative">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-secondary">
                    {getInitials(user.full_name)}
                  </AvatarFallback>
                </Avatar>
                {isUserOnline(user.id) && (
                  <span className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-background" />
                )}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="font-medium text-sm truncate">{user.full_name}</div>
                <div className="text-xs text-muted-foreground truncate">{user.email}</div>
              </div>
              {isUserOnline(user.id) ? (
                <span className="text-xs text-green-600 font-medium">Online</span>
              ) : (
                <span className="text-xs text-muted-foreground">Offline</span>
              )}
            </button>
          ))}

          {filteredUsers.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <User className="h-8 w-8 mb-2" />
              <p className="text-sm">No users found</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}
