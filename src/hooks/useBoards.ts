import { useQuery } from '@tanstack/react-query';
import { boardsList } from '@/api/generated/api';
import type { Board } from '@/api/generated/interfaces';

export const useBoards = () => {
  return useQuery<Board[]>({
    queryKey: ['boards'],
    queryFn: async () => {
      const response = await boardsList();
      return response.results || [];
    },
  });
};