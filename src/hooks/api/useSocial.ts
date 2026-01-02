"use client";

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
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
} from '@/api/generated';
import type {
  EmailMessage as GeneratedEmailMessage,
  EmailDraft as GeneratedEmailDraft,
  PaginatedEmailMessageList,
  EmailDraftRequest,
  PatchedEmailDraftRequest,
} from '@/api/generated';
import axios from '@/api/axios';

// Query keys
export const socialKeys = {
  all: ['social'] as const,
  unreadCount: () => [...socialKeys.all, 'unreadCount'] as const,
  settings: () => [...socialKeys.all, 'settings'] as const,
  assignments: () => [...socialKeys.all, 'assignments'] as const,
  myAssignments: () => [...socialKeys.assignments(), 'my'] as const,
  allAssignments: () => [...socialKeys.assignments(), 'all'] as const,
  assignmentStatus: (platform: string, conversationId: string, accountId: string) =>
    [...socialKeys.assignments(), 'status', platform, conversationId, accountId] as const,
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
  emailFolders: () => [...socialKeys.email(), 'folders'] as const,
  emailDrafts: () => [...socialKeys.email(), 'drafts'] as const,
  tiktok: () => [...socialKeys.all, 'tiktok'] as const,
  tiktokStatus: () => [...socialKeys.tiktok(), 'status'] as const,
  tiktokMessages: () => [...socialKeys.tiktok(), 'messages'] as const,
  tiktokMessagesList: (filters: Record<string, any>) => [...socialKeys.tiktokMessages(), filters] as const,
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
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchInterval: options?.refetchInterval ?? 30000, // Poll every 30 seconds by default
    enabled: options?.enabled ?? true,
  });
}

export function useMarkConversationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { platform: 'facebook' | 'instagram' | 'whatsapp' | 'email'; conversation_id: string }) => {
      const response = await axios.post('/api/social/mark-read/', data);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate unread count so it updates
      queryClient.invalidateQueries({ queryKey: socialKeys.unreadCount() });
    },
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { platform: 'facebook' | 'instagram' | 'whatsapp' | 'email'; conversation_id: string }) => {
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
}) {
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
    refetchInterval: 5000, // Auto-refresh every 5 seconds
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
    refetchInterval: 5000, // Auto-refresh every 5 seconds
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
}) {
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
    refetchInterval: 5000, // Auto-refresh every 5 seconds
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
    refetchInterval: 5000, // Auto-refresh every 5 seconds
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
}) {
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
    refetchInterval: 5000, // Auto-refresh every 5 seconds
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
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  });
}

export function useSendWhatsAppMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { to_number: string; message: string; waba_id: string }) => {
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

export interface SocialSettings {
  id: number;
  refresh_interval: number;
  chat_assignment_enabled: boolean;
  session_management_enabled: boolean;
  hide_assigned_chats: boolean;
  collect_customer_rating: boolean;
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
    mutationFn: async (data: Partial<Pick<SocialSettings, 'refresh_interval' | 'chat_assignment_enabled' | 'session_management_enabled' | 'hide_assigned_chats' | 'collect_customer_rating'>>) => {
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

export type ChatAssignmentPlatform = 'facebook' | 'instagram' | 'whatsapp' | 'email';
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
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchInterval: 30000, // Poll every 30 seconds
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
    staleTime: 10 * 1000, // Consider data fresh for 10 seconds
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: socialKeys.assignments() });
      queryClient.invalidateQueries({
        queryKey: socialKeys.assignmentStatus(variables.platform, variables.conversation_id, variables.account_id),
      });
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: socialKeys.assignments() });
      queryClient.invalidateQueries({
        queryKey: socialKeys.assignmentStatus(variables.platform, variables.conversation_id, variables.account_id),
      });
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
      queryClient.invalidateQueries({
        queryKey: socialKeys.assignmentStatus(variables.platform, variables.conversation_id, variables.account_id),
      });
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: socialKeys.assignments() });
      queryClient.invalidateQueries({
        queryKey: socialKeys.assignmentStatus(variables.platform, variables.conversation_id, variables.account_id),
      });
      // Also invalidate messages since a rating request message was sent
      queryClient.invalidateQueries({ queryKey: socialKeys.facebookMessages() });
      queryClient.invalidateQueries({ queryKey: socialKeys.instagramMessages() });
      queryClient.invalidateQueries({ queryKey: socialKeys.whatsappMessages() });
      queryClient.invalidateQueries({ queryKey: socialKeys.emailMessages() });
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
}

