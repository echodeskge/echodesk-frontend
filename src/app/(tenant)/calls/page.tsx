"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Lock } from "lucide-react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useCallingAccess } from "@/lib/calling-access";
import { LoadingBlock } from "@/components/redesign/states";
import { rdButton } from "@/components/redesign/buttons";
import { EmptyState } from "@/app/(tenant)/tickets/_components/primitives/empty-state";
import { CallsScreen } from "./_components/calls-screen";

/**
 * `/calls` opens for users who may view calls: the tenant's subscription has
 * `ip_calling` AND the user holds the feature key (or is staff). The same
 * helper gates the softphone, the PBX settings and the nav, so a user never
 * sees a Calls page without a softphone or the other way round.
 */
function CallsAccessBlock({ tenantHasCalling }: { tenantHasCalling: boolean }) {
  const t = useTranslations("calls.access");
  return (
    <section className="flex w-full justify-center p-4 sm:p-6" data-testid="calls-no-access" data-reason={tenantHasCalling ? "user" : "tenant"}>
      <div className="w-full max-w-[560px] rounded-[10px] border bg-card">
        {tenantHasCalling ? (
          <EmptyState icon={Lock} title={t("noAccessTitle")} description={t("noAccessDescription")} />
        ) : (
          <EmptyState
            icon={Lock}
            title={t("upgradeTitle")}
            description={t("upgradeDescription")}
            action={
              <Link href="/settings/subscription" className={rdButton.outline} data-testid="calls-upgrade-link">
                {t("upgradePlan")}
              </Link>
            }
          />
        )}
      </div>
    </section>
  );
}

export default function CallsPage() {
  const t = useTranslations("calls.access");
  const { loading } = useSubscription();
  const { canViewCalls, tenantHasCalling } = useCallingAccess();

  if (canViewCalls) return <CallsScreen />;
  if (loading) return <LoadingBlock label={t("loading")} testId="calls-access-loading" />;
  return <CallsAccessBlock tenantHasCalling={tenantHasCalling} />;
}
