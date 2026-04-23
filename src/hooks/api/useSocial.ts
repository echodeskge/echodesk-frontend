"use client";

import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';
import { parseTimestamp } from '@/lib/parseTimestamp';
import {
  socialFacebookSendMessageCreate,
  socialWhatsappOauthStartRetrieve,
  socialWhatsappTemplatesList,
  socialWhatsappTemplatesSyncCreate,
  socialWhatsappTemplatesCreateCreate,
  socialWhatsappTemplatesDeleteDestroy,
  socialWhatsappTemplatesSendCreate,
  WhatsAppTemplateCreateRequest,
  WhatsAppTemplateSendRequest,
  socialEmailStatusRetrieve,
  socialEmailMessagesThreadsRetrieve,
  socialEmailFoldersRetrieve,
  socialEmailDraftsList,
  socialEmailDraftsCreate,
  socialEmailDraftsPartialUpdate,
  socialEmailDraftsDestroy,
  socialConversationsRetrieve,
} from '@/api/generated';
import type {
  EmailMessage as GeneratedEmailMessage,
  EmailDraft as GeneratedEmailDraft,
  PaginatedEmailMessageList,
  EmailDraftRequest,
  PatchedEmailDraftRequest,
  PaginatedUnifiedConversation,
  UnifiedConversation,
  WidgetConnection,
  WidgetConnectionRequest,
  PatchedWidgetConnectionRequest,
} from '@/api/generated';
import axios from '@/api/axios';

// Query keys
export const socialKeys = {
  all: ['social'] as const,
  unreadCount: () => [...socialKeys.all, 'unreadCount'] as const,
  settings: () => [...socialKeys.all, 'settings'] as const,
  conversations: () => [...socialKeys.all, 'conversations'] as const,
  conversationsList: (filters: { platforms?: string; search?: string; folder?: string; assigned?: boolean; archived?: boolean; connectionId?: number | null }) =>
    [...socialKeys.conversations(), filters] as const,
  assignments: () => [...socialKeys.all, 'assignments'] as const,
  myAssignments: () => [...socialKeys.assignments(), 'my'] as const,
  allAssignments: () => [...socialKeys.assignments(), 'all'] as const,
  assignmentStatus: (platform: string, conversationId: string, accountId: string) =>
    [...socialKeys.assignments(), 'status', platform, conversationId, accountId] as const,
  messagingWindow: (platform: string, conversationId: string, accountId: string) =>
    [...socialKeys.all, 'messagingWindow', platform, conversationId, accountId] as const,
  facebook: () => [...socialKeys.all, 'facebook'] as const,
  facebookStatus: () => [...socialKeys.facebook(), 'status'] as const,
  facebookPages: () => [...socialKeys.facebook(), 'pages'] as const,
  facebookMessages: () => [...socialKeys.facebook(), 'messages'] as const,
  facebookMessagesList: (filters: Record<string, any>) => [...socialKeys.facebookMessages(), filters] as const,
  instagram: () => [...socialKeys.all, 'instagram'] as const,
  instagramStatus: () => [...socialKeys.instagram(), 'status'] as const,
  instagramAccounts: () => [...socialKeys.instagram(), 'accounts'] as const,
  instagramMessages: () => [...socialKeys.instagram(), 'messages'] as const,
  instagramMessagesList: (filters: Record<string, any>) => [...socialKeys.instagramMessages(), filters] as const,
  whatsapp: () => [...socialKeys.all, 'whatsapp'] as const,
  whatsappStatus: () => [...socialKeys.whatsapp(), 'status'] as const,
  whatsappMessages: () => [...socialKeys.whatsapp(), 'messages'] as const,
  whatsappMessagesList: (filters: Record<string, any>) => [...socialKeys.whatsappMessages(), filters] as const,
  whatsappTemplates: () => [...socialKeys.whatsapp(), 'templates'] as const,
  whatsappTemplatesList: (wabaId: string) => [...socialKeys.whatsappTemplates(), wabaId] as const,
  email: () => [...socialKeys.all, 'email'] as const,
  emailStatus: () => [...socialKeys.email(), 'status'] as const,
  emailMessages: () => [...socialKeys.email(), 'messages'] as const,
  emailMessagesList: (filters: Record<string, any>) => [...socialKeys.emailMessages(), filters] as const,
  emailThreads: () => [...socialKeys.email(), 'threads'] as const,
  emailFolders: (connectionId?: number | null) => [...socialKeys.email(), 'folders', connectionId ?? 'all'] as const,
  emailDrafts: () => [...socialKeys.email(), 'drafts'] as const,
  tiktok: () => [...socialKeys.all, 'tiktok'] as const,
  tiktokStatus: () => [...socialKeys.tiktok(), 'status'] as const,
  tiktokMessages: () => [...socialKeys.tiktok(), 'messages'] as const,
  tiktokMessagesList: (filters: Record<string, any>) => [...socialKeys.tiktokMessages(), filters] as const,
  widget: () => [...socialKeys.all, 'widget'] as const,
  widgetConnections: () => [...socialKeys.widget(), 'connections'] as const,
};

// ============================================================================
// UNREAD MESSAGES COUNT
// ============================================================================

export interface UnreadMessagesCount {
  total: number;
  facebook: number;
  instagram: number;
  whatsapp: number;
  email: number;
}

export function useUnreadMessagesCount(options?: { refetchInterval?: number | false; enabled?: boolean }) {
  return useQuery<UnreadMessagesCount>({
    queryKey: socialKeys.unreadCount(),
    queryFn: async () => {
      const response = await axios.get('/api/social/unread-count/');
      return response.data;
    },
    staleTime: 15 * 1000, // Consider data fresh for 15 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchInterval: options?.refetchInterval ?? 30000, // Poll every 30 seconds by default
    enabled: options?.enabled ?? true,
  });
}

export function useMarkConversationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { platform: 'facebook' | 'instagram' | 'whatsapp' | 'email' | 'widget'; conversation_id: string }) => {
      const response = await axios.post('/api/social/mark-read/', data);
      return response.data;
    },
    onMutate: async (variables) => {
      // Cancel ongoing refetches to prevent race conditions
      await queryClient.cancelQueries({ queryKey: socialKeys.conversations() });
      await queryClient.cancelQueries({ queryKey: socialKeys.unreadCount() });

      // Snapshot previous data for rollback
      const prevUnreadCount = queryClient.getQueryData<UnreadMessagesCount>(socialKeys.unreadCount());

      // Optimistically set unread count to 0 in all matching conversation list caches
      queryClient.setQueriesData<{ pages: Array<{ results?: UnifiedConversation[]; next?: string | null; count?: number }>; pageParams: number[] }>(
        { queryKey: socialKeys.conversations() },
        (old) => {
          if (!old?.pages) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              results: page.results?.map((conv) =>
                conv.sender_id === variables.conversation_id &&
                String(conv.platform) === variables.platform
                  ? { ...conv, unread_count: 0 }
                  : conv
              ),
            })),
          };
        }
      );

      // Optimistically decrement platform unread count
      if (prevUnreadCount) {
        const platformKey = variables.platform as keyof Omit<UnreadMessagesCount, 'total'>;
        const currentPlatformCount = prevUnreadCount[platformKey] || 0;
        if (currentPlatformCount > 0) {
          queryClient.setQueryData<UnreadMessagesCount>(socialKeys.unreadCount(), {
            ...prevUnreadCount,
            [platformKey]: currentPlatformCount - 1,
            total: Math.max(0, prevUnreadCount.total - 1),
          });
        }
      }

      return { prevUnreadCount };
    },
    onError: (_err, _vars, context) => {
      // Rollback unread count on error
      if (context?.prevUnreadCount) {
        queryClient.setQueryData(socialKeys.unreadCount(), context.prevUnreadCount);
      }
    },
    onSettled: () => {
      // Only refresh the unread count badge — the conversations list was already
      // optimistically updated to unread_count: 0 and doesn't need a server refetch
      // just to mark a single chat read (the rest of the list is unchanged).
      queryClient.invalidateQueries({ queryKey: socialKeys.unreadCount() });
    },
  });
}

export function useMarkConversationUnread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { platform: 'facebook' | 'instagram' | 'whatsapp' | 'email' | 'widget'; conversation_id: string }) => {
      const response = await axios.post('/api/social/mark-unread/', data);
      return response.data;
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: socialKeys.conversations() });
      await queryClient.cancelQueries({ queryKey: socialKeys.unreadCount() });

      const prevUnreadCount = queryClient.getQueryData<UnreadMessagesCount>(socialKeys.unreadCount());

      // Optimistically set unread count to 1 in all matching conversation list caches
      queryClient.setQueriesData<{ pages: Array<{ results?: UnifiedConversation[]; next?: string | null; count?: number }>; pageParams: number[] }>(
        { queryKey: socialKeys.conversations() },
        (old) => {
          if (!old?.pages) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              results: page.results?.map((conv) =>
                conv.sender_id === variables.conversation_id &&
                String(conv.platform) === variables.platform
                  ? { ...conv, unread_count: 1 }
                  : conv
              ),
            })),
          };
        }
      );

      // Optimistically increment platform unread count
      if (prevUnreadCount) {
        const platformKey = variables.platform as keyof Omit<UnreadMessagesCount, 'total'>;
        queryClient.setQueryData<UnreadMessagesCount>(socialKeys.unreadCount(), {
          ...prevUnreadCount,
          [platformKey]: (prevUnreadCount[platformKey] || 0) + 1,
          total: prevUnreadCount.total + 1,
        });
      }

      return { prevUnreadCount };
    },
    onError: (_err, _vars, context) => {
      if (context?.prevUnreadCount) {
        queryClient.setQueryData(socialKeys.unreadCount(), context.prevUnreadCount);
      }
    },
    onSettled: () => {
      // Optimistic update covers the conversation-list state. Only the global
      // badge needs a server-fresh value, and even then the client-side
      // optimistic increment is a close-enough estimate.
      queryClient.invalidateQueries({ queryKey: socialKeys.unreadCount() });
    },
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { platform: 'facebook' | 'instagram' | 'whatsapp' | 'email' | 'widget'; conversation_id: string }) => {
      const response = await axios.delete('/api/social/delete-conversation/', { data });
      return response.data;
    },
    onSuccess: () => {
      // Invalidate all message queries to refresh the conversation list
      queryClient.invalidateQueries({ queryKey: socialKeys.facebookMessages() });
      queryClient.invalidateQueries({ queryKey: socialKeys.instagramMessages() });
      queryClient.invalidateQueries({ queryKey: socialKeys.whatsappMessages() });
      queryClient.invalidateQueries({ queryKey: socialKeys.emailMessages() });
      queryClient.invalidateQueries({ queryKey: socialKeys.unreadCount() });
    },
  });
}

