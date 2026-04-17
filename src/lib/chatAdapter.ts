import type { ChatType, MessageType, UserType, LastMessageType } from "@/components/chat/types";
import { parseTimestamp } from "@/lib/parseTimestamp";

/**
 * Strips HTML tags from a string and decodes HTML entities
 */
function stripHtmlTags(html: string): string {
  if (!html) return '';
  // Remove HTML tags
  let text = html.replace(/<[^>]*>/g, ' ');
  // Decode common HTML entities
  text = text.replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  // Collapse multiple spaces into one and trim
  return text.replace(/\s+/g, ' ').trim();
}

// Attachment interface
interface Attachment {
  type: string;
  url: string;
  sticker_id?: string;
  media_id?: string;
  mime_type?: string;
  filename?: string;
}

// Shared attachment conversion result
interface AttachmentResult {
  images?: { name: string; url: string; size: number; type?: string }[];
  files?: { name: string; url: string; size: number }[];
  voiceMessage?: { name: string; url: string; size: number };
}

/**
 * Converts a UnifiedMessage's attachments into images/files/voiceMessage.
 * Mutates msg.message_text to add placeholder text when no URL is available.
 * Shared by both convertFacebookMessagesToChatFormat and convertUnifiedMessagesToMessageType.
 */
function convertAttachments(msg: UnifiedMessage): AttachmentResult {
  let images: AttachmentResult['images'];
  let files: AttachmentResult['files'];
  let voiceMessage: AttachmentResult['voiceMessage'];

  // For emails, treat ALL attachments as files (clickable to open)
  // Inline images are already rendered in the HTML body
  if (msg.platform === 'email' && msg.attachments && msg.attachments.length > 0) {
    const fileAttachments: { name: string; url: string; size: number }[] = [];

    msg.attachments.forEach((att: any) => {
      fileAttachments.push({
        name: att.filename || 'attachment',
        url: att.url,
        size: att.size || 0,
      });
    });

    if (fileAttachments.length > 0) files = fileAttachments;
  } else {
    // For other platforms (Facebook, Instagram, WhatsApp)
    const attachmentType = msg.attachment_type || msg.message_type || '';
    const imgTypes = ['image', 'sticker'];
    const isImageType = imgTypes.includes(attachmentType);
    const isVideoType = attachmentType === 'video';
    const isAudioType = attachmentType === 'audio';

    // Resolve URL — for WhatsApp use proxy when media_id is available
    const resolveAttUrl = (a: Attachment) => {
      if (msg.platform === 'whatsapp' && a.media_id && (msg as any).waba_id) {
        return `/api/social/whatsapp-media/${a.media_id}/?waba_id=${(msg as any).waba_id}`;
      }
      return a.url;
    };

    // Use full attachments array when available (supports multiple images)
    if (msg.attachments && msg.attachments.length > 0) {
      const imageAtts = msg.attachments.filter((a) => resolveAttUrl(a) && imgTypes.includes(a.type || attachmentType));
      const videoAtts = msg.attachments.filter((a) => resolveAttUrl(a) && (a.type === 'video' || (!a.type && isVideoType)));
      const audioAtts = msg.attachments.filter((a) => resolveAttUrl(a) && (a.type === 'audio' || (!a.type && isAudioType)));

      if (imageAtts.length > 0) {
        images = imageAtts.map((a) => ({
          name: a.type || 'image', url: resolveAttUrl(a), size: 0, type: 'image',
        }));
      }
      if (videoAtts.length > 0) {
        images = [...(images || []), { name: 'video', url: resolveAttUrl(videoAtts[0]), size: 0, type: 'video' }];
      }
      if (audioAtts.length > 0) {
        voiceMessage = { name: 'audio', url: resolveAttUrl(audioAtts[0]), size: 0 };
      }
      // Everything else as files
      const knownTypes = [...imgTypes, 'video', 'audio'];
      const fileAtts = msg.attachments.filter((a) => resolveAttUrl(a) && !knownTypes.includes(a.type || attachmentType));
      if (fileAtts.length > 0 && !images && !voiceMessage) {
        files = fileAtts.map((a) => ({
          name: a.filename || a.type || 'file', url: resolveAttUrl(a), size: 0,
        }));
      }
    }

    // Fallback to attachment_url if no media resolved from attachments array
    if (!images && !files && !voiceMessage) {
      const attachmentUrl = msg.attachment_url || msg.attachments?.find((a) => a.url)?.url;
      if (attachmentUrl) {
        if (isImageType) {
          images = [{ name: attachmentType, url: attachmentUrl, size: 0, type: 'image' }];
        } else if (isVideoType) {
          images = [{ name: 'video', url: attachmentUrl, size: 0, type: 'video' }];
        } else if (isAudioType) {
          voiceMessage = { name: 'audio', url: attachmentUrl, size: 0 };
        } else {
          const filename = msg.attachments?.[0]?.filename || attachmentType;
          files = [{ name: filename, url: attachmentUrl, size: 0 }];
        }
      }
    }

    // Placeholder text for messages with attachments but no loadable URL
    if (!images && !files && !voiceMessage && msg.attachments && msg.attachments.length > 0 && !msg.message_text) {
      const attType = msg.attachments[0]?.type || 'file';
      const attName = msg.attachments[0]?.filename;
      if (attType === 'image' || attType === 'sticker') {
        msg.message_text = attName ? `📷 ${attName}` : '📷 Image sent';
      } else if (attType === 'video') {
        msg.message_text = attName ? `🎥 ${attName}` : '🎥 Video sent';
      } else if (attType === 'audio') {
        msg.message_text = '🎵 Audio sent';
      } else {
        msg.message_text = attName ? `📎 ${attName}` : '📎 Attachment sent';
      }
    }
  }

  return { images, files, voiceMessage };
}

