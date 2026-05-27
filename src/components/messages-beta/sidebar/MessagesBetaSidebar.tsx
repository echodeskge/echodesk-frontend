"use client";

import { ReactNode, useCallback, useEffect, useMemo, useRef } from "react";
import { Facebook, Instagram, Loader2, Mail, MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChatAvatar } from "@/components/chat/chat-avatar";
import { ChatListSkeleton } from "@/components/chat/chat-sidebar/ChatListSkeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useSocialSettings } from "@/hooks/api/useSocial";
import { useUserProfile } from "@/hooks/useUserProfile";
import { cn, getInitials } from "@/lib/utils";

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
  const archivedListState = useMessagesBetaStore((s) => s.archivedListState);
  const setArchivedListState = useMessagesBetaStore((s) => s.setArchivedListState);
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

  // Count of conversations assigned to the current user (ignores search /
  // platform filters, matching the legacy sidebar's assigned-tab badge).
  const assignedCount = useMemo(
    () =>
      selectAssignedTabConversations(
        {
          conversations,
          assignmentByChatId,
          archivedByChatId,
          searchQuery: "",
          platformFilter: null,
        },
        ctx
      ).length,
    [conversations, assignmentByChatId, archivedByChatId, ctx]
  );

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

  // --- Lazy-load the server-side archived (History) list. ---
  // The bootstrap only fetches the ACTIVE list (the backend hides archived
  // conversations from it), so the History tab would otherwise show only
  // chats archived live this session. Fetch the real archived list the
  // first time the user opens History; live archive_update frames keep it
  // fresh afterward. Once-per-session — reload to refresh.
  useEffect(() => {
    if (!showArchived) return;
    if (archivedListState !== "pending") return;
    setArchivedListState("loading");
    fetchConversationsPage({ platforms: platformsRef.current, archived: true, pageSize: 100 })
      .then(({ rows, assignments, archives }) => {
        appendConversations(rows);
        for (const [chatId, slice] of assignments) {
          if (useMessagesBetaStore.getState().assignmentByChatId[chatId] === undefined) {
            patchAssignment(chatId, slice);
          }
        }
        // Every row here is archived — mark it so the History selector
        // includes it (and the active tabs exclude it). Use the server's
        // archived_at when present, else stamp now.
        const archiveMap = new Map(archives);
        for (const row of rows) {
          const meta = archiveMap.get(row.id) ?? {
            archivedAt: new Date().toISOString(),
            byUserId: null,
          };
          patchArchive(row.id, meta);
        }
        setArchivedListState("ready");
      })
      .catch((err) => {
        console.warn("[messages-beta] archived-list fetch failed:", err);
        setArchivedListState("error");
      });
  }, [
    showArchived,
    archivedListState,
    setArchivedListState,
    appendConversations,
    patchAssignment,
    patchArchive,
  ]);

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

        {ctx.assignmentEnabled && !showArchived && (
          <div className="px-3 py-2 border-b border-border">
            <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="all">{t("tabAll")}</TabsTrigger>
                <TabsTrigger value="assigned">
                  {t("tabAssigned")}
                  {assignedCount > 0 && (
                    <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-primary/20 px-1.5 text-xs font-medium">
                      {assignedCount}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        )}

        {(() => {
          // Collapse the active-list vs archived-list state machines into one
          // set of booleans so the list renders with the legacy structure:
          // a paddingless scroll container + a padded <ul> (or the skeleton,
          // which carries its own padding) — matching chat-sidebar-list.tsx.
          const listLoading =
            tab === "archive"
              ? archivedListState === "loading"
              : bootstrapState === "loading";
          const listError =
            tab === "archive"
              ? archivedListState === "error"
              : bootstrapState === "error";
          const listReady =
            tab === "archive"
              ? archivedListState === "ready"
              : bootstrapState === "ready";
          const emptyMessage =
            tab === "archive"
              ? t("noArchivedConversations")
              : hasFiltersActive
              ? t("noConversationsMatch")
              : tab === "assigned"
              ? t("noAssignedConversations")
              : t("noConversationsYet");

          return (
            <div
              ref={scrollContainerRef}
              className="flex-1 min-h-0 overflow-auto"
              onScroll={handleScroll}
            >
              {listLoading ? (
                <ChatListSkeleton />
              ) : listError ? (
                <p className="text-center text-destructive py-8">{t("failedToLoad")}</p>
              ) : (
                <ul className="p-3 space-y-1.5">
                  {listReady && visibleRows.length === 0 ? (
                    <li className="text-center text-muted-foreground py-8">{emptyMessage}</li>
                  ) : (
                    <>
                      {visibleRows.map((row) => {
                        const unread = unreadByChatId[row.id] || 0;
                        const isActive = selectedChatId === row.id;
                        return (
                          <li key={row.id} data-chat-id={row.id}>
                            <button
                              type="button"
                              onClick={() => onSelectChat(row.id)}
                              onMouseEnter={() => handleHoverPrefetch(row)}
                              aria-current={isActive ? "true" : undefined}
                              className={cn(
                                buttonVariants({ variant: "ghost" }),
                                // Unread chats get a muted background (lighter)
                                unread > 0 && "bg-muted/60",
                                // Active chat gets a darker background (overrides unread)
                                isActive && "bg-primary/20 hover:bg-primary/25",
                                "h-fit w-full"
                              )}
                            >
                              <div className="w-full flex items-center gap-2">
                                <div className="relative shrink-0">
                                  <ChatAvatar
                                    src={row.avatar}
                                    fallback={getInitials(row.name)}
                                    size={2.5}
                                    className="shrink-0"
                                  />
                                  <div
                                    className={cn(
                                      "absolute -bottom-0.5 -right-0.5 rounded-full p-[3px] ring-2 ring-background",
                                      PLATFORM_BG[row.platform]
                                    )}
                                  >
                                    {PLATFORM_ICON[row.platform]}
                                  </div>
                                </div>
                                <div className="h-11 w-full grid grid-cols-[1fr_auto] gap-x-2">
                                  <div className="min-w-0 grid">
                                    <span className={cn("truncate", unread > 0 && "font-semibold")}>
                                      {row.name}
                                    </span>
                                    <span
                                      className={cn(
                                        "text-xs truncate",
                                        unread > 0
                                          ? "text-foreground font-medium"
                                          : "text-muted-foreground font-semibold"
                                      )}
                                    >
                                      {row.lastMessage?.content?.replace(/\n+/g, " ") ||
                                        t("noMessagesYet")}
                                    </span>
                                  </div>
                                  <div className="flex flex-col items-end gap-1">
                                    <span className="text-xs text-muted-foreground font-semibold whitespace-nowrap">
                                      {formatDistanceToNow(
                                        new Date(row.lastMessage?.createdAt ?? Date.now()),
                                        { addSuffix: true }
                                      )}
                                    </span>
                                    {unread > 0 && (
                                      <Badge className="hover:bg-primary">{unread}</Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </button>
                          </li>
                        );
                      })}

                      {/* Infinite-scroll footer: spinner while fetching, or a
                          "scroll for more" hint when more pages exist. */}
                      {nextConversationsPage != null && visibleRows.length > 0 && (
                        <li className="flex justify-center py-4">
                          {isFetchingNextPage ? (
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {t("scrollForMore")}
                            </span>
                          )}
                        </li>
                      )}
                    </>
                  )}
                </ul>
              )}
            </div>
          );
        })()}
      </Card>
    </aside>
  );
}