export interface RatingStatisticsResponse {
  start_date: string;
  end_date: string;
  overall: {
    total_ratings: number;
    average_rating: number;
  };
  users: RatingUserStats[];
}

export function useRatingStatistics(startDate?: string, endDate?: string) {
  return useQuery<RatingStatisticsResponse>({
    queryKey: [...socialKeys.all, 'ratingStatistics', startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      const response = await axios.get(`/api/social/rating-statistics/?${params.toString()}`);
      return response.data;
    },
    staleTime: 60 * 1000, // Consider data fresh for 1 minute
  });
}

// User chat sessions for investigation
export interface ChatSession {
  id: number;
  platform: 'facebook' | 'instagram' | 'whatsapp' | 'email';
  conversation_id: string;
  account_id: string;
  customer_name: string;
  rating: number | null;
  session_started_at: string | null;
  session_ended_at: string | null;
  created_at: string;
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

export function useUserChatSessions(userId: number | null, startDate?: string, endDate?: string) {
  return useQuery<UserChatSessionsResponse>({
    queryKey: [...socialKeys.all, 'userSessions', userId, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
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

export interface EmailConnectionDetail {
  id: number;
  email_address: string;
  display_name: string;
  imap_server: string;
  smtp_server: string;
  is_active: boolean;
  last_sync_at: string | null;
  last_sync_error: string;
  sync_folder: string;
  connected_at: string;
  signature_enabled?: boolean;
  signature_html?: string;
  signature_text?: string;
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
  message_ids: number[];
  action: 'mark_read' | 'mark_unread' | 'star' | 'unstar' | 'label' | 'unlabel' | 'move' | 'delete' | 'restore';
  label?: string;
  folder?: string;
}

// Email Status Query
export function useEmailStatus() {
  return useQuery<EmailConnectionStatus>({
    queryKey: socialKeys.emailStatus(),
    queryFn: async () => {
      return await socialEmailStatusRetrieve();
    },
    staleTime: 2 * 60 * 1000, // Consider data fresh for 2 minutes
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
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

// Email Folders Query
export function useEmailFolders() {
  return useQuery<EmailFolder[]>({
    queryKey: socialKeys.emailFolders(),
    queryFn: async () => {
      const response = await axios.get('/api/social/email-messages/folders/');
      return response.data as EmailFolder[];
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
      const response = await axios.post('/api/social/email/sync/',
        connectionId ? { connection_id: connectionId } : {}
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

// Update Email Connection (for signature settings)
export interface EmailConnectionUpdateRequest {
  connection_id: number;
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
  username: string;
  display_name: string;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TikTokStatus {
  connected: boolean;
  accounts_count: number;
  accounts: TikTokAccount[];
  messaging_available: boolean;
  messaging_note: string;
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
    refetchInterval: 5000,
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
    mutationFn: async (data: Partial<Pick<EmailSignature, 'signature_html' | 'signature_text' | 'is_enabled' | 'include_on_reply'>>) => {
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

export function useEmailSyncDebug() {
  return useQuery<EmailSyncDebugInfo>({
    queryKey: [...socialKeys.email(), 'syncDebug'],
    queryFn: async () => {
      const response = await axios.get('/api/social/email/sync/debug/');
      return response.data;
    },
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache
  });
}

export function useEmailSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await axios.post('/api/social/email/sync/');
      return response.data;
    },
    onSuccess: () => {
      // Invalidate email-related queries after sync
      queryClient.invalidateQueries({ queryKey: socialKeys.email() });
    },
  });
}

export function useUpdateEmailSyncSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (syncDaysBack: number) => {
      const response = await axios.post('/api/social/email/sync/settings/', {
        sync_days_back: syncDaysBack,
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
