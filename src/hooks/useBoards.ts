import { useQuery } from '@tanstack/react-query';
import { apiBoardsList } from '@/api/generated/api';
import type { Board } from '@/api/generated/interfaces';

export const useBoards = () => {
  return useQuery<Board[]>({
    queryKey: ['boards'],
    queryFn: async () => {
      const response = await apiBoardsList();
      return response.results || [];
    },
    staleTime: 2 * 60 * 1000, // Consider data fresh for 2 minutes
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });
};