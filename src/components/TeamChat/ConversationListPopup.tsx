'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Search, User, X, Users, XCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LAYOUT, useFloatingChat } from './FloatingChatContext';
import { panelMaxHeight, useDockPanelRight } from './floatingDock';
import type { TeamChatUser, TeamChatConversation } from './types';

interface ConversationListPopupProps {
  users: TeamChatUser[];
  conversations: TeamChatConversation[];
  onlineUsers: Map<number, string>;
  isConnected: boolean;
  /** Extra px from the right (e.g. while the dialpad popup is open). */
  rightOffset?: number;
}

export function ConversationListPopup({
  users,
  conversations,
  onlineUsers,
  isConnected,
  rightOffset = 0,
}: ConversationListPopupProps) {
  const { state, openChat, closeList, closeAllChats } = useFloatingChat();
  const [searchQuery, setSearchQuery] = useState('');
  const popupRef = useRef<HTMLDivElement>(null);
  const dockPanelRight = useDockPanelRight();

  // Close on click outside (the launcher toggles it itself)
  useEffect(() => {
    if (!state.isListOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (popupRef.current?.contains(target)) return;
      if (target.closest?.('[data-teamchat-trigger]')) return;
      closeList();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [state.isListOpen, closeList]);

  // Filter users and conversations based on search
  // All hooks must be called before any early returns
  const filteredUsers = useMemo(() => {
    const query = searchQuery.toLowerCase();
    const base = !searchQuery
      ? users
      : users.filter(
          (user) =>
            user.full_name.toLowerCase().includes(query) ||
            user.email.toLowerCase().includes(query)
        );

    // Online members float to the top; alphabetical within each group.
    // onlineUsers is reactive via useTeamChatWebSocket, so the list
    // re-sorts automatically when users connect/disconnect.
    return [...base].sort((a, b) => {
      const aOnline = onlineUsers.has(a.id) ? 0 : 1;
      const bOnline = onlineUsers.has(b.id) ? 0 : 1;
      if (aOnline !== bOnline) return aOnline - bOnline;
      return (a.full_name ?? '').localeCompare(b.full_name ?? '');
    });
  }, [users, searchQuery, onlineUsers]);

  const filteredConversations = useMemo(() => {
    let filtered = conversations;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = conversations.filter((conv) => {
        const otherParticipant = conv.other_participant;
        if (!otherParticipant) return false;
        return (
          otherParticipant.full_name.toLowerCase().includes(query) ||
          otherParticipant.email.toLowerCase().includes(query)
        );
      });
    }

    // Sort by most recent message first (newest on top)
    return [...filtered].sort((a, b) => {
      const aTime = a.last_message?.created_at || a.updated_at;
      const bTime = b.last_message?.created_at || b.updated_at;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
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

  // Opens beside the dock column so it never covers the launchers or bubbles.
  const right = dockPanelRight + rightOffset;
  const bottom = LAYOUT.MAIN_ICON.bottom;

  return (
    <Card
      ref={popupRef}
      className={cn(
        'fixed shadow-2xl flex flex-col overflow-hidden',
        'animate-in slide-in-from-bottom-4 fade-in duration-200'
      )}
      style={{
        right,
        bottom,
        width: `min(${LAYOUT.POPUP.width}px, calc(100vw - ${right + 8}px))`,
        height: LAYOUT.POPUP.height,
        maxHeight: panelMaxHeight(bottom),
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
              className="h-8 text-xs text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground dark:hover:bg-primary-foreground/10 dark:hover:text-primary-foreground"
              onClick={closeAllChats}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Close All
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground dark:hover:bg-primary-foreground/10 dark:hover:text-primary-foreground"
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
