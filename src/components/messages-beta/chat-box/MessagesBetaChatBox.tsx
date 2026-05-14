"use client";

import { useEffect, useMemo, useRef } from "react";

import { Card } from "@/components/ui/card";
import { MessageBubble } from "@/components/chat/message-bubble";
import type { UserType } from "@/components/chat/types";

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

      <div className="shrink-0 border-t p-3">
        <p className="text-xs text-muted-foreground text-center">
          Composer ships in PR 4 — beta is read-only for now.
        </p>
      </div>
    </Card>
  );
}
