/**
 * Tests for call system permission checks.
 *
 * Verifies that the dialpad widget and call context correctly check
 * user group feature_keys (not just subscription-level features)
 * before showing calling UI or loading SIP configuration.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Helpers: mock user profiles with various permission setups
// ---------------------------------------------------------------------------

function mockUserProfile(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    email: "test@test.com",
    first_name: "Test",
    last_name: "User",
    is_staff: false,
    is_superuser: false,
    feature_keys: "[]",
    tenant_groups: [],
    ...overrides,
  };
}

/**
 * Simulates the feature key check used in CallContext and DialpadWidget.
 * This is extracted from the actual code to unit test the logic.
 */
function userHasIpCalling(user: any, userProfile: any): boolean {
  if (user?.is_staff || user?.is_superuser) return true;
  const profile = userProfile as any;
  if (!profile?.feature_keys) return false;
  let keys: string[] = [];
  if (typeof profile.feature_keys === "string") {
    try {
      keys = JSON.parse(profile.feature_keys);
    } catch {
      return false;
    }
  } else if (Array.isArray(profile.feature_keys)) {
    keys = profile.feature_keys;
  }
  return keys.includes("ip_calling");
}

/**
 * Simulates whether the dialpad widget should render.
 * From DialpadWidget.tsx: if (!hasIpCalling || !activeSipConfig) return null
 */
