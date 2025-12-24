'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LAYOUT, useFloatingChat, type MinimizedChat } from './FloatingChatContext';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface MinimizedChatBubbleProps {
  chat: MinimizedChat;
  index: number;
  isOnline: boolean;
}

export function MinimizedChatBubble({ chat, index, isOnline }: MinimizedChatBubbleProps) {
  const { maximizeChat, closeChat } = useFloatingChat();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Calculate position - stack vertically above the main icon
  const bottomPosition =
    LAYOUT.MAIN_ICON.bottom +
    LAYOUT.MAIN_ICON.size +
    LAYOUT.BUBBLE.gap +
    index * (LAYOUT.BUBBLE.size + LAYOUT.BUBBLE.gap);

  const getLastMessagePreview = () => {
    if (!chat.lastMessage) return null;
    if (chat.lastMessage.text) {
      return chat.lastMessage.text.length > 50
        ? chat.lastMessage.text.slice(0, 50) + '...'
        : chat.lastMessage.text;
    }
    if (chat.lastMessage.message_type === 'image') return '[Image]';
    if (chat.lastMessage.message_type === 'file') return '[File]';
    if (chat.lastMessage.message_type === 'voice') return '[Voice message]';
    return null;
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'fixed cursor-pointer group',
              'animate-in slide-in-from-right-4 fade-in duration-200'
            )}
            style={{
              right: LAYOUT.MAIN_ICON.right + (LAYOUT.MAIN_ICON.size - LAYOUT.BUBBLE.size) / 2,
              bottom: bottomPosition,
              zIndex: LAYOUT.Z_INDEX.bubble,
            }}
            onClick={() => maximizeChat(chat.id)}
          >
            <div className="relative">
              <Avatar
                className={cn(
                  'shadow-lg transition-transform hover:scale-110',
                  'ring-2 ring-background'
                )}
                style={{
                  width: LAYOUT.BUBBLE.size,
                  height: LAYOUT.BUBBLE.size,
                }}
              >
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {getInitials(chat.user.full_name)}
                </AvatarFallback>
              </Avatar>

              {/* Online indicator */}
              {isOnline && (
                <span className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-background" />
              )}

              {/* Unread badge */}
              {chat.unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full">
                  {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                </span>
              )}

              {/* Close button - appears on hover */}
              <Button
                variant="destructive"
                size="icon"
                className="absolute -top-1 -left-1 h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  closeChat(chat.id);
                }}
              >
                <X className="h-2.5 w-2.5" />
              </Button>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-[200px]">
          <div className="font-medium text-sm">{chat.user.full_name}</div>
          {getLastMessagePreview() && (
            <p className="text-xs text-muted-foreground mt-1">{getLastMessagePreview()}</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
