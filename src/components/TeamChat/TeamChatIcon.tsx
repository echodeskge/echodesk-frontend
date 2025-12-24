'use client';

import { MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LAYOUT } from './FloatingChatContext';

interface TeamChatIconProps {
  unreadCount: number;
  onClick: () => void;
  isOpen: boolean;
}

export function TeamChatIcon({ unreadCount, onClick, isOpen }: TeamChatIconProps) {
  return (
    <div
      className="fixed z-50 cursor-pointer"
      style={{
        right: LAYOUT.MAIN_ICON.right,
        bottom: LAYOUT.MAIN_ICON.bottom,
      }}
      onClick={onClick}
    >
      <div
        className={cn(
          'relative flex items-center justify-center rounded-full shadow-lg transition-all duration-200',
          isOpen
            ? 'bg-primary/90 scale-95'
            : 'bg-primary hover:bg-primary/90 hover:scale-105'
        )}
        style={{
          width: LAYOUT.MAIN_ICON.size,
          height: LAYOUT.MAIN_ICON.size,
        }}
      >
        <MessageCircle className="h-6 w-6 text-primary-foreground" />

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </div>
    </div>
  );
}
