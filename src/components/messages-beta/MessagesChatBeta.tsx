"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useMedia } from "react-use";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { MessagesBetaProvider } from "./MessagesBetaProvider";
import { MessagesBetaChatBox } from "./chat-box/MessagesBetaChatBox";
import { MessagesBetaSidebar } from "./sidebar/MessagesBetaSidebar";
import type { BetaPlatform } from "./store/types";
import { useMessagesBetaStore } from "./store/useMessagesBetaStore";
import {
  readFiltersFromSearch,
  snapshotsEqual,
  writeFiltersToSearch,
} from "./url-state";

interface Props {
  platforms: BetaPlatform[];
}

/**
 * /messages-beta orchestrator. Reads URL → store, store → URL, then renders
 * the sidebar + chat box. Deliberately thin — heavy lifting lives in the
 * Provider (bootstrap, WS) and the store (state + selectors).
 */
export function MessagesChatBeta({ platforms }: Props) {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();

  const urlChatId = Array.isArray(params.id) ? params.id[0] : (params.id as string | undefined);
  const selectedChatId = useMessagesBetaStore((s) => s.selectedChatId);
  const selectChat = useMessagesBetaStore((s) => s.selectChat);

  // PR G — URL ↔ store sync for filter state (tab / view / platform).
  const assignmentTab = useMessagesBetaStore((s) => s.assignmentTab);
  const showArchived = useMessagesBetaStore((s) => s.showArchived);
  const platformFilter = useMessagesBetaStore((s) => s.platformFilter);
  const setAssignmentTab = useMessagesBetaStore((s) => s.setAssignmentTab);
  const setShowArchived = useMessagesBetaStore((s) => s.setShowArchived);
  const setPlatformFilter = useMessagesBetaStore((s) => s.setPlatformFilter);

  // One-shot hydration from the URL on first mount. We deliberately skip
  // continuous URL→store mirroring because the store changes during normal
  // UI interaction (tab clicks, platform picker) and we own the URL push
  // in the other direction below.
  const hydratedFromUrlRef = useRef(false);
  useEffect(() => {
    if (hydratedFromUrlRef.current) return;
    hydratedFromUrlRef.current = true;
    if (typeof window === "undefined") return;
    const snapshot = readFiltersFromSearch(window.location.search);
    if (snapshot.assignmentTab !== assignmentTab) setAssignmentTab(snapshot.assignmentTab);
    if (snapshot.showArchived !== showArchived) setShowArchived(snapshot.showArchived);
    if (snapshot.platformFilter !== platformFilter) setPlatformFilter(snapshot.platformFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Store → URL whenever the relevant slices change. Uses replaceState so
  // we don't pile up history entries for every tab click — only the chat
  // id change (handleSelectChat) creates a new history entry.
  useEffect(() => {
    if (!hydratedFromUrlRef.current) return;
    if (typeof window === "undefined") return;
    const next = { assignmentTab, showArchived, platformFilter };
    const currentSnap = readFiltersFromSearch(window.location.search);
    if (snapshotsEqual(currentSnap, next)) return;
    const nextSearch = writeFiltersToSearch(window.location.search, next);
    const url = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}`;
    window.history.replaceState(null, "", url);
  }, [assignmentTab, showArchived, platformFilter]);

  // URL → store sync. Hydrate from the route, but ONLY when the URL has a
  // truthy chat id. Without this guard, the effect fights with sidebar
  // clicks: handleSelectChat uses history.pushState (not router.push) for
  // perf, and useParams() doesn't reactively pick up pushState, so urlChatId
  // stays `undefined` after a click — re-running the effect with that
  // undefined would then clobber the store back to null and the "Select a
  // conversation" empty state would render. Mirrors MessagesChat.tsx:111
  // which uses the same `if (initialChatId && ...)` guard.
  useEffect(() => {
    if (urlChatId && urlChatId !== selectedChatId) {
      selectChat(urlChatId);
    }
  }, [urlChatId, selectedChatId, selectChat]);

  // Store → URL. When the user clicks a sidebar item we push the new chatId
  // into the URL using history.pushState so Next.js doesn't re-render the
  // entire tree (matches the perf choice MessagesChat made).
  const handleSelectChat = useCallback(
    (chatId: string) => {
      selectChat(chatId);
      const base = pathname.replace(/\/[^/]*$/, "");
      const root =
        pathname.startsWith("/social/messages-beta")
          ? "/social/messages-beta"
          : "/messages-beta";
      // We use pushState (not router.push) to avoid a Next.js navigation
      // round-trip on every chat click. Falls back to the router if the
      // browser API isn't available (SSR/edge cases).
      if (typeof window !== "undefined") {
        window.history.pushState(null, "", `${root}/${chatId}${window.location.search}`);
      } else {
        router.push(`${root}/${chatId}`);
      }
      // Suppress unused warning while keeping the variable available for
      // future tab-aware navigation logic.
      void base;
    },
    [selectChat, pathname, router]
  );

  // Browser back/forward → store sync. Restores the chat id AND the
  // filter slices so the prior URL view actually reproduces.
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      const match = path.match(/\/messages-beta\/(.+)$/);
      selectChat(match ? match[1] : null);

      const snapshot = readFiltersFromSearch(window.location.search);
      const state = useMessagesBetaStore.getState();
      if (snapshot.assignmentTab !== state.assignmentTab) {
        state.setAssignmentTab(snapshot.assignmentTab);
      }
      if (snapshot.showArchived !== state.showArchived) {
        state.setShowArchived(snapshot.showArchived);
      }
      if (snapshot.platformFilter !== state.platformFilter) {
        state.setPlatformFilter(snapshot.platformFilter);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [selectChat]);

  // Mobile sidebar drawer wiring (mirrors chat-sidebar/index.tsx). On
  // screens < md we hide the inline sidebar and surface it via a slide-in
  // Sheet; the chat box's hamburger opens it, selecting a chat closes it.
  // `useMedia` returns false during SSR; ssr-fallback to desktop layout to
  // avoid hydration mismatch flicker.
  const isMobile = useMedia("(max-width: 767px)", false);
  const isMobileSidebarOpen = useMessagesBetaStore((s) => s.isMobileSidebarOpen);
  const setIsMobileSidebarOpen = useMessagesBetaStore((s) => s.setIsMobileSidebarOpen);

  const handleSelectChatAndClose = useCallback(
    (chatId: string) => {
      handleSelectChat(chatId);
      // Auto-close the drawer on mobile so the user lands directly in the
      // chat — same UX as the legacy page.
      if (isMobile) setIsMobileSidebarOpen(false);
    },
    [handleSelectChat, isMobile, setIsMobileSidebarOpen]
  );

  return (
    <MessagesBetaProvider platforms={platforms}>
      <div className="relative w-full flex gap-x-4 p-4 h-[80vh]">
        {!isMobile && (
          <MessagesBetaSidebar onSelectChat={handleSelectChatAndClose} platforms={platforms} />
        )}
        {isMobile && (
          <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
            <SheetContent side="left" className="p-0 w-[90vw] max-w-sm">
              <SheetHeader className="sr-only">
                <SheetTitle>Conversations</SheetTitle>
                <SheetDescription>Pick a conversation to read or reply.</SheetDescription>
              </SheetHeader>
              <div className="h-full">
                <MessagesBetaSidebar
                  onSelectChat={handleSelectChatAndClose}
                  platforms={platforms}
                />
              </div>
            </SheetContent>
          </Sheet>
        )}
        <MessagesBetaChatBox />
      </div>
    </MessagesBetaProvider>
  );
}
