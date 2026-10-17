/**
 * Permission checks that match the backend's `user.has_permission(codename)`.
 *
 * /api/auth/profile/ returns `permissions_list` (and `all_permissions`) as
 * bare codenames such as "manage_settings" or "view_reports", with role
 * grants already folded in. permissionService.hasPermission() expects the
 * legacy "can_*" names and treats a non-empty list without them as a final
 * "no", so gates that must agree with the backend use these helpers instead.
 */
export interface ProfilePermissionFields {
  is_staff?: boolean
  is_superuser?: boolean
  permissions_list?: unknown
  all_permissions?: unknown
}

/** Strip the legacy "can_" prefix: "can_manage_settings" -> "manage_settings". */
export function toCodename(permission: string): string {
  return permission.startsWith("can_") ? permission.slice(4) : permission
}

export function profileCodenames(profile: ProfilePermissionFields | null | undefined): Set<string> {
  const list = Array.isArray(profile?.permissions_list)
    ? profile!.permissions_list
    : Array.isArray(profile?.all_permissions)
      ? profile!.all_permissions
      : []
  return new Set((list as unknown[]).filter((p): p is string => typeof p === "string").map(toCodename))
}

/** Backend has_permission(): superusers hold everything; staff do NOT (callers add that bypass). */
export function profileHasPermission(
  profile: ProfilePermissionFields | null | undefined,
  permission: string
): boolean {
  if (profile?.is_superuser) return true
  return profileCodenames(profile).has(toCodename(permission))
}

export function isStaffOrSuperuser(profile: ProfilePermissionFields | null | undefined): boolean {
  return Boolean(profile?.is_staff || profile?.is_superuser)
}

/** crm/permissions.py is_pbx_admin: staff, superuser or manage_settings. */
export function isPbxAdmin(profile: ProfilePermissionFields | null | undefined): boolean {
  return isStaffOrSuperuser(profile) || profileHasPermission(profile, "manage_settings")
}

/** crm/permissions.py can_view_call_stats: PBX admin or view_reports. */
export function canViewCallStats(profile: ProfilePermissionFields | null | undefined): boolean {
  return isPbxAdmin(profile) || profileHasPermission(profile, "view_reports")
}
