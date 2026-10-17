import { useQuery } from '@tanstack/react-query';
import { usersRetrieve } from '@/api/generated/api';
import type { User, UserDirectory } from '@/api/generated/interfaces';
import { authService } from '@/services/auth';
import { profileHasPermission } from '@/lib/backendPermissions';

export type TenantRole = 'admin' | 'manager' | 'agent' | 'viewer';

/** Role ranks used by the backend's role-change guard (users/views.py). */
const ROLE_RANK: Record<TenantRole, number> = { viewer: 0, agent: 1, manager: 2, admin: 3 };

/**
 * What the signed-in user may do, mirroring the backend permission checks so
 * the UI can hide actions that would only come back as 403.
 *
 * - is_staff / is_superuser and `permissions_list` (flat codenames, role
 *   grants included) come from /api/auth/profile/.
 * - The tenant role is not on the profile payload, so it is read from the
 *   user's own slim directory row (/api/users/{id}/?lite=1).
 *
 * The backend stays the source of truth: these flags only decide what to
 * show, and every call still surfaces the backend's error message.
 */
export function useMyAccess() {
  // Shares the ['userProfile'] cache with useUserProfile, but without its
  // refetchOnMount: 'always', so every gated button doesn't refetch the profile.
  const { data: profile } = useQuery<User>({
    queryKey: ['userProfile'],
    queryFn: () => authService.getProfile(),
    enabled: authService.isAuthenticated(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
  const p = profile as unknown as
    | {
        id?: number;
        is_staff?: boolean;
        is_superuser?: boolean;
        permissions_list?: string[];
        all_permissions?: unknown;
      }
    | undefined;
  const userId = p?.id;

  const { data: me } = useQuery({
    queryKey: ['users', 'me', 'lite', userId],
    queryFn: async () => (await usersRetrieve(userId as number, true)) as unknown as UserDirectory,
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });

  const isSuperuser = Boolean(p?.is_superuser);
  const isStaff = Boolean(p?.is_staff);
  const role = (me?.role as TenantRole | undefined) ?? null;
  /** Backend `user.has_permission(codename)` (individual flag or role grant). */
  const has = (codename: string) => profileHasPermission(p, codename);
  const isRole = (...roles: TenantRole[]) => role !== null && roles.includes(role);
  const isStaffOrSuperuser = isStaff || isSuperuser;

  return {
    loaded: !!profile,
    userId,
    isSuperuser,
    isStaff,
    isStaffOrSuperuser,
    role,
    roleRank: role ? ROLE_RANK[role] : -1,
    has,
    /** booking_management is_booking_admin: catalog, settings, hard deletes. */
    isBookingAdmin: isStaffOrSuperuser || isRole('admin', 'manager'),
    /** ecommerce_crm manager: refunds, mark-paid, paid-order cancel, deletes, customer edits. */
    isEcommerceManager: isStaffOrSuperuser || isRole('admin', 'manager') || has('access_orders'),
    /** ecommerce_crm store admin: settings, languages, homepage builder writes. */
    isStoreAdmin: isStaffOrSuperuser || isRole('admin') || has('manage_settings'),
    /** Social clients delete / custom-field writes. */
    canManageSocialSettings: isStaffOrSuperuser || isRole('admin') || has('manage_social_settings'),
    /** Assigning tenant groups (feature keys) to users. */
    canManageGroups: isStaffOrSuperuser || has('manage_groups'),
    /** Item lists, list items, ticket forms, tenant settings writes. */
    canManageSettings: isStaffOrSuperuser || has('manage_settings'),
    /** Saved cards, plan changes and paid features. */
    isBillingAdmin: isStaffOrSuperuser || isRole('admin'),
  };
}

export const TENANT_ROLE_RANK = ROLE_RANK;
