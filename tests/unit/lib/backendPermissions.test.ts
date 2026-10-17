/**
 * The PBX / Calls settings gates must match crm/permissions.py
 * (is_pbx_admin / can_view_call_stats), which read user.has_permission()
 * with bare codenames, as /api/auth/profile/ returns them.
 */
import { describe, it, expect } from "vitest";
import {
  canViewCallStats,
  isPbxAdmin,
  profileHasPermission,
} from "@/lib/backendPermissions";
import { permissionService } from "@/services/permissionService";

const roleAdmin = {
  id: 1,
  is_staff: false,
  is_superuser: false,
  // role=admin grants, as tenant_profile returns them
  permissions_list: ["manage_groups", "manage_settings", "manage_users", "view_reports"],
  all_permissions: ["manage_groups", "manage_settings", "manage_users", "view_reports"],
};
const manager = {
  id: 2,
  is_staff: false,
  is_superuser: false,
  permissions_list: ["view_all_tickets", "view_reports"],
  all_permissions: ["view_all_tickets", "view_reports"],
};
const agent = { id: 3, is_staff: false, is_superuser: false, permissions_list: [], all_permissions: [] };

describe("backendPermissions", () => {
  it("treats manage_settings holders (role admin) as PBX admins", () => {
    expect(isPbxAdmin(roleAdmin)).toBe(true);
    expect(canViewCallStats(roleAdmin)).toBe(true);
  });

  it("lets view_reports managers see call statistics only", () => {
    expect(isPbxAdmin(manager)).toBe(false);
    expect(canViewCallStats(manager)).toBe(true);
  });

  it("denies plain agents, allows staff and superusers", () => {
    expect(isPbxAdmin(agent)).toBe(false);
    expect(canViewCallStats(agent)).toBe(false);
    expect(isPbxAdmin({ ...agent, is_staff: true })).toBe(true);
    expect(canViewCallStats({ ...agent, is_superuser: true })).toBe(true);
  });

  it("accepts legacy can_* names and falls back to all_permissions", () => {
    expect(profileHasPermission({ all_permissions: ["manage_settings"] }, "can_manage_settings")).toBe(true);
    expect(profileHasPermission({ permissions_list: ["view_reports"] }, "manage_settings")).toBe(false);
    expect(profileHasPermission(null, "manage_settings")).toBe(false);
  });

  it("documents why permissionService is not used for these gates", () => {
    // Bare codenames make permissionService give a final "no" for can_* names.
    expect(permissionService.hasPermission(roleAdmin as never, "can_manage_settings")).toBe(false);
  });
});
