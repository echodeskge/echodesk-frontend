/**
 * One-shot REST bootstrap for /messages-beta.
 *
 * Reuses the existing generated client + adapter functions so we don't drift
 * from the live /messages page's view of the data. After bootstrap, all
 * state updates must come through the WS dispatcher — no polling here.
 */
import axios from "@/api/axios";

import {
  convertApiConversationsToChatFormat,
  convertUnifiedMessagesToMessageType,
} from "@/lib/chatAdapter";
import type { MessageType } from "@/components/chat/types";

import type { BetaPlatform, ChatAssignmentSlice, ConversationRow } from "./types";

interface ApiUnifiedConversation {
  conversation_id: string;
  sender_id: string;
  sender_name?: string;
  account_id?: string;
  account_name?: string;
  profile_pic_url?: string;
  platform: string;
  unread_count: number;
  last_message: {
    text?: string;
    attachment_type?: string;
    timestamp: string;
    is_from_business?: boolean;
  };
  session_ended_at?: string | null;
  session_ended_by?: "visitor" | "agent" | "timeout" | null;
  assigned_user_id?: number | null;
  assigned_user_name?: string | null;
  assignment_status?: "active" | "in_session" | "completed" | null;
  session_started_at?: string | null;
  is_archived?: boolean;
  archived_at?: string | null;
}

interface PaginatedConversations {
  results: ApiUnifiedConversation[];
  next: string | null;
}

export interface BetaConversationsPage {
  rows: ConversationRow[];
  assignments: Array<[string, ChatAssignmentSlice | null]>;
  archives: Array<[string, { archivedAt: string; byUserId: number | null } | null]>;
  /** Next page number to request, or null when there are no more pages. */
  nextPage: number | null;
}

/**
 * Pure mapper from an API conversation array to the trio of beta store
 * slices. Factored out so initial bootstrap + paginated next-page fetches
 * share the same shape conversion.
 */
function mapApiPageToBetaSlices(
  conversations: ApiUnifiedConversation[]
): Pick<BetaConversationsPage, "rows" | "assignments" | "archives"> {
  // Lean on the existing adapter for shape consistency with /messages, then
  // narrow to the slim ConversationRow the beta store cares about.
  const chats = convertApiConversationsToChatFormat(
    conversations.map((c) => ({
      ...c,
      platform: c.platform as ApiUnifiedConversation["platform"],
    })) as Parameters<typeof convertApiConversationsToChatFormat>[0]
  );

  const rows: ConversationRow[] = chats.map((chat) => {
    const apiRow = conversations.find((c) => c.conversation_id === chat.id);
    // `conversationKey` is the UNPREFIXED platform-side conversation
    // identifier (FB sender_id, WA from_number, widget session_id, email
    // thread_id). The backend's mark-read / archive / assignment endpoints
    // accept conversation_id in this same unprefixed shape, and the WS
    // broadcasts echo it back unprefixed too — so this is the join key the
    // WS dispatcher's resolveStoreChatIds() will look against. Prefer the
    // API's sender_id field; fall back to slicing the chat id when older
    // payloads don't carry sender_id.
    const fallbackKey = chat.id.split("_").slice(2).join("_") || chat.id;
    return {
      id: chat.id,
      platform: (chat.platform || "facebook") as BetaPlatform,
      accountId: apiRow?.account_id || "",
      conversationKey: apiRow?.sender_id || fallbackKey,
      name: chat.name,
      avatar: chat.avatar,
      lastMessage: chat.lastMessage
        ? {
            content: chat.lastMessage.content,
            createdAt: chat.lastMessage.createdAt.toISOString(),
          }
        : null,
      unreadCount: chat.unreadCount || 0,
      sessionEndedAt: chat.sessionEndedAt || null,
      sessionEndedBy: chat.sessionEndedBy || null,
    };
  });

  const assignments: Array<[string, ChatAssignmentSlice | null]> = conversations.map((c) => [
    c.conversation_id,
    c.assigned_user_id
      ? {
          assignedUserId: c.assigned_user_id,
          assignedUserName: c.assigned_user_name ?? null,
          status: c.assignment_status ?? "active",
          sessionStartedAt: c.session_started_at ?? null,
          sessionEndedAt: c.session_ended_at ?? null,
        }
      : null,
  ]);

  const archives: Array<[string, { archivedAt: string; byUserId: number | null } | null]> =
    conversations.map((c) => [
      c.conversation_id,
      c.is_archived && c.archived_at
        ? { archivedAt: c.archived_at, byUserId: null }
        : null,
    ]);

  return { rows, assignments, archives };
}

