"use client";

import { ReactNode, useMemo } from "react";

import { ChatContext } from "@/components/chat/contexts/chat-context";
import type { ChatContextType, ReplyingToType } from "@/components/chat/types";

import { useMessagesBetaStore } from "../store/useMessagesBetaStore";

/**
 * A minimal ChatContext provider scoped to /messages-beta.
 *
 * We deliberately avoid mounting the full legacy `ChatProvider` here because
 * it pulls in React Query + the legacy reducer + many side-effect hooks we
 * intentionally don't run in the socket-driven page. But several dumb
 * legacy presentation components (MessageBubble, ChatMessageSearch, …) read
 * `useChatContext()` for two slim concerns:
 *
 *   • `setReplyingTo`           — MessageBubble's reply button
 *   • `replyingTo`              — composer's reply preview
 *   • `messageSearchQuery`      — in-thread search bar
 *   • `setMessageSearchQuery`   — in-thread search bar
 *
 * Wrap the beta tree with this Provider and those components light up
 * against the beta store. Everything else on the context type is set to a
 * safe no-op so a stray legacy call site can't crash the page.
 *
 * NOTE: this lives in beta-only space; the legacy /messages page already
 * mounts the real ChatProvider and never sees this shim.
 */
export function MessagesBetaChatContextShim({ children }: { children: ReactNode }) {
  const messageSearchQuery = useMessagesBetaStore((s) => s.messageSearchQuery);
  const setMessageSearchQuery = useMessagesBetaStore((s) => s.setMessageSearchQuery);

  const value: ChatContextType = useMemo(() => {
    const noop = () => {
      /* shim */
    };
    const noopAsync = async () => {
      /* shim */
    };
    // Cast through `unknown` because we're intentionally NOT implementing
    // the chat-state half of the context (the beta page uses its own store
    // for everything other than the four fields we expose). Components that
    // try to read chatState here would never have been wired into beta in
    // the first place.
    // Reply functionality is wired in PR C. Until then the bubble's reply
    // button calls a no-op — harmless. When PR C lands this getter/setter
    // pair becomes reactive via the beta store.
    const replyingTo: ReplyingToType | null = null;
    const setReplyingTo = (_next: ReplyingToType | null) => {
      /* PR C wires this to the beta store */
    };
    return {
      chatState: { chats: [], selectedChat: null },
      isChatSidebarOpen: false,
      setIsChatSidebarOpen: noop,
      handleSelectChat: noop,
      handleAddTextMessage: noop,
      handleAddImagesMessage: noop,
      handleAddFilesMessage: noop,
      handleRemoveChat: noop,
      handleSetUnreadCount: noop,
      chatListSearchQuery: "",
      setChatListSearchQuery: noop,
      messageSearchQuery,
      setMessageSearchQuery,
      assignmentTab: "all",
      setAssignmentTab: noop,
      assignedChatIds: new Set<string>(),
      assignmentEnabled: false,
      loadingMessages: false,
      loadChatMessages: noopAsync,
      reloadChatMessages: noopAsync,
      prefetchChatMessages: noop,
      isInitialLoading: false,
      loadFullHistory: noopAsync,
      isLoadingHistory: false,
      fullHistoryLoadedChats: new Set<string>(),
      platforms: [],
      platformFilter: null,
      setPlatformFilter: noop,
      selectedEmailFolder: "INBOX",
      setSelectedEmailFolder: noop,
      selectedEmailConnectionId: null,
      setSelectedEmailConnectionId: noop,
      replyingTo,
      setReplyingTo,
      showArchived: false,
      setShowArchived: noop,
      selectedChatId: null,
      setSelectedChatId: noop,
    } as unknown as ChatContextType;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messageSearchQuery, setMessageSearchQuery]);

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}