/**
 * Converts a UnifiedMessage to a MessageType (shared conversion logic).
 * The senderId is determined by the caller since the context differs.
 */
function convertMessageFields(msg: UnifiedMessage, senderId: string): MessageType {
  // Calculate status for messages sent by business only
  let status = "SENT";
  if (msg.is_from_business) {
    if (msg.is_read) {
      status = "READ";
    } else if (msg.is_delivered) {
      status = "DELIVERED";
    }
  }

  const { images, files, voiceMessage } = convertAttachments(msg);

  const effectiveSenderName = msg.is_from_business
    ? (msg.recipient_name || msg.sender_name)
    : msg.sender_name;

  return {
    id: msg.id,
    senderId,
    text: msg.message_text,
    images,
    files,
    voiceMessage,
    status,
    createdAt: parseTimestamp(msg.timestamp),
    platformMessageId: msg.platform_message_id,
    senderName: effectiveSenderName,
    recipientName: msg.recipient_name,
    source: msg.source,
    isEcho: msg.is_echo,
    sentByName: msg.sent_by_name,
    isEdited: msg.is_edited,
    editedAt: msg.edited_at ? parseTimestamp(msg.edited_at) : undefined,
    originalText: msg.original_text,
    isRevoked: msg.is_revoked,
    revokedAt: msg.revoked_at ? new Date(msg.revoked_at) : undefined,
    bodyHtml: msg.body_html,
    subject: msg.subject,
    platform: msg.platform,
    replyToMessageId: msg.reply_to_message_id,
    replyToId: msg.reply_to_id,
    replyToText: msg.reply_to_text,
    replyToSenderName: msg.reply_to_sender_name,
    reaction: msg.reaction,
    reactionEmoji: msg.reaction_emoji,
    reactedBy: msg.reacted_by,
    reactedAt: msg.reacted_at ? new Date(msg.reacted_at) : undefined,
  };
}

// Unified message interfaces supporting Facebook, Instagram, WhatsApp, and Email
interface UnifiedMessage {
  id: string;
  platform: 'facebook' | 'instagram' | 'whatsapp' | 'email';
  sender_id: string;
  sender_name: string;
  recipient_name?: string; // For outgoing messages - the customer's name
  profile_pic_url?: string;
  message_text: string;
  message_type?: string;
  attachment_type?: string;
  attachment_url?: string;
  attachments?: Attachment[];
  timestamp: string;
  is_from_business: boolean;
  is_delivered?: boolean;
  delivered_at?: string;
  is_read?: boolean;
  read_at?: string;
  page_name?: string;
  conversation_id: string;
  platform_message_id: string;
  account_id: string;
  // Message source tracking (all platforms)
  source?: 'echodesk' | 'cloud_api' | 'business_app' | 'synced' | 'facebook_app' | 'messenger_app' | 'instagram_app';
  is_echo?: boolean;
  // Staff member who sent this message via EchoDesk
  sent_by_name?: string;
  is_edited?: boolean;
  edited_at?: string;
  original_text?: string;
  is_revoked?: boolean;
  revoked_at?: string;
  // Email fields
  subject?: string;
  body_html?: string;
  // Reply fields (Facebook Messenger)
  reply_to_message_id?: string;
  reply_to_id?: number;
  reply_to_text?: string;
  reply_to_sender_name?: string;
  // Reaction fields (Facebook Messenger)
  reaction?: string;
  reaction_emoji?: string;
  reacted_by?: string;
  reacted_at?: string;
}

