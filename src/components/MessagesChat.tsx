"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useParams, useSearchParams, useRouter, usePathname } from "next/navigation";
import axios from "@/api/axios";
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
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  // params.id is an array for [[...id]] catch-all routes
  const chatId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [selectedEmailFolder, setSelectedEmailFolder] = useState<string>('INBOX');
  const [selectedEmailConnectionId, setSelectedEmailConnectionId] = useState<number | null>(null);
  const [currentUser] = useState({ id: "business", name: "Me", status: "online" });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showArchived, setShowArchived] = useState(false);

  // Read assignment tab from URL search params (persists across navigation)
  const assignmentTabFromUrl = searchParams.get('tab') as AssignmentTabType | null;
  const assignmentTab: AssignmentTabType = assignmentTabFromUrl === 'assigned' ? 'assigned' : 'all';

  // Update assignment tab in URL
  const setAssignmentTab = useCallback((tab: AssignmentTabType) => {
    const newParams = new URLSearchParams(searchParams.toString());
    if (tab === 'assigned') {
      newParams.set('tab', 'assigned');
    } else {
      newParams.delete('tab');
    }
    const queryString = newParams.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
    router.replace(newUrl, { scroll: false });
  }, [searchParams, pathname, router]);

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
    connectionId: selectedEmailConnectionId,
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

  // Ref to hold the addIncomingMessage dispatch function (set by ChatProvider)
  const addIncomingMessageRef = useRef<((chatId: string, message: MessageType, senderName?: string) => void) | null>(null);

  // Track which chats have been directly loaded to prevent duplicate loads
  const directLoadedChatsRef = useRef<Set<string>>(new Set());

  // Handle WebSocket new message - add message directly to state
  const handleNewMessage = useCallback((data: any) => {
    const messageData = data?.message;

    if (!messageData) {
      return;
    }

    // Build chat ID based on platform
    // Format: fb_{page_id}_{sender_id}, ig_{account_id}_{sender_id}, wa_{waba_id}_{number}, email_{thread_id}
    let chatId: string | undefined;
    const platform = messageData.platform;
    const isFromBusiness = messageData.is_from_page || messageData.is_from_business || false;

    // Only process messages for enabled platforms on this page
    if (!enabledPlatforms.includes(platform)) {
      return;
    }

    // For outgoing messages (from page/business), use recipient_id as the conversation identifier
    // For incoming messages, use sender_id
    const conversationId = isFromBusiness
      ? (messageData.recipient_id || data?.conversation_id)
      : (data?.conversation_id || messageData.sender_id || messageData.from_number || messageData.to_number);

    if (platform === 'facebook' && messageData.page_id) {
      chatId = `fb_${messageData.page_id}_${conversationId}`;
    } else if (platform === 'instagram' && messageData.account_id) {
      chatId = `ig_${messageData.account_id}_${conversationId}`;
    } else if (platform === 'whatsapp' && messageData.waba_id) {
      // For WhatsApp, use to_number for sent messages, from_number for received
      let number = messageData.is_from_business ? messageData.to_number : messageData.from_number;
      // Strip the + prefix from phone numbers to match chat ID format
      if (number?.startsWith('+')) {
        number = number.slice(1);
      }
      chatId = `wa_${messageData.waba_id}_${number || conversationId}`;
    } else if (platform === 'email') {
      chatId = conversationId;
    } else {
      // Fallback: try to use chat_id from message or conversation_id from data
      chatId = messageData.chat_id || data?.conversation_id;
    }

    if (!chatId) {
      console.warn('Could not determine chat ID from WebSocket message:', data);
      return;
    }

    // Convert WebSocket message to MessageType format
    // For sent messages (from business), use "business" as senderId to match currentUser.id
    const newMessage: MessageType = {
      id: String(messageData.id),
      senderId: isFromBusiness ? 'business' : (messageData.sender_id || messageData.from_number || ''),
      text: messageData.message_text || '',
      status: 'DELIVERED',
      createdAt: new Date(messageData.timestamp),
      platformMessageId: messageData.message_id,
      senderName: messageData.sender_name || messageData.contact_name,
      platform: messageData.platform,
      source: messageData.source,
      isEcho: messageData.is_echo,
      sentByName: messageData.sent_by || messageData.sent_by_name,
      replyToMessageId: messageData.reply_to_message_id,
      replyToId: messageData.reply_to_id,
    };

    // Add attachments if present
    if (messageData.attachments?.length > 0 || messageData.attachment_url) {
      newMessage.files = messageData.attachments?.map((att: any) => ({
        name: att.filename || 'attachment',
        url: att.url || messageData.attachment_url,
        type: att.type || messageData.attachment_type,
      })) || [{
        name: 'attachment',
        url: messageData.attachment_url,
        type: messageData.attachment_type,
      }];
    }

    // Dispatch to chat state if the handler is available
    if (addIncomingMessageRef.current) {
      // For incoming messages (from customer): use sender_name or contact_name
      // For outgoing messages (from business): use recipient_name (the customer's name) if available
      let senderNameForChat: string | undefined;
      if (isFromBusiness) {
        // Use recipient_name for outgoing messages (backend looks up the customer's name)
        senderNameForChat = messageData.recipient_name || messageData.contact_name;
      } else {
        // Use sender_name for incoming messages
        senderNameForChat = messageData.sender_name || messageData.contact_name;
      }
      addIncomingMessageRef.current(chatId, newMessage, senderNameForChat);
    }
  }, [enabledPlatforms]);

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
  // initialLoad=true: fetch only unread + 10 messages (default)
  // initialLoad=false: fetch all messages (for loading history)
  const loadChatMessages = useCallback(async (chatId: string, initialLoad: boolean = true): Promise<MessageType[]> => {
    try {
      // Parse chat ID to determine platform and IDs
      // Format: fb_{page_id}_{sender_id}, ig_{account_id}_{sender_id}, wa_{waba_id}_{from_number}, email_{thread_id}
      const parts = chatId.split('_');
      const platform = parts[0];

      if (platform === 'fb' && parts.length >= 3) {
        const pageId = parts[1];
        const senderId = parts.slice(2).join('_');

        const response = await axios.get("/api/social/facebook-messages/", {
          params: {
            page_id: pageId,
            sender_id: senderId,
            page_size: initialLoad ? 100 : 500,
            ...(initialLoad && { initial_load: 'true' }),
          },
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
          params: {
            account_id: accountId,
            sender_id: senderId,
            page_size: initialLoad ? 100 : 500,
            ...(initialLoad && { initial_load: 'true' }),
          },
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
          params: {
            waba_id: wabaId,
            from_number: fromNumber,
            page_size: initialLoad ? 100 : 500,
            ...(initialLoad && { initial_load: 'true' }),
          },
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

      if (platform === 'email' && parts.length >= 3) {
        const connectionId = parts[1];
        const threadId = parts.slice(2).join('_');

        const response = await axios.get("/api/social/email-messages/", {
          params: { thread_id: threadId, connection_id: connectionId },
        });
        const messages = response.data?.results || [];

        if (messages.length === 0) return [];

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
          account_id: connectionId,
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
  // This effect loads the chat immediately without waiting for the conversations list
  useEffect(() => {
    if (!chatId) return;

    // Check if we already have this chat loaded directly
    if (directLoadedChat?.id === chatId) {
      return;
    }

    // Prevent duplicate direct loads for the same chat
    if (directLoadedChatsRef.current.has(chatId)) {
      return;
    }

    // Check if the chat is already in chatsData (which includes conversions from API)
    const chatInList = chatsData.some(chat => chat.id === chatId);
    if (chatInList) {
      // Chat is already available, no need to load directly
      setIsLoadingDirectChat(false);
      return;
    }

    // If conversations are still loading, wait a bit longer
    // But if we don't have the chat after loading completes, we'll load it directly
    if (isLoading) {
      return;
    }

    // Mark this chat as being loaded to prevent duplicate loads
    directLoadedChatsRef.current.add(chatId);

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
  }, [chatId, isLoading, chatsData, directLoadedChat, loadChatMessages]);

  // Mark conversation as read mutation
  const markReadMutation = useMarkConversationRead();

  // Handle chat selection - mark as read
  const handleChatSelected = useCallback((chat: ChatType) => {
    if (!chat.platform) return;

    // Note: We don't call setDirectLoadedChat here to avoid infinite loops
    // The directLoadedChat is only set when loading a chat via URL that's not in the list

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
      selectedEmailConnectionId={selectedEmailConnectionId}
      setSelectedEmailConnectionId={setSelectedEmailConnectionId}
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
      onAddIncomingMessageRef={addIncomingMessageRef}
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
