"use client";

import { ReactNode, useMemo, useState } from "react";
import { Facebook, Instagram, Mail, MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useSocialSettings } from "@/hooks/api/useSocial";
import { cn } from "@/lib/utils";

import {
  selectAllTabConversations,
  selectArchivedConversations,
  selectAssignedTabConversations,
} from "../store/selectors";
import { useMessagesBetaStore } from "../store/useMessagesBetaStore";
import type { ConversationRow } from "../store/types";

type Tab = "all" | "assigned" | "archive";

interface Props {
  onSelectChat: (chatId: string) => void;
}

const PLATFORM_ICON: Record<ConversationRow["platform"], ReactNode> = {
  facebook: <Facebook className="h-3 w-3 text-white" />,
  instagram: <Instagram className="h-3 w-3 text-white" />,
  whatsapp: <MessageCircle className="h-3 w-3 text-white" />,
  email: <Mail className="h-3 w-3 text-white" />,
  widget: <MessageCircle className="h-3 w-3 text-white" />,
};

const PLATFORM_BG: Record<ConversationRow["platform"], string> = {
  facebook: "bg-blue-600",
  instagram: "bg-gradient-to-br from-purple-600 to-pink-600",
  whatsapp: "bg-green-600",
  email: "bg-red-600",
  widget: "bg-indigo-600",
};

export function MessagesBetaSidebar({ onSelectChat }: Props) {
  const { user } = useAuth();
  const { data: settings } = useSocialSettings();
  const [tab, setTab] = useState<Tab>("all");

  const selectedChatId = useMessagesBetaStore((s) => s.selectedChatId);
  const bootstrapState = useMessagesBetaStore((s) => s.bootstrapState);

  // Subscribe to the slices that the tab selectors care about. Component
  // re-renders only when one of these changes — narrow subscriptions keep
  // cross-user WS frames cheap.
  const conversations = useMessagesBetaStore((s) => s.conversations);
  const assignmentByChatId = useMessagesBetaStore((s) => s.assignmentByChatId);
  const archivedByChatId = useMessagesBetaStore((s) => s.archivedByChatId);
  const unreadByChatId = useMessagesBetaStore((s) => s.unreadByChatId);

  const ctx = useMemo(
    () => ({
      currentUserId: user?.id ?? null,
      hideAssignedChats: settings?.hide_assigned_chats ?? false,
    }),
    [user?.id, settings?.hide_assigned_chats]
  );

  const visibleRows = useMemo(() => {
    const state = { conversations, assignmentByChatId, archivedByChatId };
    if (tab === "assigned") return selectAssignedTabConversations(state, ctx);
    if (tab === "archive") return selectArchivedConversations(state);
    return selectAllTabConversations(state, ctx);
  }, [tab, conversations, assignmentByChatId, archivedByChatId, ctx]);

  return (
    <aside className="h-full w-full md:w-96 shrink-0">
      <Card className="h-full flex flex-col">
        <div className="p-3 border-b">
          <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="assigned">Assigned</TabsTrigger>
              <TabsTrigger value="archive">Archive</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex-1 min-h-0 overflow-auto p-2 space-y-1.5">
          {bootstrapState === "loading" && (
            <p className="text-xs text-muted-foreground p-3">Loading conversations…</p>
          )}
          {bootstrapState === "error" && (
            <p className="text-xs text-destructive p-3">
              Failed to load conversations. Refresh the page.
            </p>
          )}
          {bootstrapState === "ready" && visibleRows.length === 0 && (
            <p className="text-xs text-muted-foreground p-3">No conversations</p>
          )}
          {visibleRows.map((row) => {
            const unread = unreadByChatId[row.id] || 0;
            const isActive = selectedChatId === row.id;
            return (
              <button
                key={row.id}
                onClick={() => onSelectChat(row.id)}
                className={cn(
                  "w-full text-left rounded-md p-2 flex items-center gap-2 hover:bg-muted transition-colors",
                  unread > 0 && !isActive && "bg-muted/60",
                  isActive && "bg-primary/15 hover:bg-primary/20"
                )}
              >
                <div className="relative shrink-0">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                    {row.name?.slice(0, 2).toUpperCase() || "?"}
                  </div>
                  <div
                    className={cn(
                      "absolute -bottom-0.5 -right-0.5 rounded-full p-[3px] ring-2 ring-background",
                      PLATFORM_BG[row.platform]
                    )}
                  >
                    {PLATFORM_ICON[row.platform]}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "truncate text-sm",
                        unread > 0 && "font-semibold"
                      )}
                    >
                      {row.name}
                    </span>
                    {row.lastMessage?.createdAt && (
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(row.lastMessage.createdAt), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "truncate text-xs",
                        unread > 0 ? "text-foreground font-medium" : "text-muted-foreground"
                      )}
                    >
                      {row.lastMessage?.content || "No messages yet…"}
                    </span>
                    {unread > 0 && (
                      <Badge className="shrink-0 h-5 px-1.5 text-[10px]">{unread}</Badge>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </Card>
    </aside>
  );
}