/**
 * Fetch ONE page of the conversations list. Used by both the bootstrap
 * (page 1) and the sidebar's infinite-scroll loader (page 2…N). Returns
 * `nextPage` so callers know whether to expose a "load more" cue or stop.
 */
export async function fetchConversationsPage(opts: {
  platforms: BetaPlatform[];
  page?: number;
  pageSize?: number;
}): Promise<BetaConversationsPage> {
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 50;
  const params = {
    page,
    page_size: pageSize,
    platforms: opts.platforms.join(","),
  };
  const response = await axios.get<PaginatedConversations>("/api/social/conversations/", { params });
  const conversations = response.data?.results ?? [];
  const slices = mapApiPageToBetaSlices(conversations);
  return {
    ...slices,
    nextPage: response.data?.next ? page + 1 : null,
  };
}

/**
 * Backwards-compat entry point — equivalent to `fetchConversationsPage`
 * with page=1 + the same default pageSize. Kept so existing call sites
 * in MessagesBetaProvider don't need to change in this PR.
 */
export async function fetchInitialConversations(opts: {
  platforms: BetaPlatform[];
  pageSize?: number;
}): Promise<BetaConversationsPage> {
  return fetchConversationsPage({ ...opts, page: 1 });
}

interface UnifiedMessagesEnvelope {
  results: Parameters<typeof convertUnifiedMessagesToMessageType>[0];
}

/**
 * Fetches the message history for one conversation. Mirrors the lazy-load
 * step the existing /messages page does on chat select; the beta page only
 * fires this once per chat (the dirty-set / dirty-refetch dance is gone —
 * WS keeps us live after this).
 */
export async function fetchMessagesForChat(
  chatId: string,
  platform: BetaPlatform
): Promise<MessageType[]> {
  // Endpoint shape is platform-specific; for PR2 we cover the social four.
  // Email is excluded from beta page MVP — its endpoint shape differs enough
  // that we want a dedicated PR for it.
  const parts = chatId.split("_");

  if (platform === "facebook" && parts.length >= 3) {
    const pageId = parts[1];
    const senderId = parts.slice(2).join("_");
    const res = await axios.get<UnifiedMessagesEnvelope>("/api/social/facebook-messages/", {
      params: { page_id: pageId, sender_id: senderId, page_size: 50 },
    });
    return convertUnifiedMessagesToMessageType(res.data?.results || []);
  }

  if (platform === "instagram" && parts.length >= 3) {
    const accountId = parts[1];
    const senderId = parts.slice(2).join("_");
    const res = await axios.get<UnifiedMessagesEnvelope>("/api/social/instagram-messages/", {
      params: { account_id: accountId, sender_id: senderId, page_size: 50 },
    });
    return convertUnifiedMessagesToMessageType(res.data?.results || []);
  }

  if (platform === "whatsapp" && parts.length >= 3) {
    const wabaId = parts[1];
    const number = parts.slice(2).join("_");
    const res = await axios.get<UnifiedMessagesEnvelope>("/api/social/whatsapp-messages/", {
      params: { waba_id: wabaId, contact_number: number, page_size: 50 },
    });
    return convertUnifiedMessagesToMessageType(res.data?.results || []);
  }

  if (platform === "widget" && parts.length >= 3) {
    const connectionId = parts[1];
    const sessionId = parts.slice(2).join("_");
    const res = await axios.get("/api/widget/admin/messages/", {
      params: { session_id: sessionId, page_size: 50 },
    });
    const raw = (res.data?.results || res.data || []) as Array<Record<string, unknown>>;
    return convertUnifiedMessagesToMessageType(
      raw.map((msg) => ({
        id: String(msg.id),
        platform: "widget" as const,
        sender_id: String(msg.sender_id || sessionId),
        sender_name: String(msg.sender_name || "Website visitor"),
        message_text: String(msg.message_text || ""),
        timestamp: String(msg.timestamp || ""),
        is_from_business: !(msg.is_from_visitor as boolean | undefined),
        is_delivered: Boolean(msg.is_delivered),
        is_read: Boolean(msg.is_read_by_visitor),
        conversation_id: chatId,
        platform_message_id: String(msg.message_id || msg.id),
        account_id: connectionId,
        attachments: msg.attachments as never,
      })) as never
    );
  }

  return [];
}
