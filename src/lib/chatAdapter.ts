import type { ChatType, MessageType, UserType, LastMessageType } from "@/components/chat/types";

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

      // Determine attachment type - check both message_type and attachment_type
      const attachmentType = msg.attachment_type || msg.message_type || '';

      // Get attachment URL from either attachments array or direct attachment_url
      let attachmentUrl = msg.attachment_url;
      if (!attachmentUrl && msg.attachments && msg.attachments.length > 0) {
        attachmentUrl = msg.attachments[0].url;
      }

      // Determine if this is an image type (including stickers)
      const isImageType = ['image', 'sticker'].includes(attachmentType);

      // Determine if this is an audio type
      const isAudioType = ['audio'].includes(attachmentType);

      // Determine if this is a video type
      const isVideoType = ['video'].includes(attachmentType);

      // Build images array for image/sticker attachments
      let images = undefined;
      if (attachmentUrl && isImageType) {
        images = [{ name: attachmentType, url: attachmentUrl, size: 0 }];
      }

      // Build voice message for audio attachments
      let voiceMessage = undefined;
      if (attachmentUrl && isAudioType) {
        voiceMessage = { name: 'audio', url: attachmentUrl, size: 0 };
      }

      // Build files array for other types (video, document, file)
      let files = undefined;
      if (attachmentUrl && !isImageType && !isAudioType) {
        const filename = msg.attachments?.[0]?.filename || attachmentType;
        files = [{ name: filename, url: attachmentUrl, size: 0 }];
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
        // WhatsApp Coexistence fields
        source: msg.source,
        isEcho: msg.is_echo,
        isEdited: msg.is_edited,
        editedAt: msg.edited_at ? new Date(msg.edited_at) : undefined,
        originalText: msg.original_text,
        isRevoked: msg.is_revoked,
        revokedAt: msg.revoked_at ? new Date(msg.revoked_at) : undefined,
      };
    });

    // Sort messages by date
    chatMessages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    // Last message - use text or fallback to attachment type description
    const lastMsg = conversation.last_message;
    let lastMessageContent = lastMsg.message_text;
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

    return {
      id: conversation.conversation_id,
      lastMessage,
      name: conversation.sender_name,
      avatar: conversation.profile_pic_url,
      status: "online",
      messages: chatMessages,
      users: [customerUser, businessUser],
      typingUsers: [],
      unreadCount: 0, // We don't track unread count in our system
      platform: conversation.platform,
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
