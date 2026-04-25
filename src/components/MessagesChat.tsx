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
import { useMarkConversationRead, useUnifiedConversations, socialKeys } from "@/hooks/api/useSocial";
import { useQueryClient } from "@tanstack/react-query";
import { consumePendingMedia } from "@/lib/pendingMedia";
import { parseTimestamp } from "@/lib/parseTimestamp";
import { getApiUrl } from "@/api/axios";

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
  platform: "facebook" | "instagram" | "whatsapp" | "email" | "widget";
  sender_id: string;
  sender_name: string;
  recipient_name?: string;
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

type Platform = "facebook" | "instagram" | "whatsapp" | "email" | "widget";

interface MessagesChatProps {
  platforms?: Platform[];
}

export default function MessagesChat({ platforms }: MessagesChatProps) {
  const enabledPlatforms = platforms || ["facebook", "instagram", "whatsapp", "email", "widget"];
  const queryClient = useQueryClient();
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  // params.id is an array for [[...id]] catch-all routes
  const initialChatId = Array.isArray(params.id) ? params.id[0] : params.id;

  // State-based chat selection: avoids Next.js re-renders when clicking sidebar items
  const [selectedChatId, setSelectedChatIdRaw] = useState<string | null>(initialChatId || null);

  // Sync URL via pushState when selectedChatId changes (no Next.js re-render)
  const setSelectedChatId = useCallback((id: string | null) => {
    setSelectedChatIdRaw(id);
    // Build the new URL preserving query params
    const base = pathname.startsWith('/email/messages') ? '/email/messages'
      : pathname.startsWith('/social/messages') ? '/social/messages'
      : '/messages';
    const newPath = id ? `${base}/${id}` : base;
    const queryString = window.location.search;
    const newUrl = queryString ? `${newPath}${queryString}` : newPath;
    window.history.pushState(null, '', newUrl);
  }, [pathname]);

  // Listen for browser back/forward to update selectedChatId
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      const match = path.match(/\/messages\/(.+)$/);
      setSelectedChatIdRaw(match ? match[1] : null);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Keep selectedChatId in sync if URL-based params change (e.g., full page navigation)
  useEffect(() => {
    if (initialChatId && initialChatId !== selectedChatId) {
      setSelectedChatIdRaw(initialChatId);
    }
  }, [initialChatId]);

  const chatId = selectedChatId;

  const [currentUser] = useState({ id: "business", name: "Me", status: "online" });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [platformFilter, setPlatformFilter] = useState<string | null>(null);

  // Read showArchived from URL search params (persists across navigation)
  const showArchived = searchParams.get('view') === 'history';
  const setShowArchived = useCallback((show: boolean) => {
    const newParams = new URLSearchParams(searchParams.toString());
    if (show) {
      newParams.set('view', 'history');
      // History doesn't have assignment tabs, reset to all chats
      newParams.delete('tab');
    } else {
      newParams.delete('view');
    }
    const queryString = newParams.toString();
    // Navigate to base route (without chat ID) to clear selected chat
    const base = pathname.startsWith('/email/messages') ? '/email/messages'
      : pathname.startsWith('/social/messages') ? '/social/messages'
      : '/messages';
    const newUrl = queryString ? `${base}?${queryString}` : base;
    router.push(newUrl, { scroll: false });
  }, [searchParams, pathname, router]);

  // Base route without chat ID (e.g., /email/messages, /social/messages, /messages)
  const getBaseRoute = useCallback(() => {
    if (pathname.startsWith('/email/messages')) return '/email/messages'
    if (pathname.startsWith('/social/messages')) return '/social/messages'
    return '/messages'
  }, [pathname])

  // Read email folder from URL search params (persists across navigation)
  const selectedEmailFolder = searchParams.get('folder') || 'INBOX';
  const setSelectedEmailFolder = useCallback((folder: string) => {
    const newParams = new URLSearchParams(searchParams.toString());
    if (folder === 'INBOX') {
      newParams.delete('folder');
    } else {
      newParams.set('folder', folder);
    }
    const queryString = newParams.toString();
    const base = getBaseRoute();
    const newUrl = queryString ? `${base}?${queryString}` : base;
    router.push(newUrl, { scroll: false });
  }, [searchParams, router, getBaseRoute]);

  // Read email connection ID from URL search params (persists across navigation)
  const connectionIdParam = searchParams.get('account');
  const selectedEmailConnectionId = connectionIdParam ? Number(connectionIdParam) : null;
  const setSelectedEmailConnectionId = useCallback((id: number | null) => {
    const newParams = new URLSearchParams(searchParams.toString());
    if (id === null) {
      newParams.delete('account');
    } else {
      newParams.set('account', String(id));
    }
    const queryString = newParams.toString();
    const base = getBaseRoute();
    const newUrl = queryString ? `${base}?${queryString}` : base;
    router.push(newUrl, { scroll: false });
  }, [searchParams, router, getBaseRoute]);

  // Assignment tab state. Seeded from URL (so deep links work) but then kept
  // entirely in local state. Using router.replace() here would trigger a full
  // Next.js RSC refresh that flashes the layout after every tab change — we
  // avoid it by updating the URL via history.replaceState (no re-render).
  const [assignmentTab, setAssignmentTabState] = useState<AssignmentTabType>(() => {
    const tabFromUrl = searchParams.get('tab');
    return tabFromUrl === 'assigned' ? 'assigned' : 'all';
  });

  const setAssignmentTab = useCallback((tab: AssignmentTabType) => {
    setAssignmentTabState(tab);
    if (typeof window === 'undefined') return;
    const newParams = new URLSearchParams(window.location.search);
    if (tab === 'assigned') {
      newParams.set('tab', 'assigned');
    } else {
      newParams.delete('tab');
    }
    const queryString = newParams.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
    window.history.replaceState(null, '', newUrl);
  }, [pathname]);

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
    isPlaceholderData,
  } = useUnifiedConversations({
    platforms: platformFilter || enabledPlatforms.join(','),
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
        platform: String(conv.platform) as 'facebook' | 'instagram' | 'whatsapp' | 'email' | 'widget',
      }))
    );

    const convertedChats = convertApiConversationsToChatFormat(allConversations);

    // If we have a directly loaded chat that's not in the list, add it
    if (directLoadedChat && !convertedChats.find(c => c.id === directLoadedChat.id)) {
      return [directLoadedChat, ...convertedChats];
    }

    return convertedChats;
  }, [conversationsData, directLoadedChat]);

  // Keep previous chats during query key transitions to prevent state wipe
  const prevChatsRef = useRef<ChatType[]>([]);
  const removedChatIdsRef = useRef<Set<string>>(new Set());
  // Chats that were explicitly ended (End Session). We block WebSocket-driven
  // re-addition of these chats for a short window so the rating-request echo
  // and any late-arriving messages don't resurrect them in "All Chats" right
  // after the user ended the session.
  const endedChatIdsRef = useRef<Map<string, number>>(new Map());
  const END_SESSION_BLOCK_MS = 60_000;

  const stableChatsData = useMemo(() => {
    const now = Date.now();
    const filterEnded = (chats: ChatType[]) =>
      chats.filter((c) => {
        const endedAt = endedChatIdsRef.current.get(c.id);
        if (endedAt === undefined) return true;
        if (now - endedAt > END_SESSION_BLOCK_MS) {
          endedChatIdsRef.current.delete(c.id);
          return true;
        }
        return false;
      });

    if (chatsData.length === 0 && isFetching) {
      if (removedChatIdsRef.current.size > 0) {
        return filterEnded(
          prevChatsRef.current.filter((c) => !removedChatIdsRef.current.has(c.id))
        );
      }
      return filterEnded(prevChatsRef.current);
    }
    // Fresh server data arrived — clear transient removed IDs.
    // Note: we deliberately DON'T lift the end-session block just because the
    // server returned the chat. The server may temporarily include the chat
    // because of rating-request echoes or timing races, which would make the
    // chat pop back in seconds after End Session. The block is cleared only
    // by a real incoming customer message in handleNewMessage, or when the
    // 60s TTL expires.
    removedChatIdsRef.current.clear();
    const filtered = filterEnded(chatsData);
    prevChatsRef.current = filtered;
    return filtered;
  }, [chatsData, isFetching]);

  // Callback for ChatProvider to notify when a chat is removed (e.g., end session)
  const handleChatRemoved = useCallback((chatId: string) => {
    removedChatIdsRef.current.add(chatId);
    endedChatIdsRef.current.set(chatId, Date.now());
    // Also remove from prevChatsRef so it doesn't reappear on tab switch
    prevChatsRef.current = prevChatsRef.current.filter((c) => c.id !== chatId);
  }, []);

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
    // Widget uses the inverted convention — is_from_visitor=true means the
    // customer sent it, so is_from_business = !is_from_visitor.
    const isFromBusiness =
      platform === 'widget'
        ? !messageData.is_from_visitor
        : (messageData.is_from_page || messageData.is_from_business || false);

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
    } else if (platform === 'whatsapp' && (messageData.waba_id || messageData.account_id)) {
      const wabaId = messageData.waba_id || messageData.account_id;
      // For WhatsApp, use to_number for sent messages, from_number for received
      let number = messageData.is_from_business ? messageData.to_number : messageData.from_number;
      // Strip the + prefix from phone numbers to match chat ID format
      if (number?.startsWith('+')) {
        number = number.slice(1);
      }
      chatId = `wa_${wabaId}_${number || conversationId}`;
    } else if (platform === 'email') {
      chatId = conversationId;
    } else if (platform === 'widget' && messageData.connection_id && messageData.session_id) {
      chatId = `widget_${messageData.connection_id}_${messageData.session_id}`;
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
      // Widget WS payloads don't carry a DB id — fall back to the stable
      // platform message id so the reducer's dedupe can tell widget
      // messages apart instead of collapsing them all under id="undefined".
      id: messageData.id != null ? String(messageData.id) : String(messageData.message_id || ''),
      senderId: isFromBusiness ? 'business' : (messageData.sender_id || messageData.from_number || ''),
      text: messageData.message_text || '',
      status: 'DELIVERED',
      createdAt: parseTimestamp(messageData.timestamp),
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
      // For WhatsApp, use proxy URL to avoid browser ORB blocking on Meta URLs
      const wabaId = messageData.waba_id || messageData.account_id;
      const resolveUrl = (att: any) => {
        if (platform === 'whatsapp' && att?.media_id && wabaId) {
          return `${getApiUrl()}/api/social/whatsapp-media/${att.media_id}/?waba_id=${wabaId}`;
        }
        return att?.url || messageData.attachment_url;
      };

      const attachmentType = messageData.attachments?.[0]?.type || messageData.attachment_type || messageData.message_type || '';
      const isImageType = ['image', 'sticker'].includes(attachmentType);
      const isAudioType = attachmentType === 'audio';
      const isVideoType = attachmentType === 'video';

      if (isImageType) {
        const images = (messageData.attachments?.map((att: any) => ({
          name: att.type || 'image',
          url: resolveUrl(att),
          size: 0,
          type: 'image',
        })) || [{
          name: 'image',
          url: resolveUrl(null),
          size: 0,
          type: 'image',
        }]).filter((img: any) => img.url);
        if (images.length > 0) {
          newMessage.images = images;
        } else if (chatId && isFromBusiness) {
          // Sent media without URL — try pending blob URL from local send
          const pending = consumePendingMedia(chatId);
          if (pending && pending.isImage) {
            newMessage.images = [{
              name: pending.fileName,
              url: pending.blobUrl,
              size: 0,
              type: 'image',
            }];
          } else if (!newMessage.text) {
            const attName = messageData.attachments?.[0]?.filename;
            newMessage.text = attName ? `📷 ${attName}` : '📷 Image sent';
          }
        } else if (!newMessage.text) {
          const attName = messageData.attachments?.[0]?.filename;
          newMessage.text = attName ? `📷 ${attName}` : '📷 Image sent';
        }
      } else if (isAudioType) {
        const audioUrl = resolveUrl(messageData.attachments?.[0] || null);
        if (audioUrl) {
          newMessage.voiceMessage = { name: 'audio', url: audioUrl, size: 0 };
        } else if (!newMessage.text) {
          newMessage.text = '🎵 Audio sent';
        }
      } else if (isVideoType) {
        const videoUrl = resolveUrl(messageData.attachments?.[0] || null);
        if (videoUrl) {
          newMessage.images = [{ name: 'video', url: videoUrl, size: 0, type: 'video' }];
        } else if (!newMessage.text) {
          newMessage.text = '🎥 Video sent';
        }
      } else {
        const files = (messageData.attachments?.map((att: any) => ({
          name: att.filename || 'attachment',
          url: resolveUrl(att),
          type: att.type || messageData.attachment_type,
        })) || [{
          name: 'attachment',
          url: resolveUrl(null),
          type: messageData.attachment_type,
        }]).filter((f: any) => f.url);
        if (files.length > 0) {
          newMessage.files = files;
        } else if (chatId && isFromBusiness) {
          // Sent file without URL — try pending blob URL from local send
          const pending = consumePendingMedia(chatId);
          if (pending) {
            newMessage.files = [{
              name: pending.fileName,
              url: pending.blobUrl,
              size: 0,
              type: pending.isImage ? 'image' : 'file',
            }];
          } else if (!newMessage.text) {
            const attName = messageData.attachments?.[0]?.filename;
            newMessage.text = attName ? `📎 ${attName}` : '📎 Attachment sent';
          }
        } else if (!newMessage.text) {
          const attName = messageData.attachments?.[0]?.filename;
          newMessage.text = attName ? `📎 ${attName}` : '📎 Attachment sent';
        }
      }
    }

    // Skip WebSocket-driven re-addition of chats that were just ended via
    // End Session — but only for outgoing (business) messages. The rating-
    // request echo is what resurrects the chat undesirably. A genuine
    // incoming message from the customer must still reappear the chat so
    // the agent sees it (the backend also auto-unarchives in that case).
    if (isFromBusiness) {
      const endedAt = endedChatIdsRef.current.get(chatId);
      if (endedAt !== undefined) {
        if (Date.now() - endedAt < END_SESSION_BLOCK_MS) {
          return;
        }
        endedChatIdsRef.current.delete(chatId);
      }
    } else {
      // New incoming message — the chat is legitimately back. Lift the
      // block so subsequent renders can include it again.
      endedChatIdsRef.current.delete(chatId);
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

  // Handle widget `session_ended` events. The conversation already moved
  // to history server-side (visitor close + agent close both archive),
  // so we only need to refresh the cached query data — the existing
  // chat list / chat-box-footer plumbing already swaps the composer for
  // the ended banner once it sees the new session_ended_at field.
  // No toast — the agent will see the chat move to History on its own.
  const handleSessionEnded = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: socialKeys.conversations() });
    queryClient.invalidateQueries({ queryKey: socialKeys.unreadCount() });
  }, [queryClient]);

  // Track prior WebSocket connection state so we can detect reconnects
  // (disconnected → connected) and catch up on any conversations/messages
  // that were missed while the socket was down.
  const wasConnectedRef = useRef(false);
  const handleConnectionChange = useCallback((connected: boolean) => {
    if (connected && !wasConnectedRef.current) {
      // Transition to connected (includes first connect). If we were previously
      // disconnected for any reason, invalidate the conversations list so the
      // sidebar re-syncs immediately instead of waiting for the 30s poll tick.
      queryClient.invalidateQueries({ queryKey: socialKeys.conversations() });
      queryClient.invalidateQueries({ queryKey: socialKeys.unreadCount() });
    }
    wasConnectedRef.current = connected;
  }, [queryClient]);

  // Initialize WebSocket connection
  const { isConnected } = useMessagesWebSocket({
    onNewMessage: handleNewMessage,
    onConversationUpdate: handleConversationUpdate,
    onSessionEnded: handleSessionEnded,
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
          recipient_name: msg.recipient_name,
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
          recipient_name: msg.recipient_name,
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

        const unifiedMessages: UnifiedMessage[] = messages.map((msg: any) => {
          // Use proxy URL for WhatsApp media (direct Meta URLs are blocked by browsers)
          const mediaId = msg.attachments?.[0]?.media_id;
          const proxyUrl = mediaId ? `${getApiUrl()}/api/social/whatsapp-media/${mediaId}/?waba_id=${wabaId}` : msg.media_url;

          return {
            id: String(msg.id),
            platform: "whatsapp" as const,
            sender_id: msg.is_from_business ? msg.to_number : msg.from_number,
            sender_name: msg.contact_name || msg.from_number,
            profile_pic_url: msg.profile_pic_url,
            message_text: msg.message_text || '',
            message_type: msg.message_type,
            attachment_type: msg.message_type,
            attachment_url: proxyUrl,
            attachments: msg.attachments?.map((att: any) => ({
              ...att,
              url: att.media_id ? `${getApiUrl()}/api/social/whatsapp-media/${att.media_id}/?waba_id=${wabaId}` : att.url,
            })),
            timestamp: msg.timestamp,
            is_from_business: msg.is_from_business || false,
            is_delivered: msg.is_delivered,
            is_read: msg.is_read,
            conversation_id: chatId,
            platform_message_id: msg.message_id,
            account_id: wabaId,
            source: msg.source,
            is_echo: msg.is_echo,
            sent_by_name: msg.sent_by_name,
            reply_to_message_id: msg.reply_to_message_id,
            reply_to_id: msg.reply_to_id,
          };
        });

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

      if (platform === 'widget' && parts.length >= 3) {
        const connectionId = parts[1];
        const sessionId = parts.slice(2).join('_');

        const response = await axios.get("/api/widget/admin/messages/", {
          params: {
            session_id: sessionId,
            page_size: initialLoad ? 100 : 500,
          },
        });
        const messages = response.data?.results || response.data || [];

        const unifiedMessages: UnifiedMessage[] = (messages as Array<Record<string, unknown>>).map((msg) => {
          const attachments = (msg.attachments as Array<{ content_type?: string }> | undefined) || [];
          const firstType = (attachments[0]?.content_type || '').toLowerCase();
          const attachment_type = firstType.startsWith('image/')
            ? 'image'
            : firstType.startsWith('audio/')
              ? 'audio'
              : firstType.startsWith('video/')
                ? 'video'
                : attachments.length > 0 ? 'file' : undefined;
          return {
            id: String(msg.id),
            platform: "widget" as const,
            sender_id: String((msg.sender_id as string | undefined) || sessionId),
            sender_name: String((msg.sender_name as string | undefined) || 'Website visitor'),
            profile_pic_url: undefined,
            message_text: String((msg.message_text as string | undefined) || ''),
            attachment_type,
            attachments: msg.attachments as never,
            timestamp: String(msg.timestamp || ''),
            is_from_business: !(msg.is_from_visitor as boolean | undefined),
            is_delivered: Boolean(msg.is_delivered),
            is_read: Boolean(msg.is_read_by_visitor),
            conversation_id: chatId,
            platform_message_id: String(msg.message_id || msg.id),
            account_id: connectionId,
            sent_by_name: (msg.sent_by_name as string | undefined) || undefined,
          };
        });

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

        let platform: 'facebook' | 'instagram' | 'whatsapp' | 'email' | 'widget';
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
        } else if (platformPrefix === 'widget') {
          platform = 'widget';
          const incomingMsg = messages.find(m => m.senderId !== 'business');
          senderName = incomingMsg?.senderName || 'Website visitor';
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

  // Combined loading state — show loading if initial load, loading a direct
  // chat, OR swapping filters/tabs (at which point React Query is still
  // rendering the PREVIOUS tab's data via placeholderData=keepPreviousData).
  // Without the isPlaceholderData flag the sidebar would briefly show the
  // wrong conversations when switching Current ↔ History / tab filters.
  const isLoadingChat = isLoading || isLoadingDirectChat || (isPlaceholderData && isFetching);

  return (
    <ChatProvider
      chatsData={stableChatsData}
      onChatSelected={handleChatSelected}
      onChatRemoved={handleChatRemoved}
      loadChatMessages={loadChatMessages}
      isInitialLoading={isLoadingChat}
      platforms={enabledPlatforms}
      platformFilter={platformFilter}
      setPlatformFilter={setPlatformFilter}
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
      selectedChatId={selectedChatId}
      setSelectedChatId={setSelectedChatId}
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