// ============================================================================
// FACEBOOK HOOKS
// ============================================================================

// Queries
export function useFacebookStatus() {
  return useQuery({
    queryKey: socialKeys.facebookStatus(),
    queryFn: async () => {
      const response = await axios.get('/api/social/facebook/status/');
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // Consider data fresh for 2 minutes
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });
}

export function useFacebookPages() {
  return useQuery({
    queryKey: socialKeys.facebookPages(),
    queryFn: async () => {
      const response = await axios.get('/api/social/facebook-pages/');
      return response.data;
    },
  });
}

export function useFacebookMessages(filters?: {
  page?: number;
  page_id?: string;
  search?: string;
  unread_only?: boolean;
}, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: socialKeys.facebookMessagesList(filters || {}),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.page_id) params.append('page_id', filters.page_id);
      if (filters?.search) params.append('search', filters.search);
      if (filters?.unread_only) params.append('unread_only', 'true');

      const response = await axios.get(
        `/api/social/facebook-messages/${params.toString() ? '?' + params.toString() : ''}`
      );
      return response.data;
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds (WebSocket handles real-time)
    enabled: options?.enabled ?? true,
  });
}

export function useInfiniteFacebookMessages(filters?: {
  page_id?: string;
  search?: string;
  unread_only?: boolean;
}) {
  return useInfiniteQuery({
    queryKey: socialKeys.facebookMessagesList(filters || {}),
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams();
      params.append('page', pageParam.toString());
      if (filters?.page_id) params.append('page_id', filters.page_id);
      if (filters?.search) params.append('search', filters.search);
      if (filters?.unread_only) params.append('unread_only', 'true');

      const response = await axios.get(
        `/api/social/facebook-messages/?${params.toString()}`
      );
      return response.data;
    },
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.next) {
        return pages.length + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    refetchInterval: 30000, // Auto-refresh every 30 seconds (WebSocket handles real-time)
  });
}

// Mutations
export function useSendFacebookMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: socialFacebookSendMessageCreate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: socialKeys.facebookMessages() });
    },
  });
}

// ============================================================================
// WIDGET (EMBEDDABLE WEBSITE CHAT) HOOKS
// ============================================================================

export interface SendWidgetMessagePayload {
  connection_id: number;
  session_id: string;
  message_text: string;
  attachments?: Array<{
    url: string;
    filename?: string;
    size?: number;
    content_type?: string;
  }>;
}

export interface WidgetAdminMessageResponse {
  id: number;
  message_id: string;
  message_text: string;
  is_from_visitor: boolean;
  timestamp: string;
  attachments?: unknown[];
  [key: string]: unknown;
}

/**
 * Agent-side send for the embeddable website widget. POSTs to the admin
 * endpoint; the backend fans the message out via Channels to both the
 * visitor's widget (group `widget_visitor_<session_id>`) and the shared
 * agent inbox (`messages_<tenant_schema>`) so the existing `MessagesChat`
 * WebSocket handler renders it without extra glue.
 *
 * Returns the created `WidgetMessage`. We intentionally do NOT invalidate
 * conversation/message lists here — the WebSocket broadcast will push the
 * new row into the existing caches.
 */
export function useSendWidgetMessage() {
  return useMutation({
    mutationFn: async (data: SendWidgetMessagePayload): Promise<WidgetAdminMessageResponse> => {
      const response = await axios.post('/api/widget/admin/messages/send/', data);
      return response.data as WidgetAdminMessageResponse;
    },
  });
}

export function useConnectFacebook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await axios.get('/api/social/facebook/oauth/start/');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: socialKeys.facebookStatus() });
    },
  });
}

export function useDisconnectFacebook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await axios.post('/api/social/facebook/disconnect/');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: socialKeys.facebookStatus() });
      queryClient.invalidateQueries({ queryKey: socialKeys.facebookPages() });
    },
  });
}

export function useToggleFacebookPage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ pageId, subscribe }: { pageId: string; subscribe: boolean }) => {
      const url = subscribe
        ? `/api/social/facebook-pages/${pageId}/subscribe/`
        : `/api/social/facebook-pages/${pageId}/unsubscribe/`;
      const response = await axios.post(url);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: socialKeys.facebookPages() });
    },
  });
}

// ============================================================================
// INSTAGRAM HOOKS
// ============================================================================

export function useInstagramStatus() {
  return useQuery({
    queryKey: socialKeys.instagramStatus(),
    queryFn: async () => {
      const response = await axios.get('/api/social/instagram/status/');
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // Consider data fresh for 2 minutes
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });
}

export function useInstagramAccounts() {
  return useQuery({
    queryKey: socialKeys.instagramAccounts(),
    queryFn: async () => {
      const response = await axios.get('/api/social/instagram-accounts/');
      return response.data;
    },
  });
}

export function useInstagramMessages(filters?: {
  page?: number;
  account_id?: string;
  search?: string;
  unread_only?: boolean;
}, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: socialKeys.instagramMessagesList(filters || {}),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.account_id) params.append('account_id', filters.account_id);
      if (filters?.search) params.append('search', filters.search);
      if (filters?.unread_only) params.append('unread_only', 'true');

      const response = await axios.get(
        `/api/social/instagram-messages/${params.toString() ? '?' + params.toString() : ''}`
      );
      return response.data;
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds (WebSocket handles real-time)
    enabled: options?.enabled ?? true,
  });
}

export function useInfiniteInstagramMessages(filters?: {
  account_id?: string;
  search?: string;
  unread_only?: boolean;
}) {
  return useInfiniteQuery({
    queryKey: socialKeys.instagramMessagesList(filters || {}),
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams();
      params.append('page', pageParam.toString());
      if (filters?.account_id) params.append('account_id', filters.account_id);
      if (filters?.search) params.append('search', filters.search);
      if (filters?.unread_only) params.append('unread_only', 'true');

      const response = await axios.get(
        `/api/social/instagram-messages/?${params.toString()}`
      );
      return response.data;
    },
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.next) {
        return pages.length + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    refetchInterval: 30000, // Auto-refresh every 30 seconds (WebSocket handles real-time)
  });
}

export function useSendInstagramMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { recipient_id: string; message: string; instagram_account_id: string }) => {
      const response = await axios.post('/api/social/instagram/send-message/', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: socialKeys.instagramMessages() });
    },
  });
}

export function useDisconnectInstagram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await axios.post('/api/social/instagram/disconnect/');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: socialKeys.instagramStatus() });
      queryClient.invalidateQueries({ queryKey: socialKeys.instagramAccounts() });
    },
  });
}

// ============================================================================
// WHATSAPP HOOKS
// ============================================================================

export function useWhatsAppStatus() {
  return useQuery({
    queryKey: socialKeys.whatsappStatus(),
    queryFn: async () => {
      const response = await axios.get('/api/social/whatsapp/status/');
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // Consider data fresh for 2 minutes
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });
}

export function useWhatsAppMessages(filters?: {
  page?: number;
  waba_id?: string;
  search?: string;
  unread_only?: boolean;
}, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: socialKeys.whatsappMessagesList(filters || {}),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.waba_id) params.append('waba_id', filters.waba_id);
      if (filters?.search) params.append('search', filters.search);
      if (filters?.unread_only) params.append('unread_only', 'true');

      const response = await axios.get(
        `/api/social/whatsapp/messages/${params.toString() ? '?' + params.toString() : ''}`
      );
      return response.data;
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds (WebSocket handles real-time)
    enabled: options?.enabled ?? true,
  });
}

export function useInfiniteWhatsAppMessages(filters?: {
  waba_id?: string;
  search?: string;
  unread_only?: boolean;
}) {
  return useInfiniteQuery({
    queryKey: socialKeys.whatsappMessagesList(filters || {}),
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams();
      params.append('page', pageParam.toString());
      if (filters?.waba_id) params.append('waba_id', filters.waba_id);
      if (filters?.search) params.append('search', filters.search);
      if (filters?.unread_only) params.append('unread_only', 'true');

      const response = await axios.get(
        `/api/social/whatsapp/messages/?${params.toString()}`
      );
      return response.data;
    },
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.next) {
        return pages.length + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    refetchInterval: 30000, // Auto-refresh every 30 seconds (WebSocket handles real-time)
  });
}

export function useSendWhatsAppMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { to_number: string; message: string; waba_id: string; reply_to_message_id?: string }) => {
      const response = await axios.post('/api/social/whatsapp/send-message/', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: socialKeys.whatsappMessages() });
    },
  });
}

export function useConnectWhatsApp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: socialWhatsappOauthStartRetrieve,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: socialKeys.whatsappStatus() });
    },
  });
}

export function useDisconnectWhatsApp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (wabaId?: string) => {
      const response = await axios.post('/api/social/whatsapp/disconnect/', {
        waba_id: wabaId,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: socialKeys.whatsappStatus() });
    },
  });
}

export function useWhatsAppEmbeddedSignupCallback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { code: string; tenant: string }) => {
      const response = await axios.post('/api/social/whatsapp/embedded-signup/callback/', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: socialKeys.whatsappStatus() });
    },
  });
}

// ============================================================================
// WHATSAPP TEMPLATE HOOKS
// ============================================================================

export function useWhatsAppTemplates(wabaId: string) {
  return useQuery({
    queryKey: socialKeys.whatsappTemplatesList(wabaId),
    queryFn: () => socialWhatsappTemplatesList(wabaId),
    enabled: !!wabaId,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });
}

export function useSyncWhatsAppTemplates() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (wabaId: string) => socialWhatsappTemplatesSyncCreate(wabaId),
    onSuccess: (_, wabaId) => {
      queryClient.invalidateQueries({ queryKey: socialKeys.whatsappTemplatesList(wabaId) });
    },
  });
}

export function useCreateWhatsAppTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: WhatsAppTemplateCreateRequest) => socialWhatsappTemplatesCreateCreate(data),
    onSuccess: (_, variables) => {
      // Invalidate the templates list for the specific WABA
      queryClient.invalidateQueries({ queryKey: socialKeys.whatsappTemplatesList(variables.waba_id) });
    },
  });
}

