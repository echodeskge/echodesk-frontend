"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { FacebookPageConnection } from "@/api/generated/interfaces";
import axios from "@/api/axios";
import { convertFacebookMessagesToChatFormat } from "@/lib/chatAdapter";
import { ChatProvider } from "@/components/chat/contexts/chat-context";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ChatBoxFacebook } from "@/components/chat/chat-box-facebook";
import { ChatBoxPlaceholder } from "@/components/chat/chat-box-placeholder";
import type { ChatType } from "@/components/chat/types";
import { Card } from "@/components/ui/card";

interface PaginatedResponse<T> {
  count: number;
  next?: string;
  previous?: string;
  results: T[];
}

interface FacebookMessage {
  id: number;
  message_id: string;
  sender_id: string;
  sender_name?: string;
  profile_pic_url?: string;
  message_text: string;
  timestamp: string;
  is_from_page?: boolean;
  page_name: string;
  recipient_id?: string; // The person receiving the message
}

interface UnifiedMessage {
  id: string;
  platform: "facebook";
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
  platform: "facebook";
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  profile_pic_url?: string;
  last_message: UnifiedMessage;
  message_count: number;
  account_name: string;
  account_id: string;
}

export default function MessagesChat() {
  const router = useRouter();
  const params = useParams();
  const chatId = params.id as string | undefined;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [conversations, setConversations] = useState<UnifiedConversation[]>([]);
  const [conversationMessages, setConversationMessages] = useState<Map<string, UnifiedMessage[]>>(new Map());
  const [chatsData, setChatsData] = useState<ChatType[]>([]);
  const [currentUser, setCurrentUser] = useState({ id: "business", name: "Me", status: "online" });

  const loadAllConversations = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const allConversations: UnifiedConversation[] = [];
      const allMessages = new Map<string, UnifiedMessage[]>();

      // Load Facebook conversations
      const facebookPagesResponse = await axios.get("/api/social/facebook-pages/");
      const facebookPages = (facebookPagesResponse.data as PaginatedResponse<FacebookPageConnection>).results || [];

      for (const page of facebookPages) {
        try {
          const messagesResponse = await axios.get("/api/social/facebook-messages/", {
            params: { page_id: page.page_id },
          });

          const messages = (messagesResponse.data as PaginatedResponse<FacebookMessage>).results || [];

          // First pass: identify all unique customer IDs (non-page senders)
          const customerIds = new Set<string>();
          messages.forEach((msg) => {
            if (!msg.is_from_page) {
              customerIds.add(msg.sender_id);
            }
          });

          // Second pass: group messages by customer
          const conversationMap = new Map<string, FacebookMessage[]>();

          // Sort messages by timestamp to help with grouping
          const sortedMessages = [...messages].sort((a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );

          // Track the last customer we saw for page messages
          let lastCustomerId: string | null = null;

          sortedMessages.forEach((msg) => {
            let customerId: string;

            if (msg.is_from_page) {
              // Message from page - use the last customer we saw
              // or if only one customer exists, use that
              if (lastCustomerId) {
                customerId = lastCustomerId;
              } else {
                customerId = customerIds.size === 1 ? Array.from(customerIds)[0] : msg.sender_id;
              }
            } else {
              // Message from customer - sender_id IS the customer ID
              customerId = msg.sender_id;
              lastCustomerId = customerId; // Remember for next page message
            }

            if (!conversationMap.has(customerId)) {
              conversationMap.set(customerId, []);
            }
            conversationMap.get(customerId)!.push(msg);
          });

          // Debug: Log what we found
          console.log(`Page ${page.page_id}: Found ${messages.length} total messages`);
          conversationMap.forEach((msgs, key) => {
            const fromPage = msgs.filter(m => m.is_from_page).length;
            const fromCustomer = msgs.filter(m => !m.is_from_page).length;
            console.log(`  Conversation ${key}: ${msgs.length} messages (${fromCustomer} from customer, ${fromPage} from page)`);
          });

          // Convert to unified format
          conversationMap.forEach((msgs, customerId) => {
            if (msgs.length === 0) return;

            const sortedMsgs = msgs.sort((a, b) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
            const latestMsg = sortedMsgs[0];

            // Find customer name and info from non-page messages
            const customerMsg = msgs.find(m => !m.is_from_page);
            const customerName = customerMsg?.sender_name || "Unknown";
            const customerAvatar = customerMsg?.profile_pic_url;

            const unifiedMessages: UnifiedMessage[] = msgs.map((msg) => ({
              id: String(msg.id),
              platform: "facebook" as const,
              sender_id: msg.sender_id,
              sender_name: msg.sender_name || "Unknown",
              profile_pic_url: msg.profile_pic_url,
              message_text: msg.message_text,
              timestamp: msg.timestamp,
              is_from_business: msg.is_from_page || false,
              page_name: msg.page_name,
              conversation_id: `fb_${page.page_id}_${customerId}`,
              platform_message_id: msg.message_id,
              account_id: page.page_id,
            }));

            const conversation: UnifiedConversation = {
              platform: "facebook",
              conversation_id: `fb_${page.page_id}_${customerId}`,
              sender_id: customerId,
              sender_name: customerName,
              profile_pic_url: customerAvatar,
              last_message: unifiedMessages[unifiedMessages.length - 1],
              message_count: msgs.length,
              account_name: page.page_name,
              account_id: page.page_id,
            };

            allConversations.push(conversation);
            allMessages.set(conversation.conversation_id, unifiedMessages);
          });
        } catch (err) {
          console.error(`Failed to load messages for page ${page.page_id}:`, err);
        }
      }

      setConversations(allConversations);
      setConversationMessages(allMessages);

      // Convert to chat format
      const converted = convertFacebookMessagesToChatFormat(allConversations, allMessages);
      setChatsData(converted);
    } catch (err: unknown) {
      console.error("Failed to load conversations:", err);
      setError("Failed to load conversations");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllConversations();
  }, [loadAllConversations]);

  // Define handleMessageSent before any early returns (hooks rule)
  const handleMessageSent = useCallback(() => {
    // Reload conversations after sending a message
    loadAllConversations(true); // Silent reload
  }, [loadAllConversations]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading conversations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center text-red-500">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <ChatProvider chatsData={chatsData}>
      <div className="relative w-full flex gap-x-4 p-4 h-[calc(100vh-3.5rem)]">
        <ChatSidebar />
        {chatId ? (
          <ChatBoxFacebook user={currentUser} onMessageSent={handleMessageSent} />
        ) : (
          <ChatBoxPlaceholder />
        )}
      </div>
    </ChatProvider>
  );
}
