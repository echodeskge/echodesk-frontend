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
};

// ============================================================================
// UNREAD MESSAGES COUNT
// ============================================================================

export interface UnreadMessagesCount {
  total: number;
  facebook: number;
  instagram: number;
  whatsapp: number;
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
    mutationFn: async (data: { platform: 'facebook' | 'instagram' | 'whatsapp'; conversation_id: string }) => {
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
    mutationFn: async (data: { platform: 'facebook' | 'instagram' | 'whatsapp'; conversation_id: string }) => {
      const response = await axios.delete('/api/social/delete-conversation/', { data });
      return response.data;
    },
    onSuccess: () => {
      // Invalidate all message queries to refresh the conversation list
      queryClient.invalidateQueries({ queryKey: socialKeys.facebookMessages() });
      queryClient.invalidateQueries({ queryKey: socialKeys.instagramMessages() });
      queryClient.invalidateQueries({ queryKey: socialKeys.whatsappMessages() });
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
    staleTime: 2 * 60 * 1000, // Consider data fresh for 2 minutes
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });
}

export function useUpdateSocialSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Pick<SocialSettings, 'refresh_interval' | 'chat_assignment_enabled'>>) => {
      const response = await axios.patch('/api/social/settings/', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: socialKeys.settings() });
    },
  });
}

// ============================================================================
// CHAT ASSIGNMENT HOOKS
// ============================================================================

export type ChatAssignmentPlatform = 'facebook' | 'instagram' | 'whatsapp';
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
  platform: 'facebook' | 'instagram' | 'whatsapp';
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
