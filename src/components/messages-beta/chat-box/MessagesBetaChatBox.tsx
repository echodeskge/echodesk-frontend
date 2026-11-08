"use client";

import { useEffect, useMemo, useRef } from "react";

import { Bot, ChevronLeft, MessageSquare } from "lucide-react";
import { useTranslations } from "next-intl";

import axios from "@/api/axios";
import { ChatAvatar } from "@/components/chat/chat-avatar";
import { getInitials } from "@/lib/utils";
import type { UserType } from "@/components/chat/types";

import { MessagesBetaComposer } from "../composer/MessagesBetaComposer";
import { MessagesBetaClientRail } from "../client-rail/MessagesBetaClientRail";
import { ChannelBadge, PLATFORM_BRAND } from "../platform-visuals";
import { MessagesBetaSummaryCard } from "./MessagesBetaSummaryCard";
import { MessagesBetaArchivedNotice } from "./MessagesBetaArchivedNotice";
import { MessagesBetaHeaderActions } from "./MessagesBetaHeaderActions";
import { MessagesBetaThread } from "./MessagesBetaThread";
import { MessagesBetaChatContextShim } from "../shims/ChatContextShim";
import { useMessagesBetaStore } from "../store/useMessagesBetaStore";
import { resolveDeepLinkArchiveState } from "../store/archive-status";
import { fetchMessagesForChat } from "../store/rest-bootstrap";
import { PLACEHOLDER_CONVERSATION_NAME } from "../store/types";
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
    tg: "telegram",
  };
  const platform = PREFIX_TO_PLATFORM[prefix];
  if (!platform) return null;
  return {
    id: chatId,
    platform,
    accountId,
    conversationKey,
    name: PLACEHOLDER_CONVERSATION_NAME,
  };
}

const CURRENT_USER: UserType = {
  id: "business",
  name: "Me",
  status: "online",
};

interface ChatBoxProps {
  /** Mobile back bar: return to the conversation list. */
  onBack?: () => void;
}

/** Mobile-only 40px back bar (design: ChevronLeft + "Conversations"). */
function BackBar({ onBack, label }: { onBack?: () => void; label: string }) {
  if (!onBack) return null;
  return (
    <button
      type="button"
      onClick={onBack}
      className="flex h-10 w-full shrink-0 items-center gap-1 border-b px-2 text-[13px] font-medium md:hidden"
      data-testid="messages-back"
    >
      <ChevronLeft className="h-4 w-4" />
      {label}
    </button>
  );
}

export function MessagesBetaChatBox({ onBack }: ChatBoxProps = {}) {
  const t = useTranslations("messagesBeta.chatBox");
  const tPlatforms = useTranslations("messagesBeta.platforms");
  const showSummary = useMessagesBetaStore((s) => s.showSummary);
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

  // Deep-link archive check: archived chats are excluded from the active
  // bootstrap list, so only deep-linked rows have no archive state yet
  // (`undefined`, vs explicit `null` for every list-fetched row). Resolve
  // it once per chat so a History chat lands in the History view instead
  // of masquerading as active in the All tab.
  const archiveCheckRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!conversation || !selectedChatId) return;
    if (bootstrapState !== "ready") return;
    if (useMessagesBetaStore.getState().archivedByChatId[selectedChatId] !== undefined) return;
    if (archiveCheckRef.current.has(selectedChatId)) return;
    archiveCheckRef.current.add(selectedChatId);
    void resolveDeepLinkArchiveState(selectedChatId, conversation);
  }, [conversation, selectedChatId, bootstrapState]);

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
      <div className="flex h-full min-h-0 w-full flex-col">
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted">
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
          </span>
          <p className="text-[13px] text-muted-foreground">{t("selectAConversation")}</p>
        </div>
      </div>
    );
  }

  if (!conversation) {
    // bootstrapState !== "ready" → REST is still in flight; the
    // deep-link effect will fabricate a placeholder once it lands.
    return (
      <div className="flex h-full min-h-0 w-full flex-col">
        <BackBar onBack={onBack} label={t("backToConversations")} />
        <div className="flex flex-1 items-center justify-center p-6">
          <p className="text-[13px] text-muted-foreground">
            {bootstrapState === "ready" ? t("conversationNotFound") : t("loadingConversation")}
          </p>
        </div>
      </div>
    );
  }

  const brand = PLATFORM_BRAND[conversation.platform] ?? tPlatforms("widget");
  const handle =
    conversation.platform === "whatsapp" || conversation.platform === "telegram"
      ? conversation.conversationKey
      : null;
  const sub = [brand, handle].filter(Boolean).join(" · ");

  return (
    <MessagesBetaChatContextShim>
      <div className="relative flex h-full min-h-0 w-full">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col" data-testid="messages-chat">
          <BackBar onBack={onBack} label={t("backToConversations")} />
          <header className="flex h-[52px] shrink-0 items-center gap-2.5 border-b pl-4 pr-3">
            <span className="relative shrink-0">
              <ChatAvatar
                src={conversation.avatar}
                fallback={getInitials(conversation.name)}
                size={2}
                round
                fallbackClassName="bg-primary/10 font-semibold text-primary"
                fallbackFontSize={0.6875}
              />
              <ChannelBadge platform={conversation.platform} size={14} />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-[13px] font-semibold leading-[18px]">{conversation.name}</span>
              <span className="truncate text-[11px] leading-[14px] text-muted-foreground">{sub}</span>
            </span>
            {conversation.aiState === "needs_human" && (
              <span
                className="hidden h-5 shrink-0 items-center gap-1 rounded border border-[#f59e0b] px-1.5 text-[11px] font-semibold text-[#b45309] dark:text-amber-300 md:inline-flex"
                title={conversation.aiReason || undefined}
              >
                <Bot className="h-[11px] w-[11px]" />
                {t("aiNeedsHuman")}
              </span>
            )}
            <div className="ml-auto flex items-center">
              <MessagesBetaHeaderActions conversation={conversation} />
            </div>
          </header>

          <MessagesBetaArchivedNotice chatId={conversation.id} />

          {showSummary && <MessagesBetaSummaryCard conversation={conversation} />}

          <MessagesBetaThread conversation={conversation} currentUser={CURRENT_USER} />

          <MessagesBetaComposer conversation={conversation} />
        </div>

        {/* Client profile rail: an inline third column on desktop, an overlay
            over the chat on mobile. The store owns the open flag. */}
        <MessagesBetaClientRail conversation={conversation} />
      </div>
    </MessagesBetaChatContextShim>
  );
}
