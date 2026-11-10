"use client";

import { useTranslations } from "next-intl";
import { Settings, Trash2, TestTube, Star } from "lucide-react";
import type { SipConfigurationList } from "@/api/generated/interfaces";
import { TonePill } from "@/components/redesign/pill";
import { ActionButton } from "@/components/redesign/settings";
import { EmptyState } from "@/app/(tenant)/tickets/_components/primitives/empty-state";
interface SipConfigListProps {
  configs: SipConfigurationList[];
  onEdit: (config: SipConfigurationList) => void;
  onDelete: (configId: number) => void;
  onSetDefault: (configId: number) => void;
  onTest: (config: SipConfigurationList) => void;
  actionLoading: number | null;
}

export function SipConfigList({
  configs,
  onEdit,
  onDelete,
  onSetDefault,
  onTest,
  actionLoading,
}: SipConfigListProps) {
  const t = useTranslations("calls");
  const tCommon = useTranslations("common");

  if (configs.length === 0) {
    return (
      <EmptyState
        icon={Settings}
        title={t("settings.noConfigurations")}
        description={t("settings.noConfigurationsDesc")}
      />
    );
  }

  return (
    <ul className="divide-y" data-testid="sip-config-list">
      {configs.map((config) => (
        <li
          key={config.id}
          className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center"
          data-testid="sip-config-row"
        >
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[13px] font-semibold">{config.name}</span>
              {config.is_default && <TonePill tone="success">{t("settings.default")}</TonePill>}
              <TonePill tone={config.is_active ? "info" : "danger"} dot>
                {config.is_active ? t("settings.active") : t("settings.inactive")}
              </TonePill>
            </div>
            <span className="truncate font-mono text-xs text-muted-foreground">{config.sip_server}</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <ActionButton
              icon={TestTube}
              onClick={() => onTest(config)}
              disabled={actionLoading === config.id}
              testId="sip-test"
            >
              {t("settings.test")}
            </ActionButton>

            {!config.is_default && (
              <ActionButton
                icon={Star}
                onClick={() => onSetDefault(config.id)}
                disabled={actionLoading === config.id}
                testId="sip-set-default"
              >
                {t("settings.setDefault")}
              </ActionButton>
            )}

            <ActionButton
              icon={Settings}
              onClick={() => onEdit(config)}
              disabled={actionLoading === config.id}
              testId="sip-edit"
            >
              {tCommon("edit")}
            </ActionButton>

            <ActionButton
              icon={Trash2}
              tone="danger"
              onClick={() => onDelete(config.id)}
              disabled={actionLoading === config.id || config.is_default}
              title={
                config.is_default
                  ? t("settings.cannotDeleteDefault")
                  : t("settings.deleteConfiguration")
              }
              aria-label={t("settings.deleteConfiguration")}
              testId="sip-delete"
            >
              <span className="sr-only">{t("settings.deleteConfiguration")}</span>
            </ActionButton>
          </div>
        </li>
      ))}
    </ul>
  );
}
