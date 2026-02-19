import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import axios from "@/api/axios";

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
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
  attachments?: any[];
  timestamp: string;
  is_from_page?: boolean;
  is_delivered?: boolean;
  delivered_at?: string;
  is_read?: boolean;
  read_at?: string;
  is_read_by_staff?: boolean;
  read_by_staff_at?: string;
  page_name: string;
  recipient_id?: string;
  reply_to_message_id?: string;
  reply_to_id?: number;
  reaction?: string;
  reaction_emoji?: string;
  reacted_by?: string;
  reacted_at?: string;
  source?: string;
  is_echo?: boolean;
  sent_by_name?: string;
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
  attachments?: any[];
  timestamp: string;
  is_from_business?: boolean;
  is_delivered?: boolean;
  delivered_at?: string;
  is_read?: boolean;
  read_at?: string;
  is_read_by_staff?: boolean;
  read_by_staff_at?: string;
  account_username: string;
  source?: string;
  is_echo?: boolean;
  sent_by_name?: string;
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
  attachments?: any[];
  timestamp: string;
  is_from_business?: boolean;
  is_delivered?: boolean;
  delivered_at?: string;
  is_read?: boolean;
  read_at?: string;
  is_read_by_staff?: boolean;
  waba_id: string;
  source?: string;
  is_echo?: boolean;
  is_edited?: boolean;
  edited_at?: string;
  original_text?: string;
  is_revoked?: boolean;
  revoked_at?: string;
}

interface MessageFilters {
  page_id?: string;
  account_id?: string;
  waba_id?: string;
  search?: string;
  page_size?: number;
}

/**
 * Hook to fetch Facebook messages with infinite scroll pagination
 */
export function useFacebookMessagesInfinite(filters: MessageFilters = {}) {
  const { page_id, search, page_size = 50 } = filters;

  return useInfiniteQuery<PaginatedResponse<FacebookMessage>>({
    queryKey: ["facebook-messages-infinite", page_id, search, page_size],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams();
      if (page_id) params.append("page_id", page_id);
      if (search) params.append("search", search);
      params.append("page_size", String(page_size));
      params.append("page", String(pageParam));

      const response = await axios.get<PaginatedResponse<FacebookMessage>>(
        `/api/social/facebook-messages/?${params.toString()}`
      );
      return response.data;
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.next) {
        return allPages.length + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    enabled: !!page_id,
  });
}

/**
 * Hook to fetch Instagram messages with infinite scroll pagination
 */
export function useInstagramMessagesInfinite(filters: MessageFilters = {}) {
  const { account_id, search, page_size = 50 } = filters;

  return useInfiniteQuery<PaginatedResponse<InstagramMessage>>({
    queryKey: ["instagram-messages-infinite", account_id, search, page_size],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams();
      if (account_id) params.append("account_id", account_id);
      if (search) params.append("search", search);
      params.append("page_size", String(page_size));
      params.append("page", String(pageParam));

      const response = await axios.get<PaginatedResponse<InstagramMessage>>(
        `/api/social/instagram-messages/?${params.toString()}`
      );
      return response.data;
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.next) {
        return allPages.length + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    enabled: !!account_id,
  });
}

/**
 * Hook to fetch WhatsApp messages with infinite scroll pagination
 */
export function useWhatsAppMessagesInfinite(filters: MessageFilters = {}) {
  const { waba_id, search, page_size = 50 } = filters;

  return useInfiniteQuery<PaginatedResponse<WhatsAppMessage>>({
    queryKey: ["whatsapp-messages-infinite", waba_id, search, page_size],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams();
      if (waba_id) params.append("waba_id", waba_id);
      if (search) params.append("search", search);
      params.append("page_size", String(page_size));
      params.append("page", String(pageParam));

      const response = await axios.get<PaginatedResponse<WhatsAppMessage>>(
        `/api/social/whatsapp-messages/?${params.toString()}`
      );
      return response.data;
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.next) {
        return allPages.length + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
  });
}

/**
 * Hook to fetch all social messages with infinite scroll (unified)
 */
export function useSocialMessagesInfinite(
  platform: "facebook" | "instagram" | "whatsapp",
  filters: MessageFilters = {}
) {
  const queryClient = useQueryClient();

  const facebookQuery = useFacebookMessagesInfinite(
    platform === "facebook" ? filters : { page_id: undefined }
  );
  const instagramQuery = useInstagramMessagesInfinite(
    platform === "instagram" ? filters : { account_id: undefined }
  );
  const whatsappQuery = useWhatsAppMessagesInfinite(
    platform === "whatsapp" ? filters : { waba_id: undefined }
  );

  if (platform === "facebook") return facebookQuery;
  if (platform === "instagram") return instagramQuery;
  return whatsappQuery;
}

export type { FacebookMessage, InstagramMessage, WhatsAppMessage, MessageFilters, PaginatedResponse };