export function useDeleteWhatsAppTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (templateId: number) => socialWhatsappTemplatesDeleteDestroy(templateId),
    onSuccess: () => {
      // Invalidate all template lists since we don't know which WABA it belongs to
      queryClient.invalidateQueries({ queryKey: socialKeys.whatsappTemplates() });
    },
  });
}

export function useSendWhatsAppTemplateMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: WhatsAppTemplateSendRequest) => socialWhatsappTemplatesSendCreate(data),
    onSuccess: () => {
      // Invalidate messages to show the newly sent template message
      queryClient.invalidateQueries({ queryKey: socialKeys.whatsappMessages() });
    },
  });
}

// ============================================================================
// WHATSAPP COEXISTENCE HOOKS
// ============================================================================

export interface WhatsAppCoexStatus {
  local_status: {
    coex_enabled: boolean;
    is_on_biz_app: boolean;
    platform_type: string | null;
    sync_status: string;
    onboarded_at: string | null;
    contacts_synced_at: string | null;
    history_synced_at: string | null;
    throughput_limit: number;
    sync_window_open: boolean;
    sync_window_remaining_seconds: number | null;
  };
  api_status: {
    is_on_biz_app: boolean;
    platform_type: string;
    verified_name: string;
    quality_rating: string;
  } | null;
}

export function useWhatsAppCoexStatus(accountId: number, options?: { refresh?: boolean }) {
  return useQuery<WhatsAppCoexStatus>({
    queryKey: [...socialKeys.whatsapp(), 'coex-status', accountId, options?.refresh],
    queryFn: async () => {
      const params = options?.refresh ? '?refresh=true' : '';
      const response = await axios.get(`/api/social/whatsapp-accounts/${accountId}/coex-status/${params}`);
      return response.data;
    },
    enabled: !!accountId,
    staleTime: 30 * 1000, // Consider fresh for 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute to update sync window countdown
  });
}

export function useSyncWhatsAppContacts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (accountId: number) => {
      const response = await axios.post(`/api/social/whatsapp-accounts/${accountId}/sync-contacts/`);
      return response.data;
    },
    onSuccess: (_, accountId) => {
      queryClient.invalidateQueries({ queryKey: [...socialKeys.whatsapp(), 'coex-status', accountId] });
      queryClient.invalidateQueries({ queryKey: socialKeys.whatsappStatus() });
    },
  });
}

export function useSyncWhatsAppHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ accountId, phase }: { accountId: number; phase?: string }) => {
      const response = await axios.post(`/api/social/whatsapp-accounts/${accountId}/sync-history/`, {
        phase: phase || '0-1',
      });
      return response.data;
    },
    onSuccess: (_, { accountId }) => {
      queryClient.invalidateQueries({ queryKey: [...socialKeys.whatsapp(), 'coex-status', accountId] });
      queryClient.invalidateQueries({ queryKey: socialKeys.whatsappStatus() });
      queryClient.invalidateQueries({ queryKey: socialKeys.whatsappMessages() });
    },
  });
}

// ============================================================================
// SOCIAL SETTINGS HOOKS
// ============================================================================

// Per-platform auto-reply settings
export interface PlatformAutoReplySettings {
  welcome_enabled: boolean;
  welcome_message: string;
  away_enabled: boolean;
  away_message: string;
}

export interface AutoReplySettings {
  facebook?: PlatformAutoReplySettings;
  instagram?: PlatformAutoReplySettings;
  whatsapp?: PlatformAutoReplySettings;
}

// Away hours schedule - each day maps to array of away hours (0-23)
export interface AwayHoursSchedule {
  monday?: number[];
  tuesday?: number[];
  wednesday?: number[];
  thursday?: number[];
  friday?: number[];
  saturday?: number[];
  sunday?: number[];
}

export interface SocialSettings {
  id: number;
  refresh_interval: number;
  chat_assignment_enabled: boolean;
  session_management_enabled: boolean;
  hide_assigned_chats: boolean;
  collect_customer_rating: boolean;
  // Link-based rating settings
  link_based_rating_enabled: boolean;
  rating_request_message_template_ka: string;
  rating_request_message_template_en: string;
  post_review_redirect_url: string;
  notification_sound_facebook: string;
  notification_sound_instagram: string;
  notification_sound_whatsapp: string;
  notification_sound_email: string;
  notification_sound_widget: string;
  notification_sound_team_chat: string;
  notification_sound_system: string;
  // Auto-reply settings
  timezone: string;
  away_hours_enabled: boolean;
  away_hours_schedule: AwayHoursSchedule;
  auto_reply_settings: AutoReplySettings;
  created_at: string;
  updated_at: string;
}

export function useSocialSettings() {
  return useQuery<SocialSettings>({
    queryKey: socialKeys.settings(),
    queryFn: async () => {
      const response = await axios.get('/api/social/settings/');
      return response.data;
    },
    staleTime: 10 * 1000, // Consider data fresh for 10 seconds (short to reflect settings changes quickly)
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnMount: true, // Always check for fresh data when component mounts
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });
}

export function useUpdateSocialSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Pick<SocialSettings,
      | 'refresh_interval'
      | 'chat_assignment_enabled'
      | 'session_management_enabled'
      | 'hide_assigned_chats'
      | 'collect_customer_rating'
      | 'notification_sound_facebook'
      | 'notification_sound_instagram'
      | 'notification_sound_whatsapp'
      | 'notification_sound_email'
      | 'notification_sound_widget'
      | 'notification_sound_team_chat'
      | 'notification_sound_system'
      | 'timezone'
      | 'away_hours_enabled'
      | 'away_hours_schedule'
      | 'auto_reply_settings'
    >>) => {
      const response = await axios.patch('/api/social/settings/', data);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate settings query
      queryClient.invalidateQueries({ queryKey: socialKeys.settings() });
      // Invalidate all assignment queries since they include settings in their response
      queryClient.invalidateQueries({ queryKey: socialKeys.assignments() });
      // Invalidate message queries in case hide_assigned_chats changed
      queryClient.invalidateQueries({ queryKey: socialKeys.facebookMessages() });
      queryClient.invalidateQueries({ queryKey: socialKeys.instagramMessages() });
      queryClient.invalidateQueries({ queryKey: socialKeys.whatsappMessages() });
    },
  });
}

// ============================================================================
// CHAT ASSIGNMENT HOOKS
// ============================================================================

export type ChatAssignmentPlatform = 'facebook' | 'instagram' | 'whatsapp' | 'email' | 'widget';
export type ChatAssignmentStatus = 'active' | 'in_session' | 'completed';

export interface ChatAssignment {
  id: number;
  platform: ChatAssignmentPlatform;
  conversation_id: string;
  account_id: string;
  full_conversation_id: string;
  assigned_user: number;
  assigned_user_name: string;
  assigned_user_email: string;
  status: ChatAssignmentStatus;
  session_started_at: string | null;
  session_ended_at: string | null;
  assigned_at: string;
  updated_at: string;
}

export interface ChatAssignmentStatusResponse {
  assignment: ChatAssignment | null;
  settings: {
    chat_assignment_enabled: boolean;
    session_management_enabled: boolean;
    hide_assigned_chats: boolean;
    collect_customer_rating: boolean;
  };
}

export interface ChatRating {
  id: number;
  assignment: number;
  assignment_id: number;
  platform: ChatAssignmentPlatform;
  conversation_id: string;
  rating: number;
  rating_request_message_id: string;
  rating_response_message_id: string;
  created_at: string;
}

// Get current user's assignments
export function useMyAssignments(options?: { enabled?: boolean }) {
  return useQuery<ChatAssignment[]>({
    queryKey: socialKeys.myAssignments(),
    queryFn: async () => {
      const response = await axios.get('/api/social/assignments/');
      return response.data;
    },
    staleTime: 15 * 1000, // Consider data fresh for 15 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchInterval: 30000, // Poll every 30 seconds (WebSocket handles immediate updates)
    enabled: options?.enabled ?? true,
  });
}

