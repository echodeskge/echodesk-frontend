import type { ChatType, MessageType, UserType, LastMessageType } from "@/components/chat/types";

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

// Unified message interfaces supporting Facebook, Instagram, WhatsApp, and Email
interface UnifiedMessage {
  id: string;
  platform: 'facebook' | 'instagram' | 'whatsapp' | 'email';
  sender_id: string;
  sender_name: string;
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
  // WhatsApp Coexistence fields
  source?: 'cloud_api' | 'business_app' | 'synced';
  is_echo?: boolean;
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

    // Convert messages
    const chatMessages: MessageType[] = messages.map((msg) => {
      // Calculate status for messages sent by business only
      let status = "SENT"; // Default status
      if (msg.is_from_business) {
        if (msg.is_read) {
          status = "READ";
        } else if (msg.is_delivered) {
          status = "DELIVERED";
        } else {
          status = "SENT";
        }
      }

      let images: { name: string; url: string; size: number }[] | undefined;
      let files: { name: string; url: string; size: number }[] | undefined;
      let voiceMessage: { name: string; url: string; size: number } | undefined;

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
        // For other platforms, use existing logic
        const attachmentType = msg.attachment_type || msg.message_type || '';
        let attachmentUrl = msg.attachment_url;
        if (!attachmentUrl && msg.attachments && msg.attachments.length > 0) {
          attachmentUrl = msg.attachments[0].url;
        }

        const isImageType = ['image', 'sticker'].includes(attachmentType);
        const isAudioType = ['audio'].includes(attachmentType);

        if (attachmentUrl && isImageType) {
          images = [{ name: attachmentType, url: attachmentUrl, size: 0 }];
        }
        if (attachmentUrl && isAudioType) {
          voiceMessage = { name: 'audio', url: attachmentUrl, size: 0 };
        }
        if (attachmentUrl && !isImageType && !isAudioType) {
          const filename = msg.attachments?.[0]?.filename || attachmentType;
          files = [{ name: filename, url: attachmentUrl, size: 0 }];
        }
      }

      return {
        id: msg.id,
        senderId: msg.is_from_business ? businessUser.id : customerUser.id,
        text: msg.message_text,
        images,
        files,
        voiceMessage,
        status,
        createdAt: new Date(msg.timestamp),
        // Platform-specific message ID for reply functionality
        platformMessageId: msg.platform_message_id,
        senderName: msg.sender_name,
        // WhatsApp Coexistence fields
        source: msg.source,
        isEcho: msg.is_echo,
        isEdited: msg.is_edited,
        editedAt: msg.edited_at ? new Date(msg.edited_at) : undefined,
        originalText: msg.original_text,
        isRevoked: msg.is_revoked,
        revokedAt: msg.revoked_at ? new Date(msg.revoked_at) : undefined,
        // Email fields
        bodyHtml: msg.body_html,
        subject: msg.subject,
        platform: msg.platform,
        // Reply fields (Facebook Messenger)
        replyToMessageId: msg.reply_to_message_id,
        replyToId: msg.reply_to_id,
        replyToText: msg.reply_to_text,
        replyToSenderName: msg.reply_to_sender_name,
        // Reaction fields (Facebook Messenger)
        reaction: msg.reaction,
        reactionEmoji: msg.reaction_emoji,
        reactedBy: msg.reacted_by,
        reactedAt: msg.reacted_at ? new Date(msg.reacted_at) : undefined,
      };
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
      createdAt: new Date(lastMsg.timestamp),
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
    // Calculate status for messages sent by business only
    let status = "SENT"; // Default status
    if (msg.is_from_business) {
      if (msg.is_read) {
        status = "READ";
      } else if (msg.is_delivered) {
        status = "DELIVERED";
      } else {
        status = "SENT";
      }
    }

    let images: { name: string; url: string; size: number }[] | undefined;
    let files: { name: string; url: string; size: number }[] | undefined;
    let voiceMessage: { name: string; url: string; size: number } | undefined;

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
      // For other platforms, use existing logic
      const attachmentType = msg.attachment_type || msg.message_type || '';
      let attachmentUrl = msg.attachment_url;
      if (!attachmentUrl && msg.attachments && msg.attachments.length > 0) {
        attachmentUrl = msg.attachments[0].url;
      }

      const isImageType = ['image', 'sticker'].includes(attachmentType);
      const isAudioType = ['audio'].includes(attachmentType);

      if (attachmentUrl && isImageType) {
        images = [{ name: attachmentType, url: attachmentUrl, size: 0 }];
      }
      if (attachmentUrl && isAudioType) {
        voiceMessage = { name: 'audio', url: attachmentUrl, size: 0 };
      }
      if (attachmentUrl && !isImageType && !isAudioType) {
        const filename = msg.attachments?.[0]?.filename || attachmentType;
        files = [{ name: filename, url: attachmentUrl, size: 0 }];
      }
    }

    return {
      id: msg.id,
      senderId: msg.is_from_business ? "business" : msg.sender_id,
      text: msg.message_text,
      images,
      files,
      voiceMessage,
      status,
      createdAt: new Date(msg.timestamp),
      // Platform-specific message ID for reply functionality
      platformMessageId: msg.platform_message_id,
      senderName: msg.sender_name,
      // WhatsApp Coexistence fields
      source: msg.source,
      isEcho: msg.is_echo,
      isEdited: msg.is_edited,
      editedAt: msg.edited_at ? new Date(msg.edited_at) : undefined,
      originalText: msg.original_text,
      isRevoked: msg.is_revoked,
      revokedAt: msg.revoked_at ? new Date(msg.revoked_at) : undefined,
      // Email fields
      bodyHtml: msg.body_html,
      subject: msg.subject,
      platform: msg.platform,
      // Reply fields (Facebook Messenger)
      replyToMessageId: msg.reply_to_message_id,
      replyToId: msg.reply_to_id,
      replyToText: msg.reply_to_text,
      replyToSenderName: msg.reply_to_sender_name,
      // Reaction fields (Facebook Messenger)
      reaction: msg.reaction,
      reactionEmoji: msg.reaction_emoji,
      reactedBy: msg.reacted_by,
      reactedAt: msg.reacted_at ? new Date(msg.reacted_at) : undefined,
    };
  });

  // Sort messages by date (oldest first for chat display)
  chatMessages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  return chatMessages;
}
