import { useQuery } from '@tanstack/react-query';
import { boardsList } from '@/api/generated/api';
import type { Board } from '@/api/generated/interfaces';
import { authService } from '@/services/auth';

export const useBoards = () => {
  return useQuery<Board[]>({
    queryKey: ['boards'],
    queryFn: async () => {
      const response = await boardsList();
      // Backend handles board filtering based on user permissions
      // Frontend displays exactly what backend returns
      // NOTE: Backend should return unrestricted boards (no board_groups AND no board_users) to all users
      return response.results || [];
    },
    // Only fetch boards when user is authenticated
    enabled: authService.isAuthenticated(),
    staleTime: 2 * 60 * 1000, // Consider data fresh for 2 minutes
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });
};