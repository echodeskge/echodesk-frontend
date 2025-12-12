"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '@/api/axios';
import {
  listInvoices
} from '@/api/generated';

// Query keys
export const paymentKeys = {
  all: ['payments'] as const,
  savedCard: () => [...paymentKeys.all, 'saved-card'] as const,
  packages: () => [...paymentKeys.all, 'packages'] as const,
  upgradePreview: (packageId?: number) => [...paymentKeys.all, 'upgrade-preview', packageId] as const,
  invoices: () => [...paymentKeys.all, 'invoices'] as const,
};

// Queries
export function useSavedCard() {
  return useQuery({
    queryKey: paymentKeys.savedCard(),
    queryFn: async () => {
      const response = await axios.get('/api/payments/saved-card/');
      return response.data;
    },
    retry: false, // Don't retry if no card is saved
  });
}

export function usePackages() {
  return useQuery({
    queryKey: paymentKeys.packages(),
    queryFn: async () => {
      const response = await axios.get('/api/packages/');
      return response.data;
    },
  });
}

// Mutations
export function useDeleteSavedCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await axios.delete('/api/payments/saved-card/delete/');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.savedCard() });
    },
  });
}

export function useManualPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { amount: number; package_id?: string }) => {
      const response = await axios.post('/api/payments/manual/', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.savedCard() });
    },
  });
}

export function useUpgradeSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { package_id: string }) => {
      const response = await axios.post('/api/subscription/upgrade/', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant', 'subscription'] });
    },
  });
}

// Upgrade preview query
export function useUpgradePreview(packageId?: number, enabled: boolean = false) {
  return useQuery({
    queryKey: paymentKeys.upgradePreview(packageId),
    queryFn: async () => {
      const response = await axios.get('/api/upgrade/preview/', {
        params: { package_id: packageId },
      });
      return response.data;
    },
    enabled: enabled && !!packageId, // Only fetch when enabled and packageId exists
    staleTime: 30 * 1000, // Preview data is fresh for 30 seconds
  });
}

// Immediate upgrade mutation
export function useImmediateUpgrade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { package_id: number }) => {
      const response = await axios.post('/api/upgrade/immediate/', data);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate subscription data after successful upgrade
      queryClient.invalidateQueries({ queryKey: ['tenant', 'subscription'] });
      queryClient.invalidateQueries({ queryKey: paymentKeys.packages() });
    },
  });
}

// Scheduled upgrade mutation
export function useScheduleUpgrade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { package_id: number; effective_date?: string }) => {
      const response = await axios.post('/api/upgrade/scheduled/', data);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate subscription data after scheduling upgrade
      queryClient.invalidateQueries({ queryKey: ['tenant', 'subscription'] });
    },
  });
}

// Cancel scheduled upgrade mutation
export function useCancelScheduledUpgrade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await axios.post('/api/upgrade/cancel-scheduled/');
      return response.data;
    },
    onSuccess: () => {
      // Invalidate subscription data after canceling upgrade
      queryClient.invalidateQueries({ queryKey: ['tenant', 'subscription'] });
    },
  });
}

// Invoices query
export function useInvoices() {
  return useQuery({
    queryKey: paymentKeys.invoices(),
    queryFn: () => listInvoices(),
    staleTime: 5 * 60 * 1000, // Invoices are fresh for 5 minutes
  });
}

// Add new card mutation
export function useAddNewCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { make_default?: boolean }) => {
      const response = await axios.post('/api/payments/saved-card/add/', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.savedCard() });
    },
  });
}

// Remove card mutation
export function useRemoveSavedCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { card_id: number }) => {
      const response = await axios.delete('/api/payments/saved-card/', { data });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.savedCard() });
    },
  });
}

// Set default card mutation
export function useSetDefaultCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { card_id: number }) => {
      const response = await axios.post('/api/payments/saved-card/set-default/', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.savedCard() });
    },
  });
}

// Reactivate subscription with payment mutation
export function useReactivateSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await axios.post('/api/payments/reactivate/');
      return response.data;
    },
    onSuccess: () => {
      // Invalidate subscription and saved card data after successful reactivation
      queryClient.invalidateQueries({ queryKey: ['tenant', 'subscription'] });
      queryClient.invalidateQueries({ queryKey: paymentKeys.savedCard() });
    },
  });
}
