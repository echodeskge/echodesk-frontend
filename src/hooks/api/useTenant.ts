"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tenantGroupsList, tenantGroupsCreate, tenantGroupsPartialUpdate, tenantGroupsDestroy } from '@/api/generated';
import axios from '@/api/axios';
import { tenantService } from '@/services/tenantService';
import { authService } from '@/services/auth';
import type { TenantConfig } from '@/types/tenant';

// Query keys
export const tenantKeys = {
  all: ['tenant'] as const,
  config: (subdomain: string) => [...tenantKeys.all, 'config', subdomain] as const,
  settings: () => [...tenantKeys.all, 'settings'] as const,
  subscription: () => [...tenantKeys.all, 'subscription'] as const,
  groups: () => [...tenantKeys.all, 'groups'] as const,
  availableFeatures: () => [...tenantKeys.groups(), 'available-features'] as const,
};

// Queries
export function useTenantConfig(subdomain: string | null, options?: { enabled?: boolean }) {
  return useQuery<TenantConfig | null>({
    queryKey: tenantKeys.config(subdomain || '_no_subdomain'),
    queryFn: async () => {
      if (!subdomain) return null;
      return await tenantService.getTenantBySubdomain(subdomain);
    },
    enabled: options?.enabled !== false && !!subdomain,
    staleTime: 10 * 60 * 1000, // Consider data fresh for 10 minutes (tenant config rarely changes)
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
  });
}

export function useTenantSettings() {
  return useQuery({
    queryKey: tenantKeys.settings(),
    queryFn: async () => {
      const response = await axios.get('/api/tenant-settings/');
      return response.data;
    },
  });
}

export function useTenantSubscription(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: tenantKeys.subscription(),
    queryFn: async () => {
      const response = await axios.get('/api/subscription/me/');
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    enabled: options?.enabled ?? true, // Only fetch when enabled (default: true)
  });
}

export function useTenantGroups(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: tenantKeys.groups(),
    queryFn: () => tenantGroupsList(),
    // Only fetch when authenticated
    enabled: options?.enabled !== false && authService.isAuthenticated(),
    staleTime: 2 * 60 * 1000, // Consider data fresh for 2 minutes
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });
}

export function useAvailableFeatures() {
  return useQuery({
    queryKey: tenantKeys.availableFeatures(),
    queryFn: async () => {
      const response = await axios.get('/api/tenant-groups/available_features/');
      return response.data;
    },
  });
}

// Mutations
export function useUpdateTenantSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await axios.patch('/api/tenant-settings/', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKeys.settings() });
    },
  });
}

export function useUploadTenantLogo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await axios.post('/api/tenant-settings/upload-logo/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKeys.settings() });
    },
  });
}

export function useRemoveTenantLogo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await axios.delete('/api/tenant-settings/remove-logo/');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKeys.settings() });
    },
  });
}

export function useCreateTenantGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: tenantGroupsCreate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKeys.groups() });
    },
  });
}

export function useUpdateTenantGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      tenantGroupsPartialUpdate(Number(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKeys.groups() });
    },
  });
}

export function useDeleteTenantGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => tenantGroupsDestroy(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKeys.groups() });
    },
  });
}