// Get all assignments (admin only)
export function useAllAssignments(options?: { enabled?: boolean }) {
  return useQuery<ChatAssignment[]>({
    queryKey: socialKeys.allAssignments(),
    queryFn: async () => {
      const response = await axios.get('/api/social/assignments/all/');
      return response.data;
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: 30000,
    enabled: options?.enabled ?? true,
  });
}

// Get assignment status for a specific conversation
export function useAssignmentStatus(
  platform: ChatAssignmentPlatform,
  conversationId: string,
  accountId: string,
  options?: { enabled?: boolean }
) {
  return useQuery<ChatAssignmentStatusResponse>({
    queryKey: socialKeys.assignmentStatus(platform, conversationId, accountId),
    queryFn: async () => {
      const params = new URLSearchParams({
        platform,
        conversation_id: conversationId,
        account_id: accountId,
      });
      const response = await axios.get(`/api/social/assignments/status/?${params.toString()}`);
      return response.data;
    },
    staleTime: 10 * 1000, // Consider data fresh for 10 seconds (was 2s — too aggressive)
    enabled: options?.enabled ?? (!!platform && !!conversationId && !!accountId),
  });
}

// Assign chat to self
export function useAssignChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { platform: ChatAssignmentPlatform; conversation_id: string; account_id: string }) => {
      const response = await axios.post('/api/social/assignments/assign/', data);
      return response.data as ChatAssignment;
    },
    onMutate: async (variables) => {
      // Cancel ongoing refetches to prevent race conditions
      await queryClient.cancelQueries({ queryKey: socialKeys.assignments() });
      await queryClient.cancelQueries({ queryKey: socialKeys.conversations() });
      await queryClient.cancelQueries({
        queryKey: socialKeys.assignmentStatus(variables.platform, variables.conversation_id, variables.account_id),
      });

      // Snapshot previous data for rollback
      const prevMyAssignments = queryClient.getQueryData<ChatAssignment[]>(socialKeys.myAssignments());
      const prevAssignmentStatus = queryClient.getQueryData<ChatAssignmentStatusResponse>(
        socialKeys.assignmentStatus(variables.platform, variables.conversation_id, variables.account_id)
      );
      // Snapshot all conversations caches so we can roll back if the assign fails
      const prevConversationsCaches = queryClient.getQueriesData({ queryKey: socialKeys.conversations() });

      // Optimistically add to myAssignments cache
      const optimisticAssignment: ChatAssignment = {
        id: -1, // Temporary ID
        platform: variables.platform,
        conversation_id: variables.conversation_id,
        account_id: variables.account_id,
        full_conversation_id: `${variables.platform}_${variables.conversation_id}`,
        assigned_user: -1,
        assigned_user_name: '',
        assigned_user_email: '',
        status: 'active',
        session_started_at: null,
        session_ended_at: null,
        assigned_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      queryClient.setQueryData<ChatAssignment[]>(socialKeys.myAssignments(), (old) => {
        return [...(old || []), optimisticAssignment];
      });

      // Optimistically set assignment status to assigned
      if (prevAssignmentStatus) {
        queryClient.setQueryData<ChatAssignmentStatusResponse>(
          socialKeys.assignmentStatus(variables.platform, variables.conversation_id, variables.account_id),
          {
            ...prevAssignmentStatus,
            assignment: optimisticAssignment,
          }
        );
      }

      // Optimistically insert the conversation into the assigned={true} list
      // by finding it in any cached conversations list and copying it across.
      let foundConv: UnifiedConversation | undefined;
      for (const [, data] of prevConversationsCaches) {
        const infiniteData = data as { pages?: Array<{ results?: UnifiedConversation[] }> } | undefined;
        for (const page of infiniteData?.pages ?? []) {
          const hit = page.results?.find(
            (c) =>
              c.sender_id === variables.conversation_id &&
              c.account_id === variables.account_id &&
              String(c.platform) === variables.platform
          );
          if (hit) {
            foundConv = hit;
            break;
          }
        }
        if (foundConv) break;
      }

      if (foundConv) {
        // Walk cached conversations queries. For any assigned=true variant that
        // exists, prepend the conversation; for other variants, only update if
        // it's already present (to avoid breaking other filter buckets).
        const allConvQueries = queryClient.getQueriesData<{
          pages: Array<{ results?: UnifiedConversation[]; next?: string | null; count?: number }>;
          pageParams: number[];
        }>({ queryKey: socialKeys.conversations() });

        for (const [key] of allConvQueries) {
          const filtersInKey = key[2] as { assigned?: boolean } | undefined;
          const isAssignedVariant = filtersInKey?.assigned === true;

          queryClient.setQueryData<{
            pages: Array<{ results?: UnifiedConversation[]; next?: string | null; count?: number }>;
            pageParams: number[];
          }>(key, (old) => {
            if (!old?.pages || old.pages.length === 0) {
              if (!isAssignedVariant) return old;
              return {
                pages: [{ results: [foundConv!], next: null, count: 1 }],
                pageParams: [1],
              };
            }
            const alreadyPresent = old.pages.some((page) =>
              page.results?.some((c) => c.conversation_id === foundConv!.conversation_id)
            );
            if (alreadyPresent) return old;
            return {
              ...old,
              pages: old.pages.map((page, idx) =>
                idx === 0 ? { ...page, results: [foundConv!, ...(page.results ?? [])] } : page
              ),
            };
          });
        }
      }

      return { prevMyAssignments, prevAssignmentStatus, prevConversationsCaches };
    },
    onError: (_err, variables, context) => {
      // Rollback on error
      if (context?.prevMyAssignments !== undefined) {
        queryClient.setQueryData(socialKeys.myAssignments(), context.prevMyAssignments);
      }
      if (context?.prevAssignmentStatus !== undefined) {
        queryClient.setQueryData(
          socialKeys.assignmentStatus(variables.platform, variables.conversation_id, variables.account_id),
          context.prevAssignmentStatus
        );
      }
      // Restore all conversation list caches
      if (context?.prevConversationsCaches) {
        for (const [key, data] of context.prevConversationsCaches) {
          queryClient.setQueryData(key, data);
        }
      }
    },
    onSettled: () => {
      // Sync with server. Invalidating the base assignments() key also
      // invalidates the assignmentStatus(...) children — no need for a
      // second specific invalidation, which would trigger a duplicate
      // refetch on slow networks.
      queryClient.invalidateQueries({ queryKey: socialKeys.assignments() });
    },
  });
}

// Unassign chat
export function useUnassignChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { platform: ChatAssignmentPlatform; conversation_id: string; account_id: string }) => {
      const response = await axios.post('/api/social/assignments/unassign/', data);
      return response.data;
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: socialKeys.assignments() });
      await queryClient.cancelQueries({
        queryKey: socialKeys.assignmentStatus(variables.platform, variables.conversation_id, variables.account_id),
      });

      const prevMyAssignments = queryClient.getQueryData<ChatAssignment[]>(socialKeys.myAssignments());
      const prevAllAssignments = queryClient.getQueryData<ChatAssignment[]>(socialKeys.allAssignments());
      const prevAssignmentStatus = queryClient.getQueryData<ChatAssignmentStatusResponse>(
        socialKeys.assignmentStatus(variables.platform, variables.conversation_id, variables.account_id)
      );

      // Optimistically remove from myAssignments cache
      queryClient.setQueryData<ChatAssignment[]>(socialKeys.myAssignments(), (old) => {
        if (!old) return old;
        return old.filter(
          (a) => !(a.platform === variables.platform && a.conversation_id === variables.conversation_id)
        );
      });

      // Optimistically remove from allAssignments cache
      queryClient.setQueryData<ChatAssignment[]>(socialKeys.allAssignments(), (old) => {
        if (!old) return old;
        return old.filter(
          (a) => !(a.platform === variables.platform && a.conversation_id === variables.conversation_id)
        );
      });

      // Optimistically set assignment status to unassigned
      if (prevAssignmentStatus) {
        queryClient.setQueryData<ChatAssignmentStatusResponse>(
          socialKeys.assignmentStatus(variables.platform, variables.conversation_id, variables.account_id),
          {
            ...prevAssignmentStatus,
            assignment: null,
          }
        );
      }

      return { prevMyAssignments, prevAllAssignments, prevAssignmentStatus };
    },
    onError: (_err, variables, context) => {
      if (context?.prevMyAssignments !== undefined) {
        queryClient.setQueryData(socialKeys.myAssignments(), context.prevMyAssignments);
      }
      if (context?.prevAllAssignments !== undefined) {
        queryClient.setQueryData(socialKeys.allAssignments(), context.prevAllAssignments);
      }
      if (context?.prevAssignmentStatus !== undefined) {
        queryClient.setQueryData(
          socialKeys.assignmentStatus(variables.platform, variables.conversation_id, variables.account_id),
          context.prevAssignmentStatus
        );
      }
    },
    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({ queryKey: socialKeys.assignments() });
    },
  });
}

// Transfer chat to another user
export function useTransferChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { platform: ChatAssignmentPlatform; conversation_id: string; account_id: string; target_user_id: number }) => {
      const response = await axios.post('/api/social/assignments/transfer/', data);
      return response.data as { message: string; assignment: ChatAssignment };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: socialKeys.assignments() });
    },
  });
}

// Start session
export function useStartSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { platform: ChatAssignmentPlatform; conversation_id: string; account_id: string }) => {
      const response = await axios.post('/api/social/assignments/start-session/', data);
      return response.data as ChatAssignment;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: socialKeys.assignments() });
    },
  });
}

// End session (sends rating request to customer)
export function useEndSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { platform: ChatAssignmentPlatform; conversation_id: string; account_id: string }) => {
      const response = await axios.post('/api/social/assignments/end-session/', data);
      return response.data;
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: socialKeys.assignments() });
      await queryClient.cancelQueries({ queryKey: socialKeys.conversations() });
      await queryClient.cancelQueries({ queryKey: socialKeys.unreadCount() });
      await queryClient.cancelQueries({
        queryKey: socialKeys.assignmentStatus(variables.platform, variables.conversation_id, variables.account_id),
      });

      const prevMyAssignments = queryClient.getQueryData<ChatAssignment[]>(socialKeys.myAssignments());
      const prevAllAssignments = queryClient.getQueryData<ChatAssignment[]>(socialKeys.allAssignments());
      const prevAssignmentStatus = queryClient.getQueryData<ChatAssignmentStatusResponse>(
        socialKeys.assignmentStatus(variables.platform, variables.conversation_id, variables.account_id)
      );
      const prevUnreadCount = queryClient.getQueryData<UnreadMessagesCount>(socialKeys.unreadCount());
      // Snapshot all conversation list caches so we can roll back on error.
      const prevConversationsCaches = queryClient.getQueriesData({ queryKey: socialKeys.conversations() });

      // Optimistically update assignment status to completed and remove from active lists
      queryClient.setQueryData<ChatAssignment[]>(socialKeys.myAssignments(), (old) => {
        if (!old) return old;
        return old.filter(
          (a) => !(a.platform === variables.platform && a.conversation_id === variables.conversation_id)
        );
      });

      queryClient.setQueryData<ChatAssignment[]>(socialKeys.allAssignments(), (old) => {
        if (!old) return old;
        return old.map((a) =>
          a.platform === variables.platform && a.conversation_id === variables.conversation_id
            ? { ...a, status: 'completed' as ChatAssignmentStatus, session_ended_at: new Date().toISOString() }
            : a
        );
      });

      // Optimistically update assignment status
      if (prevAssignmentStatus?.assignment) {
        queryClient.setQueryData<ChatAssignmentStatusResponse>(
          socialKeys.assignmentStatus(variables.platform, variables.conversation_id, variables.account_id),
          {
            ...prevAssignmentStatus,
            assignment: {
              ...prevAssignmentStatus.assignment,
              status: 'completed',
              session_ended_at: new Date().toISOString(),
            },
          }
        );
      }

      // Ending a session archives the conversation on the server. Optimistically
      // remove it from every non-archived conversations cache so the user doesn't
      // see it lingering in "All Chats" or "Assigned to Me" after End Session.
      // Also track its unread_count so we can decrement the global badge.
      // Match on all three identifiers to avoid collisions across platforms.
      let unreadDelta = 0;
      queryClient.setQueriesData<{
        pages: Array<{ results?: UnifiedConversation[]; next?: string | null; count?: number }>;
        pageParams: number[];
      }>({ queryKey: socialKeys.conversations() }, (old) => {
        if (!old?.pages) return old;
        let removed = false;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            results: page.results?.filter((conv) => {
              const matches =
                conv.sender_id === variables.conversation_id &&
                conv.account_id === variables.account_id &&
                String(conv.platform) === variables.platform;
              if (matches) {
                if (!removed) {
                  unreadDelta = conv.unread_count || 0;
                  removed = true;
                }
                return false;
              }
              return true;
            }),
          })),
        };
      });

      // Decrement unread count
      if (prevUnreadCount && unreadDelta > 0) {
        const platformKey = variables.platform as keyof Omit<UnreadMessagesCount, 'total'>;
        queryClient.setQueryData<UnreadMessagesCount>(socialKeys.unreadCount(), {
          ...prevUnreadCount,
          [platformKey]: Math.max(0, (prevUnreadCount[platformKey] || 0) - unreadDelta),
          total: Math.max(0, prevUnreadCount.total - unreadDelta),
        });
      }

      return {
        prevMyAssignments,
        prevAllAssignments,
        prevAssignmentStatus,
        prevUnreadCount,
        prevConversationsCaches,
      };
    },
    onError: (_err, variables, context) => {
      if (context?.prevMyAssignments !== undefined) {
        queryClient.setQueryData(socialKeys.myAssignments(), context.prevMyAssignments);
      }
      if (context?.prevAllAssignments !== undefined) {
        queryClient.setQueryData(socialKeys.allAssignments(), context.prevAllAssignments);
      }
      if (context?.prevAssignmentStatus !== undefined) {
        queryClient.setQueryData(
          socialKeys.assignmentStatus(variables.platform, variables.conversation_id, variables.account_id),
          context.prevAssignmentStatus
        );
      }
      if (context?.prevUnreadCount) {
        queryClient.setQueryData(socialKeys.unreadCount(), context.prevUnreadCount);
      }
      // Restore all conversation list caches (undo the optimistic removal)
      if (context?.prevConversationsCaches) {
        for (const [key, data] of context.prevConversationsCaches) {
          queryClient.setQueryData(key, data);
        }
      }
    },
    onSettled: (_data, _err, variables) => {
      // Sync assignment state with server. Conversations/unread/messages are
      // already handled by the optimistic update and by WebSocket events
      // (the rating request message arrives via WebSocket), so no need to
      // force refetches here.
      queryClient.invalidateQueries({ queryKey: socialKeys.assignments() });
    },
  });
}

