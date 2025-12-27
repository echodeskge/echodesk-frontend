"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { FacebookPageConnection, WhatsAppMessage, EmailMessage as GeneratedEmailMessage } from "@/api/generated/interfaces";
import axios from "@/api/axios";
import {
  socialWhatsappMessagesList,
  socialWhatsappStatusRetrieve,
  socialEmailStatusRetrieve,
  socialEmailMessagesThreadsRetrieve,
} from "@/api/generated";
import { convertFacebookMessagesToChatFormat } from "@/lib/chatAdapter";
import { ChatProvider } from "@/components/chat/contexts/chat-context";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ChatBoxFacebook } from "@/components/chat/chat-box-facebook";
import { ChatBoxPlaceholder } from "@/components/chat/chat-box-placeholder";
import type { ChatType, MessageType } from "@/components/chat/types";
import { Card } from "@/components/ui/card";
import { useMessagesWebSocket } from "@/hooks/useMessagesWebSocket";
import { useMarkConversationRead } from "@/hooks/api/useSocial";
import { convertUnifiedMessagesToMessageType } from "@/lib/chatAdapter";

interface PaginatedResponse<T> {
  count: number;
  next?: string;
  previous?: string;
  results: T[];
}

interface Attachment {
  type: string;
  url: string;
  sticker_id?: string;
  media_id?: string;
  mime_type?: string;
  filename?: string;
}

interface FacebookMessage {
  id: number;
  message_id: string;
  sender_id: string;
  sender_name?: string;
  profile_pic_url?: string;
  message_text: string;
  attachment_type?: string;
  attachment_url?: string;
  attachments?: Attachment[];
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
  sender_name?: string;
  sender_username?: string;
  sender_profile_pic?: string;
  message_text: string;
  attachment_type?: string;
  attachment_url?: string;
  attachments?: Attachment[];
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
  platform: "facebook" | "instagram" | "whatsapp" | "email";
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
  platform: "facebook" | "instagram" | "whatsapp" | "email";
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

type Platform = "facebook" | "instagram" | "whatsapp" | "email";

interface MessagesChatProps {
  platforms?: Platform[];
}

export default function MessagesChat({ platforms }: MessagesChatProps) {
  // If no platforms specified, show all
  const enabledPlatforms = platforms || ["facebook", "instagram", "whatsapp", "email"];
  const router = useRouter();
  const params = useParams();
  const chatId = params.id as string | undefined;

  const CHATS_CACHE_KEY = 'echodesk_chats_cache';

  // Initialize chatsData from sessionStorage cache if available
  const getInitialChatsData = (): ChatType[] => {
    if (typeof window === 'undefined') return [];
    try {
      const cached = sessionStorage.getItem(CHATS_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        // Restore Date objects
        return parsed.map((chat: any) => ({
          ...chat,
          lastMessage: chat.lastMessage ? {
            ...chat.lastMessage,
            createdAt: new Date(chat.lastMessage.createdAt)
          } : undefined,
          messages: chat.messages?.map((msg: any) => ({
            ...msg,
            createdAt: new Date(msg.createdAt)
          })) || []
        }));
      }
    } catch (e) {
      console.error('Failed to parse cached chats:', e);
    }
    return [];
  };

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [conversations, setConversations] = useState<UnifiedConversation[]>([]);
  const [conversationMessages, setConversationMessages] = useState<Map<string, UnifiedMessage[]>>(new Map());
  const [chatsData, setChatsData] = useState<ChatType[]>(getInitialChatsData);
  const [currentUser, setCurrentUser] = useState({ id: "business", name: "Me", status: "online" });
  const [wsConnected, setWsConnected] = useState(false);

  // Ref to ensure initial load only happens once
  const hasInitiallyLoadedRef = useRef(false);

  // Cache chatsData to sessionStorage whenever it changes
  useEffect(() => {
    if (chatsData.length > 0 && typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(CHATS_CACHE_KEY, JSON.stringify(chatsData));
      } catch (e) {
        console.error('Failed to cache chats:', e);
      }
    }
  }, [chatsData]);

  const loadAllConversations = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const allConversations: UnifiedConversation[] = [];
      const allMessages = new Map<string, UnifiedMessage[]>();

      // Load Facebook conversations
      if (enabledPlatforms.includes("facebook")) {
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
              attachment_type: msg.attachment_type,
              attachment_url: msg.attachment_url,
              attachments: msg.attachments,
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
              attachment_type: latestMsg.attachment_type,
              attachment_url: latestMsg.attachment_url,
              attachments: latestMsg.attachments,
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
      }

