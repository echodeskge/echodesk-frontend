"use client";

import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import type { DynamicIconNameType } from "@/types";

import { cn, formatUnreadCount } from "@/lib/utils";

import { useEmailContext } from "../_hooks/use-email-context";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { DynamicIcon } from "@/components/dynamic-icon";

interface EmailSidebarItemProps {
  name: string;
  displayName: string;
  iconName: string;
  isActive: boolean;
  unreadCount?: number;
  lucideIcon?: LucideIcon;
}

export function EmailSidebarItem({
  name,
  displayName,
  iconName,
  isActive,
  unreadCount = 0,
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
          buttonVariants({ variant: "ghost" }),
          "w-full justify-start",
          isActive && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
        )}
        onClick={handleClick}
        aria-current={isActive ? "true" : undefined}
      >
        {LucideIconComponent ? (
          <LucideIconComponent className="me-2 h-4 w-4" />
        ) : (
          <DynamicIcon
            name={iconName as DynamicIconNameType}
            className="me-2 h-4 w-4"
          />
        )}
        <span className="capitalize">{displayName}</span>
        {!!formattedCount && (
          <Badge className="ms-auto">{formattedCount}</Badge>
        )}
      </button>
    </li>
  );
}