// ============================================================================
// RATING STATISTICS
// ============================================================================

export interface RatingUserStats {
  user_id: number;
  email: string;
  name: string;
  total_ratings: number;
  average_rating: number;
  rating_breakdown: {
    '1': number;
    '2': number;
    '3': number;
    '4': number;
    '5': number;
  };
  social_ratings?: number;
  call_ratings?: number;
}

export interface BySourceBreakdown {
  total: number;
  average: number;
}

export interface RatingStatisticsResponse {
  start_date: string;
  end_date: string;
  overall: {
    total_ratings: number;
    average_rating: number;
    by_source?: {
      social?: BySourceBreakdown;
      calls_callback?: BySourceBreakdown;
      calls_sms?: BySourceBreakdown;
    };
  };
  users: RatingUserStats[];
}

export function useRatingStatistics(startDate?: string, endDate?: string, source?: string) {
  return useQuery<RatingStatisticsResponse>({
    queryKey: [...socialKeys.all, 'ratingStatistics', startDate, endDate, source],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (source && source !== 'all') params.append('source', source);
      const response = await axios.get(`/api/social/rating-statistics/?${params.toString()}`);
      return response.data;
    },
    staleTime: 60 * 1000, // Consider data fresh for 1 minute
  });
}

// User chat sessions for investigation
export interface ChatSession {
  id: number;
  platform: 'facebook' | 'instagram' | 'whatsapp' | 'email' | 'phone_sms' | 'phone_callback';
  conversation_id: string;
  account_id: string;
  customer_name: string;
  rating: number | null;
  comment: string;
  session_started_at: string | null;
  session_ended_at: string | null;
  created_at: string;
  is_archived: boolean;
}

export interface UserChatSessionsResponse {
  user: {
    id: number;
    email: string;
    name: string;
  };
  start_date: string;
  end_date: string;
  sessions: ChatSession[];
  total_sessions: number;
}

export function useUserChatSessions(userId: number | null, startDate?: string, endDate?: string, source?: string) {
  return useQuery<UserChatSessionsResponse>({
    queryKey: [...socialKeys.all, 'userSessions', userId, startDate, endDate, source],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (source && source !== 'all') params.append('source', source);
      const response = await axios.get(`/api/social/rating-statistics/user/${userId}/?${params.toString()}`);
      return response.data;
    },
    staleTime: 60 * 1000,
    enabled: userId !== null,
  });
}

// ============================================================================
// EMAIL HOOKS
// ============================================================================

export interface EmailConnection {
  id: number;
  email_address: string;
  display_name: string;
  imap_server: string;
  imap_port: number;
  imap_use_ssl: boolean;
  smtp_server: string;
  smtp_port: number;
  smtp_use_tls: boolean;
  smtp_use_ssl: boolean;
  username: string;
  is_active: boolean;
  last_sync_at: string | null;
  last_sync_error: string;
  sync_folder: string;
  sync_days_back: number;
  created_at: string;
  updated_at: string;
}

export interface EmailConnectionAssignedUser {
  id: number;
  user_id: number;
  user_email: string;
  user_name: string;
  assigned_at: string;
}

export interface EmailConnectionDetail {
  id: number;
  email_address: string;
  display_name: string;
  imap_server: string;
  imap_port: number;
  imap_use_ssl: boolean;
  smtp_server: string;
  smtp_port: number;
  smtp_use_tls: boolean;
  smtp_use_ssl: boolean;
  username: string;
  is_active: boolean;
  last_sync_at: string | null;
  last_sync_error: string;
  /**
   * ISO timestamp set when the Celery sync worker auto-disabled this
   * connection after a non-transient failure. Non-null means is_active was
   * flipped off by the system (not by the user) — the UI should force the
   * user through the Reactivate flow which re-tests the credentials.
   */
  auto_disabled_at: string | null;
  sync_folder: string;
  sync_days_back: number;
  connected_at: string;
  signature_enabled?: boolean;
  signature_html?: string;
  signature_text?: string;
  assigned_users?: EmailConnectionAssignedUser[];
}

export interface EmailConnectionStatus {
  connected: boolean;
  connections: EmailConnectionDetail[];  // All connections
  connection: EmailConnectionDetail | null;  // First connection (backwards compatibility)
}

export interface EmailMessage {
  id: number;
  message_id: string;
  thread_id: string;
  in_reply_to: string;
  references: string;
  from_email: string;
  from_name: string;
  to_emails: Array<{ email: string; name?: string }>;
  cc_emails: Array<{ email: string; name?: string }>;
  bcc_emails: Array<{ email: string; name?: string }>;
  reply_to: string;
  subject: string;
  body_text: string;
  body_html: string;
  attachments: Array<{
    filename: string;
    content_type: string;
    url: string;
    size: number;
  }>;
  timestamp: string;
  folder: string;
  uid: string;
  is_from_business: boolean;
  is_read: boolean;
  is_starred: boolean;
  is_answered: boolean;
  is_draft: boolean;
  labels: string[];
  is_read_by_staff: boolean;
  read_by_staff_at: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  connection_id: number;
  connection_email: string;
  connection_display_name: string;
  created_at: string;
  updated_at: string;
  // Additional fields for thread view
  message_count?: number;
  unread_count?: number;
}

export interface EmailFolder {
  name: string;
  display_name: string;
}

export interface EmailMoveRequest {
  message_id: string;
  source_folder: string;
  target_folder: string;
}

export interface EmailConnectRequest {
  email_address: string;
  display_name?: string;
  imap_server: string;
  imap_port?: number;
  imap_use_ssl?: boolean;
  smtp_server: string;
  smtp_port?: number;
  smtp_use_tls?: boolean;
  smtp_use_ssl?: boolean;
  username: string;
  password: string;
  sync_folder?: string;
  sync_days_back?: number;
}

export interface EmailSendRequest {
  to_emails: string[];
  cc_emails?: string[];
  bcc_emails?: string[];
  subject?: string;
  body_text?: string;
  body_html?: string;
  reply_to_message_id?: number;
  connection_id?: number;  // Optional: send from specific email account
}

export interface EmailActionRequest {
  message_ids?: number[];
  thread_id?: string;
  action: 'mark_read' | 'mark_unread' | 'star' | 'unstar' | 'label' | 'unlabel' | 'move' | 'delete' | 'restore';
  label?: string;
  folder?: string;
}

// Email Status Query
export function useEmailStatus(options?: { enabled?: boolean }) {
  return useQuery<EmailConnectionStatus>({
    queryKey: socialKeys.emailStatus(),
    queryFn: async () => {
      return await socialEmailStatusRetrieve();
    },
    staleTime: 2 * 60 * 1000, // Consider data fresh for 2 minutes
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    enabled: options?.enabled ?? true,
  });
}

// Email Connection Mutations
export function useConnectEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: EmailConnectRequest) => {
      const response = await axios.post('/api/social/email/connect/', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: socialKeys.emailStatus() });
    },
  });
}

export function useDisconnectEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (connectionId: number) => {
      const response = await axios.post('/api/social/email/disconnect/', { connection_id: connectionId });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: socialKeys.emailStatus() });
      queryClient.invalidateQueries({ queryKey: socialKeys.emailMessages() });
      queryClient.invalidateQueries({ queryKey: socialKeys.emailDrafts() });
    },
  });
}

