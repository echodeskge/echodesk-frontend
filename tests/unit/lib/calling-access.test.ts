/**
 * Softphone access must agree with the backend contract:
 * tenant `ip_calling` AND (user feature key OR staff) AND (`make_calls` OR staff).
 */
import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import {
  callingAccess,
  parseFeatureKeys,
  useCallingAccess,
  type CallingAccessUser,
} from "@/lib/calling-access";

const mocks = vi.hoisted(() => ({
  hasFeature: vi.fn<(feature: string) => boolean>(() => true),
  user: null as CallingAccessUser | null,
  profile: undefined as CallingAccessUser | undefined,
}));

vi.mock("@/contexts/SubscriptionContext", () => ({
  useSubscription: () => ({ hasFeature: mocks.hasFeature }),
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: mocks.user }),
}));
vi.mock("@/hooks/useUserProfile", () => ({
  useUserProfile: () => ({ data: mocks.profile }),
}));

const tenantOn = () => true;
const tenantOff = () => false;

function agent(opts: {
  key?: boolean;
  staff?: boolean;
  superuser?: boolean;
  makeCalls?: boolean;
}): CallingAccessUser {
  return {
    is_staff: opts.staff ?? false,
    is_superuser: opts.superuser ?? false,
    feature_keys: opts.key ? ["ip_calling", "tickets"] : ["tickets"],
    permissions_list: opts.makeCalls ? ["make_calls", "view_all_tickets"] : ["view_all_tickets"],
  };
}

describe("parseFeatureKeys", () => {
  it("is re-exported from the dependency-free @/lib/feature-keys", async () => {
    const { parseFeatureKeys: standalone } = await import("@/lib/feature-keys");
    expect(parseFeatureKeys).toBe(standalone);
  });

  it("parses a JSON string", () => {
    expect(parseFeatureKeys('["ip_calling","tickets"]')).toEqual(["ip_calling", "tickets"]);
  });

  it("passes arrays through, keeping only strings", () => {
    expect(parseFeatureKeys(["ip_calling", 3, null, "x"])).toEqual(["ip_calling", "x"]);
  });

  it("returns [] for bad JSON instead of throwing", () => {
    expect(parseFeatureKeys("{not json")).toEqual([]);
    expect(parseFeatureKeys("ip_calling")).toEqual([]);
  });

  it("returns [] for JSON that is not an array", () => {
    expect(parseFeatureKeys('{"ip_calling":true}')).toEqual([]);
    expect(parseFeatureKeys('"ip_calling"')).toEqual([]);
  });

  it("returns [] for null, undefined, numbers and objects", () => {
    expect(parseFeatureKeys(null)).toEqual([]);
    expect(parseFeatureKeys(undefined)).toEqual([]);
    expect(parseFeatureKeys(42)).toEqual([]);
    expect(parseFeatureKeys({ ip_calling: true })).toEqual([]);
    expect(parseFeatureKeys("")).toEqual([]);
  });
});

