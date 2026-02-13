"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  socialClientsList,
  socialClientsCreate,
  socialClientsRetrieve,
  socialClientsUpdate,
  socialClientsPartialUpdate,
  socialClientsDestroy,
  socialClientsCustomFieldsList,
  socialClientsCustomFieldsCreate,
  socialClientsCustomFieldsUpdate,
  socialClientsCustomFieldsDestroy,
} from '@/api/generated';
import type {
  SocialClient,
  SocialClientList,
  SocialClientCreateRequest,
  SocialClientCustomField,
  SocialClientCustomFieldRequest,
  PaginatedSocialClientListList,
  PaginatedSocialClientCustomFieldList,
  SocialAccount,
  PlatformEnum,
} from '@/api/generated';
import axios from '@/api/axios';

// Re-export types for convenience
export type {
  SocialClient,
  SocialClientList,
  SocialClientCreateRequest,
  SocialClientCustomField,
  SocialClientCustomFieldRequest,
  SocialAccount,
  PlatformEnum,
};

// Query keys
export const socialClientKeys = {
  all: ['socialClients'] as const,
  lists: () => [...socialClientKeys.all, 'list'] as const,
  list: (filters: SocialClientFilters) => [...socialClientKeys.lists(), filters] as const,
  details: () => [...socialClientKeys.all, 'detail'] as const,
  detail: (id: number) => [...socialClientKeys.details(), id] as const,
  byAccount: (platform: string, platformId: string, accountConnectionId: string) =>
    [...socialClientKeys.all, 'byAccount', platform, platformId, accountConnectionId] as const,
  customFields: () => [...socialClientKeys.all, 'customFields'] as const,
  customFieldList: (filters?: { is_active?: boolean }) => [...socialClientKeys.customFields(), filters] as const,
  bookingHistory: (id: number, filters?: BookingHistoryFilters) =>
    [...socialClientKeys.all, 'bookingHistory', id, filters] as const,
  bookingStats: (id: number) => [...socialClientKeys.all, 'bookingStats', id] as const,
};

// Aliases for unified client naming
export const clientKeys = socialClientKeys;

// Types
export interface SocialClientFilters {
  search?: string;
  platform?: string;
  page?: number;
  page_size?: number;
  is_booking_enabled?: boolean;
  client_type?: 'all' | 'booking' | 'social';
}

export interface BookingHistoryFilters {
  page?: number;
  page_size?: number;
}

export interface BookingStats {
  total: number;
  completed: number;
  upcoming: number;
  cancelled?: number;
  total_spent?: number;
}

export interface BookingHistoryItem {
  id: number;
  booking_number: string;
  service: {
    id: number;
    name: string | Record<string, string>;
  };
  staff?: {
    id: number;
    user: {
      first_name: string;
      last_name: string;
    };
  };
  date: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  payment_status: 'pending' | 'deposit_paid' | 'fully_paid' | 'failed' | 'refunded';
  total_amount: string;
  paid_amount: string;
}

export interface BookingHistoryResponse {
  results: BookingHistoryItem[];
  count: number;
  page: number;
  page_size: number;
}

export interface SocialClientByAccountResponse {
  found: boolean;
  client: SocialClient | null;
  social_account: SocialAccount | null;
}

export interface LinkAccountData {
  platform: 'facebook' | 'instagram' | 'whatsapp' | 'email' | 'tiktok';
  platform_id: string;
  account_connection_id: string;
  display_name?: string;
  username?: string;
  profile_pic_url?: string;
}

// ============================================================================
// SOCIAL CLIENTS HOOKS
// ============================================================================

/**
 * Fetch paginated list of social clients
 */
export function useSocialClients(filters: SocialClientFilters = {}) {
  return useQuery<PaginatedSocialClientListList>({
    queryKey: socialClientKeys.list(filters),
    queryFn: async () => {
      const response = await axios.get('/api/social/clients/', { params: filters });
      return response.data;
    },
  });
}

/**
 * Fetch a single social client by ID
 */
export function useSocialClient(id: number, options?: { enabled?: boolean }) {
  return useQuery<SocialClient>({
    queryKey: socialClientKeys.detail(id),
    queryFn: () => socialClientsRetrieve(id),
    enabled: options?.enabled ?? !!id,
  });
}

/**
 * Find a client by their social account details
 */
export function useSocialClientByAccount(
  platform: string,
  platformId: string,
  accountConnectionId: string,
  options?: { enabled?: boolean }
) {
  return useQuery<SocialClientByAccountResponse>({
    queryKey: socialClientKeys.byAccount(platform, platformId, accountConnectionId),
    queryFn: async () => {
      const response = await axios.get('/api/social/clients/by_account/', {
        params: {
          platform,
          platform_id: platformId,
          account_connection_id: accountConnectionId,
        },
      });
      return response.data;
    },
    enabled: options?.enabled ?? !!(platform && platformId && accountConnectionId),
  });
}