// Email Messages Query
// Note: Using axios directly because generated function doesn't support all filter params (thread_id, folder, starred, is_read, label)
export function useEmailMessages(filters?: {
  page?: number;
  thread_id?: string;
  folder?: string;
  starred?: boolean;
  is_read?: boolean;
  label?: string;
  search?: string;
  connection_id?: number;  // Filter by specific email account
}) {
  return useQuery<PaginatedEmailMessageList>({
    queryKey: socialKeys.emailMessagesList(filters || {}),
    queryFn: async () => {
      const response = await axios.get('/api/social/email-messages/', { params: filters });
      return response.data;
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds (emails are less time-sensitive)
  });
}

export function useInfiniteEmailMessages(filters?: {
  thread_id?: string;
  folder?: string;
  starred?: boolean;
  is_read?: boolean;
  label?: string;
  search?: string;
  connection_id?: number;  // Filter by specific email account
}) {
  return useInfiniteQuery({
    queryKey: socialKeys.emailMessagesList(filters || {}),
    queryFn: async ({ pageParam = 1 }) => {
      const response = await axios.get('/api/social/email-messages/', {
        params: { ...filters, page: pageParam }
      });
      return response.data;
    },
    getNextPageParam: (lastPage: PaginatedEmailMessageList, pages) => {
      if (lastPage.next) {
        return pages.length + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });
}

// Email Threads Query
export function useEmailThreads(filters?: { folder?: string; connection_id?: number }) {
  return useQuery<GeneratedEmailMessage[]>({
    queryKey: [...socialKeys.emailThreads(), filters?.folder || 'All', filters?.connection_id || 'all'],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.folder && filters.folder !== 'All') {
        params.set('folder', filters.folder);
      }
      if (filters?.connection_id) {
        params.set('connection_id', String(filters.connection_id));
      }
      const queryString = params.toString() ? `?${params.toString()}` : '';
      const response = await axios.get(`/api/social/email-messages/threads/${queryString}`);
      return response.data as GeneratedEmailMessage[];
    },
    refetchInterval: 30000,
  });
}

// Email Folders Response Types
interface EmailConnectionFolders {
  connection_id: number;
  email: string;
  folders: string[];
  success: boolean;
  error?: string;
}

interface EmailFoldersAllResponse {
  connections: EmailConnectionFolders[];
}

interface EmailFoldersSingleResponse {
  connection_id: number;
  email: string;
  folders: string[];
}

// Helper to transform folder strings to EmailFolder objects
function transformFolders(folderNames: string[]): EmailFolder[] {
  return folderNames.map(name => ({
    name,
    display_name: name.replace(/^INBOX\.?/i, '').replace(/\./g, ' / ') || name,
  }));
}

// Email Folders Query
export function useEmailFolders(connectionId?: number | null) {
  return useQuery<EmailFolder[]>({
    queryKey: socialKeys.emailFolders(connectionId),
    queryFn: async () => {
      const url = connectionId
        ? `/api/social/email/folders/?connection_id=${connectionId}`
        : '/api/social/email/folders/';
      const response = await axios.get(url);

      if (connectionId) {
        // Single connection response
        const data = response.data as EmailFoldersSingleResponse;
        return transformFolders(data.folders);
      } else {
        // All connections response - merge unique folders
        const data = response.data as EmailFoldersAllResponse;
        const allFolders = new Set<string>();
        data.connections.forEach(conn => {
          if (conn.success) {
            conn.folders.forEach(folder => allFolders.add(folder));
          }
        });
        return transformFolders(Array.from(allFolders).sort());
      }
    },
    staleTime: 5 * 60 * 1000, // Consider fresh for 5 minutes
  });
}

// Move Email Mutation
export function useMoveEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: EmailMoveRequest) => {
      const response = await axios.post('/api/social/email-messages/move/', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: socialKeys.emailMessages() });
      queryClient.invalidateQueries({ queryKey: socialKeys.emailThreads() });
    },
  });
}

// Send Email Mutation
export function useSendEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: EmailSendRequest) => {
      const response = await axios.post('/api/social/email/send/', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: socialKeys.emailMessages() });
      queryClient.invalidateQueries({ queryKey: socialKeys.emailThreads() });
    },
  });
}

// Email Action Mutation (star, read, label, move, delete)
export function useEmailAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: EmailActionRequest) => {
      const response = await axios.post('/api/social/email/action/', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: socialKeys.emailMessages() });
      queryClient.invalidateQueries({ queryKey: socialKeys.emailThreads() });
      queryClient.invalidateQueries({ queryKey: socialKeys.unreadCount() });
    },
  });
}

// Email Sync Mutation
export function useSyncEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (connectionId?: number) => {
      // Use longer timeout for sync (3 minutes) as it can take a while
      const response = await axios.post('/api/social/email/sync/',
        connectionId ? { connection_id: connectionId } : {},
        { timeout: 180000 }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: socialKeys.emailStatus() });
      queryClient.invalidateQueries({ queryKey: socialKeys.emailMessages() });
      queryClient.invalidateQueries({ queryKey: socialKeys.emailThreads() });
      queryClient.invalidateQueries({ queryKey: socialKeys.unreadCount() });
    },
  });
}

// Update Email Connection
export interface EmailConnectionUpdateRequest {
  connection_id: number;
  display_name?: string;
  imap_server?: string;
  imap_port?: number;
  imap_use_ssl?: boolean;
  smtp_server?: string;
  smtp_port?: number;
  smtp_use_tls?: boolean;
  smtp_use_ssl?: boolean;
  username?: string;
  password?: string;
  sync_folder?: string;
  sync_days_back?: number;
  signature_enabled?: boolean;
  signature_html?: string;
  signature_text?: string;
}

export function useUpdateEmailConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: EmailConnectionUpdateRequest) => {
      const response = await axios.post('/api/social/email/update/', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: socialKeys.emailStatus() });
    },
  });
}

export interface EmailReactivateRequest {
  connection_id: number;
  /** Optional: new password to store + test before flipping is_active back on. */
  password?: string;
  /** Optional IMAP/SMTP overrides — any provided field replaces the stored value. */
  username?: string;
  imap_server?: string;
  imap_port?: number;
  imap_use_ssl?: boolean;
  smtp_server?: string;
  smtp_port?: number;
  smtp_use_tls?: boolean;
  smtp_use_ssl?: boolean;
}

export function useReactivateEmailConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: EmailReactivateRequest) => {
      const response = await axios.post('/api/social/email/reactivate/', data);
      return response.data as { message: string; connection: EmailConnectionDetail };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: socialKeys.emailStatus() });
    },
  });
}

// ============================================================================
// EMAIL USER ASSIGNMENT HOOKS
// ============================================================================

export interface EmailConnectionAssignment {
  id: number;
  connection: number;
  user: number;
  user_email: string;
  user_name: string;
  assigned_by: number | null;
  assigned_by_email: string | null;
  assigned_by_name: string | null;
  connection_email: string;
  assigned_at: string;
}

export interface EmailConnectionWithAssignments {
  id: number;
  email_address: string;
  display_name: string;
  is_active: boolean;
  assigned_users: EmailConnectionAssignment[];
}

export interface UpdateEmailAssignmentsRequest {
  user_ids: number[];
}

// Get assigned users for an email connection
export function useEmailConnectionAssignedUsers(connectionId: number) {
  return useQuery<{
    connection_id: number;
    connection_email: string;
    assigned_users: EmailConnectionAssignment[];
  }>({
    queryKey: [...socialKeys.email(), 'assignments', connectionId],
    queryFn: async () => {
      const response = await axios.get(`/api/social/email/${connectionId}/assigned-users/`);
      return response.data;
    },
    enabled: !!connectionId,
    staleTime: 30 * 1000,
  });
}

// Update assigned users for an email connection
export function useUpdateEmailConnectionAssignments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ connectionId, userIds }: { connectionId: number; userIds: number[] }) => {
      const response = await axios.put(`/api/social/email/${connectionId}/assigned-users/`, {
        user_ids: userIds,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: socialKeys.emailStatus() });
      queryClient.invalidateQueries({ queryKey: socialKeys.email() });
      queryClient.invalidateQueries({ queryKey: socialKeys.conversations() });
    },
  });
}

// Create a single email assignment
export function useCreateEmailAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ connectionId, userId }: { connectionId: number; userId: number }) => {
      const response = await axios.post('/api/social/email/assignments/create/', {
        connection_id: connectionId,
        user_id: userId,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: socialKeys.emailStatus() });
      queryClient.invalidateQueries({ queryKey: socialKeys.email() });
    },
  });
}

// Delete an email assignment
export function useDeleteEmailAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assignmentId: number) => {
      const response = await axios.delete(`/api/social/email/assignments/${assignmentId}/`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: socialKeys.emailStatus() });
      queryClient.invalidateQueries({ queryKey: socialKeys.email() });
    },
  });
}

// Email Drafts
export interface EmailDraft {
  id: number;
  connection: number;
  to_emails: Array<{ email: string; name?: string }>;
  cc_emails: Array<{ email: string; name?: string }>;
  bcc_emails: Array<{ email: string; name?: string }>;
  subject: string;
  body_text: string;
  body_html: string;
  attachments: Array<{
    filename: string;
    content_type: string;
    url: string;
    size: number;
  }>;
  is_reply_all: boolean;
  is_forward: boolean;
  reply_to_message: number | null;
  reply_to_subject: string | null;
  created_by: number;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export function useEmailDrafts() {
  return useQuery({
    queryKey: socialKeys.emailDrafts(),
    queryFn: async () => {
      return await socialEmailDraftsList();
    },
  });
}

export function useCreateEmailDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: EmailDraftRequest) => {
      return await socialEmailDraftsCreate(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: socialKeys.emailDrafts() });
    },
  });
}

export function useUpdateEmailDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: PatchedEmailDraftRequest }) => {
      return await socialEmailDraftsPartialUpdate(String(id), data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: socialKeys.emailDrafts() });
    },
  });
}

export function useDeleteEmailDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      return await socialEmailDraftsDestroy(String(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: socialKeys.emailDrafts() });
    },
  });
}

// ============================================================================
// TIKTOK HOOKS
// ============================================================================

export interface TikTokAccount {
  id: number;
  open_id: string;
  seller_name: string;
  seller_base_region: string;
  shop_id: string;
  shop_cipher: string;
  user_type: number;
  scope: string;
  is_active: boolean;
  token_expires_at: string;
  refresh_token_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TikTokStatus {
  connected: boolean;
  account: TikTokAccount | null;
  token_expires_at: string | null;
  is_token_expired: boolean;
}

// TikTok Status Query
export function useTikTokStatus() {
  return useQuery<TikTokStatus>({
    queryKey: socialKeys.tiktokStatus(),
    queryFn: async () => {
      const response = await axios.get('/api/social/tiktok/status/');
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // Consider data fresh for 2 minutes
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });
}

// TikTok OAuth Start
export function useConnectTikTok() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await axios.get('/api/social/tiktok/oauth/start/');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: socialKeys.tiktokStatus() });
    },
  });
}

// TikTok Disconnect
export function useDisconnectTikTok() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (accountId?: number) => {
      const response = await axios.post('/api/social/tiktok/disconnect/', {
        account_id: accountId,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: socialKeys.tiktokStatus() });
      queryClient.invalidateQueries({ queryKey: socialKeys.tiktokMessages() });
    },
  });
}

// TikTok Messages Query (for future use when messaging is enabled)
export function useTikTokMessages(filters?: {
  page?: number;
  account_id?: string;
  search?: string;
  unread_only?: boolean;
}) {
  return useQuery({
    queryKey: socialKeys.tiktokMessagesList(filters || {}),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.account_id) params.append('account_id', filters.account_id);
      if (filters?.search) params.append('search', filters.search);
      if (filters?.unread_only) params.append('unread_only', 'true');

      const response = await axios.get(
        `/api/social/tiktok-messages/${params.toString() ? '?' + params.toString() : ''}`
      );
      return response.data;
    },
    enabled: false, // Disabled until messaging is available
    refetchInterval: 30000,
  });
}

