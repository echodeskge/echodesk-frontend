"use client";

import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import type { DynamicIconNameType } from "@/types";

import { cn, formatUnreadCount } from "@/lib/utils";

import { useEmailContext } from "../_hooks/use-email-context";
import { DynamicIcon } from "@/components/dynamic-icon";

interface EmailSidebarItemProps {
  name: string;
  displayName: string;
  iconName: string;
  isActive: boolean;
  unreadCount?: number;
  /** Bold foreground count (Inbox); other folders show a muted one. */
  strongCount?: boolean;
  lucideIcon?: LucideIcon;
}

/** Design folder row: 30px, icon, label, unread count. */
export function EmailSidebarItem({
  name,
  displayName,
  iconName,
  isActive,
  unreadCount = 0,
  strongCount = false,
  lucideIcon: LucideIconComponent,
}: EmailSidebarItemProps) {
  const { setIsEmailSidebarOpen } = useEmailContext();
  const router = useRouter();

  const formattedCount = formatUnreadCount(unreadCount);

  // Use router.push instead of Link to avoid Next.js interpreting
  // bracket characters in IMAP folder names (e.g. [Gmail]) as dynamic segments
  function handleClick() {
    setIsEmailSidebarOpen(false);
    router.push(`/email/${encodeURIComponent(name)}`);
  }

  return (
    <li>
      <button
        type="button"
        className={cn(
          "flex h-[30px] w-full items-center gap-2 rounded-md px-2 text-[13px] text-foreground/85 transition-colors hover:bg-muted hover:text-foreground",
          isActive && "bg-muted font-medium text-foreground"
        )}
        onClick={handleClick}
        aria-current={isActive ? "true" : undefined}
      >
        {LucideIconComponent ? (
          <LucideIconComponent className="h-[15px] w-[15px] shrink-0 text-muted-foreground" />
        ) : (
          <DynamicIcon
            name={iconName as DynamicIconNameType}
            className="h-[15px] w-[15px] shrink-0 text-muted-foreground"
          />
        )}
        <span className="min-w-0 flex-1 truncate text-start capitalize">{displayName}</span>
        {!!formattedCount && (
          <span
            className={cn(
              "text-[11px] tabular-nums",
              strongCount ? "font-semibold text-foreground" : "text-muted-foreground"
            )}
          >
            {formattedCount}
          </span>
        )}
      </button>
    </li>
  );
}
