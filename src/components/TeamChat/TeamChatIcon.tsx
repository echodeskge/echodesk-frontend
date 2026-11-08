'use client';

import { MessageCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { DockBadge, dockLauncherClass } from '@/components/calls/dock-launcher';
import { LAYOUT } from './FloatingChatContext';

interface TeamChatIconProps {
  unreadCount: number;
  onClick: () => void;
  isOpen: boolean;
}

/** Team chat launcher (dock slot 0) with the destructive unread badge. */
export function TeamChatIcon({ unreadCount, onClick, isOpen }: TeamChatIconProps) {
  const t = useTranslations('calls.dock');
  const label = [
    isOpen ? t('closeTeamChat') : t('openTeamChat'),
    unreadCount > 0 ? t('unread', { count: unreadCount }) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <button
      type="button"
      className={cn(dockLauncherClass(isOpen), 'fixed')}
      style={{
        right: LAYOUT.MAIN_ICON.right,
        bottom: LAYOUT.MAIN_ICON.bottom,
        zIndex: LAYOUT.Z_INDEX.icon,
        width: LAYOUT.MAIN_ICON.size,
        height: LAYOUT.MAIN_ICON.size,
      }}
      data-teamchat-trigger
      onClick={onClick}
      aria-label={label}
      aria-expanded={isOpen}
      aria-haspopup="dialog"
      title={label}
    >
      <MessageCircle className="h-4 w-4" aria-hidden />
      {unreadCount > 0 && <DockBadge count={unreadCount} testId="teamchat-unread-badge" />}
    </button>
  );
}
