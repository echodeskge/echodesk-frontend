import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketsDestroy, ticketsPartialUpdate, moveTicketToColumn } from '@/api/generated/api';
import { toast } from 'sonner';
import type { PatchedTicketRequest } from '@/api/generated/interfaces';

// Update a ticket
export function useUpdateTicket(boardId?: number | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: PatchedTicketRequest }) =>
      ticketsPartialUpdate(id, data),
    onSuccess: () => {
      // Invalidate the specific board's query
      if (boardId) {
        queryClient.invalidateQueries({ queryKey: ['kanbanBoard', boardId] });
      } else {
        // Fallback to invalidating all kanbanBoard queries
        queryClient.invalidateQueries({ queryKey: ['kanbanBoard'] });
      }
    },
    onError: (error: any) => {
      console.error('Error updating ticket:', error);
      toast.error(error.response?.data?.detail || 'Failed to update ticket');
    },
  });
}

// Delete a ticket
export function useDeleteTicket(boardId?: number | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ticketId: number) => ticketsDestroy(ticketId),
    onSuccess: () => {
      // Invalidate the specific board's query
      if (boardId) {
        queryClient.invalidateQueries({ queryKey: ['kanbanBoard', boardId] });
      } else {
        // Fallback to invalidating all kanbanBoard queries
        queryClient.invalidateQueries({ queryKey: ['kanbanBoard'] });
      }
      toast.success('Ticket deleted successfully');
    },
    onError: (error: any) => {
      console.error('Error deleting ticket:', error);
      toast.error(error.response?.data?.detail || 'Failed to delete ticket');
    },
  });
}

// Move a ticket to a column (with time tracking support)
export function useMoveTicketToColumn(boardId?: number | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { column_id: number; position_in_column: number } }) => {
      const axios = (await import('@/api/axios')).default;
      const response = await axios.patch(`/api/tickets/${id}/move_to_column/`, data);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate the specific board's query
      if (boardId) {
        queryClient.invalidateQueries({ queryKey: ['kanbanBoard', boardId] });
      } else {
        // Fallback to invalidating all kanbanBoard queries
        queryClient.invalidateQueries({ queryKey: ['kanbanBoard'] });
      }
    },
    onError: (error: any) => {
      console.error('Error moving ticket:', error);
      toast.error(error.response?.data?.detail || 'Failed to move ticket');
    },
  });
}
