/**
 * Tests for permissionUtils.ts.
 * Verifies category-to-Django permission mapping, reverse mapping,
 * query creation, access checks, payload creation, and menu validation.
 */
import { describe, it, expect, vi } from "vitest";
import {
  categoriesToDjangoPermissions,
  djangoPermissionsToCategories,
  createPermissionQuery,
  hasCompleteAccessToCategory,
  createGroupPermissionPayload,
  validateMenuAccess,
} from "@/utils/permissionUtils";

// ---------------------------------------------------------------------------
// categoriesToDjangoPermissions
// ---------------------------------------------------------------------------

describe("categoriesToDjangoPermissions", () => {
  it("converts a single category to its Django permissions", () => {
    const result = categoriesToDjangoPermissions(["settings"]);

    expect(result).toContain("settings.view_settings");
    expect(result).toContain("settings.change_settings");
    expect(result).toHaveLength(2);
  });

  it("converts multiple categories", () => {
    const result = categoriesToDjangoPermissions(["settings", "orders"]);

    expect(result).toContain("settings.view_settings");
    expect(result).toContain("settings.change_settings");
    expect(result).toContain("orders.add_order");
    expect(result).toContain("orders.view_order");
  });

  it("returns empty array for unknown category", () => {
    const result = categoriesToDjangoPermissions(["nonexistent_category"]);

    expect(result).toEqual([]);
  });

  it("returns empty array for empty input", () => {
    const result = categoriesToDjangoPermissions([]);

    expect(result).toEqual([]);
  });

  it("returns all ticket permissions for the tickets category", () => {
    const result = categoriesToDjangoPermissions(["tickets"]);

    expect(result).toContain("tickets.add_ticket");
    expect(result).toContain("tickets.view_ticket");
    expect(result).toContain("tickets.change_ticket");
    expect(result).toContain("tickets.delete_ticket");
    expect(result).toContain("tickets.add_tag");
    expect(result).toContain("tickets.view_board");
    expect(result.length).toBeGreaterThan(10);
  });

  it("returns call permissions for the calls category", () => {
    const result = categoriesToDjangoPermissions(["calls"]);

    expect(result).toContain("crm.add_calllog");
    expect(result).toContain("crm.view_calllog");
    expect(result).toContain("crm.add_callrecording");
  });
});

// ---------------------------------------------------------------------------
// djangoPermissionsToCategories
// ---------------------------------------------------------------------------

