import type { ChatType, MessageType, UserType, LastMessageType } from "@/components/chat/types";

// Unified message interfaces supporting Facebook, Instagram, and WhatsApp
interface UnifiedMessage {
  id: string;
  platform: 'facebook' | 'instagram' | 'whatsapp';
  sender_id: string;
  sender_name: string;
  profile_pic_url?: string;
  message_text: string;
  message_type?: string;
  attachment_url?: string;
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
}

interface UnifiedConversation {
  platform: 'facebook' | 'instagram' | 'whatsapp';
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  profile_pic_url?: string;
  last_message: UnifiedMessage;
  message_count: number;
  account_name: string;
  account_id: string;
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

      return {
        id: msg.id,
        senderId: msg.is_from_business ? businessUser.id : customerUser.id,
        text: msg.message_text,
        images: msg.attachment_url && msg.message_type === 'image'
          ? [{ name: 'attachment', url: msg.attachment_url, size: 0 }]
          : undefined,
        files: msg.attachment_url && msg.message_type !== 'image'
          ? [{ name: 'attachment', url: msg.attachment_url, size: 0 }]
          : undefined,
        status,
        createdAt: new Date(msg.timestamp),
      };
    });

    // Sort messages by date
    chatMessages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    // Last message
    const lastMsg = conversation.last_message;
    const lastMessage: LastMessageType = {
      content: lastMsg.message_text,
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
