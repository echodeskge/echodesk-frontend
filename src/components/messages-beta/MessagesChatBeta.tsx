"use client";

import { useCallback, useEffect } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";

import { MessagesBetaProvider } from "./MessagesBetaProvider";
import { MessagesBetaChatBox } from "./chat-box/MessagesBetaChatBox";
import { MessagesBetaSidebar } from "./sidebar/MessagesBetaSidebar";
import type { BetaPlatform } from "./store/types";
import { useMessagesBetaStore } from "./store/useMessagesBetaStore";

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

  // URL → store sync. On first mount + any URL change (back/forward, deep
  // link), hydrate selectedChatId from the route. Mirrors MessagesChat.tsx
  // behaviour but without the legacy direct-loaded-chat fallback — the WS
  // store will eventually carry the chat or we'll show the not-found state.
  useEffect(() => {
    if (urlChatId !== selectedChatId) {
      selectChat(urlChatId || null);
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

  // Browser back/forward → store sync.
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      const match = path.match(/\/messages-beta\/(.+)$/);
      selectChat(match ? match[1] : null);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [selectChat]);

  return (
    <MessagesBetaProvider platforms={platforms}>
      <div className="relative w-full flex gap-x-4 p-4 h-[80vh]">
        <MessagesBetaSidebar onSelectChat={handleSelectChat} />
        <MessagesBetaChatBox />
      </div>
    </MessagesBetaProvider>
  );
}
