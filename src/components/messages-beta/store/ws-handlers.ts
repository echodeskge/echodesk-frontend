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
      store.appendMessage(chatId, message, isSelected);
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
      // Every connected agent on the tenant receives this frame, so when
      // teammate A claims a chat, teammate B's sidebar tab selectors
      // recompute and the chat moves between All / Assigned without any
      // imperative hide-this-row code.
      const conversationId = frame.conversation_id as string | undefined;
      if (!conversationId) break;
      const assignedUserId = frame.assigned_user_id as number | null | undefined;
      if (assignedUserId == null) {
        // Unassigned (or status null = post-end-session deletion).
        store.patchAssignment(conversationId, null);
      } else {
        store.patchAssignment(conversationId, {
          assignedUserId,
          assignedUserName: (frame.assigned_user_name as string | null | undefined) ?? null,
          status: (frame.status as "active" | "in_session" | "completed" | null | undefined) ?? null,
          sessionStartedAt: (frame.session_started_at as string | null | undefined) ?? null,
          sessionEndedAt: (frame.session_ended_at as string | null | undefined) ?? null,
        });
      }
      break;
    }

    case "read_state_update": {
      const conversationId = frame.conversation_id as string | null | undefined;
      const platform = frame.platform as string | undefined;
      const unread = frame.unread_count as number | undefined;
      if (conversationId == null) {
        // Bulk hint: clear all unread for the listed platform. Used by
        // mark_all_conversations_read and archive_all_conversations.
        if (platform && enabledPlatforms.includes(platform)) {
          store.clearAllUnreadForPlatform(platform as never);
        }
      } else {
        if (typeof unread === "number") {
          store.setUnread(conversationId, unread);
        } else {
          store.clearUnread(conversationId);
        }
        const ts = frame.last_read_at as string | undefined;
        if (ts) store.setReadWatermark(conversationId, ts);
      }
      break;
    }

    case "archive_update": {
      const conversationId = frame.conversation_id as string | null | undefined;
      const platform = frame.platform as string | undefined;
      const archived = !!frame.archived;
      const archivedAt = (frame.archived_at as string | null | undefined) ?? null;
      const byUserId = (frame.by_user_id as number | null | undefined) ?? null;
      if (conversationId == null) {
        // Bulk: emitted by archive_all_conversations per-platform.
        if (platform && enabledPlatforms.includes(platform)) {
          store.bulkPatchArchiveForPlatform(platform as never, archived, archivedAt);
        }
      } else if (archived) {
        store.patchArchive(conversationId, {
          archivedAt: archivedAt || new Date().toISOString(),
          byUserId,
        });
      } else {
        store.patchArchive(conversationId, null);
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
