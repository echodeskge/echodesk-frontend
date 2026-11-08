"use client";

/**
 * Screen-level ticket permissions from the user profile (plan §4.5, W107,
 * W109). They mirror the backend checks:
 *
 * - staff and superusers pass every gate (the backend bypasses for them);
 * - otherwise `has_permission(codename)` from `permissions_list`
 *   (superusers hold everything, see `profileHasPermission`);
 * - `set_default` is staff-only on the server;
 * - tags are open to every authenticated user (E26).
 *
 * Per-ticket rights come from `ticket.viewer_permissions`, not from here.
 */
import { useMemo } from "react";
import { useUserProfile } from "@/hooks/useUserProfile";
import {
  isStaffOrSuperuser,
  profileHasPermission,
  type ProfilePermissionFields,
} from "@/lib/backendPermissions";

export interface TicketPermissions {
  canCreateTicket: boolean;
  canDeleteTickets: boolean;
  canCreateBoard: boolean;
  canEditBoard: boolean;
  canDeleteBoard: boolean;
  canSetDefaultBoard: boolean;
  canManageColumns: boolean;
  canManageTags: true;
  hasSocialFeature: boolean;
  isStaff: boolean;
}

export type TicketPermissionProfile = ProfilePermissionFields & { feature_keys?: unknown };

export const NO_TICKET_PERMISSIONS: TicketPermissions = {
  canCreateTicket: false,
  canDeleteTickets: false,
  canCreateBoard: false,
  canEditBoard: false,
  canDeleteBoard: false,
  canSetDefaultBoard: false,
  canManageColumns: false,
  canManageTags: true,
  hasSocialFeature: false,
  isStaff: false,
};

function featureKeys(value: unknown): string[] {
  let keys = value;
  if (typeof keys === "string") {
    try {
      keys = JSON.parse(keys);
    } catch {
      return [];
    }
  }
  return Array.isArray(keys) ? keys.filter((k): k is string => typeof k === "string") : [];
}

export function computeTicketPermissions(profile: TicketPermissionProfile | null | undefined): TicketPermissions {
  if (!profile) return NO_TICKET_PERMISSIONS;
  const isStaff = isStaffOrSuperuser(profile);
  const can = (codename: string) => isStaff || profileHasPermission(profile, codename);
  return {
    canCreateTicket: can("create_tickets"),
    canDeleteTickets: can("delete_tickets"),
    canCreateBoard: can("create_boards"),
    canEditBoard: can("edit_boards"),
    canDeleteBoard: can("delete_boards"),
    canSetDefaultBoard: isStaff,
    canManageColumns: can("manage_columns"),
    canManageTags: true,
    // Features are never bypassed by staff on the server (User.has_feature).
    hasSocialFeature: featureKeys(profile.feature_keys).includes("social_integrations"),
    isStaff,
  };
}

export function useTicketPermissions(): TicketPermissions {
  const { data: profile } = useUserProfile();
  return useMemo(() => computeTicketPermissions(profile as TicketPermissionProfile | undefined), [profile]);
}
