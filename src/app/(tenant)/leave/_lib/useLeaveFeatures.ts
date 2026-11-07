"use client"

import { useQuery } from "@tanstack/react-query"
import type { User } from "@/api/generated/interfaces"
import { authService } from "@/services/auth"
import type { LeaveFeatures } from "./hr-api"

/** Read the HR switches from a profile payload (the generated type lacks them). */
export function profileLeaveFeatures(profile: unknown): LeaveFeatures | null {
  const lf = (profile as { leave_features?: LeaveFeatures | null } | null | undefined)?.leave_features
  return lf ?? null
}

/**
 * HR feature switches + leave roles of the signed-in user, from the shared
 * ['userProfile'] cache (GET /api/auth/profile/).
 */
export function useLeaveFeatures() {
  const { data: profile, isLoading, refetch } = useQuery<User>({
    queryKey: ["userProfile"],
    queryFn: () => authService.getProfile(),
    enabled: authService.isAuthenticated(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })
  const p = profile as unknown as
    | { id?: number; is_staff?: boolean; is_superuser?: boolean; is_leave_manager?: boolean }
    | undefined
  const features = profileLeaveFeatures(profile)
  const isStaff = Boolean(p?.is_staff || p?.is_superuser)
  return {
    loaded: !!profile,
    isLoading,
    refetch,
    userId: p?.id,
    features,
    isStaff,
    isLeaveManager: Boolean(p?.is_leave_manager) || isStaff,
  }
}
