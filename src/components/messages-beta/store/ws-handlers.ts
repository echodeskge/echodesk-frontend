/**
 * Maps incoming WS frames from /ws/messages/<tenant_schema>/ to store
 * mutations. Pure functions (state, frame) → store-action calls so they're
 * easy to unit test without React.
 *
 * For PR2 we only handle event types the backend already emits today
 * (`new_message`, `conversation_update`, `read_receipt`, `delivery_receipt`,
 * `session_ended`). The new assignment_update / read_state_update /
 * archive_update handlers land in PR3 + PR4 once the backend broadcasts
 * them.
 */
import { parseTimestamp } from "@/lib/parseTimestamp";

import type { MessageType } from "@/components/chat/types";

import type { MessagesBetaStore } from "./useMessagesBetaStore";

interface WsFrame {
  type: string;
  [key: string]: unknown;
}

/**
 * Translate the same chatId-building rules MessagesChat uses (line 351-371
 * of MessagesChat.tsx) for incoming `new_message` payloads. Centralised here
 * so the beta page doesn't drift from the production page's id semantics.
 */
function buildChatId(messageData: Record<string, any>, dataConversationId?: string): string | undefined {
  const platform = messageData.platform;
  const isFromBusiness =
    platform === "widget"
      ? !messageData.is_from_visitor
      : messageData.is_from_page || messageData.is_from_business || false;

  const conversationId = isFromBusiness
    ? messageData.recipient_id || dataConversationId
    : dataConversationId ||
      messageData.sender_id ||
      messageData.from_number ||
      messageData.to_number;

  if (platform === "facebook" && messageData.page_id) {
    return `fb_${messageData.page_id}_${conversationId}`;
  }
  if (platform === "instagram" && messageData.account_id) {
    return `ig_${messageData.account_id}_${conversationId}`;
  }
  if (platform === "whatsapp" && (messageData.waba_id || messageData.account_id)) {
    const wabaId = messageData.waba_id || messageData.account_id;
    let number = messageData.is_from_business ? messageData.to_number : messageData.from_number;
    if (typeof number === "string" && number.startsWith("+")) number = number.slice(1);
    return `wa_${wabaId}_${number || conversationId}`;
  }
  if (platform === "widget" && messageData.connection_id && messageData.session_id) {
    return `widget_${messageData.connection_id}_${messageData.session_id}`;
  }
  return messageData.chat_id || dataConversationId;
}

/**
 * Reconstruct our store's prefixed chat id from a backend broadcast that
 * carries (platform, account_id, conversation_id) where conversation_id is
 * the raw platform conversation key (FB sender_id, WA from_number, ...).
 *
 * Mirrors buildChatId above but for the assignment/archive/read broadcast
 * shape (account_id arrives explicitly instead of being inferred from a
 * message payload). Returns `null` when we can't reconstruct (missing
 * pieces or unsupported platform) so callers can fall back to the
 * platform+conversationKey scan path.
 */
function buildChatIdFromBroadcast(
  platform: string | undefined,
  accountId: string | undefined,
  conversationId: string | undefined
): string | null {
  if (!platform || !conversationId) return null;
  if (platform === "facebook" && accountId) return `fb_${accountId}_${conversationId}`;
  if (platform === "instagram" && accountId) return `ig_${accountId}_${conversationId}`;
  if (platform === "whatsapp" && accountId) {
    const number = conversationId.startsWith("+") ? conversationId.slice(1) : conversationId;
    return `wa_${accountId}_${number}`;
  }
  if (platform === "widget" && accountId) return `widget_${accountId}_${conversationId}`;
  if (platform === "email") return conversationId; // already prefixed (email_...)
  return null;
}

/**
 * Resolve a backend broadcast to one (or more) of our store's chat ids.
 * Prefers explicit reconstruction via account_id; falls back to scanning
 * conversations for a row whose conversationKey matches when account_id
 * isn't carried (e.g. mark-read endpoints don't take it).
 */
