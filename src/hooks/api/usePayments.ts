"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '@/api/axios';

// Query keys
export const paymentKeys = {
  all: ['payments'] as const,
  savedCard: () => [...paymentKeys.all, 'saved-card'] as const,
  packages: () => [...paymentKeys.all, 'packages'] as const,
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
