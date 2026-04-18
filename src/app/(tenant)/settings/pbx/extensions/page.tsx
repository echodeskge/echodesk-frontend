"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UserPhoneAssignments } from "@/components/calls/UserPhoneAssignments";
import { sipConfigurationsList } from "@/api/generated/api";
import type { SipConfigurationList } from "@/api/generated/interfaces";

export default function PbxExtensionsPage() {
  const t = useTranslations("pbxSettings.extensions");

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
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">…</p>
          ) : activeConfigs.length === 0 ? (
            <p className="text-sm text-muted-foreground">—</p>
          ) : (
            <div className="space-y-6">
              {activeConfigs.map((config) => (
                <UserPhoneAssignments
                  key={config.id}
                  sipConfigId={config.id}
                  sipConfigName={config.name}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
