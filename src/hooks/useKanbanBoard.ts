import { useQuery } from '@tanstack/react-query';
import { apiBoardsKanbanBoardRetrieve } from '@/api/generated/api';
import type { KanbanBoard } from '@/api/generated/interfaces';

export const useKanbanBoard = (boardId: number | null) => {
  return useQuery<KanbanBoard>({
    queryKey: ['kanbanBoard', boardId],
    queryFn: async () => {
      if (!boardId) throw new Error('Board ID is required');
      const response = await apiBoardsKanbanBoardRetrieve(boardId.toString());
      return response as unknown as KanbanBoard;
    },
    enabled: !!boardId, // Only run query if boardId exists
  });
};