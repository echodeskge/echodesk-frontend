"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, History, Loader2, Search } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { ChatMessageSearch } from "@/components/chat/chat-message-search";
import { MessageBubble } from "@/components/chat/message-bubble";
import { TypingIndicator } from "@/components/chat/typing-indicator";
import type { MessageType, UserType } from "@/components/chat/types";
import { useTypingWebSocket } from "@/hooks/useTypingWebSocket";

import { fetchMessagesForChat } from "../store/rest-bootstrap";
import { selectMessagesForChat } from "../store/selectors";
import { useMessagesBetaStore } from "../store/useMessagesBetaStore";
import type { ConversationRow } from "../store/types";

interface Props {
  conversation: ConversationRow;
  /** Maps to message.senderId === currentUser.id for the "outgoing" styling. */
  currentUser: UserType;
}

const NEAR_BOTTOM_PX = 80;

/**
 * Thread surface for /messages-beta.
 *
 * Owns:
 *   • The message list rendered through the legacy `MessageBubble` for full
 *     reaction / reply-preview / status-pip parity (PR B's headline win).
 *   • "Load older messages" — fetches the deep-history page once per chat,
 *     tracked in `fullHistoryLoadedByChatId` so we never re-fetch the same
 *     thread's full history twice in a session.
 *   • In-thread search via legacy `ChatMessageSearch` — bound to the beta
 *     store's `messageSearchQuery` slice through the ChatContextShim wrapper.
 *   • Typing indicator inbound via `useTypingWebSocket` scoped to this chat.
 *   • Smarter auto-scroll: only sticks the user to the bottom when they
 *     were already near it (matches legacy chat-box-content-list:44–48).
 */
