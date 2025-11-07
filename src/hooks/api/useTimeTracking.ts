"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { timeLogsList } from '@/api/generated';
import axios from '@/api/axios';
import { ticketKeys } from './useTickets';

// Query keys
export const timeLogKeys = {
  all: ['time-logs'] as const,
  lists: () => [...timeLogKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...timeLogKeys.lists(), filters] as const,
};

// Queries
export function useTimeLogs(ticketId?: number) {
  return useQuery({
    queryKey: timeLogKeys.list({ ticket: ticketId }),
    queryFn: async () => {
      const response = await axios.get(`/api/time-logs/`, {
        params: ticketId ? { ticket: ticketId } : undefined,
      });
      return response.data;
    },
    enabled: !!ticketId,
  });
}

// Mutations
export function useCreateTimeLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      ticket: string;
      time_spent: string;
      description?: string;
    }) => {
      const response = await axios.post('/api/ticket-time-logs/', data);
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(variables.ticket) });
    },
  });
}

export function useUpdateTimeLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: {
        time_spent?: string;
        description?: string;
      };
    }) => {
      const response = await axios.patch(`/api/ticket-time-logs/${id}/`, data);
      return response.data;
    },
    onSuccess: (data) => {
      if (data.ticket) {
        queryClient.invalidateQueries({ queryKey: ticketKeys.detail(data.ticket) });
      }
    },
  });
}

export function useDeleteTimeLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ticketId }: { id: string; ticketId: string }) => {
      const response = await axios.delete(`/api/ticket-time-logs/${id}/`);
      return { data: response.data, ticketId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(result.ticketId) });
    },
  });
}
