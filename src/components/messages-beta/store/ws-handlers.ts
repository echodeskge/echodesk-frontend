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
import { consumePendingMedia } from "@/lib/pendingMedia";
import { convertAttachments, extractLocation } from "@/lib/chatAdapter";

import { isInEndSessionBlockWindow } from "../end-session-block";

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

  // Route attachments through the SAME shared adapter the REST path + the
  // legacy page use, so live messages classify image/video/audio/file and
  // derive filenames + "📷 Image sent" style placeholders identically —
  // instead of the weaker hand-rolled mapping that mislabelled files as a bare
  // "attachment". Seed `waba_id` so WhatsApp media URLs get rewritten to our
  // proxy endpoint inside the adapter.
  const attMsg: Record<string, any> = {
    ...messageData,
    waba_id: messageData.waba_id || messageData.account_id,
  };
  const { images, files, voiceMessage } = convertAttachments(
    attMsg as unknown as Parameters<typeof convertAttachments>[0]
  );

  const msg: MessageType = {
    id: messageData.id != null ? String(messageData.id) : String(messageData.message_id || ""),
    senderId: isFromBusiness ? "business" : messageData.sender_id || messageData.from_number || "",
    // convertAttachments sets a placeholder ("📷 Image sent") on attMsg when an
    // attachment has no loadable URL — prefer it over an empty body.
    text: attMsg.message_text || "",
    images,
    files,
    voiceMessage,
    // Shared location (WhatsApp type:'location') → message.location so the
    // bubble renders the "Open in Maps" card. Same extractor as the REST path.
    location: extractLocation({ attachments: messageData.attachments }),
    status: "DELIVERED",
    createdAt: parseTimestamp(messageData.timestamp),
    platformMessageId: messageData.message_id,
    senderName: messageData.sender_name || messageData.contact_name,
    platform: messageData.platform,
    source: messageData.source,
    isEcho: messageData.is_echo,
    sentByName: messageData.sent_by || messageData.sent_by_name,
    // Reply-quote thread-through. Map the API-provided reply text when present;
    // appendMessage resolves it against the loaded thread when only the id is
    // sent (the common case for live frames).
    replyToMessageId: messageData.reply_to_message_id,
    replyToId: messageData.reply_to_id,
    replyToText: messageData.reply_to_text,
    replyToSenderName: messageData.reply_to_sender_name,
  };

  return msg;
}

/**
 * For self-echoed media (our own send bouncing back via new_message), the
 * platform's CDN URL is often not yet ready in the echo payload — so the
 * message renders without an attachment URL and looks broken for a beat.
 *
 * The composer (PR C) stashes a blob URL via `addPendingMedia(chatId, …)`
 * BEFORE sending; here we consume that blob URL once on the matching echo
 * and slot it into the message. Result: the sent image renders instantly
 * from local memory until the real URL lands, then the lightbox swaps it
 * on the next list refresh.
 */
