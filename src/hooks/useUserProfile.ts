import { useQuery } from '@tanstack/react-query';
import { authService } from '@/services/auth';
import type { User } from '@/api/generated/interfaces';

export const useUserProfile = () => {
  return useQuery<User>({
    queryKey: ['userProfile'],
    queryFn: async () => {
      return await authService.getProfile();
    },
    // Only enable query if user is authenticated (has token)
    enabled: authService.isAuthenticated(),
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: 1, // Only retry once on failure for auth endpoints
    refetchOnWindowFocus: false, // Don't refetch on window focus - profile rarely changes
    refetchOnMount: false, // Don't refetch on mount if data exists in cache
  });
};