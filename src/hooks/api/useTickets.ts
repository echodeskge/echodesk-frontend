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
};

// Queries
export function useTickets(filters?: Record<string, any>) {
  return useQuery({
    queryKey: ticketKeys.list(filters || {}),
    queryFn: () => ticketsList(...(filters ? [filters.assignedGroups, filters.assignedTo, filters.column, filters.createdBy, filters.ordering, filters.page, filters.priority, filters.search, filters.tags] : [])),
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds (tickets change frequently)
    gcTime: 2 * 60 * 1000, // Keep in cache for 2 minutes
  });
}

export function useTicket(id: string, enabled = true) {
  return useQuery({
    queryKey: ticketKeys.detail(id),
    queryFn: () => ticketsRetrieve(id),
    enabled: enabled && !!id,
    staleTime: 1 * 60 * 1000, // Consider data fresh for 1 minute
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
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
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds (kanban updates frequently)
    gcTime: 2 * 60 * 1000, // Keep in cache for 2 minutes
  });
}

export function useColumns() {
  return useQuery({
    queryKey: ticketKeys.columns,
    queryFn: () => columnsList(),
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes (columns rarely change)
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });
}

export function useTags() {
  return useQuery({
    queryKey: ticketKeys.tags,
    queryFn: () => tagsList(),
    staleTime: 2 * 60 * 1000, // Consider data fresh for 2 minutes (tags change occasionally)
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
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