interface UnifiedConversation {
  platform: 'facebook' | 'instagram' | 'whatsapp' | 'email';
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  profile_pic_url?: string;
  last_message: UnifiedMessage;
  message_count: number;
  account_name: string;
  account_id: string;
  // Email-specific fields
  subject?: string;
  // Unread count (messages from customers not read by staff)
  unread_count?: number;
}

/**
 * Converts unified messages (Facebook, Instagram, and WhatsApp) to full-kit chat format
 * Sorts conversations by last message time (most recent first)
 */
export function convertFacebookMessagesToChatFormat(
  conversations: UnifiedConversation[],
  conversationMessages: Map<string, UnifiedMessage[]>
): ChatType[] {
  const chats = conversations.map((conversation) => {
    const messages = conversationMessages.get(conversation.conversation_id) || [];

    // Create user for the customer
    const customerUser: UserType = {
      id: conversation.sender_id,
      name: conversation.sender_name,
      avatar: conversation.profile_pic_url,
      status: "online", // We don't have real status, default to online
    };

    // Create user for the business/page
    // Use "business" as the ID to match currentUser in MessagesChat
    const businessUser: UserType = {
      id: "business",
      name: conversation.account_name,
      avatar: undefined, // Pages don't have avatars in our system
      status: "online",
    };

    // Convert messages using shared helper
    const chatMessages: MessageType[] = messages.map((msg) => {
      const senderId = msg.is_from_business ? businessUser.id : customerUser.id;
      return convertMessageFields(msg, senderId);
    });

    // Sort messages by date
    chatMessages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    // Resolve reply_to references - find the original message text for replies
    chatMessages.forEach((msg) => {
      if (msg.replyToId) {
        const originalMsg = chatMessages.find((m) => m.id === String(msg.replyToId));
        if (originalMsg) {
          msg.replyToText = originalMsg.text;
          // Find the sender name from users
          const sender = originalMsg.senderId === businessUser.id ? businessUser : customerUser;
          msg.replyToSenderName = sender.name;
        }
      }
    });

    // Last message - use text or fallback to attachment type description
    const lastMsg = conversation.last_message;
    let lastMessageContent = lastMsg.message_text;
    // For emails, strip HTML tags from the preview
    if (conversation.platform === 'email' && lastMessageContent) {
      lastMessageContent = stripHtmlTags(lastMessageContent);
    }
    if (!lastMessageContent && lastMsg.attachment_type) {
      // Provide a user-friendly description for attachment-only messages
      const attachmentLabels: Record<string, string> = {
        image: '📷 Image',
        sticker: '🏷️ Sticker',
        video: '🎬 Video',
        audio: '🎵 Audio',
        file: '📎 File',
        document: '📄 Document',
        location: '📍 Location',
      };
      lastMessageContent = attachmentLabels[lastMsg.attachment_type] || '📎 Attachment';
    }
    const lastMessage: LastMessageType = {
      content: lastMessageContent || '',
      createdAt: parseTimestamp(lastMsg.timestamp),
    };

    // Determine if messages are loaded (empty messages array means lazy loading needed)
    const messagesLoaded = chatMessages.length > 0 || conversation.platform !== 'email';

    // Calculate unread count - use conversation.unread_count if available,
    // otherwise check if last message is from customer and not read
    let unreadCount = conversation.unread_count || 0;
    if (unreadCount === 0 && conversation.last_message) {
      // If last message is from customer (not from business) and not read, mark as 1 unread
      if (!conversation.last_message.is_from_business && !conversation.last_message.is_read) {
        unreadCount = 1;
      }
    }

    return {
      id: conversation.conversation_id,
      lastMessage,
      name: conversation.sender_name,
      avatar: conversation.profile_pic_url,
      status: "online",
      messages: chatMessages,
      users: [customerUser, businessUser],
      typingUsers: [],
      unreadCount,
      platform: conversation.platform,
      messagesLoaded,
    };
  });

  // Sort chats by last message time (most recent first)
  chats.sort((a, b) => {
    const timeA = a.lastMessage?.createdAt?.getTime() || 0;
    const timeB = b.lastMessage?.createdAt?.getTime() || 0;
    return timeB - timeA; // Descending order (newest first)
  });

  return chats;
}