// TikTok Send Message (for future use when messaging is enabled)
export function useSendTikTokMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { conversation_id: string; message: string; account_id: number }) => {
      const response = await axios.post('/api/social/tiktok/send-message/', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: socialKeys.tiktokMessages() });
    },
  });
}

// ============================================================================
// EMAIL SIGNATURE HOOKS
// ============================================================================

export interface EmailSignature {
  id: number;
  sender_name: string;
  signature_html: string;
  signature_text: string;
  is_enabled: boolean;
  include_on_reply: boolean;
  created_by: number | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export function useEmailSignature() {
  return useQuery<EmailSignature>({
    queryKey: [...socialKeys.email(), 'signature'],
    queryFn: async () => {
      const response = await axios.get('/api/social/email/signature/');
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // Consider fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });
}

export function useUpdateEmailSignature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Pick<EmailSignature, 'sender_name' | 'signature_html' | 'signature_text' | 'is_enabled' | 'include_on_reply'>>) => {
      const response = await axios.patch('/api/social/email/signature/', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...socialKeys.email(), 'signature'] });
    },
  });
}

// ============================================================================
// EMAIL SYNC DEBUG HOOKS
// ============================================================================

export interface EmailSyncFolderDebug {
  name: string;
  is_synced: boolean;
  skip_reason: string | null;
  total_messages_on_server?: number;
  messages_matching_filter?: number;
  messages_already_synced?: number;
  search_filter?: string;
  select_error?: string;
  search_error?: string;
  error?: string;
}

export interface EmailSyncDebugInfo {
  connection: {
    email: string;
    imap_server: string;
    sync_days_back: number;
    sync_days_back_meaning: string;
    last_sync_at: string | null;
    last_sync_error: string | null;
  };
  folders: EmailSyncFolderDebug[];
  skipped_folders: EmailSyncFolderDebug[];
  summary: {
    total_folders_on_server: number;
    folders_being_synced: number;
    folders_skipped: number;
    total_messages_in_db: number;
  };
  errors: string[];
}

export function useEmailSyncDebug(connectionId?: number | null) {
  return useQuery<EmailSyncDebugInfo>({
    queryKey: [...socialKeys.email(), 'syncDebug', connectionId ?? 'default'],
    queryFn: async () => {
      const params = connectionId ? `?connection_id=${connectionId}` : '';
      const response = await axios.get(`/api/social/email/sync/debug/${params}`);
      return response.data;
    },
    staleTime: 0,
    gcTime: 0,
    enabled: connectionId !== null,
  });
}

export function useEmailSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (connectionId?: number) => {
      const response = await axios.post('/api/social/email/sync/', connectionId ? { connection_id: connectionId } : {});
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: socialKeys.email() });
    },
  });
}

export function useUpdateEmailSyncSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ syncDaysBack, connectionId }: { syncDaysBack: number; connectionId?: number }) => {
      const response = await axios.post('/api/social/email/sync/settings/', {
        sync_days_back: syncDaysBack,
        ...(connectionId ? { connection_id: connectionId } : {}),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...socialKeys.email(), 'syncDebug'] });
    },
  });
}

// ============================================================================
// QUICK REPLY HOOKS
// ============================================================================

export type QuickReplyPlatform = 'all' | 'facebook' | 'instagram' | 'whatsapp' | 'email' | 'tiktok';

export interface QuickReply {
  id: number;
  title: string;
  message: string;
  platforms: QuickReplyPlatform[];
  shortcut: string;
  category: string;
  use_count: number;
  position: number;
  created_by: number | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuickReplyVariable {
  name: string;
  description: string;
}

export interface QuickReplyUseResponse {
  original_message: string;
  processed_message: string;
  use_count: number;
}

export interface QuickReplyUseParams {
  customer_name?: string;
  order_number?: string;
  agent_name?: string;
  company_name?: string;
}

// Query keys for quick replies
export const quickReplyKeys = {
  all: ['quickReplies'] as const,
  list: (filters?: { platform?: string; category?: string; search?: string }) =>
    [...quickReplyKeys.all, 'list', filters] as const,
  variables: () => [...quickReplyKeys.all, 'variables'] as const,
  categories: () => [...quickReplyKeys.all, 'categories'] as const,
};

// List quick replies with optional filtering
export function useQuickReplies(filters?: {
  platform?: string;
  category?: string;
  search?: string;
  shortcut?: string;
}) {
  return useQuery<QuickReply[]>({
    queryKey: quickReplyKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.platform) params.append('platform', filters.platform);
      if (filters?.category) params.append('category', filters.category);
      if (filters?.search) params.append('search', filters.search);
      if (filters?.shortcut) params.append('shortcut', filters.shortcut);

      const response = await axios.get(`/api/social/quick-replies/${params.toString() ? '?' + params.toString() : ''}`);
      // Handle both paginated and non-paginated responses
      const data = response.data;
      if (Array.isArray(data)) {
        return data;
      }
      // Paginated response
      return data.results || [];
    },
    staleTime: 60 * 1000, // Consider fresh for 1 minute
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });
}

// Get available variables for quick replies
export function useQuickReplyVariables() {
  return useQuery<QuickReplyVariable[]>({
    queryKey: quickReplyKeys.variables(),
    queryFn: async () => {
      const response = await axios.get('/api/social/quick-replies/variables/');
      return response.data;
    },
    staleTime: 10 * 60 * 1000, // Variables rarely change, consider fresh for 10 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
  });
}

// Get categories
export function useQuickReplyCategories() {
  return useQuery<string[]>({
    queryKey: quickReplyKeys.categories(),
    queryFn: async () => {
      const response = await axios.get('/api/social/quick-replies/categories/');
      return response.data;
    },
    staleTime: 60 * 1000, // Consider fresh for 1 minute
  });
}

// Create quick reply
export function useCreateQuickReply() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<QuickReply, 'id' | 'use_count' | 'created_by' | 'created_by_name' | 'created_at' | 'updated_at'>) => {
      const response = await axios.post('/api/social/quick-replies/', data);
      return response.data as QuickReply;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quickReplyKeys.all });
    },
  });
}

// Update quick reply
export function useUpdateQuickReply() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Omit<QuickReply, 'id' | 'use_count' | 'created_by' | 'created_by_name' | 'created_at' | 'updated_at'>> }) => {
      const response = await axios.patch(`/api/social/quick-replies/${id}/`, data);
      return response.data as QuickReply;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quickReplyKeys.all });
    },
  });
}