export function MessagesBetaThread({ conversation, currentUser }: Props) {
  const t = useTranslations("messagesBeta.thread");
  const selectedChatId = conversation.id;

  const messagesByChatId = useMessagesBetaStore((s) => s.messagesByChatId);
  const messagesLoaded = useMessagesBetaStore((s) => s.messagesLoaded);
  const fullHistoryLoadedByChatId = useMessagesBetaStore(
    (s) => s.fullHistoryLoadedByChatId
  );
  const isLoadingFullHistory = useMessagesBetaStore((s) => s.isLoadingFullHistory);
  const setIsLoadingFullHistory = useMessagesBetaStore((s) => s.setIsLoadingFullHistory);
  const setFullHistoryForChat = useMessagesBetaStore((s) => s.setFullHistoryForChat);
  const messageSearchQuery = useMessagesBetaStore((s) => s.messageSearchQuery);
  const setMessageSearchQuery = useMessagesBetaStore((s) => s.setMessageSearchQuery);

  const messages = selectMessagesForChat({ messagesByChatId }, selectedChatId);

  // --- Typing indicator: scoped to the active chat. ---
  // Use the same unprefixed conversation key the typing-WS room is built on.
  const typingConversationId =
    conversation.conversationKey || conversation.id.split("_").slice(2).join("_") || conversation.id;
  const { typingUsers } = useTypingWebSocket({ conversationId: typingConversationId });

  // --- In-thread search bar. ---
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const matchingIndices = useMemo(() => {
    const q = messageSearchQuery.trim().toLowerCase();
    if (!q) return [] as number[];
    return messages
      .map((m, i) => (m.text?.toLowerCase().includes(q) ? i : -1))
      .filter((i) => i >= 0);
  }, [messages, messageSearchQuery]);

  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  useEffect(() => {
    // Reset match cursor whenever the query or the list of matches changes
    // — otherwise the highlight could land on an out-of-range index.
    setCurrentMatchIndex(0);
  }, [messageSearchQuery, matchingIndices.length]);

  const handleSearchClose = useCallback(() => {
    setIsSearchOpen(false);
    setMessageSearchQuery("");
    setCurrentMatchIndex(0);
  }, [setMessageSearchQuery]);

  const handlePrevMatch = useCallback(() => {
    setCurrentMatchIndex((prev) =>
      prev > 0 ? prev - 1 : matchingIndices.length - 1
    );
  }, [matchingIndices.length]);

  const handleNextMatch = useCallback(() => {
    setCurrentMatchIndex((prev) =>
      prev < matchingIndices.length - 1 ? prev + 1 : 0
    );
  }, [matchingIndices.length]);

  // --- Scroll behaviour. Pin to the bottom while the user is reading the
  //     latest messages; when they scroll up, stop auto-scrolling and surface
  //     a "jump to latest" button instead. ---
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLUListElement>(null);
  const wasNearBottomRef = useRef(true);
  const messageRefs = useRef<Map<number, HTMLLIElement>>(new Map());
  const prevSelectedChatRef = useRef<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [flashIndex, setFlashIndex] = useState<number | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // A reply-quote click whose target isn't in the loaded window yet — held
  // until full history loads, then resolved by the effect below handleLoadOlder.
  const [pendingQuote, setPendingQuote] = useState<{ id: string | null; mid?: string } | null>(
    null
  );

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    const el = scrollAreaRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
    wasNearBottomRef.current = true;
    setShowScrollButton(false);
  }, []);

  // When the user opens a different chat, jump to the most recent message;
  // preserve mid-thread scroll only within the SAME chat.
  useEffect(() => {
    if (prevSelectedChatRef.current === selectedChatId) return;
    prevSelectedChatRef.current = selectedChatId;
    wasNearBottomRef.current = true;
    setShowScrollButton(false);
    // Defer to after paint so the freshly-rendered list has its full height.
    requestAnimationFrame(() => scrollToBottom("auto"));
  }, [selectedChatId, scrollToBottom]);

  // On message-list growth, follow the bottom only if the user was already
  // there. Skip while search is open so the highlighted match stays put.
  useEffect(() => {
    if (isSearchOpen) return;
    if (wasNearBottomRef.current) scrollToBottom("auto");
  }, [messages.length, isSearchOpen, scrollToBottom]);

  // Late-rendering media (images/video) grows the thread height AFTER the
  // message count settled, which previously left the view "half scrolled".
  // A ResizeObserver re-pins to the bottom whenever the content reflows — but
  // only while the user is still parked at the bottom.
  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const ro = new ResizeObserver(() => {
      if (isSearchOpen) return;
      if (!wasNearBottomRef.current) return;
      const el = scrollAreaRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
    ro.observe(content);
    return () => ro.disconnect();
  }, [isSearchOpen, selectedChatId]);

  const handleScroll = useCallback(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distanceFromBottom < NEAR_BOTTOM_PX;
    wasNearBottomRef.current = atBottom;
    setShowScrollButton(!atBottom);
  }, []);

  const scrollToIndex = useCallback((idx: number) => {
    const node = messageRefs.current.get(idx);
    if (!node) return;
    node.scrollIntoView({ behavior: "smooth", block: "center" });
    setFlashIndex(idx);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => setFlashIndex(null), 1600);
  }, []);

  // Clicking a reply-quote scrolls up to the quoted message and briefly
  // highlights it. Resolves the target by DB id (reply_to_id) or platform
  // message id (reply_to_message_id). When the quoted message is older than
  // the loaded window, stash it and let the resolver effect pull full history.
  const scrollToQuoted = useCallback(
    (msg: MessageType) => {
      const targetId = msg.replyToId != null ? String(msg.replyToId) : null;
      const targetMid = msg.replyToMessageId;
      const idx = messages.findIndex(
        (m) =>
          (!!targetId && m.id === targetId) ||
          (!!targetMid && m.platformMessageId === targetMid)
      );
      if (idx >= 0) {
        scrollToIndex(idx);
        return;
      }
      setPendingQuote({ id: targetId, mid: targetMid });
    },
    [messages, scrollToIndex]
  );

  // Scroll the highlighted search match into view when it changes.
  useEffect(() => {
    if (!isSearchOpen) return;
    const idx = matchingIndices[currentMatchIndex];
    if (idx == null) return;
    const node = messageRefs.current.get(idx);
    node?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [isSearchOpen, currentMatchIndex, matchingIndices]);

  // --- Load older messages. Fires the deep-page fetch ONCE per chat. ---
  const isFullLoaded = !!fullHistoryLoadedByChatId[selectedChatId];
  const handleLoadOlder = useCallback(async () => {
    if (isFullLoaded || isLoadingFullHistory) return;
    setIsLoadingFullHistory(true);
    try {
      const deeper = await fetchMessagesForChat(selectedChatId, conversation.platform, {
        fullHistory: true,
      });
      if (deeper.length > 0) {
        setFullHistoryForChat(selectedChatId, deeper);
      } else {
        // Even if the deep fetch returned nothing (empty thread), don't keep
        // showing the "Load older" button — there's nothing to load.
        setFullHistoryForChat(selectedChatId, messages);
      }
    } catch (err) {
      console.warn("[messages-beta] load-older failed:", err);
    } finally {
      setIsLoadingFullHistory(false);
    }
  }, [
    isFullLoaded,
    isLoadingFullHistory,
    setIsLoadingFullHistory,
    setFullHistoryForChat,
    selectedChatId,
    conversation.platform,
    messages,
  ]);

  // Resolve a pending reply-quote: scroll once the target is in the loaded
  // list; otherwise pull full history and retry on the next messages update.
  useEffect(() => {
    if (!pendingQuote) return;
    const idx = messages.findIndex(
      (m) =>
        (!!pendingQuote.id && m.id === pendingQuote.id) ||
        (!!pendingQuote.mid && m.platformMessageId === pendingQuote.mid)
    );
    if (idx >= 0) {
      // Wait a frame so the freshly-rendered rows have their refs + height.
      requestAnimationFrame(() => scrollToIndex(idx));
      setPendingQuote(null);
      return;
    }
    if (!isFullLoaded && !isLoadingFullHistory) {
      void handleLoadOlder();
    } else if (isFullLoaded) {
      // Full history loaded and still not found — nothing more we can do.
      setPendingQuote(null);
    }
  }, [
    pendingQuote,
    messages,
    isFullLoaded,
    isLoadingFullHistory,
    handleLoadOlder,
    scrollToIndex,
  ]);

  const userMap = useMemo(() => {
    const map = new Map<string, UserType>();
    map.set(currentUser.id, currentUser);
    map.set(conversation.name || "customer", {
      id: conversation.name,
      name: conversation.name,
      avatar: conversation.avatar,
      status: "online",
    });
    return map;
  }, [currentUser, conversation.name, conversation.avatar]);

  const loadingThisChat = !messagesLoaded[selectedChatId];

  return (
    <div className="relative flex flex-col flex-1 min-h-0">
      <div className="flex items-center justify-end px-3 py-1 border-b">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setIsSearchOpen((v) => !v)}
          aria-label={t("searchMessages")}
          className="h-8"
        >
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {isSearchOpen && (
        <ChatMessageSearch
          onClose={handleSearchClose}
          matchCount={matchingIndices.length}
          currentMatchIndex={currentMatchIndex}
          onPrevMatch={handlePrevMatch}
          onNextMatch={handleNextMatch}
        />
      )}

      <div
        ref={scrollAreaRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto px-4 py-3"
      >
        {/* Load older messages — top of thread. Hidden once the deep fetch
            has run for this chat in this session. */}
        {!loadingThisChat && !isFullLoaded && (
          <div className="flex justify-center py-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleLoadOlder}
              disabled={isLoadingFullHistory}
              className="text-muted-foreground hover:text-foreground"
            >
              {isLoadingFullHistory ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("loadingHistory")}
                </>
              ) : (
                <>
                  <History className="mr-2 h-4 w-4" />
                  {t("loadOlder")}
                </>
              )}
            </Button>
          </div>
        )}

        {loadingThisChat && (
          <p className="text-xs text-muted-foreground py-4 text-center">{t("loadingMessages")}</p>
        )}
        {!loadingThisChat && messages.length === 0 && (
          <p className="text-xs text-muted-foreground py-4 text-center">{t("noMessages")}</p>
        )}

        <ul ref={contentRef} className="flex flex-col gap-y-1.5">
          {messages.map((message, idx) => {
            const isByCurrentUser = message.senderId === currentUser.id;
            // Fall back to the conversation-level avatar for any customer
            // sender (incoming) so MessageBubble doesn't render initials
            // when the row already knows the customer's profile picture.
            // For business-sent messages we keep currentUser as the sender.
            const sender =
              userMap.get(message.senderId) ||
              (isByCurrentUser
                ? currentUser
                : {
                    id: message.senderId,
                    name: message.senderName || conversation.name,
                    avatar: conversation.avatar,
                    status: "online",
                  });
            const isHighlighted =
              matchingIndices[currentMatchIndex] === idx || idx === flashIndex;
            return (
              <MessageBubble
                key={message.id || `idx-${idx}`}
                ref={(el) => {
                  if (el) messageRefs.current.set(idx, el);
                  else messageRefs.current.delete(idx);
                }}
                sender={sender}
                message={message}
                isByCurrentUser={isByCurrentUser}
                platform={conversation.platform}
                isHighlighted={isHighlighted}
                searchQuery={messageSearchQuery}
                onQuoteClick={scrollToQuoted}
              />
            );
          })}
        </ul>
      </div>

      {typingUsers.length > 0 && (
        <div className="px-4 pb-2 shrink-0">
          {typingUsers.map((u) => (
            <TypingIndicator key={u.user_id} userName={u.user_name} />
          ))}
        </div>
      )}

      {/* "Jump to latest" — shown only when the user has scrolled up. Clicking
          it smooth-scrolls back to the newest message. */}
      {showScrollButton && (
        <Button
          type="button"
          variant="secondary"
          size="icon"
          onClick={() => scrollToBottom("smooth")}
          aria-label={t("scrollToBottom")}
          className="absolute bottom-4 right-4 z-10 h-9 w-9 rounded-full shadow-md"
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
