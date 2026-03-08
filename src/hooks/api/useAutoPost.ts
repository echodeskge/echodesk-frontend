"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '@/api/axios';

// Types
export interface AutoPostSettings {
  id: number;
  is_enabled: boolean;
  company_description: string;
  posting_time: string;
  timezone: string;
  post_to_facebook: boolean;
  post_to_instagram: boolean;
  tone: string;
  content_source: string;
  content_language: string;
  require_approval: boolean;
  max_posts_per_day: number;
  created_at: string;
  updated_at: string;
}

export interface AutoPostContent {
  id: number;
  status: 'draft' | 'approved' | 'published' | 'failed' | 'rejected';
  facebook_text: string;
  instagram_text: string;
  image_url: string | null;
  featured_product: number | null;
  featured_product_name: string | null;
  target_facebook: boolean;
  target_instagram: boolean;
  scheduled_for: string;
  facebook_post_id: string | null;
  instagram_media_id: string | null;
  published_at: string | null;
  error_message: string;
  ai_model_used: string;
  approved_by: number | null;
  approved_by_name: string | null;
  approved_at: string | null;
  rejected_by: number | null;
  rejected_by_name: string | null;
  rejected_at: string | null;
  rejection_reason: string;
  created_at: string;
  updated_at: string;
}

export interface PublishingStatus {
  facebook_pages: {
    id: number;
    page_id: string;
    page_name: string;
    has_publishing_permission: boolean;
  }[];
  instagram_accounts: {
    id: number;
    instagram_account_id: string;
    username: string;
    has_publishing_permission: boolean;
  }[];
}

export interface PaginatedAutoPostList {
  count: number;
  next: string | null;
  previous: string | null;
  results: AutoPostContent[];
}

// Query keys
export const autoPostKeys = {
  all: ['autoPost'] as const,
  settings: () => [...autoPostKeys.all, 'settings'] as const,
  publishingStatus: () => [...autoPostKeys.all, 'publishingStatus'] as const,
  lists: () => [...autoPostKeys.all, 'list'] as const,
  list: (filters: { status?: string; page?: number }) => [...autoPostKeys.lists(), filters] as const,
  details: () => [...autoPostKeys.all, 'detail'] as const,
  detail: (id: number) => [...autoPostKeys.details(), id] as const,
};

// Hooks
export function useAutoPostSettings() {
  return useQuery<AutoPostSettings>({
    queryKey: autoPostKeys.settings(),
    queryFn: async () => {
      const response = await axios.get('/api/social/auto-post/settings/');
      return response.data;
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useUpdateAutoPostSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<AutoPostSettings>) => {
      const response = await axios.put('/api/social/auto-post/settings/', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: autoPostKeys.settings() });
    },
  });
}

export function usePublishingStatus() {
  return useQuery<PublishingStatus>({
    queryKey: autoPostKeys.publishingStatus(),
    queryFn: async () => {
      const response = await axios.get('/api/social/auto-post/publishing-status/');
      return response.data;
    },
    staleTime: 60 * 1000,
  });
}

export function useAutoPostList(filters: { status?: string; page?: number } = {}) {
  return useQuery<PaginatedAutoPostList>({
    queryKey: autoPostKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.page) params.append('page', String(filters.page));
      const response = await axios.get(`/api/social/auto-post/list/?${params.toString()}`);
      return response.data;
    },
    staleTime: 30 * 1000,
  });
}

export function useAutoPostDetail(id: number) {
  return useQuery<AutoPostContent>({
    queryKey: autoPostKeys.detail(id),
    queryFn: async () => {
      const response = await axios.get(`/api/social/auto-post/${id}/`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useApprovePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await axios.post(`/api/social/auto-post/${id}/approve/`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: autoPostKeys.lists() });
    },
  });
}

export function useRejectPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason?: string }) => {
      const response = await axios.post(`/api/social/auto-post/${id}/reject/`, { reason });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: autoPostKeys.lists() });
    },
  });
}

export function useEditPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<AutoPostContent> }) => {
      const response = await axios.put(`/api/social/auto-post/${id}/edit/`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: autoPostKeys.lists() });
    },
  });
}

export function useGeneratePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const response = await axios.post('/api/social/auto-post/generate/');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: autoPostKeys.lists() });
    },
  });
}

export function usePublishPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await axios.post(`/api/social/auto-post/${id}/publish/`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: autoPostKeys.lists() });
    },
  });
}

export function useStartPublishingOAuth() {
  return useMutation({
    mutationFn: async () => {
      const response = await axios.get('/api/social/facebook/oauth/start-publishing/');
      return response.data;
    },
  });
}