      // Load Instagram conversations
      if (enabledPlatforms.includes("instagram")) {
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

            // Convert to unified format
            conversationMap.forEach((msgs, customerId) => {
              if (msgs.length === 0) return;

              const sortedMsgs = msgs.sort((a, b) =>
                new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
              );
              const latestMsg = sortedMsgs[0];

              const customerMsg = msgs.find(m => !m.is_from_business);
              const customerName = customerMsg?.sender_name || customerMsg?.sender_username || customerMsg?.sender_id || customerId;
              const customerAvatar = customerMsg?.sender_profile_pic;

              const unifiedMessages: UnifiedMessage[] = msgs.map((msg) => ({
                id: String(msg.id),
                platform: "instagram" as const,
                sender_id: msg.sender_id,
                sender_name: msg.sender_name || msg.sender_username || msg.sender_id,
                profile_pic_url: msg.sender_profile_pic,
                message_text: msg.message_text,
                attachment_type: msg.attachment_type,
                attachment_url: msg.attachment_url,
                attachments: msg.attachments,
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
                sender_name: latestMsg.sender_name || latestMsg.sender_username || latestMsg.sender_id,
                profile_pic_url: latestMsg.sender_profile_pic,
                message_text: latestMsg.message_text,
                attachment_type: latestMsg.attachment_type,
                attachment_url: latestMsg.attachment_url,
                attachments: latestMsg.attachments,
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
      }

      // Load WhatsApp conversations
      if (enabledPlatforms.includes("whatsapp")) {
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
                message_text: msg.message_text || '',
                message_type: msg.message_type as string | undefined,
                attachment_type: msg.message_type as string | undefined,
                attachment_url: msg.media_url,
                attachments: msg.attachments as Attachment[] | undefined,
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
                // WhatsApp Coexistence fields
                source: msg.source as unknown as 'cloud_api' | 'business_app' | 'synced' | undefined,
                is_echo: msg.is_echo,
                is_edited: msg.is_edited,
                edited_at: msg.edited_at,
                original_text: msg.original_text,
                is_revoked: msg.is_revoked,
                revoked_at: msg.revoked_at,
              }));

              const lastUnifiedMessage: UnifiedMessage = {
                id: String(latestMsg.id),
                platform: "whatsapp" as const,
                sender_id: latestMsg.is_from_business ? latestMsg.to_number : latestMsg.from_number,
                sender_name: latestMsg.contact_name || (latestMsg.is_from_business ? account.business_name : latestMsg.from_number),
                profile_pic_url: latestMsg.profile_pic_url,
                message_text: latestMsg.message_text || '',
                message_type: latestMsg.message_type as string | undefined,
                attachment_type: latestMsg.message_type as string | undefined,
                attachment_url: latestMsg.media_url,
                attachments: latestMsg.attachments as Attachment[] | undefined,
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
                // WhatsApp Coexistence fields
                source: latestMsg.source as unknown as 'cloud_api' | 'business_app' | 'synced' | undefined,
                is_echo: latestMsg.is_echo,
                is_edited: latestMsg.is_edited,
                edited_at: latestMsg.edited_at,
                original_text: latestMsg.original_text,
                is_revoked: latestMsg.is_revoked,
                revoked_at: latestMsg.revoked_at,
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
      }

      // Load Email conversations (only previews, not all messages)
      if (enabledPlatforms.includes("email")) {
      try {
        const emailStatus = await socialEmailStatusRetrieve();

        if (emailStatus.connected && emailStatus.connection) {
          const emailConnection = emailStatus.connection;

          // Get email threads (grouped conversations)
          // The threads endpoint returns EmailMessage with additional aggregate fields
          interface EmailThreadMessage extends GeneratedEmailMessage {
            message_count?: number;
            unread_count?: number;
          }
          const threads = await socialEmailMessagesThreadsRetrieve() as unknown as EmailThreadMessage[];

          for (const thread of (Array.isArray(threads) ? threads : [])) {
            // DON'T fetch all messages for each thread upfront
            // Only create conversation preview from thread data
            // Messages will be loaded lazily when the chat is selected

            // Use customer_email/customer_name from thread (the external party, not business)
            // Falls back to from_email if customer fields not available
            const threadAny = thread as any;
            const customerEmail = threadAny.customer_email || thread.from_email;
            const customerName = threadAny.customer_name || thread.from_name || customerEmail;

            // Create last message preview from thread data
            const lastUnifiedMessage: UnifiedMessage = {
              id: String(thread.id),
              platform: "email" as const,
              sender_id: thread.from_email,
              sender_name: thread.from_name || thread.from_email,
              profile_pic_url: undefined,
              message_text: thread.body_text || '',
              message_type: 'email',
              attachment_type: thread.attachments?.length > 0 ? 'file' : undefined,
              attachment_url: thread.attachments?.[0]?.url,
              attachments: thread.attachments,
              timestamp: thread.timestamp,
              is_from_business: thread.is_from_business || false,
              is_delivered: true,
              is_read: thread.is_read,
              page_name: emailConnection.email_address,
              conversation_id: `email_${thread.thread_id}`,
              platform_message_id: thread.message_id,
              account_id: String(emailConnection.id),
              subject: thread.subject,
              body_html: thread.body_html,
            };

            const conversation: UnifiedConversation = {
              platform: "email",
              conversation_id: `email_${thread.thread_id}`,
              sender_id: customerEmail,
              sender_name: customerName,
              profile_pic_url: undefined,
              last_message: lastUnifiedMessage,
              message_count: thread.message_count || 1,
              account_name: emailConnection.email_address,
              account_id: String(emailConnection.id),
              subject: thread.subject,
            };

            allConversations.push(conversation);
            // Don't add messages to allMessages - they'll be loaded lazily
            // Set empty array to indicate messages need to be loaded
            allMessages.set(conversation.conversation_id, []);
          }
        }
      } catch (err) {
        console.error("Failed to load email conversations:", err);
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

  // Handle WebSocket new message
  const handleNewMessage = useCallback((data: any) => {
    // Sound is played globally in layout.tsx
    // Reload conversations to get the latest data
    loadAllConversations(true);
  }, [loadAllConversations]);

  // Handle WebSocket conversation update - don't reload on every update
  // Only new_message events should trigger a reload (handled separately)
  const handleConversationUpdate = useCallback((data: any) => {
    // Conversation updates (read receipts, delivery receipts, status changes)
    // don't require a full reload - they're just status updates
    // New messages are handled by handleNewMessage which does reload
  }, []);

  // Handle WebSocket connection status
  const handleConnectionChange = useCallback((connected: boolean) => {
    setWsConnected(connected);
  }, []);

  // Initialize WebSocket connection
  const { isConnected } = useMessagesWebSocket({
    onNewMessage: handleNewMessage,
    onConversationUpdate: handleConversationUpdate,
    onConnectionChange: handleConnectionChange,
    autoReconnect: true,
    reconnectInterval: 3000,
  });

  // Initial load - only runs once
  useEffect(() => {
    if (hasInitiallyLoadedRef.current) {
      return;
    }
    hasInitiallyLoadedRef.current = true;
    loadAllConversations();
  }, [loadAllConversations]);

  // Define handleMessageSent before any early returns (hooks rule)
  const handleMessageSent = useCallback(() => {
    // Reload conversations after sending a message
    loadAllConversations(true); // Silent reload
  }, [loadAllConversations]);

  // Load messages for a specific chat (lazy loading for emails)
  const loadChatMessages = useCallback(async (chatId: string): Promise<MessageType[]> => {
    // Check if this is an email chat
    if (chatId.startsWith('email_')) {
      const threadId = chatId.replace('email_', '');
      try {
        const threadMessagesResponse = await axios.get("/api/social/email-messages/", {
          params: { thread_id: threadId },
        });
        const threadMessages = threadMessagesResponse.data?.results || [];

        if (threadMessages.length === 0) return [];

        // Get email connection info
        const emailStatus = await socialEmailStatusRetrieve();
        const emailConnection = emailStatus.connection;

        // Convert to unified messages then to MessageType
        const unifiedMessages: UnifiedMessage[] = threadMessages.map((msg: any) => ({
          id: String(msg.id),
          platform: "email" as const,
          sender_id: msg.from_email,
          sender_name: msg.from_name || msg.from_email,
          profile_pic_url: undefined,
          message_text: msg.body_text || '',
          message_type: 'email',
          attachment_type: msg.attachments?.length > 0 ? 'file' : undefined,
          attachment_url: msg.attachments?.[0]?.url,
          attachments: msg.attachments,
          timestamp: msg.timestamp,
          is_from_business: msg.is_from_business || false,
          is_delivered: true,
          is_read: msg.is_read,
          page_name: emailConnection?.email_address || '',
          conversation_id: chatId,
          platform_message_id: msg.message_id,
          account_id: String(emailConnection?.id || ''),
          subject: msg.subject,
          body_html: msg.body_html,
        }));

        return convertUnifiedMessagesToMessageType(unifiedMessages);
      } catch (err) {
        console.error("Failed to load email messages:", err);
        return [];
      }
    }

    // For other platforms, messages are already loaded
    // Return empty array (they should already have messages)
    return [];
  }, []);

  // Mark conversation as read mutation
  const markReadMutation = useMarkConversationRead();

  // Handle chat selection - mark as read
  const handleChatSelected = useCallback((chat: ChatType) => {
    if (!chat.platform) return;

    const parts = chat.id.split('_');
    let conversationId: string;

    // Handle email format: email_{thread_id}
    if (chat.platform === 'email') {
      if (parts.length < 2) return;
      conversationId = parts.slice(1).join('_'); // thread_id
    } else {
      // Format: fb_{page_id}_{sender_id}, ig_{account_id}_{sender_id}, wa_{waba_id}_{from_number}
      if (parts.length < 3) return;
      conversationId = parts.slice(2).join('_');
    }

    markReadMutation.mutate({
      platform: chat.platform,
      conversation_id: conversationId,
    });
  }, [markReadMutation]);

  // Show error if there's one
  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center text-red-500">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  // Always show the layout - loading state is handled within the chat area
  return (
    <ChatProvider chatsData={chatsData} onChatSelected={handleChatSelected} loadChatMessages={loadChatMessages} isInitialLoading={loading}>
      <div className="relative w-full flex gap-x-4 p-4 h-[80vh]">
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
