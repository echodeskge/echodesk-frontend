"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiTenantGroupsList, apiTenantGroupsCreate, apiTenantGroupsPartialUpdate, apiTenantGroupsDestroy } from '@/api/generated';
import axios from '@/api/axios';

// Query keys
export const tenantKeys = {
  all: ['tenant'] as const,
  settings: () => [...tenantKeys.all, 'settings'] as const,
  subscription: () => [...tenantKeys.all, 'subscription'] as const,
  groups: () => [...tenantKeys.all, 'groups'] as const,
  availableFeatures: () => [...tenantKeys.groups(), 'available-features'] as const,
};

// Queries
export function useTenantSettings() {
  return useQuery({
    queryKey: tenantKeys.settings(),
    queryFn: async () => {
      const response = await axios.get('/api/tenant-settings/');
      return response.data;
    },
  });
}

export function useTenantSubscription() {
  return useQuery({
    queryKey: tenantKeys.subscription(),
    queryFn: async () => {
      const response = await axios.get('/api/subscription/me/');
      return response.data;
    },
  });
}

export function useTenantGroups() {
  return useQuery({
    queryKey: tenantKeys.groups(),
    queryFn: () => apiTenantGroupsList(),
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
    mutationFn: apiTenantGroupsCreate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKeys.groups() });
    },
  });
}

export function useUpdateTenantGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiTenantGroupsPartialUpdate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKeys.groups() });
    },
  });
}

export function useDeleteTenantGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiTenantGroupsDestroy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKeys.groups() });
    },
  });
}
