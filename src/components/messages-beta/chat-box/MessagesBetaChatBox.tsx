"use client";

import { useEffect, useMemo, useRef } from "react";

import axios from "@/api/axios";
import { Card } from "@/components/ui/card";
import { MessageBubble } from "@/components/chat/message-bubble";
import type { UserType } from "@/components/chat/types";

import { MessagesBetaComposer } from "../composer/MessagesBetaComposer";
import { selectMessagesForChat } from "../store/selectors";
import { useMessagesBetaStore } from "../store/useMessagesBetaStore";
import { fetchMessagesForChat } from "../store/rest-bootstrap";

const CURRENT_USER: UserType = {
  id: "business",
  name: "Me",
  status: "online",
};

export function MessagesBetaChatBox() {
  const selectedChatId = useMessagesBetaStore((s) => s.selectedChatId);
  const conversations = useMessagesBetaStore((s) => s.conversations);
  const messagesByChatId = useMessagesBetaStore((s) => s.messagesByChatId);
  const messagesLoaded = useMessagesBetaStore((s) => s.messagesLoaded);
  const hydrateMessages = useMessagesBetaStore((s) => s.hydrateMessages);

  const conversation = useMemo(
    () => conversations.find((c) => c.id === selectedChatId) || null,
    [conversations, selectedChatId]
  );

  // Lazy-load the thread once per chat — never re-fetch after that. WS keeps
  // it live. The dirty-set song-and-dance the legacy page does to plug holes
  // in this model isn't needed here because we no longer overwrite live state
  // with stale REST hits.
  const inFlightRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!conversation || !selectedChatId) return;
    if (messagesLoaded[selectedChatId]) return;
    if (inFlightRef.current.has(selectedChatId)) return;

    inFlightRef.current.add(selectedChatId);
    const id = selectedChatId;
    fetchMessagesForChat(id, conversation.platform)
      .then((msgs) => hydrateMessages(id, msgs))
      .catch((err) => console.error("[messages-beta] fetchMessagesForChat failed:", err))
      .finally(() => inFlightRef.current.delete(id));
  }, [conversation, selectedChatId, messagesLoaded, hydrateMessages]);

  // Mark the conversation read once per (chat × session). The backend then
  // broadcasts read_state_update (PR3) which clears the badge in every
  // connected agent's beta sidebar simultaneously — including the user who
  // just opened it. We POST asynchronously and don't await the result; if
  // the request fails the badge just stays until the next mark-read.
  const markReadFiredRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!conversation || !selectedChatId) return;
    if (markReadFiredRef.current.has(selectedChatId)) return;
    markReadFiredRef.current.add(selectedChatId);

    // chatId layout: <prefix>_<account>_<rest>. mark-read only needs the
    // platform + the platform-specific conversation_id, which is everything
    // after the second underscore (matches the legacy /messages convention).
    const parts = selectedChatId.split("_");
    if (parts.length < 3) return;
    const conversationKey = parts.slice(2).join("_");

    axios
      .post("/api/social/mark-read/", {
        platform: conversation.platform,
        conversation_id: conversationKey,
      })
      .catch((err) => {
        // Don't toast — mark-read is best-effort; a transient failure just
        // means the badge sticks around until the user re-opens the chat.
        console.warn("[messages-beta] mark-read failed:", err);
      });
  }, [conversation, selectedChatId]);

  const messages = selectMessagesForChat({ messagesByChatId }, selectedChatId);

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length]);

  if (!selectedChatId) {
    return (
      <Card className="grow flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground">Select a conversation to start reading.</p>
      </Card>
    );
  }

  if (!conversation) {
    return (
      <Card className="grow flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground">Conversation not found in this view.</p>
      </Card>
    );
  }

  const userMap = new Map<string, UserType>([
    [CURRENT_USER.id, CURRENT_USER],
    [conversation.name || "customer", { id: conversation.name, name: conversation.name, status: "online" }],
  ]);

  const loadingThisChat = !messagesLoaded[selectedChatId];

  return (
    <Card className="grow h-full flex flex-col overflow-hidden">
      <div className="shrink-0 border-b px-4 py-3 flex items-center gap-2">
        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
          {conversation.name?.slice(0, 2).toUpperCase() || "?"}
        </div>
        <div>
          <p className="text-sm font-medium leading-tight">{conversation.name}</p>
          <p className="text-[11px] text-muted-foreground capitalize">{conversation.platform}</p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
        {loadingThisChat && (
          <p className="text-xs text-muted-foreground py-4 text-center">Loading messages…</p>
        )}
        {!loadingThisChat && messages.length === 0 && (
          <p className="text-xs text-muted-foreground py-4 text-center">No messages yet.</p>
        )}
        <ul className="flex flex-col gap-y-1.5">
          {messages.map((message) => {
            const sender = userMap.get(message.senderId) || {
              id: message.senderId,
              name: message.senderName || conversation.name,
              status: "online",
            };
            const isByCurrentUser = message.senderId === CURRENT_USER.id;
            return (
              <MessageBubble
                key={message.id}
                sender={sender}
                message={message}
                isByCurrentUser={isByCurrentUser}
                platform={conversation.platform}
              />
            );
          })}
        </ul>
      </div>

      <MessagesBetaComposer conversation={conversation} />
    </Card>
  );
}
