import { useQuery } from '@tanstack/react-query';
import { apiBoardsList } from '@/api/generated/api';
import type { Board } from '@/api/generated/interfaces';
import { authService } from '@/services/authService';

export const useBoards = () => {
  return useQuery<Board[]>({
    queryKey: ['boards'],
    queryFn: async () => {
      const response = await apiBoardsList();
      const allBoards = response.results || [];

      // Get current user
      const currentUser = authService.getUser();
      if (!currentUser) {
        return allBoards; // If no user, return all boards (shouldn't happen in authenticated context)
      }

      // Filter boards to show:
      // 1. Boards with no restrictions (no board_users AND no board_groups) - available to everyone
      // 2. Boards where the current user is explicitly assigned (in board_users)
      // 3. Boards where the current user belongs to one of the board_groups
      const userBoards = allBoards.filter(board => {
        const hasUserRestrictions = board.board_users && board.board_users.length > 0;
        const hasGroupRestrictions = board.board_groups && board.board_groups.length > 0;

        // If board has no restrictions at all, it's available to everyone
        if (!hasUserRestrictions && !hasGroupRestrictions) {
          return true;
        }

        // Check if current user is directly assigned to the board
        if (hasUserRestrictions && board.board_users.some(user => user.id === currentUser.id)) {
          return true;
        }

        // Check if current user belongs to any of the board's groups
        if (hasGroupRestrictions && currentUser.groups) {
          const userGroupIds = new Set(currentUser.groups.map((g: any) => g.id));
          const boardHasUserGroup = board.board_groups.some(group => userGroupIds.has(group.id));
          if (boardHasUserGroup) {
            return true;
          }
        }

        return false;
      });

      return userBoards;
    },
    staleTime: 2 * 60 * 1000, // Consider data fresh for 2 minutes
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });
};