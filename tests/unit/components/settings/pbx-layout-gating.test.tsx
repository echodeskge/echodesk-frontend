/**
 * PBX settings layout: tabs follow the backend's is_pbx_admin /
 * can_view_call_stats, using the profile's bare permission codenames.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const state = vi.hoisted(() => ({
  pathname: "/settings/pbx",
  profile: {} as Record<string, unknown>,
  tenantHasCalling: true,
}));

vi.mock("next/navigation", () => ({ usePathname: () => state.pathname }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/contexts/SubscriptionContext", () => ({ useSubscription: () => ({ hasFeature: () => state.tenantHasCalling }) }));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { is_staff: state.profile.is_staff, is_superuser: state.profile.is_superuser } }),
}));
vi.mock("@/hooks/useUserProfile", () => ({ useUserProfile: () => ({ data: state.profile }) }));

import PbxLayout from "@/app/(tenant)/settings/pbx/layout";

function renderLayout() {
  return render(
    <PbxLayout>
      <div>tab content</div>
    </PbxLayout>
  );
}

describe("PbxLayout gating", () => {
  beforeEach(() => {
    state.pathname = "/settings/pbx";
    state.tenantHasCalling = true;
  });

  it("tenant without the ip_calling add-on sees the upgrade block, even with the key", () => {
    state.tenantHasCalling = false;
    state.profile = {
      is_staff: false,
      is_superuser: false,
      feature_keys: ["ip_calling"],
      permissions_list: ["manage_settings"],
      all_permissions: ["manage_settings"],
    };
    renderLayout();
    expect(screen.getByTestId("pbx-upgrade")).toBeInTheDocument();
    expect(screen.queryByText("tab content")).not.toBeInTheDocument();
  });

  it("user without the feature key (not staff) sees the upgrade block", () => {
    state.profile = {
      is_staff: false,
      is_superuser: false,
      feature_keys: ["ticket_management"],
      permissions_list: ["manage_settings"],
      all_permissions: ["manage_settings"],
    };
    renderLayout();
    expect(screen.getByTestId("pbx-upgrade")).toBeInTheDocument();
  });

  it("a malformed feature_keys value does not crash the layout", () => {
    state.profile = {
      is_staff: false,
      is_superuser: false,
      feature_keys: "{not json",
      permissions_list: ["manage_settings"],
      all_permissions: ["manage_settings"],
    };
    expect(() => renderLayout()).not.toThrow();
    expect(screen.getByTestId("pbx-upgrade")).toBeInTheDocument();
  });

  it("staff see the tabs without any feature key", () => {
    state.profile = { is_staff: true, is_superuser: false, feature_keys: [] };
    renderLayout();
    expect(screen.getByText("tab content")).toBeInTheDocument();
  });

  it("gives a role-admin (manage_settings) user every tab", () => {
    state.profile = {
      is_staff: false,
      is_superuser: false,
      feature_keys: ["ip_calling"],
      permissions_list: ["manage_settings", "manage_users"],
      all_permissions: ["manage_settings", "manage_users"],
    };
    renderLayout();
    expect(screen.getByText("tab content")).toBeInTheDocument();
    expect(screen.queryByText("page.noAccessTitle")).not.toBeInTheDocument();
    expect(screen.getByText("tabs.trunks")).toBeInTheDocument();
  });

  it("gives a view_reports manager statistics only", () => {
    state.profile = {
      is_staff: false,
      is_superuser: false,
      feature_keys: ["ip_calling"],
      permissions_list: ["view_reports"],
      all_permissions: ["view_reports"],
    };
    renderLayout();
    expect(screen.getByText("page.noAccessTitle")).toBeInTheDocument();

    state.pathname = "/settings/pbx/statistics";
    renderLayout();
    expect(screen.getByText("tab content")).toBeInTheDocument();
  });

  it("shows no access to a plain agent", () => {
    state.profile = {
      is_staff: false,
      is_superuser: false,
      feature_keys: ["ip_calling"],
      permissions_list: [],
      all_permissions: [],
    };
    state.pathname = "/settings/pbx/statistics";
    renderLayout();
    expect(screen.getByText("page.noAccessTitle")).toBeInTheDocument();
    expect(screen.queryByText("tab content")).not.toBeInTheDocument();
  });
});
