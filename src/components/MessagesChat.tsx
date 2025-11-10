"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { FacebookPageConnection } from "@/api/generated/interfaces";
import axios from "@/api/axios";
import { socialWhatsappMessagesList, socialWhatsappStatusRetrieve } from "@/api/generated";
import { convertFacebookMessagesToChatFormat } from "@/lib/chatAdapter";
import { ChatProvider } from "@/components/chat/contexts/chat-context";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ChatBoxFacebook } from "@/components/chat/chat-box-facebook";
import { ChatBoxPlaceholder } from "@/components/chat/chat-box-placeholder";
import type { ChatType } from "@/components/chat/types";
import { Card } from "@/components/ui/card";
import { useMessagesWebSocket } from "@/hooks/useMessagesWebSocket";

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
  is_delivered?: boolean;
  delivered_at?: string;
  is_read?: boolean;
  read_at?: string;
  page_name: string;
  recipient_id?: string; // The person receiving the message
}

interface InstagramMessage {
  id: number;
  message_id: string;
  sender_id: string;
  sender_username?: string;
  sender_profile_pic?: string;
  message_text: string;
  timestamp: string;
  is_from_business?: boolean;
  is_delivered?: boolean;
  delivered_at?: string;
  is_read?: boolean;
  read_at?: string;
  account_username: string;
}

interface InstagramAccount {
  id: number;
  instagram_account_id: string;
  username: string;
  profile_picture_url?: string;
  is_active: boolean;
}

interface WhatsAppMessage {
  id: number;
  message_id: string;
  from_number: string;
  to_number: string;
  contact_name?: string;
  profile_pic_url?: string;
  message_text: string;
  message_type?: string;
  media_url?: string;
  timestamp: string;
  is_from_business?: boolean;
  status?: string;
  is_delivered?: boolean;
  delivered_at?: string;
  is_read?: boolean;
  read_at?: string;
  business_name: string;
  business_phone: string;
  waba_id: string;
}

interface WhatsAppAccount {
  id: number;
  waba_id: string;
  business_name: string;
  phone_number: string;
  display_phone_number: string;
  is_active: boolean;
}

interface UnifiedMessage {
  id: string;
  platform: "facebook" | "instagram" | "whatsapp";
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
  platform: "facebook" | "instagram" | "whatsapp";
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
  const [wsConnected, setWsConnected] = useState(false);