describe("djangoPermissionsToCategories", () => {
  it("maps a Django permission back to its category", () => {
    const result = djangoPermissionsToCategories(["settings.view_settings"]);

    expect(result).toContain("settings");
  });

  it("maps permissions from multiple categories", () => {
    const result = djangoPermissionsToCategories([
      "tickets.add_ticket",
      "crm.view_calllog",
    ]);

    expect(result).toContain("tickets");
    expect(result).toContain("calls");
  });

  it("returns empty array when no permissions match", () => {
    const result = djangoPermissionsToCategories(["unknown.permission"]);

    expect(result).toEqual([]);
  });

  it("returns empty array for empty input", () => {
    const result = djangoPermissionsToCategories([]);

    expect(result).toEqual([]);
  });

  it("matches permissions without app prefix (Strategy 3)", () => {
    // Django permission has prefix, category permission might match action_model
    const result = djangoPermissionsToCategories(["view_settings"]);

    // Strategy 2/3 in the function: handles partial match
    // settings category has "settings.view_settings", and "view_settings" should match
    expect(result).toContain("settings");
  });

  it("does not duplicate categories when multiple permissions from same category", () => {
    const result = djangoPermissionsToCategories([
      "tickets.add_ticket",
      "tickets.view_ticket",
      "tickets.change_ticket",
    ]);

    // Should only list 'tickets' once
    const ticketOccurrences = result.filter((c) => c === "tickets");
    expect(ticketOccurrences).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// createPermissionQuery
// ---------------------------------------------------------------------------

describe("createPermissionQuery", () => {
  it("creates query string from permission codenames", () => {
    const result = createPermissionQuery([
      "settings.view_settings",
      "settings.change_settings",
    ]);

    expect(result).toBe(
      "codename=settings.view_settings&codename=settings.change_settings"
    );
  });

  it("returns empty string for empty array", () => {
    const result = createPermissionQuery([]);

    expect(result).toBe("");
  });

  it("creates query for single permission", () => {
    const result = createPermissionQuery(["tickets.add_ticket"]);

    expect(result).toBe("codename=tickets.add_ticket");
  });
});

// ---------------------------------------------------------------------------
// hasCompleteAccessToCategory
// ---------------------------------------------------------------------------

describe("hasCompleteAccessToCategory", () => {
  it("returns true when user has all permissions for a category", () => {
    const settingsPerms = [
      "settings.view_settings",
      "settings.change_settings",
    ];

    const result = hasCompleteAccessToCategory("settings", settingsPerms);

    expect(result).toBe(true);
  });

  it("returns false when user is missing some permissions", () => {
    const result = hasCompleteAccessToCategory("settings", [
      "settings.view_settings",
    ]);

    expect(result).toBe(false);
  });

  it("returns false for unknown category", () => {
    const result = hasCompleteAccessToCategory("nonexistent", [
      "some.permission",
    ]);

    expect(result).toBe(false);
  });

  it("returns false when user has no permissions", () => {
    const result = hasCompleteAccessToCategory("settings", []);

    expect(result).toBe(false);
  });

  it("returns true for orders category with all order permissions", () => {
    const orderPerms = [
      "orders.add_order",
      "orders.change_order",
      "orders.delete_order",
      "orders.view_order",
    ];

    const result = hasCompleteAccessToCategory("orders", orderPerms);

    expect(result).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// createGroupPermissionPayload
// ---------------------------------------------------------------------------

describe("createGroupPermissionPayload", () => {
  it("creates payload with simplified and django permissions", () => {
    const result = createGroupPermissionPayload(["settings"]);

    expect(result.simplified_permissions).toEqual(["settings"]);
    expect(result.django_permissions).toContain("settings.view_settings");
    expect(result.django_permissions).toContain("settings.change_settings");
    expect(result.permission_count).toBe(2);
  });

  it("creates payload for multiple categories", () => {
    const result = createGroupPermissionPayload(["settings", "orders"]);

    expect(result.simplified_permissions).toEqual(["settings", "orders"]);
    expect(result.permission_count).toBe(6); // 2 settings + 4 orders
  });

  it("creates empty payload for empty categories", () => {
    const result = createGroupPermissionPayload([]);

    expect(result.simplified_permissions).toEqual([]);
    expect(result.django_permissions).toEqual([]);
    expect(result.permission_count).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// validateMenuAccess
// ---------------------------------------------------------------------------

describe("validateMenuAccess", () => {
  it("validates ticket access with complete ticket permissions", () => {
    // Get all ticket permissions
    const ticketPerms = categoriesToDjangoPermissions(["tickets"]);

    const result = validateMenuAccess("can_access_tickets", ticketPerms);

    expect(result).toBe(true);
  });

  it("rejects ticket access when missing some permissions", () => {
    const result = validateMenuAccess("can_access_tickets", [
      "tickets.add_ticket",
    ]);

    expect(result).toBe(false);
  });

  it("validates call access with complete call permissions", () => {
    const callPerms = categoriesToDjangoPermissions(["calls"]);

    const result = validateMenuAccess("can_access_calls", callPerms);

    expect(result).toBe(true);
  });

  it("validates user management access", () => {
    const userMgmtPerms = categoriesToDjangoPermissions(["user_management"]);

    const result = validateMenuAccess(
      "can_access_user_management",
      userMgmtPerms
    );

    expect(result).toBe(true);
  });

  it("returns false for unknown menu permission", () => {
    const result = validateMenuAccess("can_access_unknown", [
      "some.permission",
    ]);

    expect(result).toBe(false);
  });

  it("returns false for empty permissions array", () => {
    const result = validateMenuAccess("can_access_tickets", []);

    expect(result).toBe(false);
  });
});
