import type { ChatType, MessageType, UserType, LastMessageType } from "@/components/chat/types";

// Facebook message interfaces from UnifiedMessagesManagement
interface UnifiedMessage {
  id: string;
  platform: 'facebook';
  sender_id: string;
  sender_name: string;
  profile_pic_url?: string;
  message_text: string;
  message_type?: string;
  attachment_url?: string;
  timestamp: string;
  is_from_business: boolean;
  page_name?: string;
  conversation_id: string;
  platform_message_id: string;
  account_id: string;
}

interface UnifiedConversation {
  platform: 'facebook';
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
 * Converts Facebook messages to full-kit chat format
 */
export function convertFacebookMessagesToChatFormat(
  conversations: UnifiedConversation[],
  conversationMessages: Map<string, UnifiedMessage[]>
): ChatType[] {
  return conversations.map((conversation) => {
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
    const chatMessages: MessageType[] = messages.map((msg) => ({
      id: msg.id,
      senderId: msg.is_from_business ? businessUser.id : customerUser.id,
      text: msg.message_text,
      images: msg.attachment_url && msg.message_type === 'image'
        ? [{ name: 'attachment', url: msg.attachment_url, size: 0 }]
        : undefined,
      files: msg.attachment_url && msg.message_type !== 'image'
        ? [{ name: 'attachment', url: msg.attachment_url, size: 0 }]
        : undefined,
      status: "READ", // We don't track message status, default to READ
      createdAt: new Date(msg.timestamp),
    }));

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
    };
  });
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
