"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Headset, Lock } from "lucide-react";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useAuth } from "@/contexts/AuthContext";
import { profileHasPermission } from "@/lib/backendPermissions";
import { useCallingAccess } from "@/lib/calling-access";
import { SettingsPage } from "@/components/redesign/settings";
import { EmptyState } from "@/app/(tenant)/tickets/_components/primitives/empty-state";
import { PbxTabs } from "./_components/pbx-ui";

const PBX_TABS = [
  { id: "overview", href: "/settings/pbx", exact: true },
  { id: "server", href: "/settings/pbx/server" },
  { id: "trunks", href: "/settings/pbx/trunks" },
  { id: "extensions", href: "/settings/pbx/extensions" },
  { id: "queues", href: "/settings/pbx/queues" },
  { id: "inbound", href: "/settings/pbx/inbound" },
  { id: "statistics", href: "/settings/pbx/statistics" },
];

function UpgradeRequired() {
  const t = useTranslations("pbxSettings.page");
  return (
    <SettingsPage icon={Headset} title={t("title")} width="list" gap={16}>
      <div className="rounded-[10px] border bg-card" data-testid="pbx-upgrade">
        <EmptyState icon={Lock} title={t("upgradeTitle")} description={t("upgradeDescription")} />
      </div>
    </SettingsPage>
  );
}

export default function PbxLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const t = useTranslations("pbxSettings");
  const { user } = useAuth();
  const { data: userProfile } = useUserProfile();
  // Tenant subscription AND user feature key (or staff), like every other
  // calling gate (`calling-access.ts`).
  const { canViewCalls } = useCallingAccess();

  const isStaffOrAdmin = user?.is_staff || user?.is_superuser;

  if (!canViewCalls) return <UpgradeRequired />;

  // Mirrors the backend: PBX configuration needs a PBX admin (staff,
  // superuser or manage_settings); statistics also open to view_reports.
  const isPbxAdmin =
    isStaffOrAdmin || profileHasPermission(userProfile as never, "manage_settings");
  const canViewStats = isPbxAdmin || profileHasPermission(userProfile as never, "view_reports");
  const visibleTabs = PBX_TABS.filter((tab) =>
    tab.id === "statistics" ? canViewStats : isPbxAdmin
  );
  const onAllowedTab = visibleTabs.some((tab) =>
    tab.exact ? pathname === tab.href : pathname === tab.href || pathname.startsWith(tab.href + "/")
  );

  return (
    <SettingsPage
      icon={Headset}
      title={t("page.title")}
      description={t("page.description")}
      width="list"
      gap={16}
      testId="pbx-layout"
    >
      <PbxTabs
        ariaLabel={t("page.tabsLabel")}
        tabs={visibleTabs.map((tab) => ({
          id: tab.id,
          href: tab.href,
          label: t(`tabs.${tab.id}`),
          active: tab.exact
            ? pathname === tab.href
            : pathname === tab.href || pathname.startsWith(tab.href + "/"),
        }))}
      />

      <div className="flex min-w-0 flex-col gap-5">
        {onAllowedTab ? (
          children
        ) : (
          <div className="rounded-[10px] border bg-card" data-testid="pbx-no-access">
            <EmptyState icon={Lock} title={t("page.noAccessTitle")} description={t("page.noAccessDescription")} />
          </div>
        )}
      </div>
    </SettingsPage>
  );
}
