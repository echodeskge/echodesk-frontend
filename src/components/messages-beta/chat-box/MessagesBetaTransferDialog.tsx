"use client";

import { useMemo, useState } from "react";
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
import { useUsers } from "@/hooks/api/useUsers";
import { useTransferChat } from "@/hooks/api/useSocial";
import { cn } from "@/lib/utils";

import type { ConversationRow } from "../store/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: ConversationRow;
}

/**
 * Picker dialog for "Transfer chat to user". The backend's
 * `assignment_update` broadcast (PR3) carries the result so the receiving
 * agent's Assigned tab gets the chat live without any extra wiring here.
 *
 * Out of scope here: showing online status / current load / capacity per
 * agent. The legacy dialog doesn't render those either.
 */
export function MessagesBetaTransferDialog({
  open,
  onOpenChange,
  conversation,
}: Props) {
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState("");
  const { data: usersData, isLoading } = useUsers({ enabled: open });
  const transferChat = useTransferChat();

  const users = usersData?.results ?? [];
  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const others = users.filter((u) => u.id !== currentUser?.id && u.is_active);
    if (!q) return others;
    return others.filter((u) => {
      const name = `${u.first_name || ""} ${u.last_name || ""}`.trim().toLowerCase();
      return name.includes(q) || (u.email || "").toLowerCase().includes(q);
    });
  }, [users, search, currentUser?.id]);

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
      setSearch("");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to transfer chat");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Transfer chat
          </DialogTitle>
          <DialogDescription>
            Hand this conversation to a teammate. They'll see it in their Assigned
            tab immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email"
            className="pl-8"
            autoFocus
          />
        </div>

        <div className="max-h-72 overflow-y-auto -mx-2 px-2 space-y-1">
          {isLoading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
          {!isLoading && filteredUsers.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-6">
              No teammates match.
            </p>
          )}
          {filteredUsers.map((u) => {
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
