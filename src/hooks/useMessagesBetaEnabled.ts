"use client";

import { useMemo } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";

const FEATURE_KEY = "messages_beta";

/**
 * Gates access to the socket-driven /messages-beta inbox.
 *
 * The flag lives on the user's group `feature_keys` (same pattern as
 * `ip_calling` — see CallContext for the reference implementation). To opt a
 * tenant in, add "messages_beta" to the group's feature_keys JSON array on
 * the backend; superusers always have access for dogfooding.
 *
 * The default-off behavior is the whole point: prod tenants never see the
 * beta route until we flip them on explicitly.
 */
export function useMessagesBetaEnabled(): boolean {
  const { user } = useAuth();
  const { data: userProfile } = useUserProfile();

  return useMemo(() => {
    if (user?.is_staff || user?.is_superuser) return true;

    const profile = userProfile as Record<string, unknown> | undefined;
    const raw = profile?.feature_keys;
    if (!raw) return false;

    let keys: string[] = [];
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) keys = parsed;
      } catch {
        return false;
      }
    } else if (Array.isArray(raw)) {
      keys = raw as string[];
    }

    return keys.includes(FEATURE_KEY);
  }, [user, userProfile]);
}
