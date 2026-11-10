/**
 * The Calls nav entry gates on `ip_calling` everywhere (legacy menu, sidebar
 * config); the dead `sip_calling` key is gone.
 */
import { describe, it, expect } from "vitest";
import { DEFAULT_MENU_ITEMS, getSidebarMenuItems } from "@/services/permissionService";
import { navigationConfig } from "@/config/navigationConfig";

const flatKeys = (item: { requiredFeatureKey?: string | string[] }) => [item.requiredFeatureKey ?? []].flat();

describe("calls nav key", () => {
  it("legacy menu: Calls requires ip_calling", () => {
    const calls = DEFAULT_MENU_ITEMS.find((i) => i.id === "calls");
    expect(calls && flatKeys(calls)).toEqual(["ip_calling"]);
    expect(JSON.stringify(DEFAULT_MENU_ITEMS)).not.toContain("sip_calling");
  });

  it("sidebar config: the calls item requires ip_calling", () => {
    const calls = navigationConfig.find((i) => i.id === "calls");
    expect(calls && flatKeys(calls)).toEqual(["ip_calling"]);
    expect(JSON.stringify(navigationConfig)).not.toContain("sip_calling");
  });

  it("a user whose group grants ip_calling sees the Calls entry", () => {
    const user = {
      id: 7,
      is_staff: false,
      is_superuser: false,
      tenant_groups: [{ id: 1, name: "Agents", feature_keys: ["ip_calling"] }],
    };
    const ids = getSidebarMenuItems(user).map((i) => i.id);
    expect(ids).toContain("calls");
    const without = getSidebarMenuItems({ ...user, tenant_groups: [{ id: 1, name: "Agents", feature_keys: [] }] }).map((i) => i.id);
    expect(without).not.toContain("calls");
  });
});
