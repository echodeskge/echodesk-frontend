"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Search, UserPlus } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useInfiniteUsers } from "@/hooks/api/useUsers";
import { useTransferChat } from "@/hooks/api/useSocial";
import { cn } from "@/lib/utils";

import type { ConversationRow } from "../store/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: ConversationRow;
}

const SEARCH_DEBOUNCE_MS = 250;

/**
 * Picker dialog for "Transfer chat to user". The backend's
 * `assignment_update` broadcast (PR3) carries the result so the receiving
 * agent's Assigned tab gets the chat live without any extra wiring here.
 *
 * Tenants with >50 users were stuck on the first page in the original
 * dialog; this version uses useInfiniteUsers + server-side search so the
 * picker works at any team size. Debounced text input drives the search
 * param; an IntersectionObserver-free scroll listener fetches the next
 * page as the user scrolls near the bottom of the list.
 */
export function MessagesBetaTransferDialog({
  open,
  onOpenChange,
  conversation,
}: Props) {
  const { user: currentUser } = useAuth();
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce — server-side search is what makes pagination tractable for
  // large tenants, but firing on every keystroke would thrash.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Reset state when dialog closes so reopening starts fresh.
  useEffect(() => {
    if (!open) {
      setSearchInput("");
      setDebouncedSearch("");
    }
  }, [open]);

  const transferChat = useTransferChat();
  const usersQuery = useInfiniteUsers({
    enabled: open,
    search: debouncedSearch || undefined,
    pageSize: 50,
  });

  // Flatten every loaded page + drop the current user from the list. The
  // hook returns InfiniteData<PaginatedUserList>; pages may be undefined
  // mid-fetch so guard for that.
  const flattened = useMemo(() => {
    const pages = usersQuery.data?.pages ?? [];
    const all = pages.flatMap((p) => p?.results ?? []);
    return all.filter((u) => u.id !== currentUser?.id && u.is_active);
  }, [usersQuery.data, currentUser?.id]);

  // Infinite scroll trigger — fire next-page fetch when the user scrolls
  // within 80 px of the bottom of the list.
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    if (!usersQuery.hasNextPage || usersQuery.isFetchingNextPage) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80) {
      void usersQuery.fetchNextPage();
    }
  };

  const handleTransfer = async (targetUserId: number, displayName: string) => {
    try {
      await transferChat.mutateAsync({
        platform: conversation.platform,
        conversation_id: conversation.conversationKey,
        account_id: conversation.accountId,
        target_user_id: targetUserId,
      });
      toast.success(`Transferred to ${displayName}`);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to transfer chat");
    }
  };

  const isInitialLoading = usersQuery.isLoading && flattened.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Transfer chat
          </DialogTitle>
          <DialogDescription>
            Hand this conversation to a teammate. They&apos;ll see it in their
            Assigned tab immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name or email"
            className="pl-8"
            autoFocus
          />
        </div>

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="max-h-72 overflow-y-auto -mx-2 px-2 space-y-1"
        >
          {isInitialLoading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
          {!isInitialLoading && flattened.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-6">
              {debouncedSearch ? "No teammates match that search." : "No teammates available."}
            </p>
          )}
          {flattened.map((u) => {
            const name = `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.email;
            const initials = name
              .split(" ")
              .map((p) => p[0])
              .slice(0, 2)
              .join("")
              .toUpperCase();
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => handleTransfer(u.id, name)}
                disabled={transferChat.isPending}
                className={cn(
                  "w-full text-left rounded-md p-2 flex items-center gap-3 hover:bg-muted transition-colors",
                  transferChat.isPending && "opacity-50 cursor-wait"
                )}
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">{initials || "?"}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{name}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                </div>
              </button>
            );
          })}
          {usersQuery.isFetchingNextPage && (
            <div className="flex items-center justify-center py-3">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
