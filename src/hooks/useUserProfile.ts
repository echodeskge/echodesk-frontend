import { useQuery } from '@tanstack/react-query';
import { authService } from '@/services/auth';
import type { User } from '@/api/generated/interfaces';

export const useUserProfile = () => {
  return useQuery<User>({
    queryKey: ['userProfile'],
    queryFn: async () => {
      return await authService.getProfile();
    },
  });
};