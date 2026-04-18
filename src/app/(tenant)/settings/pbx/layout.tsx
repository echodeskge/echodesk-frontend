"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const PBX_TABS = [
  { id: "overview", href: "/settings/pbx", exact: true },
  { id: "trunks", href: "/settings/pbx/trunks" },
  { id: "extensions", href: "/settings/pbx/extensions" },
  { id: "queues", href: "/settings/pbx/queues" },
  { id: "inbound", href: "/settings/pbx/inbound" },
  { id: "hours", href: "/settings/pbx/hours" },
  { id: "statistics", href: "/settings/pbx/statistics" },
];

function UpgradeRequired() {
  const t = useTranslations("pbxSettings.page");
  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("upgradeTitle")}</CardTitle>
          <CardDescription>{t("upgradeDescription")}</CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </div>
  );
}

export default function PbxLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const t = useTranslations("pbxSettings");
  const { hasFeature } = useSubscription();
  const { user } = useAuth();
  const { data: userProfile } = useUserProfile();

  const isStaffOrAdmin = user?.is_staff || user?.is_superuser;
  const userFeatureKeys: string[] = userProfile?.feature_keys
    ? typeof userProfile.feature_keys === "string"
      ? JSON.parse(userProfile.feature_keys)
      : (userProfile.feature_keys as string[])
    : [];
  const hasIpCalling =
    (isStaffOrAdmin && userFeatureKeys.length === 0) ||
    userFeatureKeys.includes("ip_calling") ||
    hasFeature("ip_calling");

  if (!hasIpCalling) return <UpgradeRequired />;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("page.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("page.description")}</p>
      </div>

      <nav className="flex flex-wrap gap-1 border-b">
        {PBX_TABS.map((tab) => {
          const isActive = tab.exact
            ? pathname === tab.href
            : pathname === tab.href || pathname.startsWith(tab.href + "/");
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={cn(
                "inline-flex items-center px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
              )}
            >
              {t(`tabs.${tab.id}`)}
            </Link>
          );
        })}
      </nav>

      <div>{children}</div>
    </div>
  );
}
