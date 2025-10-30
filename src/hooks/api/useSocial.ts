"use client";

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { apiSocialFacebookSendMessageCreate } from '@/api/generated';
import axios from '@/api/axios';

// Query keys
export const socialKeys = {
  all: ['social'] as const,
  facebook: () => [...socialKeys.all, 'facebook'] as const,
  facebookStatus: () => [...socialKeys.facebook(), 'status'] as const,
  facebookPages: () => [...socialKeys.facebook(), 'pages'] as const,
  facebookMessages: () => [...socialKeys.facebook(), 'messages'] as const,
  facebookMessagesList: (filters: Record<string, any>) => [...socialKeys.facebookMessages(), filters] as const,
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
    mutationFn: apiSocialFacebookSendMessageCreate,
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