/**
 * Converts a single conversation with its messages
 */
export function convertSingleConversation(
  conversation: UnifiedConversation,
  messages: UnifiedMessage[]
): ChatType {
  const map = new Map<string, UnifiedMessage[]>();
  map.set(conversation.conversation_id, messages);
  return convertFacebookMessagesToChatFormat([conversation], map)[0];
}

/**
 * Converts unified messages to MessageType array (for lazy loading)
 */
export function convertUnifiedMessagesToMessageType(messages: UnifiedMessage[]): MessageType[] {
  const chatMessages: MessageType[] = messages.map((msg) => {
    const senderId = msg.is_from_business ? "business" : msg.sender_id;
    return convertMessageFields(msg, senderId);
  });

  // Sort messages by date (oldest first for chat display)
  chatMessages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  // Resolve reply_to references - find the original message text for replies
  chatMessages.forEach((msg) => {
    if (msg.replyToId && !msg.replyToText) {
      const originalMsg = chatMessages.find((m) => m.id === String(msg.replyToId));
      if (originalMsg) {
        msg.replyToText = originalMsg.text;
        msg.replyToSenderName = originalMsg.senderName || (originalMsg.senderId === 'business' ? 'You' : undefined);
      }
    }
  });

  return chatMessages;
}

/**
 * API conversation interface (from unified backend endpoint)
 */
interface ApiUnifiedConversation {
  conversation_id: string;
  platform: 'facebook' | 'instagram' | 'whatsapp' | 'email' | string;
  sender_id: string;
  sender_name: string | null;
  profile_pic_url?: string | null;
  last_message: {
    id: string;
    text: string | null;
    timestamp: string;
    is_from_business: boolean;
    attachment_type?: string | null;
    platform_message_id: string;
  };
  message_count: number;
  unread_count: number;
  account_name: string;
  account_id: string;
  subject?: string | null;
}

/**
 * Converts API unified conversations to ChatType format.
 * Messages are NOT loaded - they will be fetched lazily when chat is selected.
 */
export function convertApiConversationsToChatFormat(
  conversations: ApiUnifiedConversation[]
): ChatType[] {
  const chats = conversations.map((conversation) => {
    // Create user for the customer
    const customerUser = {
      id: conversation.sender_id,
      name: conversation.sender_name || 'Unknown',
      avatar: conversation.profile_pic_url || undefined,
      status: "online",
    };

    // Create user for the business/page
    const businessUser = {
      id: "business",
      name: conversation.account_name,
      avatar: undefined,
      status: "online",
    };

    // Build last message content
    const lastMsg = conversation.last_message;
    let lastMessageContent = lastMsg.text || '';

    // For emails, strip HTML tags from the preview
    if (conversation.platform === 'email' && lastMessageContent) {
      lastMessageContent = stripHtmlTags(lastMessageContent);
    }

    if (!lastMessageContent && lastMsg.attachment_type) {
      const attachmentLabels: Record<string, string> = {
        image: '📷 Image',
        sticker: '🏷️ Sticker',
        video: '🎬 Video',
        audio: '🎵 Audio',
        file: '📎 File',
        document: '📄 Document',
        location: '📍 Location',
        attachment: '📎 Attachment',
      };
      lastMessageContent = attachmentLabels[lastMsg.attachment_type] || '📎 Attachment';
    }

    const lastMessage = {
      content: lastMessageContent,
      createdAt: parseTimestamp(lastMsg.timestamp),
    };

    return {
      id: conversation.conversation_id,
      lastMessage,
      name: conversation.sender_name || 'Unknown',
      avatar: conversation.profile_pic_url || undefined,
      status: "online",
      messages: [], // Messages will be loaded lazily
      users: [customerUser, businessUser],
      typingUsers: [],
      unreadCount: conversation.unread_count,
      platform: conversation.platform as 'facebook' | 'instagram' | 'whatsapp' | 'email',
      messagesLoaded: false, // Always false - messages need to be fetched
    };
  });

  // Sort chats by last message time (most recent first)
  chats.sort((a, b) => {
    const timeA = a.lastMessage?.createdAt?.getTime() || 0;
    const timeB = b.lastMessage?.createdAt?.getTime() || 0;
    return timeB - timeA;
  });

  return chats;
}
