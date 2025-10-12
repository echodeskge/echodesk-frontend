import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketsDestroy } from '@/api/generated/api';
import { toast } from 'sonner';

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
