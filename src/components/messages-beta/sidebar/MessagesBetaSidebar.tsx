"use client";

import { ReactNode, useCallback, useEffect, useMemo, useRef } from "react";
import { Facebook, Instagram, Loader2, Mail, MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useSocialSettings } from "@/hooks/api/useSocial";
import { useUserProfile } from "@/hooks/useUserProfile";
import { cn } from "@/lib/utils";

import {
  selectAllTabConversations,
  selectArchivedConversations,
  selectAssignedTabConversations,
} from "../store/selectors";
import { useMessagesBetaStore } from "../store/useMessagesBetaStore";
import { fetchConversationsPage, fetchMessagesForChat } from "../store/rest-bootstrap";
import type { BetaPlatform, ConversationRow } from "../store/types";
import { MessagesBetaSidebarHeader } from "./MessagesBetaSidebarHeader";

type Tab = "all" | "assigned" | "archive";

interface Props {
  onSelectChat: (chatId: string) => void;
  platforms: BetaPlatform[];
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

// Trigger the next-page fetch when the scroll viewport is within this many
// pixels of the bottom. Matches legacy chat-sidebar-list.tsx:32 (100 px).
const INFINITE_SCROLL_THRESHOLD_PX = 100;

export function MessagesBetaSidebar({ onSelectChat, platforms }: Props) {
  const t = useTranslations("messagesBeta.sidebar");
  const { user } = useAuth();
  const { data: profile } = useUserProfile();
  const { data: settings } = useSocialSettings();

  const selectedChatId = useMessagesBetaStore((s) => s.selectedChatId);
  const bootstrapState = useMessagesBetaStore((s) => s.bootstrapState);
  const assignmentTab = useMessagesBetaStore((s) => s.assignmentTab);
  const setAssignmentTab = useMessagesBetaStore((s) => s.setAssignmentTab);
  const showArchived = useMessagesBetaStore((s) => s.showArchived);

  // Subscribe to the slices that the tab selectors care about. Narrow
  // subscriptions keep cross-user WS frames cheap.
  const conversations = useMessagesBetaStore((s) => s.conversations);
  const assignmentByChatId = useMessagesBetaStore((s) => s.assignmentByChatId);
  const archivedByChatId = useMessagesBetaStore((s) => s.archivedByChatId);
  const unreadByChatId = useMessagesBetaStore((s) => s.unreadByChatId);
  const searchQuery = useMessagesBetaStore((s) => s.searchQuery);
  const platformFilter = useMessagesBetaStore((s) => s.platformFilter);
  const nextConversationsPage = useMessagesBetaStore((s) => s.nextConversationsPage);
  const isFetchingNextPage = useMessagesBetaStore((s) => s.isFetchingNextPage);
  const setIsFetchingNextPage = useMessagesBetaStore((s) => s.setIsFetchingNextPage);
  const setNextConversationsPage = useMessagesBetaStore((s) => s.setNextConversationsPage);
  const appendConversations = useMessagesBetaStore((s) => s.appendConversations);
  const patchAssignment = useMessagesBetaStore((s) => s.patchAssignment);
  const patchArchive = useMessagesBetaStore((s) => s.patchArchive);
  const messagesLoaded = useMessagesBetaStore((s) => s.messagesLoaded);
  const hydrateMessages = useMessagesBetaStore((s) => s.hydrateMessages);

  // When the user is viewing history we override the visible tab. The store's
  // `assignmentTab` is preserved so toggling history off returns them where
  // they were.
  const tab: Tab = showArchived ? "archive" : assignmentTab;
  const setTab = useCallback(
    (next: Tab) => {
      if (next === "archive") return; // Archive is reached via the header menu, not the tab strip.
      setAssignmentTab(next);
    },
    [setAssignmentTab]
  );

  // Admins (is_staff or is_superuser) bypass the hide_assigned_chats
  // filter so they can audit every conversation. Matches backend
  // unified_conversations carve-out (views.py:5559).
  const isAdmin = !!profile?.is_staff;
  const ctx = useMemo(
    () => ({
      currentUserId: user?.id ?? null,
      assignmentEnabled: settings?.chat_assignment_enabled ?? false,
      hideAssignedChats: settings?.hide_assigned_chats ?? false,
      isAdmin,
    }),
    [user?.id, settings?.chat_assignment_enabled, settings?.hide_assigned_chats, isAdmin]
  );

  const visibleRows = useMemo(() => {
    const state = {
      conversations,
      assignmentByChatId,
      archivedByChatId,
      searchQuery,
      platformFilter,
    };
    if (tab === "assigned") return selectAssignedTabConversations(state, ctx);
    if (tab === "archive") return selectArchivedConversations(state);
    return selectAllTabConversations(state, ctx);
  }, [tab, conversations, assignmentByChatId, archivedByChatId, ctx, searchQuery, platformFilter]);

  const hasFiltersActive = !!searchQuery.trim() || !!platformFilter;

  // --- Infinite scroll: when the viewport nears the bottom, load page+1. ---
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const platformsRef = useRef(platforms);
  useEffect(() => {
    platformsRef.current = platforms;
  }, [platforms]);

  const loadNextPage = useCallback(async () => {
    if (nextConversationsPage == null) return;
    if (isFetchingNextPage) return;
    setIsFetchingNextPage(true);
    try {
      const { rows, assignments, archives, nextPage } = await fetchConversationsPage({
        platforms: platformsRef.current,
        page: nextConversationsPage,
      });
      appendConversations(rows);
      for (const [chatId, slice] of assignments) {
        // Don't overwrite an assignment we've been patching live via WS while
        // the next page was in flight. patchAssignment unconditionally sets
        // — which is correct for hot data but wrong for stale page rows.
        // We only seed when the slot is currently undefined.
        const current = useMessagesBetaStore.getState().assignmentByChatId[chatId];
        if (current === undefined) patchAssignment(chatId, slice);
      }
      for (const [chatId, meta] of archives) {
        const current = useMessagesBetaStore.getState().archivedByChatId[chatId];
        if (current === undefined) patchArchive(chatId, meta);
      }
      setNextConversationsPage(nextPage);
    } catch (err) {
      // Failure to fetch the next page shouldn't be fatal — leave nextPage
      // intact so a subsequent scroll attempt can retry.
      console.warn("[messages-beta] next-page fetch failed:", err);
    } finally {
      setIsFetchingNextPage(false);
    }
  }, [
    nextConversationsPage,
    isFetchingNextPage,
    setIsFetchingNextPage,
    setNextConversationsPage,
    appendConversations,
    patchAssignment,
    patchArchive,
  ]);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom < INFINITE_SCROLL_THRESHOLD_PX) {
      void loadNextPage();
    }
  }, [loadNextPage]);

  // --- Hover prefetch: warm a chat's messages so click feels instant. ---
  const prefetchedRef = useRef<Set<string>>(new Set());
  const handleHoverPrefetch = useCallback(
    (row: ConversationRow) => {
      if (messagesLoaded[row.id]) return;
      if (prefetchedRef.current.has(row.id)) return;
      prefetchedRef.current.add(row.id);
      fetchMessagesForChat(row.id, row.platform)
        .then((msgs) => hydrateMessages(row.id, msgs))
        .catch((err) => {
          console.warn("[messages-beta] hover prefetch failed:", err);
          // Allow a future hover to retry.
          prefetchedRef.current.delete(row.id);
        });
    },
    [messagesLoaded, hydrateMessages]
  );

  return (
    <aside className="h-full w-full md:w-96 shrink-0">
      <Card className="h-full flex flex-col">
        <MessagesBetaSidebarHeader platforms={platforms} />

        {!showArchived && (
          <div className="px-3 pt-2">
            <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="all">{t("tabAll")}</TabsTrigger>
                <TabsTrigger value="assigned">{t("tabAssigned")}</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        )}

        <div
          ref={scrollContainerRef}
          className="flex-1 min-h-0 overflow-auto p-2 space-y-1.5"
          onScroll={handleScroll}
        >
          {bootstrapState === "loading" && (
            <p className="text-xs text-muted-foreground p-3">{t("loadingConversations")}</p>
          )}
          {bootstrapState === "error" && (
            <p className="text-xs text-destructive p-3">{t("failedToLoad")}</p>
          )}
          {bootstrapState === "ready" && visibleRows.length === 0 && (
            <p className="text-xs text-muted-foreground p-3">
              {hasFiltersActive
                ? t("noConversationsMatch")
                : tab === "assigned"
                ? t("noAssignedConversations")
                : tab === "archive"
                ? t("noArchivedConversations")
                : t("noConversationsYet")}
            </p>
          )}
          {visibleRows.map((row) => {
            const unread = unreadByChatId[row.id] || 0;
            const isActive = selectedChatId === row.id;
            return (
              <button
                key={row.id}
                data-chat-id={row.id}
                onClick={() => onSelectChat(row.id)}
                onMouseEnter={() => handleHoverPrefetch(row)}
                className={cn(
                  "w-full text-left rounded-md p-2 flex items-center gap-2 hover:bg-muted transition-colors",
                  unread > 0 && !isActive && "bg-muted/60",
                  isActive && "bg-primary/15 hover:bg-primary/20"
                )}
              >
                <div className="relative shrink-0">
                  {row.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={row.avatar}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover bg-muted"
                      onError={(e) => {
                        // Customer profile pictures (Meta CDN) sometimes 403
                        // after their signed URL expires. Hide the broken
                        // image and fall back to the initials sibling below.
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : null}
                  {!row.avatar && (
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                      {row.name?.slice(0, 2).toUpperCase() || "?"}
                    </div>
                  )}
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
                      className={cn("truncate text-sm", unread > 0 && "font-semibold")}
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
                      {row.lastMessage?.content || t("noMessagesYet")}
                    </span>
                    {unread > 0 && (
                      <Badge className="shrink-0 h-5 px-1.5 text-[10px]">{unread}</Badge>
                    )}
                  </div>
                </div>
              </button>
            );
          })}

          {/* Infinite-scroll footer: shows a spinner while fetching, or a
              "scroll for more" hint when we know there are more pages. */}
          {nextConversationsPage != null && visibleRows.length > 0 && (
            <div className="flex justify-center py-3 text-xs text-muted-foreground">
              {isFetchingNextPage ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <span>{t("scrollForMore")}</span>
              )}
            </div>
          )}
        </div>
      </Card>
    </aside>
  );
}