  // Track component mount/unmount
  useEffect(() => {
    console.log('[MessagesChat] ===== COMPONENT MOUNTED =====');
    return () => {
      console.log('[MessagesChat] ===== COMPONENT UNMOUNTED =====');
    };
  }, []);

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
              is_delivered: msg.is_delivered,
              delivered_at: msg.delivered_at,
              is_read: msg.is_read,
              read_at: msg.read_at,
              page_name: msg.page_name,
              conversation_id: `fb_${page.page_id}_${customerId}`,
              platform_message_id: msg.message_id,
              account_id: page.page_id,
            }));

            // Convert latest message to unified format
            const lastUnifiedMessage: UnifiedMessage = {
              id: String(latestMsg.id),
              platform: "facebook" as const,
              sender_id: latestMsg.sender_id,
              sender_name: latestMsg.sender_name || "Unknown",
              profile_pic_url: latestMsg.profile_pic_url,
              message_text: latestMsg.message_text,
              timestamp: latestMsg.timestamp,
              is_from_business: latestMsg.is_from_page || false,
              is_delivered: latestMsg.is_delivered,
              delivered_at: latestMsg.delivered_at,
              is_read: latestMsg.is_read,
              read_at: latestMsg.read_at,
              page_name: latestMsg.page_name,
              conversation_id: `fb_${page.page_id}_${customerId}`,
              platform_message_id: latestMsg.message_id,
              account_id: page.page_id,
            };

            const conversation: UnifiedConversation = {
              platform: "facebook",
              conversation_id: `fb_${page.page_id}_${customerId}`,
              sender_id: customerId,
              sender_name: customerName,
              profile_pic_url: customerAvatar,
              last_message: lastUnifiedMessage,
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

      // Load Instagram conversations
      try {
        const instagramAccountsResponse = await axios.get("/api/social/instagram-accounts/");
        const instagramAccounts = (instagramAccountsResponse.data as PaginatedResponse<InstagramAccount>).results || [];

        for (const account of instagramAccounts) {
          try {
            const messagesResponse = await axios.get("/api/social/instagram-messages/", {
              params: { account_id: account.instagram_account_id },
            });

            const messages = (messagesResponse.data as PaginatedResponse<InstagramMessage>).results || [];

            // Group messages by customer (sender)
            const customerIds = new Set<string>();
            messages.forEach((msg) => {
              if (!msg.is_from_business) {
                customerIds.add(msg.sender_id);
              }
            });

            const conversationMap = new Map<string, InstagramMessage[]>();
            const sortedMessages = [...messages].sort((a, b) =>
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );

            let lastCustomerId: string | null = null;

            sortedMessages.forEach((msg) => {
              let customerId: string;

              if (msg.is_from_business) {
                if (lastCustomerId) {
                  customerId = lastCustomerId;
                } else {
                  customerId = customerIds.size === 1 ? Array.from(customerIds)[0] : msg.sender_id;
                }
              } else {
                customerId = msg.sender_id;
                lastCustomerId = customerId;
              }

              if (!conversationMap.has(customerId)) {
                conversationMap.set(customerId, []);
              }
              conversationMap.get(customerId)!.push(msg);
            });

            console.log(`Instagram @${account.username}: Found ${messages.length} total messages`);
            conversationMap.forEach((msgs, key) => {
              const fromBusiness = msgs.filter(m => m.is_from_business).length;
              const fromCustomer = msgs.filter(m => !m.is_from_business).length;
              console.log(`  Conversation ${key}: ${msgs.length} messages (${fromCustomer} from customer, ${fromBusiness} from business)`);
            });

            // Convert to unified format
            conversationMap.forEach((msgs, customerId) => {
              if (msgs.length === 0) return;

              const sortedMsgs = msgs.sort((a, b) =>
                new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
              );
              const latestMsg = sortedMsgs[0];

              const customerMsg = msgs.find(m => !m.is_from_business);
              const customerName = customerMsg?.sender_username || customerMsg?.sender_id || customerId;
              const customerAvatar = customerMsg?.sender_profile_pic;

              const unifiedMessages: UnifiedMessage[] = msgs.map((msg) => ({
                id: String(msg.id),
                platform: "instagram" as const,
                sender_id: msg.sender_id,
                sender_name: msg.sender_username || msg.sender_id,
                profile_pic_url: msg.sender_profile_pic,
                message_text: msg.message_text,
                timestamp: msg.timestamp,
                is_from_business: msg.is_from_business || false,
                is_delivered: msg.is_delivered,
                delivered_at: msg.delivered_at,
                is_read: msg.is_read,
                read_at: msg.read_at,
                page_name: `@${msg.account_username}`,
                conversation_id: `ig_${account.instagram_account_id}_${customerId}`,
                platform_message_id: msg.message_id,
                account_id: account.instagram_account_id,
              }));

              // Convert latest message to unified format
              const lastUnifiedMessage: UnifiedMessage = {
                id: String(latestMsg.id),
                platform: "instagram" as const,
                sender_id: latestMsg.sender_id,
                sender_name: latestMsg.sender_username || latestMsg.sender_id,
                profile_pic_url: latestMsg.sender_profile_pic,
                message_text: latestMsg.message_text,
                timestamp: latestMsg.timestamp,
                is_from_business: latestMsg.is_from_business || false,
                is_delivered: latestMsg.is_delivered,
                delivered_at: latestMsg.delivered_at,
                is_read: latestMsg.is_read,
                read_at: latestMsg.read_at,
                page_name: `@${latestMsg.account_username}`,
                conversation_id: `ig_${account.instagram_account_id}_${customerId}`,
                platform_message_id: latestMsg.message_id,
                account_id: account.instagram_account_id,
              };

              const conversation: UnifiedConversation = {
                platform: "instagram",
                conversation_id: `ig_${account.instagram_account_id}_${customerId}`,
                sender_id: customerId,
                sender_name: customerName,
                profile_pic_url: customerAvatar,
                last_message: lastUnifiedMessage,
                message_count: msgs.length,
                account_name: `@${account.username}`,
                account_id: account.instagram_account_id,
              };

              allConversations.push(conversation);
              allMessages.set(conversation.conversation_id, unifiedMessages);
            });
          } catch (err) {
            console.error(`Failed to load messages for Instagram account ${account.instagram_account_id}:`, err);
          }
        }
      } catch (err) {
        console.error("Failed to load Instagram accounts:", err);
      }

      // Load WhatsApp conversations
      try {
        const whatsappStatusResponse = await socialWhatsappStatusRetrieve();
        const whatsappAccounts = (whatsappStatusResponse?.accounts as WhatsAppAccount[]) || [];

        // Load all WhatsApp messages at once (ViewSet returns all messages for all accounts in tenant)
        const messagesResponse = await socialWhatsappMessagesList();
        const allWhatsAppMessages = messagesResponse.results || [];

        // Helper function to normalize phone numbers (remove + prefix for consistent conversation IDs)
        const normalizePhoneNumber = (phone: string): string => {
          return phone.startsWith('+') ? phone.substring(1) : phone;
        };

        // Group messages by WhatsApp Business Account
        const messagesByAccount = new Map<string, WhatsAppMessage[]>();
        allWhatsAppMessages.forEach(msg => {
          const wabaId = msg.waba_id;
          if (!wabaId) return;
          if (!messagesByAccount.has(wabaId)) {
            messagesByAccount.set(wabaId, []);
          }
          messagesByAccount.get(wabaId)!.push(msg);
        });

        // Process messages for each account
        for (const account of whatsappAccounts) {
          const messages = messagesByAccount.get(account.waba_id) || [];

            // Group messages by customer (sender phone number) - normalized
            const customerIds = new Set<string>();
            messages.forEach((msg) => {
              if (!msg.is_from_business) {
                customerIds.add(normalizePhoneNumber(msg.from_number));
              }
            });

            const conversationMap = new Map<string, WhatsAppMessage[]>();
            const sortedMessages = [...messages].sort((a, b) =>
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );

            let lastCustomerId: string | null = null;

            sortedMessages.forEach((msg) => {
              let customerId: string;

              if (msg.is_from_business) {
                // Message from business - use to_number as customer
                customerId = normalizePhoneNumber(msg.to_number);
                if (!customerId && lastCustomerId) {
                  customerId = lastCustomerId;
                } else if (!customerId && customerIds.size === 1) {
                  customerId = Array.from(customerIds)[0];
                }
              } else {
                // Message from customer - from_number IS the customer ID
                customerId = normalizePhoneNumber(msg.from_number);
                lastCustomerId = customerId;
              }

              if (!conversationMap.has(customerId)) {
                conversationMap.set(customerId, []);
              }
              conversationMap.get(customerId)!.push(msg);
            });

            console.log(`WhatsApp ${account.waba_id}: Found ${messages.length} total messages`);
            conversationMap.forEach((msgs, key) => {
              const fromBusiness = msgs.filter(m => m.is_from_business).length;
              const fromCustomer = msgs.filter(m => !m.is_from_business).length;
              console.log(`  Conversation ${key}: ${msgs.length} messages (${fromCustomer} from customer, ${fromBusiness} from business)`);
            });

            // Convert to unified format
            conversationMap.forEach((msgs, customerId) => {
              if (msgs.length === 0) return;

              const sortedMsgs = msgs.sort((a, b) =>
                new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
              );
              const latestMsg = sortedMsgs[0];

              const customerMsg = msgs.find(m => !m.is_from_business);
              const customerName = customerMsg?.contact_name || customerId;
              const customerAvatar = customerMsg?.profile_pic_url;

              const unifiedMessages: UnifiedMessage[] = msgs.map((msg) => ({
                id: String(msg.id),
                platform: "whatsapp" as const,
                sender_id: msg.is_from_business ? msg.to_number : msg.from_number,
                sender_name: msg.contact_name || (msg.is_from_business ? account.business_name : msg.from_number),
                profile_pic_url: msg.profile_pic_url,
                message_text: msg.message_text,
                message_type: msg.message_type,
                attachment_url: msg.media_url,
                timestamp: msg.timestamp,
                is_from_business: msg.is_from_business || false,
                is_delivered: msg.is_delivered,
                delivered_at: msg.delivered_at,
                is_read: msg.is_read,
                read_at: msg.read_at,
                page_name: account.business_name,
                conversation_id: `wa_${account.waba_id}_${customerId}`,
                platform_message_id: msg.message_id,
                account_id: account.waba_id,
              }));

              const lastUnifiedMessage: UnifiedMessage = {
                id: String(latestMsg.id),
                platform: "whatsapp" as const,
                sender_id: latestMsg.is_from_business ? latestMsg.to_number : latestMsg.from_number,
                sender_name: latestMsg.contact_name || (latestMsg.is_from_business ? account.business_name : latestMsg.from_number),
                profile_pic_url: latestMsg.profile_pic_url,
                message_text: latestMsg.message_text,
                message_type: latestMsg.message_type,
                attachment_url: latestMsg.media_url,
                timestamp: latestMsg.timestamp,
                is_from_business: latestMsg.is_from_business || false,
                is_delivered: latestMsg.is_delivered,
                delivered_at: latestMsg.delivered_at,
                is_read: latestMsg.is_read,
                read_at: latestMsg.read_at,
                page_name: account.business_name,
                conversation_id: `wa_${account.waba_id}_${customerId}`,
                platform_message_id: latestMsg.message_id,
                account_id: account.waba_id,
              };

              const conversation: UnifiedConversation = {
                platform: "whatsapp",
                conversation_id: `wa_${account.waba_id}_${customerId}`,
                sender_id: customerId,
                sender_name: customerName,
                profile_pic_url: customerAvatar,
                last_message: lastUnifiedMessage,
                message_count: msgs.length,
                account_name: account.business_name,
                account_id: account.waba_id,
              };

              allConversations.push(conversation);
              allMessages.set(conversation.conversation_id, unifiedMessages);
            });
        }
      } catch (err) {
        console.error("Failed to load WhatsApp accounts:", err);
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

  // Handle WebSocket new message
  const handleNewMessage = useCallback((data: any) => {
    console.log('[MessagesChat] WebSocket new message received:', data);
    // Reload conversations to get the latest data
    loadAllConversations(true);
  }, [loadAllConversations]);

  // Handle WebSocket read receipt
  const handleReadReceipt = useCallback((data: any) => {
    console.log('[MessagesChat] WebSocket read receipt received:', data);
    // For now, reload to get updated status
    // TODO: Optimize to update specific messages in state
    loadAllConversations(true);
  }, [loadAllConversations]);

  // Handle WebSocket delivery receipt
  const handleDeliveryReceipt = useCallback((data: any) => {
    console.log('[MessagesChat] WebSocket delivery receipt received:', data);
    // For now, reload to get updated status
    // TODO: Optimize to update specific messages in state
    loadAllConversations(true);
  }, [loadAllConversations]);

  // Handle WebSocket conversation update
  const handleConversationUpdate = useCallback((data: any) => {
    console.log('[MessagesChat] WebSocket conversation update received:', data);

    // Check if this is a read or delivery receipt
    if (data.type === 'read_receipt') {
      handleReadReceipt(data);
    } else if (data.type === 'delivery_receipt') {
      handleDeliveryReceipt(data);
    } else {
      // For other updates, reload conversations
      loadAllConversations(true);
    }
  }, [loadAllConversations, handleReadReceipt, handleDeliveryReceipt]);

  // Handle WebSocket connection status
  const handleConnectionChange = useCallback((connected: boolean) => {
    console.log('[MessagesChat] WebSocket connection status changed:', connected);
    setWsConnected(connected);
  }, []);

  console.log('[MessagesChat] About to initialize WebSocket hook');

  // Initialize WebSocket connection
  const { isConnected } = useMessagesWebSocket({
    onNewMessage: handleNewMessage,
    onConversationUpdate: handleConversationUpdate,
    onConnectionChange: handleConnectionChange,
    autoReconnect: true,
    reconnectInterval: 3000,
  });

  console.log('[MessagesChat] WebSocket hook initialized, isConnected:', isConnected);

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
          <ChatBoxFacebook user={currentUser} onMessageSent={handleMessageSent} isConnected={isConnected} />
        ) : (
          <ChatBoxPlaceholder />
        )}
      </div>
    </ChatProvider>
  );
}
