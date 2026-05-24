"use client";

import { useEffect, useMemo, useRef } from "react";

import { Menu } from "lucide-react";

import axios from "@/api/axios";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { UserType } from "@/components/chat/types";

import { MessagesBetaComposer } from "../composer/MessagesBetaComposer";
import { MessagesBetaClientRail } from "../client-rail/MessagesBetaClientRail";
import { MessagesBetaHeaderActions } from "./MessagesBetaHeaderActions";
import { MessagesBetaThread } from "./MessagesBetaThread";
import { MessagesBetaChatContextShim } from "../shims/ChatContextShim";
import { useMessagesBetaStore } from "../store/useMessagesBetaStore";
import { fetchMessagesForChat } from "../store/rest-bootstrap";
import type { BetaPlatform, ConversationRow } from "../store/types";

/**
 * Parse a chatId prefix into the platform + (account_id, conversation_key)
 * triple. Used to fabricate a placeholder ConversationRow when the user
 * deep-links directly to a chat that hasn't been paginated into the
 * bootstrap list yet. Mirrors the inverse of buildChatId in ws-handlers.ts.
 */
function placeholderFromChatId(chatId: string): Omit<ConversationRow, "lastMessage" | "unreadCount" | "avatar"> | null {
  const parts = chatId.split("_");
  if (parts.length < 3) return null;
  const prefix = parts[0];
  const accountId = parts[1];
  const conversationKey = parts.slice(2).join("_");
  const PREFIX_TO_PLATFORM: Record<string, BetaPlatform> = {
    fb: "facebook",
    ig: "instagram",
    wa: "whatsapp",
    widget: "widget",
    email: "email",
  };
  const platform = PREFIX_TO_PLATFORM[prefix];
  if (!platform) return null;
  return {
    id: chatId,
    platform,
    accountId,
    conversationKey,
    name: "Loading…",
  };
}

const CURRENT_USER: UserType = {
  id: "business",
  name: "Me",
  status: "online",
};

export function MessagesBetaChatBox() {
  const selectedChatId = useMessagesBetaStore((s) => s.selectedChatId);
  const conversations = useMessagesBetaStore((s) => s.conversations);
  const messagesLoaded = useMessagesBetaStore((s) => s.messagesLoaded);
  const hydrateMessages = useMessagesBetaStore((s) => s.hydrateMessages);
  const ensureConversationRow = useMessagesBetaStore((s) => s.ensureConversationRow);
  const bootstrapState = useMessagesBetaStore((s) => s.bootstrapState);

  // Deep-link recovery: if the user landed on /messages-beta/<chatId> for a
  // conversation that the bootstrap page-1 didn't include (large tenant with
  // hundreds of chats, archive, etc.), fabricate a placeholder row from the
  // chatId so the chat box renders and `fetchMessagesForChat` can fire.
  // Only kick in once bootstrap is done — otherwise we'd race the REST
  // hydration and end up with a duplicate row.
  useEffect(() => {
    if (!selectedChatId) return;
    if (bootstrapState !== "ready") return;
    if (conversations.some((c) => c.id === selectedChatId)) return;
    const placeholder = placeholderFromChatId(selectedChatId);
    if (!placeholder) return;
    ensureConversationRow(selectedChatId, placeholder);
  }, [selectedChatId, bootstrapState, conversations, ensureConversationRow]);

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

  // Mark the conversation read once per (chat × session).
  //
  // Two-step pattern:
  //   • Optimistic local clear so the user's own unread badge drops the
  //     instant they click. We can't rely on the read_state_update WS echo
  //     for the actor's own UX — that frame arrives after a round-trip and
  //     the user is staring at the chat in the meantime.
  //   • POST /mark-read to the backend, which emits read_state_update so
  //     every OTHER agent's beta sidebar clears too (PR3 cross-user path).
  //
  // The clear is best-effort: a transient failure just means the badge
  // reappears on the next list refresh.
  const clearUnreadAction = useMessagesBetaStore((s) => s.clearUnread);
  const markReadFiredRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!conversation || !selectedChatId) return;
    if (markReadFiredRef.current.has(selectedChatId)) return;
    markReadFiredRef.current.add(selectedChatId);

    // Optimistic local clear — instant UX.
    clearUnreadAction(selectedChatId);

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
        console.warn("[messages-beta] mark-read failed:", err);
      });
  }, [conversation, selectedChatId, clearUnreadAction]);

  if (!selectedChatId) {
    return (
      <Card className="grow flex flex-col items-center justify-center h-full gap-3 p-4">
        <p className="text-sm text-muted-foreground text-center">
          Select a conversation to start reading.
        </p>
        {/* Mobile: when the sidebar lives in a Sheet, the empty state needs
            its own opener — otherwise the user is stranded on a blank card
            with no nav. Desktop's persistent sidebar is right there so we
            hide this. */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="md:hidden"
          onClick={() => useMessagesBetaStore.getState().setIsMobileSidebarOpen(true)}
        >
          <Menu className="h-4 w-4 mr-2" />
          Open conversations
        </Button>
      </Card>
    );
  }

  if (!conversation) {
    // bootstrapState !== "ready" → REST is still in flight; the
    // deep-link effect will fabricate a placeholder once it lands.
    return (
      <Card className="grow flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground">
          {bootstrapState === "ready"
            ? "Conversation not found in this view."
            : "Loading conversation…"}
        </p>
      </Card>
    );
  }

  return (
    <MessagesBetaChatContextShim>
      <Card className="grow h-full flex flex-col overflow-hidden">
        <div className="shrink-0 border-b px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {/* Mobile-only hamburger — opens the sidebar drawer. Desktop's
                persistent sidebar is always visible so the button hides. */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="md:hidden shrink-0"
              aria-label="Open conversations"
              onClick={() => useMessagesBetaStore.getState().setIsMobileSidebarOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </Button>
            {conversation.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={conversation.avatar}
                alt=""
                className="h-8 w-8 rounded-full object-cover bg-muted shrink-0"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
                {conversation.name?.slice(0, 2).toUpperCase() || "?"}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium leading-tight truncate">{conversation.name}</p>
              <p className="text-[11px] text-muted-foreground capitalize">{conversation.platform}</p>
            </div>
          </div>
          <MessagesBetaHeaderActions conversation={conversation} />
        </div>

        <MessagesBetaThread conversation={conversation} currentUser={CURRENT_USER} />

        <MessagesBetaComposer conversation={conversation} />
      </Card>

      {/* PR E — Customer profile side rail. The legacy ClientDetailPanel is
          a self-contained Sheet that overlays from the right; mounting it
          as a sibling to the Card lets it slide in without competing for
          the chat box's flex space. Beta store owns the open/close flag. */}
      <MessagesBetaClientRail conversation={conversation} />
    </MessagesBetaChatContextShim>
  );
}
