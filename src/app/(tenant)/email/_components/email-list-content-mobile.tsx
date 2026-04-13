"use client";

import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import type { EmailMessage } from "@/hooks/api/useSocial";

import { useEmailContext } from "../_hooks/use-email-context";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmailListContentItemMobile } from "./email-list-content-item-mobile";

interface EmailListContentMobileProps {
  emails: EmailMessage[];
  filter: string;
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
}

export function EmailListContentMobile({
  emails,
  filter,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
}: EmailListContentMobileProps) {
  const { selectedEmailIds } = useEmailContext();
  const selectedSet = new Set(selectedEmailIds);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <ul>
      <ScrollArea className="h-[calc(100vh-18.5rem)]">
        {emails.map((email) => (
          <EmailListContentItemMobile
            key={email.id}
            email={email}
            filter={filter}
            isSelected={selectedSet.has(email.id)}
          />
        ))}
        <div ref={sentinelRef} className="h-1" />
        {isFetchingNextPage && (
          <li className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </li>
        )}
      </ScrollArea>
    </ul>
  );
}