// Delete quick reply
export function useDeleteQuickReply() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await axios.delete(`/api/social/quick-replies/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quickReplyKeys.all });
    },
  });
}

// Use quick reply (replaces variables and increments use count)
export function useUseQuickReply() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, variables }: { id: number; variables: QuickReplyUseParams }) => {
      const response = await axios.post(`/api/social/quick-replies/${id}/use/`, variables);
      return response.data as QuickReplyUseResponse;
    },
    onSuccess: () => {
      // Invalidate to update use_count
      queryClient.invalidateQueries({ queryKey: quickReplyKeys.all });
    },
  });
}

// Reorder quick replies
export function useReorderQuickReplies() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (items: Array<{ id: number; position: number }>) => {
      const response = await axios.post('/api/social/quick-replies/reorder/', { items });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quickReplyKeys.all });
    },
  });
}

// ============================================================================
// RECENT CONVERSATIONS HOOK (for Messages Dropdown)
// ============================================================================

export interface RecentConversation {
  id: string; // Full conversation ID (e.g., fb_pageId_senderId)
  platform: 'facebook' | 'instagram' | 'whatsapp';
  conversationId: string;
  accountId: string;
  senderName: string;
  senderAvatar?: string;
  lastMessage: string;
  lastMessageAt: Date;
  unreadCount: number;
}

interface ConversationGroup {
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  accountId: string;
  accountName: string;
  latestMessage: { text: string; timestamp: Date };
  unreadCount: number;
}

export function useRecentConversations(options?: { enabled?: boolean; limit?: number }) {
  const limit = options?.limit ?? 15;

  // Use a simple query to fetch recent conversations from the unified API
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['recent-conversations', limit],
    queryFn: async () => {
      const response = await axios.get<PaginatedUnifiedConversation>('/api/social/conversations/', {
        params: {
          page: 1,
          page_size: limit,
          platforms: 'facebook,instagram,whatsapp,email,widget',
        },
      });
      return response.data;
    },
    enabled: options?.enabled ?? true,
    staleTime: 30000, // 30 seconds
  });

  // Transform the API response to RecentConversation format
  const conversations: RecentConversation[] = useMemo(() => {
    if (!data?.results) return [];

    return data.results.slice(0, limit).map((conv) => ({
      id: conv.conversation_id,
      platform: String(conv.platform) as 'facebook' | 'instagram' | 'whatsapp',
      conversationId: conv.sender_id,
      accountId: conv.account_id,
      senderName: conv.sender_name,
      senderAvatar: conv.profile_pic_url || undefined,
      lastMessage: conv.last_message.text || conv.last_message.attachment_type || '',
      lastMessageAt: parseTimestamp(conv.last_message.timestamp),
      unreadCount: conv.unread_count,
    }));
  }, [data, limit]);

  return {
    data: conversations,
    isLoading,
    isFetching,
    isEmpty: !isLoading && conversations.length === 0,
  };
}


// ============================================================================
// UNIFIED CONVERSATIONS (with infinite scroll pagination)
// ============================================================================

export interface UseUnifiedConversationsOptions {
  platforms?: string;
  search?: string;
  folder?: string;
  pageSize?: number;
  enabled?: boolean;
  assigned?: boolean;
  archived?: boolean;
  connectionId?: number | null;  // Filter by email connection ID
}

/**
 * Hook to fetch unified conversations from all social platforms with infinite scroll.
 * Uses useInfiniteQuery for pagination.
 */
export function useUnifiedConversations(options: UseUnifiedConversationsOptions = {}) {
  const {
    platforms = 'facebook,instagram,whatsapp,email,widget',
    search = '',
    folder = 'INBOX',
    pageSize = 50,
    enabled = true,
    assigned = false,
    archived = false,
    connectionId = null,
  } = options;

  return useInfiniteQuery({
    queryKey: socialKeys.conversationsList({ platforms, search, folder, assigned, archived, connectionId }),
    queryFn: async ({ pageParam = 1 }) => {
      // Use axios directly to support the 'assigned' and 'archived' parameters
      const params: Record<string, string | number | boolean> = {
        page: pageParam,
        page_size: pageSize,
        platforms,
      };
      if (folder) params.folder = folder;
      if (search) params.search = search;
      if (assigned) params.assigned = 'true';
      if (archived) params.archived = 'true';
      if (connectionId) params.connection_id = connectionId;

      const response = await axios.get<PaginatedUnifiedConversation>('/api/social/conversations/', { params });
      return response.data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.next) {
        return allPages.length + 1;
      }
      return undefined;
    },
    enabled,
    staleTime: 10000, // 10 seconds
    // Background refetch so the sidebar self-heals if the WebSocket disconnects
    // silently (load balancer idle timeout, flaky network). WebSocket push is
    // still the primary real-time path — this is a fallback only.
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
    // Keep the previously-rendered list visible while switching tabs or filters,
    // so the sidebar doesn't show a full-page spinner on tab switch.
    placeholderData: keepPreviousData,
  });
}

// ============================================================================
// MARK ALL AS READ
// ============================================================================

interface MarkAllReadResponse {
  success: boolean;
  messages_marked_read: number;
  platform: string;
}

/**
 * Hook to mark all conversations as read.
 */
export function useMarkAllAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (platform: string = 'all') => {
      const response = await axios.post<MarkAllReadResponse>('/api/social/mark-all-read/', { platform });
      return response.data;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: socialKeys.conversations() });
      await queryClient.cancelQueries({ queryKey: socialKeys.unreadCount() });

      const prevUnreadCount = queryClient.getQueryData<UnreadMessagesCount>(socialKeys.unreadCount());

      // Optimistically set all conversations' unread count to 0
      queryClient.setQueriesData<{ pages: Array<{ results?: UnifiedConversation[]; next?: string | null; count?: number }>; pageParams: number[] }>(
        { queryKey: socialKeys.conversations() },
        (old) => {
          if (!old?.pages) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              results: page.results?.map((conv) => ({ ...conv, unread_count: 0 })),
            })),
          };
        }
      );

      // Optimistically set all unread counts to 0
      if (prevUnreadCount) {
        queryClient.setQueryData<UnreadMessagesCount>(socialKeys.unreadCount(), {
          total: 0,
          facebook: 0,
          instagram: 0,
          whatsapp: 0,
          email: 0,
        });
      }

      return { prevUnreadCount };
    },
    onError: (_err, _vars, context) => {
      if (context?.prevUnreadCount) {
        queryClient.setQueryData(socialKeys.unreadCount(), context.prevUnreadCount);
      }
    },
    onSettled: () => {
      // Optimistic update already zeroed unread_count across all cached
      // conversation lists. Only refresh the global badge total.
      queryClient.invalidateQueries({ queryKey: socialKeys.unreadCount() });
    },
  });
}

// ============================================================================
// ARCHIVE/HISTORY CONVERSATIONS
// ============================================================================

interface ArchiveConversationRequest {
  platform: string;
  conversation_id: string;
  account_id: string;
}

interface ArchiveResponse {
  success: boolean;
  archived_count: number;
  message: string;
  errors?: Array<{ conversation: ArchiveConversationRequest; error: string }>;
}

interface UnarchiveResponse {
  success: boolean;
  unarchived_count: number;
  message: string;
  errors?: Array<{ conversation: ArchiveConversationRequest; error: string }>;
}

/**
 * Hook to archive one or more conversations (move to history).
 */
export function useArchiveConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversations: ArchiveConversationRequest[]) => {
      const response = await axios.post<ArchiveResponse>('/api/social/conversations/archive/', { conversations });
      return response.data;
    },
    onMutate: async (conversations) => {
      await queryClient.cancelQueries({ queryKey: socialKeys.conversations() });
      await queryClient.cancelQueries({ queryKey: socialKeys.unreadCount() });

      const prevUnreadCount = queryClient.getQueryData<UnreadMessagesCount>(socialKeys.unreadCount());

      // Build a set of archive keys. Each request entry identifies a chat by
      // (platform, account_id, conversation_id=sender_id). The API response
      // embeds platform+account+sender into `conversation_id` ("fb_…_…"), so
      // match on sender_id+account_id+platform instead.
      const archivingKeys = new Set(
        conversations.map((c) => `${c.platform}|${c.account_id}|${c.conversation_id}`)
      );

      // Optimistically remove archived conversations from all conversation list caches
      queryClient.setQueriesData<{ pages: Array<{ results?: UnifiedConversation[]; next?: string | null; count?: number }>; pageParams: number[] }>(
        { queryKey: socialKeys.conversations() },
        (old) => {
          if (!old?.pages) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              results: page.results?.filter(
                (conv) => !archivingKeys.has(`${String(conv.platform)}|${conv.account_id}|${conv.sender_id}`)
              ),
            })),
          };
        }
      );

      return { prevUnreadCount };
    },
    onError: (_err, _vars, context) => {
      if (context?.prevUnreadCount) {
        queryClient.setQueryData(socialKeys.unreadCount(), context.prevUnreadCount);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: socialKeys.conversations() });
      queryClient.invalidateQueries({ queryKey: socialKeys.unreadCount() });
    },
  });
}

/**
 * Hook to unarchive (restore) one or more conversations from history.
 */
export function useUnarchiveConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversations: ArchiveConversationRequest[]) => {
      const response = await axios.post<UnarchiveResponse>('/api/social/conversations/unarchive/', { conversations });
      return response.data;
    },
    onMutate: async (conversations) => {
      await queryClient.cancelQueries({ queryKey: socialKeys.conversations() });

      // Build a set of unarchive keys (see useArchiveConversation for why we
      // match on sender_id+account_id+platform).
      const unarchivingKeys = new Set(
        conversations.map((c) => `${c.platform}|${c.account_id}|${c.conversation_id}`)
      );

      // Optimistically remove from the archived conversations list (if viewing archived)
      queryClient.setQueriesData<{ pages: Array<{ results?: UnifiedConversation[]; next?: string | null; count?: number }>; pageParams: number[] }>(
        { queryKey: socialKeys.conversations() },
        (old) => {
          if (!old?.pages) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              results: page.results?.filter(
                (conv) => !unarchivingKeys.has(`${String(conv.platform)}|${conv.account_id}|${conv.sender_id}`)
              ),
            })),
          };
        }
      );
    },
    onSettled: () => {
      // Sync with server - invalidate all conversation lists to refresh both archived and inbox
      queryClient.invalidateQueries({ queryKey: socialKeys.conversations() });
    },
  });
}

/**
 * Hook to archive all conversations (move everything to history).
 */
export function useArchiveAllConversations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (platform: string = 'all') => {
      const response = await axios.post<ArchiveResponse>('/api/social/conversations/archive-all/', { platform });
      return response.data;
    },
    onSuccess: () => {
      // Invalidate conversations and unread count
      queryClient.invalidateQueries({ queryKey: socialKeys.conversations() });
      queryClient.invalidateQueries({ queryKey: socialKeys.unreadCount() });
    },
  });
}

// ============================================================================
// MESSAGING WINDOW (24-hour check)
// ============================================================================

export interface MessagingWindowStatus {
  window_open: boolean;
  hours_remaining: number | null;
  last_user_message_at?: string;
  hours_passed?: number;
  message?: string;
}

export function useMessagingWindow(
  platform: string,
  conversationId: string,
  accountId: string,
  options?: { enabled?: boolean }
) {
  return useQuery<MessagingWindowStatus>({
    queryKey: socialKeys.messagingWindow(platform, conversationId, accountId),
    queryFn: async () => {
      const response = await axios.get('/api/social/messaging-window/', {
        params: { platform, conversation_id: conversationId, account_id: accountId },
      });
      return response.data;
    },
    enabled: options?.enabled ?? true,
    staleTime: 60 * 1000, // Fresh for 1 minute
    refetchInterval: 60 * 1000, // Re-check every minute
  });
}

// ============================================================================
// CLEAR PLATFORM HISTORY
// ============================================================================

export function useClearPlatformHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (platform: 'facebook' | 'instagram' | 'whatsapp') => {
      const response = await axios.post('/api/social/clear-history/', { platform });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: socialKeys.conversations() });
      queryClient.invalidateQueries({ queryKey: socialKeys.facebookMessages() });
      queryClient.invalidateQueries({ queryKey: socialKeys.instagramMessages() });
      queryClient.invalidateQueries({ queryKey: socialKeys.whatsappMessages() });
      queryClient.invalidateQueries({ queryKey: socialKeys.unreadCount() });
    },
  });
}

// ============================================================================
// WIDGET CONNECTIONS (Website chat widget)
// ============================================================================
//
// The generated API helpers (widgetAdminConnections*) return `any`, so we
// wrap them with typed axios calls using the generated interfaces. These hooks
// power the "Website widget" tab in `/settings/social/connections`.
//

export function useWidgetConnections() {
  return useQuery<WidgetConnection[]>({
    queryKey: socialKeys.widgetConnections(),
    queryFn: async () => {
      const response = await axios.get('/api/widget/admin/connections/');
      // DRF returns {count, next, previous, results} (or may return a bare array).
      if (Array.isArray(response.data)) return response.data as WidgetConnection[];
      return (response.data?.results ?? []) as WidgetConnection[];
    },
    staleTime: 30 * 1000,
  });
}

export function useCreateWidgetConnection() {
  const queryClient = useQueryClient();
  return useMutation<WidgetConnection, unknown, Partial<WidgetConnectionRequest>>({
    mutationFn: async (data) => {
      const response = await axios.post<WidgetConnection>(
        '/api/widget/admin/connections/',
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: socialKeys.widgetConnections() });
    },
  });
}

export function useUpdateWidgetConnection() {
  const queryClient = useQueryClient();
  return useMutation<
    WidgetConnection,
    unknown,
    { id: number; data: Partial<PatchedWidgetConnectionRequest> }
  >({
    mutationFn: async ({ id, data }) => {
      const response = await axios.patch<WidgetConnection>(
        `/api/widget/admin/connections/${id}/`,
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: socialKeys.widgetConnections() });
    },
  });
}

export function useDeleteWidgetConnection() {
  const queryClient = useQueryClient();
  return useMutation<void, unknown, number>({
    mutationFn: async (id) => {
      await axios.delete(`/api/widget/admin/connections/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: socialKeys.widgetConnections() });
    },
  });
}

// Re-export types for convenience
export type { UnifiedConversation, PaginatedUnifiedConversation };
export type { WidgetConnection, WidgetConnectionRequest, PatchedWidgetConnectionRequest };
