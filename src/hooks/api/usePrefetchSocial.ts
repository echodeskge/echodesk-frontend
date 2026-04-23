"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import axios from "@/api/axios";
import type { PaginatedUnifiedConversation } from "@/api/generated";
import { useChatContext } from "@/components/chat/hooks/use-chat-context";
import { socialKeys } from "./useSocial";

type ConversationVariant = "assigned" | "all" | "archived";

const FRESH_WINDOW_MS = 10_000;
const PREFETCH_STALE_TIME_MS = 30_000;

function useCurrentListFilters() {
  const {
    platforms,
    platformFilter,
    selectedEmailFolder,
    chatListSearchQuery,
    selectedEmailConnectionId,
  } = useChatContext();

  const defaultPlatforms = Array.isArray(platforms)
    ? platforms.join(",")
    : "facebook,instagram,whatsapp,email,widget";

  return {
    platforms: platformFilter || defaultPlatforms,
    folder: selectedEmailFolder || "INBOX",
    search: chatListSearchQuery || "",
    connectionId: selectedEmailConnectionId ?? null,
  };
}

/**
 * Prefetch a conversations-list variant (assigned / all / archived).
 * Call this from onMouseEnter on buttons that will cause the UI to show that list.
 * No-op if the cache is already fresh (< 10s old).
 */
export function usePrefetchConversations(variant: ConversationVariant) {
  const queryClient = useQueryClient();
  const filters = useCurrentListFilters();

  return useCallback(() => {
    const assigned = variant === "assigned";
    const archived = variant === "archived";
    const key = socialKeys.conversationsList({
      platforms: filters.platforms,
      search: filters.search,
      folder: filters.folder,
      assigned,
      archived,
      connectionId: filters.connectionId,
    });

    const state = queryClient.getQueryState(key);
    if (state?.dataUpdatedAt && Date.now() - state.dataUpdatedAt < FRESH_WINDOW_MS) {
      return;
    }

    queryClient.prefetchInfiniteQuery({
      queryKey: key,
      queryFn: async ({ pageParam = 1 }) => {
        const apiParams: Record<string, string | number | boolean> = {
          page: pageParam as number,
          page_size: 20,
          platforms: filters.platforms,
        };
        if (filters.folder) apiParams.folder = filters.folder;
        if (filters.search) apiParams.search = filters.search;
        if (assigned) apiParams.assigned = "true";
        if (archived) apiParams.archived = "true";
        if (filters.connectionId) apiParams.connection_id = filters.connectionId;

        const response = await axios.get<PaginatedUnifiedConversation>(
          "/api/social/conversations/",
          { params: apiParams }
        );
        return response.data;
      },
      initialPageParam: 1,
      staleTime: PREFETCH_STALE_TIME_MS,
    });
  }, [queryClient, filters, variant]);
}

/**
 * Prefetch the unread-messages count. Cheap request, worth warming before
 * mutations that will change the count (assign/end-session).
 */
export function usePrefetchUnreadCount() {
  const queryClient = useQueryClient();

  return useCallback(() => {
    const key = socialKeys.unreadCount();
    const state = queryClient.getQueryState(key);
    if (state?.dataUpdatedAt && Date.now() - state.dataUpdatedAt < FRESH_WINDOW_MS) {
      return;
    }

    queryClient.prefetchQuery({
      queryKey: key,
      queryFn: async () => {
        const response = await axios.get("/api/social/unread-count/");
        return response.data;
      },
      staleTime: PREFETCH_STALE_TIME_MS,
    });
  }, [queryClient]);
}
