/**
 * Who may see and use the softphone. One helper so CallContext, the dock
 * launcher, the call rail, `/calls`, the PBX settings layout and the nav all
 * agree (today each re-implements the check, and two of them `JSON.parse`
 * `feature_keys` unguarded).
 *
 * Mirrors the backend contract:
 *   tenant has `ip_calling`
 *   AND user has the feature key (or is staff / superuser)
 *   AND (`make_calls` permission or staff / superuser)  -> softphone
 */
import { useMemo } from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import {
  isStaffOrSuperuser,
  profileHasPermission,
  type ProfilePermissionFields,
} from '@/lib/backendPermissions';
import { parseFeatureKeys } from '@/lib/feature-keys';

// Dependency-free home: `@/lib/feature-keys` (for components that must not
// import the subscription / auth contexts). Re-exported for existing callers.
export { parseFeatureKeys };

export const CALLING_FEATURE = 'ip_calling';
export const MAKE_CALLS_PERMISSION = 'make_calls';

export interface CallingAccessUser extends ProfilePermissionFields {
  feature_keys?: unknown;
}

export interface CallingAccessInput {
  hasFeature: (feature: typeof CALLING_FEATURE) => boolean;
  /** `useAuth().user` */
  user: CallingAccessUser | null | undefined;
  /** `useUserProfile().data` */
  profile: CallingAccessUser | null | undefined;
}

export interface CallingAccess {
  /** The tenant's subscription includes `ip_calling`. */
  tenantHasCalling: boolean;
  /** The user holds the `ip_calling` feature key, or is staff / superuser. */
  userHasCalling: boolean;
  /** May register the softphone and place / answer calls. */
  canUseSoftphone: boolean;
  /** May open `/calls` and see call logs. */
  canViewCalls: boolean;
}

export const NO_CALLING_ACCESS: CallingAccess = Object.freeze({
  tenantHasCalling: false,
  userHasCalling: false,
  canUseSoftphone: false,
  canViewCalls: false,
});

export function callingAccess({ hasFeature, user, profile }: CallingAccessInput): CallingAccess {
  const tenantHasCalling = hasFeature(CALLING_FEATURE);
  const staff = isStaffOrSuperuser(user) || isStaffOrSuperuser(profile);

  // The profile is the fresher source; the auth user is what the app had at login.
  const rawKeys = profile?.feature_keys ?? user?.feature_keys;
  const keys = parseFeatureKeys(rawKeys);
  const userHasCalling = staff || keys.includes(CALLING_FEATURE);

  const mayMakeCalls =
    staff ||
    profileHasPermission(profile, MAKE_CALLS_PERMISSION) ||
    profileHasPermission(user, MAKE_CALLS_PERMISSION);

  const canViewCalls = tenantHasCalling && userHasCalling;
  const canUseSoftphone = canViewCalls && mayMakeCalls;

  return { tenantHasCalling, userHasCalling, canUseSoftphone, canViewCalls };
}

/** `callingAccess()` wired to the subscription, auth and profile contexts. */
export function useCallingAccess(): CallingAccess {
  const { hasFeature } = useSubscription();
  const { user } = useAuth();
  const { data: profile } = useUserProfile();
  // hasFeature is recreated on every SubscriptionProvider render; only its
  // answer for ip_calling matters here.
  const tenantHasCalling = hasFeature(CALLING_FEATURE);

  return useMemo(
    () =>
      callingAccess({
        hasFeature: () => tenantHasCalling,
        user,
        profile: profile as CallingAccessUser | undefined,
      }),
    [tenantHasCalling, user, profile]
  );
}
