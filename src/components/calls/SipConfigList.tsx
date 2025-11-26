"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, Trash2, TestTube, Star } from "lucide-react";
import type { SipConfigurationList } from "@/api/generated/interfaces";

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
      <Card>
        <CardContent className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <Settings className="h-16 w-16 text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold mb-2">{t("settings.noConfigurations")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("settings.noConfigurationsDesc")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {configs.map((config) => (
        <Card key={config.id}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold">{config.name}</h3>
                  {config.is_default && (
                    <Badge variant="default" className="bg-green-600">
                      {t("settings.default")}
                    </Badge>
                  )}
                  <Badge
                    variant={config.is_active ? "default" : "destructive"}
                  >
                    {config.is_active ? t("settings.active") : t("settings.inactive")}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {config.sip_server}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onTest(config)}
                  disabled={actionLoading === config.id}
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  {t("settings.test")}
                </Button>

                {!config.is_default && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSetDefault(config.id)}
                    disabled={actionLoading === config.id}
                  >
                    <Star className="h-4 w-4 mr-2" />
                    {t("settings.setDefault")}
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(config)}
                  disabled={actionLoading === config.id}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  {tCommon("edit")}
                </Button>

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onDelete(config.id)}
                  disabled={actionLoading === config.id || config.is_default}
                  title={
                    config.is_default
                      ? t("settings.cannotDeleteDefault")
                      : t("settings.deleteConfiguration")
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
