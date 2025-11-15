"use client";

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import {
  socialFacebookSendMessageCreate,
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