/**
 * Create a new social client
 */
export function useCreateSocialClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SocialClientCreateRequest) => socialClientsCreate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: socialClientKeys.lists() });
    },
  });
}

/**
 * Update an existing social client
 */
export function useUpdateSocialClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: SocialClientCreateRequest }) =>
      socialClientsUpdate(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: socialClientKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: socialClientKeys.lists() });
    },
  });
}

/**
 * Partially update a social client
 */
export function usePatchSocialClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<SocialClientCreateRequest> }) =>
      socialClientsPartialUpdate(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: socialClientKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: socialClientKeys.lists() });
    },
  });
}

/**
 * Delete a social client
 */
export function useDeleteSocialClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => socialClientsDestroy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: socialClientKeys.lists() });
    },
  });
}

/**
 * Link a social account to a client
 */
export function useLinkSocialAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clientId, data }: { clientId: number; data: LinkAccountData }) => {
      const response = await axios.post(`/api/social/clients/${clientId}/link_account/`, data);
      return response.data;
    },
    onSuccess: (_, { clientId, data }) => {
      queryClient.invalidateQueries({ queryKey: socialClientKeys.detail(clientId) });
      queryClient.invalidateQueries({ queryKey: socialClientKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: socialClientKeys.byAccount(data.platform, data.platform_id, data.account_connection_id),
      });
    },
  });
}

/**
 * Unlink a social account from a client
 */
export function useUnlinkSocialAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clientId, data }: { clientId: number; data: LinkAccountData }) => {
      const response = await axios.post(`/api/social/clients/${clientId}/unlink_account/`, data);
      return response.data;
    },
    onSuccess: (_, { clientId, data }) => {
      queryClient.invalidateQueries({ queryKey: socialClientKeys.detail(clientId) });
      queryClient.invalidateQueries({ queryKey: socialClientKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: socialClientKeys.byAccount(data.platform, data.platform_id, data.account_connection_id),
      });
    },
  });
}

// ============================================================================
// CUSTOM FIELDS HOOKS
// ============================================================================

/**
 * Fetch all custom field definitions
 */
export function useSocialClientCustomFields(options?: { is_active?: boolean }) {
  return useQuery<PaginatedSocialClientCustomFieldList>({
    queryKey: socialClientKeys.customFieldList(options),
    queryFn: async () => {
      const response = await axios.get('/api/social/clients/custom-fields/', {
        params: options,
      });
      return response.data;
    },
  });
}

/**
 * Create a new custom field definition
 */
export function useCreateSocialClientCustomField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SocialClientCustomFieldRequest) => socialClientsCustomFieldsCreate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: socialClientKeys.customFields() });
    },
  });
}

/**
 * Update a custom field definition
 */
export function useUpdateSocialClientCustomField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: SocialClientCustomFieldRequest }) =>
      socialClientsCustomFieldsUpdate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: socialClientKeys.customFields() });
    },
  });
}

/**
 * Delete a custom field definition
 */
export function useDeleteSocialClientCustomField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => socialClientsCustomFieldsDestroy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: socialClientKeys.customFields() });
    },
  });
}

/**
 * Reorder custom fields
 */
export function useReorderSocialClientCustomFields() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (items: { id: number; position: number }[]) => {
      const response = await axios.post('/api/social/clients/custom-fields/reorder/', { items });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: socialClientKeys.customFields() });
    },
  });
}

// ============================================================================
// BOOKING HISTORY HOOKS (for unified clients)
// ============================================================================

/**
 * Fetch booking history for a client
 */
export function useClientBookingHistory(
  clientId: number,
  filters: BookingHistoryFilters = {},
  options?: { enabled?: boolean }
) {
  return useQuery<BookingHistoryResponse>({
    queryKey: socialClientKeys.bookingHistory(clientId, filters),
    queryFn: async () => {
      const response = await axios.get(`/api/social/clients/${clientId}/booking_history/`, {
        params: filters,
      });
      return response.data;
    },
    enabled: options?.enabled ?? !!clientId,
  });
}

/**
 * Fetch booking statistics for a client
 */
export function useClientBookingStats(
  clientId: number,
  options?: { enabled?: boolean }
) {
  return useQuery<BookingStats>({
    queryKey: socialClientKeys.bookingStats(clientId),
    queryFn: async () => {
      const response = await axios.get(`/api/social/clients/${clientId}/booking_stats/`);
      return response.data;
    },
    enabled: options?.enabled ?? !!clientId,
  });
}

// ============================================================================
// UNIFIED CLIENT ALIASES (for cleaner naming in new code)
// ============================================================================

// Export aliases for unified client naming
export {
  useSocialClients as useClients,
  useSocialClient as useClient,
  useCreateSocialClient as useCreateClient,
  useUpdateSocialClient as useUpdateClient,
  usePatchSocialClient as usePatchClient,
  useDeleteSocialClient as useDeleteClient,
};