function resolveStoreChatIds(
  store: MessagesBetaStore,
  platform: string | undefined,
  accountId: string | null | undefined,
  conversationKey: string
): string[] {
  const built = buildChatIdFromBroadcast(platform, accountId || undefined, conversationKey);
  if (built && store.conversations.some((r) => r.id === built)) return [built];
  // Fall back: match against conversationKey on whatever rows exist. This is
  // used by mark-read-style broadcasts that don't carry account_id, and as a
  // safety net for fabricated rows whose conversationKey holds the full id.
  const matches = store.conversations
    .filter(
      (row) =>
        row.conversationKey === conversationKey &&
        (!platform || row.platform === platform)
    )
    .map((r) => r.id);
  if (matches.length > 0) return matches;
  // Last resort: maybe conversationKey IS already the prefixed chat id
  // (fabricated rows, or beta clients that received the broadcast for a chat
  // they don't have a row for yet).
  if (built) return [built];
  return store.conversations.some((r) => r.id === conversationKey) ? [conversationKey] : [];
}

function frameToMessage(messageData: Record<string, any>): MessageType {
  const isFromBusiness =
    messageData.platform === "widget"
      ? !messageData.is_from_visitor
      : messageData.is_from_page || messageData.is_from_business || false;

  // For PR2 we render text-only + basic attachments. The full attachment
  // logic (image proxy URLs, voice messages, file fallbacks) is in
  // MessagesChat.tsx; we'll port that in PR4 along with the composer.
  const msg: MessageType = {
    id: messageData.id != null ? String(messageData.id) : String(messageData.message_id || ""),
    senderId: isFromBusiness ? "business" : messageData.sender_id || messageData.from_number || "",
    text: messageData.message_text || "",
    status: "DELIVERED",
    createdAt: parseTimestamp(messageData.timestamp),
    platformMessageId: messageData.message_id,
    senderName: messageData.sender_name || messageData.contact_name,
    platform: messageData.platform,
    source: messageData.source,
    isEcho: messageData.is_echo,
    sentByName: messageData.sent_by || messageData.sent_by_name,
  };

  if (Array.isArray(messageData.attachments) && messageData.attachments.length > 0) {
    const first = messageData.attachments[0];
    const type = first?.type || messageData.attachment_type;
    if (type === "image" || type === "sticker") {
      msg.images = messageData.attachments
        .map((att: any) => ({
          name: att?.type || "image",
          url: att?.url || messageData.attachment_url,
          size: 0,
          type: "image",
        }))
        .filter((att: { url: unknown }) => att.url);
    } else if (type === "audio") {
      const url = first?.url || messageData.attachment_url;
      if (url) msg.voiceMessage = { name: "audio", url, size: 0 };
    } else {
      msg.files = messageData.attachments
        .map((att: any) => ({
          name: att?.filename || "attachment",
          url: att?.url || messageData.attachment_url,
          size: 0,
        }))
        .filter((att: { url: unknown }) => att.url);
    }
  }

  return msg;
}

