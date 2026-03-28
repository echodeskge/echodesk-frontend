/**
 * Tests for PermissionService.
 * Frontend counterpart of backend test_models.py TestUserPermissions:
 *   - Superuser bypass
 *   - Null user returns false
 *   - Group-based permissions
 *   - Role-based fallback (admin/manager/agent/viewer)
 *   - hasAnyPermission / hasAllPermissions
 *   - getSidebarMenuItems filters by featureKey
 *   - getRoleDisplayName
 *
 * Mock user objects satisfy the generated User interface from the backend schema.
 * Run `npm run generate` to refresh types from the backend.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  PermissionService,
  type MenuItem,
} from "@/services/permissionService";
import type {
  User,
  Group,
  Permission,
  TenantGroup,
  Department,
} from "@/api/generated/interfaces";

// Helper to create mock user profiles that satisfy the generated User interface.
// If the backend schema changes and `npm run generate` updates User,
// TypeScript will flag mismatches here at compile time.
function mockUser(overrides: Partial<User> & Record<string, any> = {}): User {
  const defaultDept: Department = {
    id: 1,
    name: "Default",
    is_active: true,
    employee_count: "0",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };

  return {
    id: 1,
    email: "test@test.com",
    first_name: "Test",
    last_name: "User",
    full_name: "Test User",
    role: "agent" as any,
    is_active: true,
    is_staff: false,
    is_booking_staff: "false",
    date_joined: "2024-01-01T00:00:00Z",
    last_login: "2024-01-01T00:00:00Z",
    permissions: "{}",
    group_permissions: "{}",
    all_permissions: "",
    feature_keys: "[]",
    groups: [] as Group[],
    tenant_groups: [] as TenantGroup[],
    department: defaultDept,
    ...overrides,
  } as User;
}

describe("PermissionService", () => {
  let service: PermissionService;

  beforeEach(() => {
    // Create fresh instance each test (avoid singleton cache issues)
    service = new PermissionService();
  });

  // -- Superuser bypass (mirrors backend test_has_permission_superuser_always_true) --

  describe("superuser bypass", () => {
    it("grants all permissions to superuser", () => {
      const su = mockUser({ is_superuser: true });
      expect(service.hasPermission(su, "can_access_tickets")).toBe(true);
      expect(service.hasPermission(su, "can_manage_settings")).toBe(true);
      expect(service.hasPermission(su, "nonexistent_perm")).toBe(true);
    });

    it("grants all features to superuser", () => {
      const su = mockUser({ is_superuser: true });
      expect(service.hasFeatureAccess(su, "ticket_management")).toBe(true);
      expect(service.hasFeatureAccess(su, "anything")).toBe(true);
    });
  });

  // -- Null user (mirrors safety checks) --

  describe("null user", () => {
    it("hasPermission returns false for null user", () => {
      expect(service.hasPermission(null, "can_access_tickets")).toBe(false);
    });

    it("hasFeatureAccess returns false for null user", () => {
      expect(service.hasFeatureAccess(null, "ticket_management")).toBe(false);
    });

    it("getSidebarMenuItems returns empty for null user", () => {
      const items: MenuItem[] = [
        { id: "test", label: "Test", icon: "T" },
      ];
      expect(service.getSidebarMenuItems(null, items)).toEqual([]);
    });

    it("getAllPermissions returns empty for null user", () => {
      expect(service.getAllPermissions(null)).toEqual({});
    });

    it("getRoleDisplayName returns Guest for null user", () => {
      expect(service.getRoleDisplayName(null)).toBe("Guest");
    });
  });

  // -- Group-based permissions (mirrors backend group permission checks) --

  describe("group-based permissions", () => {
    it("grants permission from group codenames", () => {
      const user = mockUser({
        groups: [
          {
            id: 1,
            name: "Agents",
            permissions: [
              { id: 1, codename: "tickets.view_ticket", name: "View Ticket", app_label: "tickets", model: "ticket" },
            ],
            user_count: "1",
          },
        ],
      });
      expect(service.hasPermission(user, "can_access_tickets")).toBe(true);
    });

    it("denies permission when group lacks codename", () => {
      const user = mockUser({
        groups: [
          {
            id: 1,
            name: "Limited",
            permissions: [
              { id: 1, codename: "orders.view_order", name: "View Order", app_label: "orders", model: "order" },
            ],
            user_count: "1",
          },
        ],
      });
      expect(service.hasPermission(user, "can_access_tickets")).toBe(false);
    });

    it("matches permissions without app prefix", () => {
      const user = mockUser({
        groups: [
          {
            id: 1,
            name: "Agents",
            permissions: [
              { id: 1, codename: "view_ticket", name: "View Ticket", app_label: "tickets", model: "ticket" },
            ],
            user_count: "1",
          },
        ],
      });
      expect(service.hasPermission(user, "can_access_tickets")).toBe(true);
    });
  });

  // -- Role-based defaults (mirrors backend test_has_permission_role_based_*) --

  describe("role-based fallback permissions", () => {
    it("admin has all standard permissions", () => {
      const admin = mockUser({ role: "admin" });
      expect(service.hasPermission(admin, "can_access_tickets")).toBe(true);
      expect(service.hasPermission(admin, "can_access_calls")).toBe(true);
      expect(service.hasPermission(admin, "can_access_orders")).toBe(true);
      expect(service.hasPermission(admin, "can_access_user_management")).toBe(
        true
      );
      expect(service.hasPermission(admin, "can_manage_settings")).toBe(true);
    });

    it("manager has tickets/calls/orders but not user_management", () => {
      const manager = mockUser({ role: "manager" });
      expect(service.hasPermission(manager, "can_access_tickets")).toBe(true);
      expect(service.hasPermission(manager, "can_access_calls")).toBe(true);
      expect(service.hasPermission(manager, "can_access_orders")).toBe(true);
      expect(
        service.hasPermission(manager, "can_access_user_management")
      ).toBe(false);
    });

    it("agent has tickets and calls only", () => {
      const agent = mockUser({ role: "agent" });
      expect(service.hasPermission(agent, "can_access_tickets")).toBe(true);
      expect(service.hasPermission(agent, "can_access_calls")).toBe(true);
      expect(service.hasPermission(agent, "can_access_orders")).toBe(false);
      expect(
        service.hasPermission(agent, "can_access_user_management")
      ).toBe(false);
    });

    it("viewer has only view_boards", () => {
      const viewer = mockUser({ role: "viewer" });
      expect(service.hasPermission(viewer, "can_view_boards")).toBe(true);
      expect(service.hasPermission(viewer, "can_access_tickets")).toBe(false);
      expect(service.hasPermission(viewer, "can_access_calls")).toBe(false);
    });

    it("unknown permission returns false", () => {
      const user = mockUser({ role: "agent" });
      expect(service.hasPermission(user, "totally_fake_permission")).toBe(
        false
      );
    });
  });

  // -- all_permissions JSON parsing --

  describe("all_permissions JSON field", () => {
    it("uses parsed all_permissions when available", () => {
      const user = mockUser({
        all_permissions: JSON.stringify({
          can_access_tickets: true,
          can_access_orders: false,
        }),
      });
      expect(service.hasPermission(user, "can_access_tickets")).toBe(true);
      expect(service.hasPermission(user, "can_access_orders")).toBe(false);
    });

    it("handles malformed JSON gracefully", () => {
      const user = mockUser({
        all_permissions: "not-valid-json{{{",
      });
      // Falls back to role-based
      expect(service.hasPermission(user, "can_access_tickets")).toBe(true); // agent role
    });
  });

  // -- hasAnyPermission / hasAllPermissions --

  describe("hasAnyPermission", () => {
    it("returns true if user has any of the listed permissions", () => {
      const agent = mockUser({ role: "agent" });
      expect(
        service.hasAnyPermission(agent, [
          "can_access_tickets",
          "can_manage_settings",
        ])
      ).toBe(true);
    });

    it("returns false if user has none", () => {
      const viewer = mockUser({ role: "viewer" });
      expect(
        service.hasAnyPermission(viewer, [
          "can_access_tickets",
          "can_manage_settings",
        ])
      ).toBe(false);
    });

    it("returns false for null user", () => {
      expect(
        service.hasAnyPermission(null, ["can_access_tickets"])
      ).toBe(false);
    });
  });

  describe("hasAllPermissions", () => {
    it("returns true if user has all listed permissions", () => {
      const admin = mockUser({ role: "admin" });
      expect(
        service.hasAllPermissions(admin, [
          "can_access_tickets",
          "can_access_calls",
        ])
      ).toBe(true);
    });

    it("returns false if user lacks one", () => {
      const agent = mockUser({ role: "agent" });
      expect(
        service.hasAllPermissions(agent, [
          "can_access_tickets",
          "can_access_orders",
        ])
      ).toBe(false);
    });
  });

  // -- getSidebarMenuItems (mirrors feature-based access control) --

  describe("getSidebarMenuItems", () => {
    const testMenuItems: MenuItem[] = [
      {
        id: "tickets",
        label: "Tickets",
        icon: "T",
        requiredFeatureKey: "ticket_management",
      },
      {
        id: "orders",
        label: "Orders",
        icon: "O",
        requiredFeatureKey: "order_management",
      },
      {
        id: "settings",
        label: "Settings",
        icon: "S",
        // No requiredFeatureKey - visible to all
      },
    ];

    it("superuser sees all items", () => {
      const su = mockUser({ is_superuser: true });
      const items = service.getSidebarMenuItems(su, testMenuItems);
      expect(items).toHaveLength(3);
    });

    it("filters by user feature keys from tenant_groups", () => {
      const user = mockUser({
        tenant_groups: [
          {
            id: 1,
            name: "Ticket Group",
            feature_keys: ["ticket_management"],
            features: [],
            is_active: true,
            created_at: "",
            updated_at: "",
            member_count: "1",
          },
        ],
      });
      const items = service.getSidebarMenuItems(user, testMenuItems);
      const ids = items.map((i) => i.id);
      expect(ids).toContain("tickets");
      expect(ids).toContain("settings"); // no feature key required
      expect(ids).not.toContain("orders");
    });

    it("items without requiredFeatureKey are always visible", () => {
      const user = mockUser(); // no feature keys
      const items = service.getSidebarMenuItems(user, testMenuItems);
      const ids = items.map((i) => i.id);
      expect(ids).toContain("settings");
      expect(ids).not.toContain("tickets");
    });
  });

  // -- getRoleDisplayName --

  describe("getRoleDisplayName", () => {
    it("returns Super Admin for superuser", () => {
      const su = mockUser({ is_superuser: true });
      expect(service.getRoleDisplayName(su)).toBe("Super Admin");
    });

    it("returns capitalized role name", () => {
      const admin = mockUser({ role: "admin" });
      expect(service.getRoleDisplayName(admin)).toBe("Admin");
    });

    it("returns User when no role", () => {
      const user = mockUser({ role: null });
      expect(service.getRoleDisplayName(user)).toBe("User");
    });
  });

  // -- Cache management --

  describe("cache", () => {
    it("clearCache does not throw", () => {
      expect(() => service.clearCache()).not.toThrow();
    });

    it("clearUserCache does not throw", () => {
      // Populate cache by checking permission
      const user = mockUser({
        all_permissions: JSON.stringify({ can_access_tickets: true }),
      });
      service.hasPermission(user, "can_access_tickets");
      expect(() => service.clearUserCache(1)).not.toThrow();
    });
  });
});
