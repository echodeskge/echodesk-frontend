"use client";

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import {
  ticketsList,
  ticketsRetrieve,
  ticketsCreate,
  ticketsUpdate,
  ticketsPartialUpdate,
  ticketsDestroy,
  boardsList,
  boardsKanbanBoardRetrieve,
  columnsList,
  tagsList,
  tenantGroupsList,
} from '@/api/generated';
import axios from '@/api/axios';

// Query keys
export const ticketKeys = {
  all: ['tickets'] as const,
  lists: () => [...ticketKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...ticketKeys.lists(), filters] as const,
  details: () => [...ticketKeys.all, 'detail'] as const,
  detail: (id: string) => [...ticketKeys.details(), id] as const,
  history: (id: string) => [...ticketKeys.detail(id), 'history'] as const,
  boards: ['boards'] as const,
  board: (id: string) => [...ticketKeys.boards, id] as const,
  kanban: (id: string) => [...ticketKeys.boards, 'kanban', id] as const,
  columns: ['columns'] as const,
  tags: ['tags'] as const,
  groups: ['tenant-groups'] as const,
};

// Queries
export function useTickets(filters?: Record<string, any>) {
  return useQuery({
    queryKey: ticketKeys.list(filters || {}),
    queryFn: () => ticketsList(filters),
  });
}

export function useTicket(id: string, enabled = true) {
  return useQuery({
    queryKey: ticketKeys.detail(id),
    queryFn: () => ticketsRetrieve(id),
    enabled: enabled && !!id,
  });
}

export function useTicketHistory(ticketId: string, enabled = true) {
  return useQuery({
    queryKey: ticketKeys.history(ticketId),
    queryFn: async () => {
      const response = await axios.get(`/api/tickets/${ticketId}/history/`);
      return response.data;
    },
    enabled: enabled && !!ticketId,
  });
}

export function useBoards() {
  return useQuery({
    queryKey: ticketKeys.boards,
    queryFn: () => boardsList(),
  });
}

export function useKanbanBoard(boardId: string, enabled = true) {
  return useQuery({
    queryKey: ticketKeys.kanban(boardId),
    queryFn: () => boardsKanbanBoardRetrieve(boardId),
    enabled: enabled && !!boardId,
  });
}

export function useColumns() {
  return useQuery({
    queryKey: ticketKeys.columns,
    queryFn: () => columnsList(),
  });
}

export function useTags() {
  return useQuery({
    queryKey: ticketKeys.tags,
    queryFn: () => tagsList(),
  });
}

export function useTenantGroups() {
  return useQuery({
    queryKey: ticketKeys.groups,
    queryFn: () => tenantGroupsList(),
  });
}

// Mutations
export function useCreateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ticketsCreate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ticketKeys.boards });
    },
  });
}

export function useUpdateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      ticketsPartialUpdate(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ticketKeys.boards });
    },
  });
}

export function useMoveTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, columnId }: { id: string; columnId: string }) =>
      axios.patch(`/api/tickets/${id}/move_to_column/`, { column_id: columnId }),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ticketKeys.boards });
    },
  });
}

export function useDeleteTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => ticketsDestroy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ticketKeys.boards });
    },
  });
}

export function useAddComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ticketId, content }: { ticketId: string; content: string }) => {
      const response = await axios.post(`/api/tickets/${ticketId}/comments/`, { content });
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(variables.ticketId) });
      queryClient.invalidateQueries({ queryKey: [...ticketKeys.detail(variables.ticketId), 'comments'] });
    },
  });
}