describe("callingAccess", () => {
  describe("matrix: tenant × user key × make_calls (regular user)", () => {
    const cases: Array<[tenant: boolean, key: boolean, makeCalls: boolean, view: boolean, soft: boolean]> = [
      [false, false, false, false, false],
      [false, false, true, false, false],
      [false, true, false, false, false],
      [false, true, true, false, false],
      [true, false, false, false, false],
      [true, false, true, false, false],
      [true, true, false, true, false],
      [true, true, true, true, true],
    ];

    it.each(cases)(
      "tenant=%s key=%s make_calls=%s -> canViewCalls=%s canUseSoftphone=%s",
      (tenant, key, makeCalls, view, soft) => {
        const profile = agent({ key, makeCalls });
        const result = callingAccess({ hasFeature: tenant ? tenantOn : tenantOff, user: profile, profile });
        expect(result.tenantHasCalling).toBe(tenant);
        expect(result.userHasCalling).toBe(key);
        expect(result.canViewCalls).toBe(view);
        expect(result.canUseSoftphone).toBe(soft);
      }
    );
  });

  describe("staff and superusers", () => {
    it("staff bypass the feature key and the permission when the tenant has calling", () => {
      const profile = agent({ staff: true });
      expect(callingAccess({ hasFeature: tenantOn, user: profile, profile })).toEqual({
        tenantHasCalling: true,
        userHasCalling: true,
        canUseSoftphone: true,
        canViewCalls: true,
      });
    });

    it("superusers bypass the feature key and the permission when the tenant has calling", () => {
      const profile = agent({ superuser: true });
      expect(callingAccess({ hasFeature: tenantOn, user: profile, profile })).toEqual({
        tenantHasCalling: true,
        userHasCalling: true,
        canUseSoftphone: true,
        canViewCalls: true,
      });
    });

    it("staff still need the tenant subscription", () => {
      const profile = agent({ staff: true, makeCalls: true });
      expect(callingAccess({ hasFeature: tenantOff, user: profile, profile })).toEqual({
        tenantHasCalling: false,
        userHasCalling: true,
        canUseSoftphone: false,
        canViewCalls: false,
      });
    });

    it("staff flag on the auth user alone is enough (profile not loaded yet)", () => {
      const user = { is_staff: true, feature_keys: "[]" };
      const result = callingAccess({ hasFeature: tenantOn, user, profile: undefined });
      expect(result.userHasCalling).toBe(true);
      expect(result.canUseSoftphone).toBe(true);
    });
  });

  describe("inputs", () => {
    it("reads feature keys from the profile before the auth user", () => {
      const user = { is_staff: false, feature_keys: '["ip_calling"]' };
      const profile = { is_staff: false, feature_keys: [] as string[], permissions_list: ["make_calls"] };
      const result = callingAccess({ hasFeature: tenantOn, user, profile });
      expect(result.userHasCalling).toBe(false);
      expect(result.canUseSoftphone).toBe(false);
    });

    it("falls back to the auth user's JSON-string feature keys while the profile is loading", () => {
      const user = { is_staff: false, feature_keys: '["ip_calling"]' };
      const result = callingAccess({ hasFeature: tenantOn, user, profile: undefined });
      expect(result.userHasCalling).toBe(true);
      expect(result.canViewCalls).toBe(true);
      // no permission list yet -> softphone stays off until the profile arrives
      expect(result.canUseSoftphone).toBe(false);
    });

    it("bad JSON in feature_keys denies without throwing", () => {
      const user = { is_staff: false, feature_keys: "{oops" };
      expect(() => callingAccess({ hasFeature: tenantOn, user, profile: user })).not.toThrow();
      expect(callingAccess({ hasFeature: tenantOn, user, profile: user }).userHasCalling).toBe(false);
    });

    it("accepts the legacy can_ prefixed permission and the all_permissions field", () => {
      const profile = {
        is_staff: false,
        feature_keys: ["ip_calling"],
        all_permissions: ["can_make_calls"],
      };
      expect(callingAccess({ hasFeature: tenantOn, user: profile, profile }).canUseSoftphone).toBe(true);
    });

    it("no user and no profile -> everything false except the tenant flag", () => {
      expect(callingAccess({ hasFeature: tenantOn, user: null, profile: null })).toEqual({
        tenantHasCalling: true,
        userHasCalling: false,
        canUseSoftphone: false,
        canViewCalls: false,
      });
    });
  });
});

describe("useCallingAccess", () => {
  it("combines the subscription, auth user and profile", () => {
    mocks.hasFeature.mockImplementation((feature) => feature === "ip_calling");
    mocks.user = { id: 1, is_staff: false, feature_keys: "[]" } as CallingAccessUser;
    mocks.profile = agent({ key: true, makeCalls: true });

    const { result } = renderHook(() => useCallingAccess());
    expect(result.current).toEqual({
      tenantHasCalling: true,
      userHasCalling: true,
      canUseSoftphone: true,
      canViewCalls: true,
    });
    expect(mocks.hasFeature).toHaveBeenCalledWith("ip_calling");
  });

  it("returns a stable object while inputs do not change", () => {
    mocks.hasFeature.mockImplementation(() => true);
    mocks.user = agent({ key: true });
    mocks.profile = mocks.user;

    const { result, rerender } = renderHook(() => useCallingAccess());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });

  it("denies when the tenant lacks ip_calling", () => {
    mocks.hasFeature.mockImplementation(() => false);
    mocks.user = agent({ staff: true });
    mocks.profile = mocks.user;

    const { result } = renderHook(() => useCallingAccess());
    expect(result.current.canViewCalls).toBe(false);
    expect(result.current.canUseSoftphone).toBe(false);
  });
});
