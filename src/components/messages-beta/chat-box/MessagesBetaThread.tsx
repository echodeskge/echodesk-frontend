"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { History, Loader2, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ChatMessageSearch } from "@/components/chat/chat-message-search";
import { MessageBubble } from "@/components/chat/message-bubble";
import { TypingIndicator } from "@/components/chat/typing-indicator";
import type { UserType } from "@/components/chat/types";
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

  // --- Scroll behaviour: only stick to bottom when the user is already
  //     near it. Avoids yanking them up when they're scrolling history. ---
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const wasNearBottomRef = useRef(true);
  const messageRefs = useRef<Map<number, HTMLLIElement>>(new Map());
  const prevSelectedChatRef = useRef<string | null>(null);

  // When the user opens a different chat, force-scroll to the bottom so they
  // land on the most recent message; preserve mid-thread scroll only within
  // the SAME chat.
  useEffect(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    if (prevSelectedChatRef.current !== selectedChatId) {
      el.scrollTop = el.scrollHeight;
      wasNearBottomRef.current = true;
      prevSelectedChatRef.current = selectedChatId;
    }
  }, [selectedChatId]);

  // On every message list change, scroll only if the user was already near
  // the bottom. We also skip auto-scroll while a search is open so the
  // highlighted match stays in view.
  useEffect(() => {
    if (isSearchOpen) return;
    const el = scrollAreaRef.current;
    if (!el) return;
    if (wasNearBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages.length, isSearchOpen]);

  const handleScroll = useCallback(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    wasNearBottomRef.current = distanceFromBottom < NEAR_BOTTOM_PX;
  }, []);

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
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center justify-end px-3 py-1 border-b">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setIsSearchOpen((v) => !v)}
          aria-label="Search messages"
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
                  Loading history…
                </>
              ) : (
                <>
                  <History className="mr-2 h-4 w-4" />
                  Load older messages
                </>
              )}
            </Button>
          </div>
        )}

        {loadingThisChat && (
          <p className="text-xs text-muted-foreground py-4 text-center">Loading messages…</p>
        )}
        {!loadingThisChat && messages.length === 0 && (
          <p className="text-xs text-muted-foreground py-4 text-center">No messages yet.</p>
        )}

        <ul className="flex flex-col gap-y-1.5">
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
            const isHighlighted = matchingIndices[currentMatchIndex] === idx;
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
    </div>
  );
}
