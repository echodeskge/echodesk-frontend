"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Phone } from "lucide-react";
import { UserPhoneAssignments } from "@/components/calls/UserPhoneAssignments";
import { sipConfigurationsList } from "@/api/generated/api";
import type { SipConfigurationList } from "@/api/generated/interfaces";
import { PbxBlockHeader, PbxEmpty, usePbxStates } from "../_components/pbx-ui";

export default function PbxExtensionsPage() {
  const t = useTranslations("pbxSettings.extensions");
  const tCalls = useTranslations("callsSettings");
  const { loading: loadingBlock } = usePbxStates();

  const { data, isLoading } = useQuery({
    queryKey: ["sip-configs-for-extensions"],
    queryFn: () => sipConfigurationsList(),
  });

  const configs = useMemo<SipConfigurationList[]>(() => {
    if (!data) return [];
    const d = data as { results?: SipConfigurationList[] } | SipConfigurationList[];
    return Array.isArray(d) ? d : (d.results ?? []);
  }, [data]);

  const activeConfigs = configs.filter((c) => c.is_active);

  return (
    <div className="flex min-w-0 flex-col gap-3" data-testid="pbx-extensions">
      <PbxBlockHeader title={t("title")} description={t("description")} />
      {isLoading ? (
        <div className="rounded-[10px] border bg-card">{loadingBlock}</div>
      ) : activeConfigs.length === 0 ? (
        <div className="rounded-[10px] border bg-card">
          {/* Was a bare "—"; the existing "no SIP configuration" text says why. */}
          <PbxEmpty icon={Phone} text={tCalls("noSipConfigs")} testId="pbx-extensions-empty" />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {activeConfigs.map((config) => (
            <UserPhoneAssignments
              key={config.id}
              sipConfigId={config.id}
              sipConfigName={config.name}
            />
          ))}
        </div>
      )}
    </div>
  );
}
