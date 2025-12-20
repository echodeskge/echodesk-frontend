'use client';

import { useState, useMemo } from 'react';
import { Search, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { TeamChatUser, TeamChatConversation } from './types';

interface UserListProps {
  users: TeamChatUser[];
  conversations: TeamChatConversation[];
  onlineUsers: Map<number, string>;
  onSelectUser: (user: TeamChatUser) => void;
  onSelectConversation: (conversation: TeamChatConversation) => void;
}

export function UserList({
  users,
  conversations,
  onlineUsers,
  onSelectUser,
  onSelectConversation,
}: UserListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter users and conversations based on search
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

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3 border-b">
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
                  onClick={() => onSelectConversation(conversation)}
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
                        <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-primary rounded-full">
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
              onClick={() => onSelectUser(user)}
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
    </div>
  );
}