function shouldShowDialpadWidget(
  user: any,
  userProfile: any,
  activeSipConfig: any
): boolean {
  const hasIpCalling = userHasIpCalling(user, userProfile);
  return hasIpCalling && !!activeSipConfig;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Call Permission Checks", () => {
  describe("userHasIpCalling", () => {
    it("returns true for staff users regardless of feature_keys", () => {
      const user = { is_staff: true, is_superuser: false };
      const profile = mockUserProfile({ feature_keys: "[]" });
      expect(userHasIpCalling(user, profile)).toBe(true);
    });

    it("returns true for superuser regardless of feature_keys", () => {
      const user = { is_staff: false, is_superuser: true };
      const profile = mockUserProfile({ feature_keys: "[]" });
      expect(userHasIpCalling(user, profile)).toBe(true);
    });

    it("returns true when user profile has ip_calling as JSON string array", () => {
      const user = { is_staff: false, is_superuser: false };
      const profile = mockUserProfile({
        feature_keys: '["ticket_management", "ip_calling", "social_integrations"]',
      });
      expect(userHasIpCalling(user, profile)).toBe(true);
    });

    it("returns true when user profile has ip_calling as native array", () => {
      const user = { is_staff: false, is_superuser: false };
      const profile = mockUserProfile({
        feature_keys: ["ticket_management", "ip_calling"],
      });
      expect(userHasIpCalling(user, profile)).toBe(true);
    });

    it("returns false when user profile has no ip_calling feature", () => {
      const user = { is_staff: false, is_superuser: false };
      const profile = mockUserProfile({
        feature_keys: '["ticket_management", "social_integrations"]',
      });
      expect(userHasIpCalling(user, profile)).toBe(false);
    });

    it("returns false when feature_keys is empty array", () => {
      const user = { is_staff: false, is_superuser: false };
      const profile = mockUserProfile({ feature_keys: "[]" });
      expect(userHasIpCalling(user, profile)).toBe(false);
    });

    it("returns false when feature_keys is null", () => {
      const user = { is_staff: false, is_superuser: false };
      const profile = mockUserProfile({ feature_keys: null });
      expect(userHasIpCalling(user, profile)).toBe(false);
    });

    it("returns false when feature_keys is undefined", () => {
      const user = { is_staff: false, is_superuser: false };
      const profile = mockUserProfile({ feature_keys: undefined });
      expect(userHasIpCalling(user, profile)).toBe(false);
    });

    it("returns false when userProfile is null", () => {
      const user = { is_staff: false, is_superuser: false };
      expect(userHasIpCalling(user, null)).toBe(false);
    });

    it("returns false when feature_keys is invalid JSON string", () => {
      const user = { is_staff: false, is_superuser: false };
      const profile = mockUserProfile({ feature_keys: "not valid json" });
      expect(userHasIpCalling(user, profile)).toBe(false);
    });

    it("still checks profile feature_keys when user is null (profile has ip_calling)", () => {
      const profile = mockUserProfile({
        feature_keys: '["ip_calling"]',
      });
      // user being null doesn't block the feature check — profile is the source of truth
      expect(userHasIpCalling(null, profile)).toBe(true);
    });

    it("returns false when both user and profile are null", () => {
      expect(userHasIpCalling(null, null)).toBe(false);
    });
  });

  describe("shouldShowDialpadWidget", () => {
    const sipConfig = { id: 1, sip_server: "pbx.example.com", username: "100" };

    it("shows widget for staff user with SIP config", () => {
      const user = { is_staff: true, is_superuser: false };
      const profile = mockUserProfile();
      expect(shouldShowDialpadWidget(user, profile, sipConfig)).toBe(true);
    });

    it("shows widget for user with ip_calling and SIP config", () => {
      const user = { is_staff: false, is_superuser: false };
      const profile = mockUserProfile({
        feature_keys: '["ip_calling"]',
      });
      expect(shouldShowDialpadWidget(user, profile, sipConfig)).toBe(true);
    });

    it("hides widget when user has ip_calling but no SIP config", () => {
      const user = { is_staff: false, is_superuser: false };
      const profile = mockUserProfile({
        feature_keys: '["ip_calling"]',
      });
      expect(shouldShowDialpadWidget(user, profile, null)).toBe(false);
    });

    it("hides widget when user has SIP config but no ip_calling", () => {
      const user = { is_staff: false, is_superuser: false };
      const profile = mockUserProfile({
        feature_keys: '["ticket_management"]',
      });
      expect(shouldShowDialpadWidget(user, profile, sipConfig)).toBe(false);
    });

    it("hides widget when user has neither ip_calling nor SIP config", () => {
      const user = { is_staff: false, is_superuser: false };
      const profile = mockUserProfile({ feature_keys: "[]" });
      expect(shouldShowDialpadWidget(user, profile, null)).toBe(false);
    });

    it("hides widget for staff user without SIP config", () => {
      const user = { is_staff: true, is_superuser: false };
      const profile = mockUserProfile();
      expect(shouldShowDialpadWidget(user, profile, null)).toBe(false);
    });
  });

  describe("feature_keys from tenant_groups", () => {
    /**
     * Simulates how the layout extracts feature_keys from tenant_groups.
     * This is the same logic used in permissionService.getUserFeatureKeys.
     */
    function extractFeatureKeysFromGroups(
      tenantGroups: Array<{ feature_keys?: string | string[] }>
    ): string[] {
      const keys = new Set<string>();
      tenantGroups.forEach((group) => {
        if (!group.feature_keys) return;
        let groupKeys: string[] = [];
        if (Array.isArray(group.feature_keys)) {
          groupKeys = group.feature_keys;
        } else if (typeof group.feature_keys === "string") {
          try {
            groupKeys = JSON.parse(group.feature_keys);
          } catch {
            groupKeys = [group.feature_keys];
          }
        }
        groupKeys.forEach((k) => keys.add(k));
      });
      return Array.from(keys);
    }

    it("extracts ip_calling from a group with JSON string feature_keys", () => {
      const groups = [
        {
          feature_keys: '["ticket_management", "ip_calling"]',
        },
      ];
      const keys = extractFeatureKeysFromGroups(groups);
      expect(keys).toContain("ip_calling");
      expect(keys).toContain("ticket_management");
    });

    it("extracts ip_calling from a group with array feature_keys", () => {
      const groups = [
        {
          feature_keys: ["ip_calling", "social_integrations"],
        },
      ];
      const keys = extractFeatureKeysFromGroups(groups);
      expect(keys).toContain("ip_calling");
    });

    it("merges feature_keys from multiple groups", () => {
      const groups = [
        { feature_keys: '["ticket_management"]' },
        { feature_keys: '["ip_calling"]' },
      ];
      const keys = extractFeatureKeysFromGroups(groups);
      expect(keys).toContain("ticket_management");
      expect(keys).toContain("ip_calling");
    });

    it("does not include ip_calling when no group has it", () => {
      const groups = [
        { feature_keys: '["ticket_management", "social_integrations"]' },
      ];
      const keys = extractFeatureKeysFromGroups(groups);
      expect(keys).not.toContain("ip_calling");
    });

    it("handles groups with null/undefined feature_keys", () => {
      const groups = [
        { feature_keys: undefined },
        { feature_keys: '["ip_calling"]' },
      ];
      const keys = extractFeatureKeysFromGroups(groups);
      expect(keys).toContain("ip_calling");
      expect(keys.length).toBe(1);
    });

    it("deduplicates feature_keys across groups", () => {
      const groups = [
        { feature_keys: '["ip_calling", "ticket_management"]' },
        { feature_keys: '["ip_calling", "social_integrations"]' },
      ];
      const keys = extractFeatureKeysFromGroups(groups);
      expect(keys.filter((k) => k === "ip_calling").length).toBe(1);
      expect(keys.length).toBe(3);
    });
  });
});
