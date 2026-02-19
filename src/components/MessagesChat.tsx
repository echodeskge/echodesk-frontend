"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import axios from "@/api/axios";
import { socialEmailStatusRetrieve } from "@/api/generated";
import { convertApiConversationsToChatFormat, convertUnifiedMessagesToMessageType } from "@/lib/chatAdapter";
import { ChatProvider } from "@/components/chat/contexts/chat-context";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ChatBoxFacebook } from "@/components/chat/chat-box-facebook";
import { ChatBoxPlaceholder } from "@/components/chat/chat-box-placeholder";
import type { ChatType, MessageType, AssignmentTabType } from "@/components/chat/types";
import { useMessagesWebSocket } from "@/hooks/useMessagesWebSocket";
import { useMarkConversationRead, useUnifiedConversations } from "@/hooks/api/useSocial";

// Custom hook for debounced value
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Unified message interface for lazy loading
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
  attachments?: { type: string; url: string; filename?: string; mime_type?: string }[];
  timestamp: string;
  is_from_business: boolean;
  is_delivered?: boolean;
  is_read?: boolean;
  page_name?: string;
  conversation_id: string;
  platform_message_id: string;
  account_id: string;
  source?: 'echodesk' | 'cloud_api' | 'business_app' | 'synced' | 'facebook_app' | 'messenger_app' | 'instagram_app';
  is_echo?: boolean;
  sent_by_name?: string;
  subject?: string;
  body_html?: string;
  reply_to_message_id?: string;
  reply_to_id?: number;
}

type Platform = "facebook" | "instagram" | "whatsapp" | "email";

interface MessagesChatProps {
  platforms?: Platform[];
}