function applyPendingMediaIfNeeded(
  chatId: string,
  message: MessageType,
  isFromBusiness: boolean
): void {
  if (!isFromBusiness) return;
  const hasImageUrl = message.images?.some((i) => i.url);
  const hasFileUrl = message.files?.some((f) => f.url);
  // Only consume pending media when the echo arrived WITHOUT a usable URL.
  if (hasImageUrl || hasFileUrl) return;
  const pending = consumePendingMedia(chatId);
  if (!pending) return;
  if (pending.isImage) {
    message.images = [
      {
        name: pending.fileName,
        url: pending.blobUrl,
        size: 0,
        type: "image",
      },
    ];
  } else {
    message.files = [
      {
        name: pending.fileName,
        url: pending.blobUrl,
        size: 0,
      },
    ];
  }
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

      // End-session block window: legacy MessagesChat.tsx:270-330. When an
      // agent just ended a session, the backend sends a rating-request
      // `new_message` back to the customer. Without this guard, the echo
      // would re-fabricate a row in the sidebar for the now-archived chat
      // and it would briefly appear in the All tab until `archive_update`
      // lands. 60s is the legacy threshold.
      if (
        isInEndSessionBlockWindow(chatId) &&
        !store.conversations.some((r) => r.id === chatId)
      ) {
        return;
      }

      const isFromBusiness =
        messageData.platform === "widget"
          ? !messageData.is_from_visitor
          : messageData.is_from_page || messageData.is_from_business || false;

      const message = frameToMessage(messageData);
      // If this is our own send echoing back, swap in the pending blob URL
      // for instant-render. Matches legacy MessagesChat behaviour.
      applyPendingMediaIfNeeded(chatId, message, isFromBusiness);
      const isSelected = store.selectedChatId === chatId;

      // Seed metadata so a brand-new sender (no row in the bootstrap list)
      // shows up in the sidebar instantly. The store falls back to these
      // values only when the row doesn't already exist; an existing row
      // is left intact and just gets its lastMessage refreshed.
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
      // Backend can emit `conversation_id` either prefixed (`fb_<page>_<sender>`)
      // or unprefixed depending on the call site. Resolve to the store's
      // prefixed chatId(s) before patching so the lastMessage lands on the
      // right row.
      const platformConversationId = frame.conversation_id as string | undefined;
      const platform = frame.platform as string | undefined;
      const accountId = frame.account_id as string | undefined;
      const last = (frame.last_message as Record<string, any>) || {};
      if (!platformConversationId) return;
      const targets = resolveStoreChatIds(store, platform, accountId, platformConversationId);
      if (targets.length === 0) break;
      if (last.text || last.timestamp) {
        for (const chatId of targets) {
          store.updateLastMessage(
            chatId,
            String(last.text || ""),
            String(last.timestamp || new Date().toISOString())
          );
        }
      }
      break;
    }

    case "read_receipt": {
      const platformConversationId = frame.conversation_id as string | undefined;
      const platform = frame.platform as string | undefined;
      const accountId = frame.account_id as string | undefined;
      const ts = (frame.timestamp as string | undefined) || new Date().toISOString();
      if (!platformConversationId) break;
      const targets = resolveStoreChatIds(store, platform, accountId, platformConversationId);
      for (const chatId of targets) store.setReadWatermark(chatId, ts);
      break;
    }

    case "delivery_receipt": {
      // PR2: no-op. PR4 will track per-message delivered flags once the
      // composer is wired and we care about sent/delivered status pips.
      break;
    }

    case "session_ended": {
      const platformConversationId = frame.conversation_id as string | undefined;
      const platform = frame.platform as string | undefined;
      const accountId = frame.account_id as string | undefined;
      const endedBy = frame.ended_by as "visitor" | "agent" | "timeout" | undefined;
      const endedAt = (frame.ended_at as string | undefined) || new Date().toISOString();
      if (!platformConversationId) break;
      const targets = resolveStoreChatIds(store, platform, accountId, platformConversationId);
      for (const chatId of targets) {
        store.setSessionEnded(chatId, endedAt, endedBy ?? null);
        if (store.selectedChatId === chatId) {
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

    case "conversation_deleted": {
      // PR F additive frame from delete_conversation +
      // clear_platform_history. Two variants share one type:
      //   • per-chat: conversation_id set → remove the matching row(s)
      //   • bulk: conversation_id null → remove every row on the platform
      //     (used by clear_platform_history when a whole channel is wiped)
      const platformConversationId = frame.conversation_id as string | null | undefined;
      const platform = frame.platform as string | undefined;
      const accountId = frame.account_id as string | null | undefined;

      if (platformConversationId == null) {
        if (!platform || !enabledPlatforms.includes(platform)) break;
        const toRemove = store.conversations
          .filter((row) => row.platform === platform)
          .map((row) => row.id);
        for (const chatId of toRemove) store.removeConversation(chatId);
        break;
      }

      const targets = resolveStoreChatIds(store, platform, accountId, platformConversationId);
      for (const chatId of targets) store.removeConversation(chatId);
      break;
    }

    case "message_status": {
      // Batch status pip update (delivered / read) on outgoing bubbles.
      // Backend sends status as 'delivered'|'read'; map to the MessageType
      // status enum the bubble renders.
      const platform = frame.platform as string | undefined;
      const accountId = frame.account_id as string | null | undefined;
      const conversationId = frame.conversation_id as string | undefined;
      const messageIds = (frame.message_ids as Array<string | number> | undefined) || [];
      const raw = frame.status as string | undefined;
      const status = raw === "read" ? "READ" : raw === "delivered" ? "DELIVERED" : null;
      if (!conversationId || !status || messageIds.length === 0) break;
      const targets = resolveStoreChatIds(store, platform, accountId, conversationId);
      for (const chatId of targets) store.setMessagesStatus(chatId, messageIds, status);
      break;
    }

    case "reaction_update": {
      // Reaction add/remove on a single message. Empty reaction_emoji
      // clears it. WA matches by platform message id, FB/IG by DB id —
      // the store action checks both.
      const platform = frame.platform as string | undefined;
      const accountId = frame.account_id as string | null | undefined;
      const conversationId = frame.conversation_id as string | undefined;
      const messageId = frame.message_id as string | number | undefined;
      if (!conversationId || messageId == null) break;
      const targets = resolveStoreChatIds(store, platform, accountId, conversationId);
      for (const chatId of targets) {
        store.setMessageReaction(chatId, messageId, (frame.reaction_emoji as string) || "");
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
