import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  columnsCreate,
  columnsUpdate,
  columnsPartialUpdate,
  columnsDestroy,
  columnsReorderCreate
} from '@/api/generated/api';
import type { TicketColumn, PatchedTicketColumnUpdate } from '@/api/generated/interfaces';
import { toast } from 'sonner';

// Create a new column
export function useCreateColumn(boardId?: number | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<TicketColumn>) => columnsCreate(data as any),
    onSuccess: () => {
      // Invalidate the specific board's query
      if (boardId) {
        queryClient.invalidateQueries({ queryKey: ['kanbanBoard', boardId] });
      } else {
        // Fallback to invalidating all kanbanBoard queries
        queryClient.invalidateQueries({ queryKey: ['kanbanBoard'] });
      }
      toast.success('Column created successfully');
    },
    onError: (error: any) => {
      console.error('Error creating column:', error);
      toast.error(error.response?.data?.detail || 'Failed to create column');
    },
  });
}

// Update a column
export function useUpdateColumn(boardId?: number | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<TicketColumn> }) =>
      columnsPartialUpdate(id, data as PatchedTicketColumnUpdate),
    onSuccess: () => {
      // Invalidate the specific board's query
      if (boardId) {
        queryClient.invalidateQueries({ queryKey: ['kanbanBoard', boardId] });
      } else {
        // Fallback to invalidating all kanbanBoard queries
        queryClient.invalidateQueries({ queryKey: ['kanbanBoard'] });
      }
      toast.success('Column updated successfully');
    },
    onError: (error: any) => {
      console.error('Error updating column:', error);
      toast.error(error.response?.data?.detail || 'Failed to update column');
    },
  });
}

// Delete a column
export function useDeleteColumn(boardId?: number | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => columnsDestroy(id),
    onSuccess: () => {
      // Invalidate the specific board's query
      if (boardId) {
        queryClient.invalidateQueries({ queryKey: ['kanbanBoard', boardId] });
      } else {
        // Fallback to invalidating all kanbanBoard queries
        queryClient.invalidateQueries({ queryKey: ['kanbanBoard'] });
      }
      toast.success('Column deleted successfully');
    },
    onError: (error: any) => {
      console.error('Error deleting column:', error);
      toast.error(error.response?.data?.detail || 'Failed to delete column');
    },
  });
}

// Reorder a column
export function useReorderColumn(boardId?: number | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { position: number } }) =>
      columnsReorderCreate(id, data as any),
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
      console.error('Error reordering column:', error);
      toast.error('Failed to reorder column');
    },
  });
}