export default function MessagesChat({ platforms }: MessagesChatProps) {
  const enabledPlatforms = platforms || ["facebook", "instagram", "whatsapp", "email"];
  const params = useParams();
  // params.id is an array for [[...id]] catch-all routes
  const chatId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [selectedEmailFolder, setSelectedEmailFolder] = useState<string>('INBOX');
  const [currentUser] = useState({ id: "business", name: "Me", status: "online" });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [assignmentTab, setAssignmentTab] = useState<AssignmentTabType>('all');
  const [showArchived, setShowArchived] = useState(false);

  // Debounce search query (300ms delay)
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Track if we're currently searching (search input has value but API hasn't responded yet)
  const isSearching = searchQuery !== '' && searchQuery !== debouncedSearchQuery;

  // Use the unified conversations hook
  const {
    data: conversationsData,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
  } = useUnifiedConversations({
    platforms: enabledPlatforms.join(','),
    folder: selectedEmailFolder,
    pageSize: 20,
    search: debouncedSearchQuery,
    assigned: assignmentTab === 'assigned',
    archived: showArchived,
  });

  // State to hold a directly loaded chat (when navigating to a URL not in the list)
  const [directLoadedChat, setDirectLoadedChat] = useState<ChatType | null>(null);
  // Track if we're currently loading a direct chat
  const [isLoadingDirectChat, setIsLoadingDirectChat] = useState(false);

  // Convert API conversations to ChatType format
  const chatsData = useMemo(() => {
    if (!conversationsData?.pages) return directLoadedChat ? [directLoadedChat] : [];

    // Flatten all pages into a single array and cast platform to string
    const allConversations = conversationsData.pages.flatMap(page =>
      (page.results || []).map(conv => ({
        ...conv,
        platform: String(conv.platform) as 'facebook' | 'instagram' | 'whatsapp' | 'email',
      }))
    );

    const convertedChats = convertApiConversationsToChatFormat(allConversations);

    // If we have a directly loaded chat that's not in the list, add it
    if (directLoadedChat && !convertedChats.find(c => c.id === directLoadedChat.id)) {
      return [directLoadedChat, ...convertedChats];
    }

    return convertedChats;
  }, [conversationsData, directLoadedChat]);

  // Handle WebSocket new message - refetch conversations
  const handleNewMessage = useCallback(() => {
    refetch();
  }, [refetch]);

  // Handle WebSocket conversation update
  const handleConversationUpdate = useCallback(() => {
    // Status updates don't require refetch
  }, []);

  // Handle WebSocket connection status
  const handleConnectionChange = useCallback(() => {
    // Connection status change
  }, []);

  // Initialize WebSocket connection
  const { isConnected } = useMessagesWebSocket({
    onNewMessage: handleNewMessage,
    onConversationUpdate: handleConversationUpdate,
    onConnectionChange: handleConnectionChange,
    autoReconnect: true,
    reconnectInterval: 3000,
  });

  // Handle message sent - refetch conversations
  const handleMessageSent = useCallback(() => {
    refetch();
  }, [refetch]);

  // Load messages for a specific chat (lazy loading)
  const loadChatMessages = useCallback(async (chatId: string): Promise<MessageType[]> => {
    try {
      // Parse chat ID to determine platform and IDs
      // Format: fb_{page_id}_{sender_id}, ig_{account_id}_{sender_id}, wa_{waba_id}_{from_number}, email_{thread_id}
      const parts = chatId.split('_');
      const platform = parts[0];

      if (platform === 'fb' && parts.length >= 3) {
        const pageId = parts[1];
        const senderId = parts.slice(2).join('_');

        const response = await axios.get("/api/social/facebook-messages/", {
          params: { page_id: pageId, sender_id: senderId, page_size: 500 },
        });
        const messages = response.data?.results || [];

        const unifiedMessages: UnifiedMessage[] = messages.map((msg: any) => ({
          id: String(msg.id),
          platform: "facebook" as const,
          sender_id: msg.sender_id,
          sender_name: msg.sender_name || "Unknown",
          profile_pic_url: msg.profile_pic_url,
          message_text: msg.message_text || '',
          attachment_type: msg.attachment_type,
          attachment_url: msg.attachment_url,
          attachments: msg.attachments,
          timestamp: msg.timestamp,
          is_from_business: msg.is_from_page || false,
          is_delivered: msg.is_delivered,
          is_read: msg.is_read,
          conversation_id: chatId,
          platform_message_id: msg.message_id,
          account_id: pageId,
          source: msg.source,
          is_echo: msg.is_echo,
          sent_by_name: msg.sent_by_name,
          reply_to_message_id: msg.reply_to_message_id,
          reply_to_id: msg.reply_to_id,
        }));

        return convertUnifiedMessagesToMessageType(unifiedMessages);
      }

      if (platform === 'ig' && parts.length >= 3) {
        const accountId = parts[1];
        const senderId = parts.slice(2).join('_');

        const response = await axios.get("/api/social/instagram-messages/", {
          params: { account_id: accountId, sender_id: senderId, page_size: 500 },
        });
        const messages = response.data?.results || [];

        const unifiedMessages: UnifiedMessage[] = messages.map((msg: any) => ({
          id: String(msg.id),
          platform: "instagram" as const,
          sender_id: msg.sender_id,
          sender_name: msg.sender_name || msg.sender_username || "Unknown",
          profile_pic_url: msg.sender_profile_pic,
          message_text: msg.message_text || '',
          attachment_type: msg.attachment_type,
          attachment_url: msg.attachment_url,
          attachments: msg.attachments,
          timestamp: msg.timestamp,
          is_from_business: msg.is_from_business || false,
          is_delivered: msg.is_delivered,
          is_read: msg.is_read,
          conversation_id: chatId,
          platform_message_id: msg.message_id,
          account_id: accountId,
          source: msg.source,
          is_echo: msg.is_echo,
          sent_by_name: msg.sent_by_name,
        }));

        return convertUnifiedMessagesToMessageType(unifiedMessages);
      }

      if (platform === 'wa' && parts.length >= 3) {
        const wabaId = parts[1];
        const fromNumber = parts.slice(2).join('_');

        const response = await axios.get("/api/social/whatsapp-messages/", {
          params: { waba_id: wabaId, from_number: fromNumber, page_size: 500 },
        });
        const messages = response.data?.results || [];

        const unifiedMessages: UnifiedMessage[] = messages.map((msg: any) => ({
          id: String(msg.id),
          platform: "whatsapp" as const,
          sender_id: msg.is_from_business ? msg.to_number : msg.from_number,
          sender_name: msg.contact_name || msg.from_number,
          profile_pic_url: msg.profile_pic_url,
          message_text: msg.message_text || '',
          message_type: msg.message_type,
          attachment_type: msg.message_type,
          attachment_url: msg.media_url,
          attachments: msg.attachments,
          timestamp: msg.timestamp,
          is_from_business: msg.is_from_business || false,
          is_delivered: msg.is_delivered,
          is_read: msg.is_read,
          conversation_id: chatId,
          platform_message_id: msg.message_id,
          account_id: wabaId,
          source: msg.source,
          is_echo: msg.is_echo,
        }));

        return convertUnifiedMessagesToMessageType(unifiedMessages);
      }

      if (platform === 'email' && parts.length >= 2) {
        const threadId = parts.slice(1).join('_');

        const response = await axios.get("/api/social/email-messages/", {
          params: { thread_id: threadId },
        });
        const messages = response.data?.results || [];

        if (messages.length === 0) return [];

        const emailStatus = await socialEmailStatusRetrieve();
        const emailConnection = emailStatus.connection;

        const unifiedMessages: UnifiedMessage[] = messages.map((msg: any) => ({
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
          conversation_id: chatId,
          platform_message_id: msg.message_id,
          account_id: String(emailConnection?.id || ''),
          subject: msg.subject,
          body_html: msg.body_html,
        }));

        return convertUnifiedMessagesToMessageType(unifiedMessages);
      }

      return [];
    } catch (err) {
      console.error("Failed to load chat messages:", err);
      return [];
    }
  }, []);

  // Load specific chat when navigating directly to a URL
  useEffect(() => {
    if (!chatId || isLoading) return;

    // Check if we already have this chat loaded directly
    if (directLoadedChat?.id === chatId) {
      return;
    }

    // Check if the chat is in the API-loaded list (not including directLoadedChat)
    const chatInApiList = conversationsData?.pages?.some(page =>
      page.results?.some(conv => {
        const platform = String(conv.platform);
        const convId = `${platform === 'facebook' ? 'fb' : platform === 'instagram' ? 'ig' : platform === 'whatsapp' ? 'wa' : 'email'}_${conv.account_id}_${conv.sender_id}`;
        return convId === chatId;
      })
    );

    if (chatInApiList) {
      // Chat is in the API list, clear any direct loaded chat
      if (directLoadedChat) {
        setDirectLoadedChat(null);
      }
      setIsLoadingDirectChat(false);
      return;
    }

    // Chat not in list, need to load it directly
    const loadDirectChat = async () => {
      setIsLoadingDirectChat(true);
      try {
        const messages = await loadChatMessages(chatId);
        if (messages.length === 0) {
          setIsLoadingDirectChat(false);
          return;
        }

        // Parse chatId to get platform info
        const parts = chatId.split('_');
        const platformPrefix = parts[0];

        let platform: 'facebook' | 'instagram' | 'whatsapp' | 'email';
        let senderName = 'Unknown';
        let accountName = '';

        if (platformPrefix === 'fb') {
          platform = 'facebook';
          // Get sender info from first incoming message
          const incomingMsg = messages.find(m => m.senderId !== 'business');
          senderName = incomingMsg?.senderName || 'Unknown';
        } else if (platformPrefix === 'ig') {
          platform = 'instagram';
          const incomingMsg = messages.find(m => m.senderId !== 'business');
          senderName = incomingMsg?.senderName || 'Unknown';
        } else if (platformPrefix === 'wa') {
          platform = 'whatsapp';
          const incomingMsg = messages.find(m => m.senderId !== 'business');
          senderName = incomingMsg?.senderName || parts.slice(2).join('_');
        } else if (platformPrefix === 'email') {
          platform = 'email';
          const incomingMsg = messages.find(m => m.senderId !== 'business');
          senderName = incomingMsg?.senderName || 'Unknown';
        } else {
          return;
        }

        // Get last message
        const lastMessage = messages[messages.length - 1];

        const chat: ChatType = {
          id: chatId,
          name: senderName,
          avatar: undefined,
          status: 'online',
          lastMessage: {
            content: lastMessage?.text || '',
            createdAt: lastMessage?.createdAt || new Date(),
          },
          messages: messages,
          users: [
            { id: 'business', name: accountName || 'Business', avatar: undefined, status: 'online' },
            { id: parts.slice(2).join('_'), name: senderName, avatar: undefined, status: 'online' },
          ],
          typingUsers: [],
          unreadCount: 0,
          platform,
          messagesLoaded: true,
        };

        setDirectLoadedChat(chat);
        setIsLoadingDirectChat(false);
      } catch (err) {
        console.error('Failed to load direct chat:', err);
        setIsLoadingDirectChat(false);
      }
    };

    loadDirectChat();
  }, [chatId, isLoading, conversationsData, directLoadedChat, loadChatMessages]);

  // Mark conversation as read mutation
  const markReadMutation = useMarkConversationRead();

  // Handle chat selection - mark as read
  const handleChatSelected = useCallback((chat: ChatType) => {
    if (!chat.platform) return;

    const parts = chat.id.split('_');
    let conversationId: string;

    if (chat.platform === 'email') {
      if (parts.length < 2) return;
      conversationId = parts.slice(1).join('_');
    } else {
      if (parts.length < 3) return;
      conversationId = parts.slice(2).join('_');
    }

    markReadMutation.mutate({
      platform: chat.platform,
      conversation_id: conversationId,
    });
  }, [markReadMutation]);

  // Show error if there's one
  if (isError) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center text-red-500">
          <p>Failed to load conversations</p>
        </div>
      </div>
    );
  }

  // Determine if search is loading (typing or fetching)
  const searchLoading = isSearching || (isFetching && debouncedSearchQuery !== '');

  // Combined loading state - show loading if initial load OR loading direct chat
  const isLoadingChat = isLoading || isLoadingDirectChat;

  return (
    <ChatProvider
      chatsData={chatsData}
      onChatSelected={handleChatSelected}
      loadChatMessages={loadChatMessages}
      isInitialLoading={isLoadingChat}
      platforms={enabledPlatforms}
      selectedEmailFolder={selectedEmailFolder}
      setSelectedEmailFolder={setSelectedEmailFolder}
      fetchNextPage={fetchNextPage}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      isSearchLoading={searchLoading}
      chatListSearchQuery={searchQuery}
      setChatListSearchQuery={setSearchQuery}
      assignmentTab={assignmentTab}
      setAssignmentTab={setAssignmentTab}
      showArchived={showArchived}
      setShowArchived={setShowArchived}
    >
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