export function dispatchWsFrame(
  store: MessagesBetaStore,
  frame: WsFrame,
  enabledPlatforms: ReadonlyArray<string>
): void {
  store.touchWs();

  switch (frame.type) {
    case "new_message": {
      const messageData = (frame.message as Record<string, any>) || {};
      const conversationId = (frame.conversation_id as string | undefined) || undefined;
      if (!enabledPlatforms.includes(messageData.platform)) return;

      const chatId = buildChatId(messageData, conversationId);
      if (!chatId) return;

      const message = frameToMessage(messageData);
      const isSelected = store.selectedChatId === chatId;

      // Seed metadata so a brand-new sender (no row in the bootstrap list)
      // shows up in the sidebar instantly. The store falls back to these
      // values only when the row doesn't already exist; an existing row
      // is left intact and just gets its lastMessage refreshed.
      const isFromBusiness =
        messageData.platform === "widget"
          ? !messageData.is_from_visitor
          : messageData.is_from_page || messageData.is_from_business || false;
      const accountId =
        messageData.page_id ||
        messageData.account_id ||
        messageData.waba_id ||
        messageData.connection_id ||
        "";
      const conversationKey = chatId.split("_").slice(2).join("_") || chatId;
      const seedRow = {
        platform: messageData.platform,
        accountId: String(accountId),
        conversationKey,
        // For agent-sent (echo) frames the "name" should be the customer,
        // not the agent — fall back to recipient_name/contact_name.
        name: isFromBusiness
          ? messageData.recipient_name || messageData.contact_name || "Customer"
          : messageData.sender_name || messageData.contact_name || "New conversation",
      };

      store.appendMessage(chatId, message, isSelected, seedRow);
      break;
    }

    case "conversation_update": {
      const conversationId = frame.conversation_id as string | undefined;
      const last = (frame.last_message as Record<string, any>) || {};
      if (!conversationId) return;
      if (last.text || last.timestamp) {
        store.updateLastMessage(
          conversationId,
          String(last.text || ""),
          String(last.timestamp || new Date().toISOString())
        );
      }
      break;
    }

    case "read_receipt": {
      const conversationId = frame.conversation_id as string | undefined;
      const ts = (frame.timestamp as string | undefined) || new Date().toISOString();
      if (conversationId) store.setReadWatermark(conversationId, ts);
      break;
    }

    case "delivery_receipt": {
      // PR2: no-op. PR4 will track per-message delivered flags once the
      // composer is wired and we care about sent/delivered status pips.
      break;
    }

    case "session_ended": {
      const conversationId = frame.conversation_id as string | undefined;
      const endedBy = frame.ended_by as "visitor" | "agent" | "timeout" | undefined;
      const endedAt = (frame.ended_at as string | undefined) || new Date().toISOString();
      if (conversationId) {
        store.setSessionEnded(conversationId, endedAt, endedBy ?? null);
        if (store.selectedChatId === conversationId) {
          // Match /messages behaviour: drop the user out of the closed chat
          // so they can't compose into a dead session.
          store.selectChat(null);
        }
      }
      break;
    }

    case "assignment_update": {
      // Cross-user reactivity — patches the assignment slice for one chat.
      // Every connected agent on the tenant receives this frame.
      const platformConversationId = frame.conversation_id as string | undefined;
      const platform = frame.platform as string | undefined;
      const accountId = frame.account_id as string | undefined;
      if (!platformConversationId) break;

      const chatIds = resolveStoreChatIds(store, platform, accountId, platformConversationId);
      if (chatIds.length === 0) break;

      const assignedUserId = frame.assigned_user_id as number | null | undefined;
      const slice = assignedUserId == null
        ? null
        : {
            assignedUserId,
            assignedUserName: (frame.assigned_user_name as string | null | undefined) ?? null,
            status: (frame.status as "active" | "in_session" | "completed" | null | undefined) ?? null,
            sessionStartedAt: (frame.session_started_at as string | null | undefined) ?? null,
            sessionEndedAt: (frame.session_ended_at as string | null | undefined) ?? null,
          };
      for (const chatId of chatIds) store.patchAssignment(chatId, slice);
      break;
    }

    case "read_state_update": {
      const platformConversationId = frame.conversation_id as string | null | undefined;
      const platform = frame.platform as string | undefined;
      const accountId = frame.account_id as string | null | undefined;
      const unread = frame.unread_count as number | undefined;

      if (platformConversationId == null) {
        // Bulk hint: clear all unread for the listed platform. Used by
        // mark_all_conversations_read and archive_all_conversations.
        if (platform && enabledPlatforms.includes(platform)) {
          store.clearAllUnreadForPlatform(platform as never);
        }
        break;
      }

      const targets = resolveStoreChatIds(store, platform, accountId, platformConversationId);
      const ts = frame.last_read_at as string | undefined;
      for (const chatId of targets) {
        if (typeof unread === "number") {
          store.setUnread(chatId, unread);
        } else {
          store.clearUnread(chatId);
        }
        if (ts) store.setReadWatermark(chatId, ts);
      }
      break;
    }

    case "archive_update": {
      const platformConversationId = frame.conversation_id as string | null | undefined;
      const platform = frame.platform as string | undefined;
      const accountId = frame.account_id as string | null | undefined;
      const archived = !!frame.archived;
      const archivedAt = (frame.archived_at as string | null | undefined) ?? null;
      const byUserId = (frame.by_user_id as number | null | undefined) ?? null;

      if (platformConversationId == null) {
        // Bulk: emitted by archive_all_conversations per-platform.
        if (platform && enabledPlatforms.includes(platform)) {
          store.bulkPatchArchiveForPlatform(platform as never, archived, archivedAt);
        }
        break;
      }

      const targets = resolveStoreChatIds(store, platform, accountId, platformConversationId);
      for (const chatId of targets) {
        if (archived) {
          store.patchArchive(chatId, {
            archivedAt: archivedAt || new Date().toISOString(),
            byUserId,
          });
        } else {
          store.patchArchive(chatId, null);
        }
      }
      break;
    }

    case "connection":
    case "pong":
      break;

    default:
      // Unknown type: ignore. This keeps the beta page resilient to backend
      // additions and matches the existing /messages behaviour.
      break;
  }
}
