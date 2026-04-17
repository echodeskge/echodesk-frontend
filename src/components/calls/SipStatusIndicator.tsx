"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface SipStatusIndicatorProps {
  isRegistered: boolean;
  isConnecting?: boolean;
  sipServer?: string;
  extension?: string;
  compact?: boolean;
}

export function SipStatusIndicator({
  isRegistered,
  isConnecting,
  sipServer,
  extension,
  compact,
}: SipStatusIndicatorProps) {
  const t = useTranslations("calls");

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {isConnecting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
        ) : isRegistered ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
        ) : (
          <XCircle className="h-3.5 w-3.5 text-destructive" />
        )}
        <Badge
          variant={isConnecting ? "secondary" : isRegistered ? "default" : "destructive"}
          className="text-xs"
        >
          {isConnecting
            ? t("dashboard.connecting")
            : isRegistered
            ? `${t("dashboard.registered")}${extension ? ` (${extension})` : ""}`
            : t("dashboard.disconnected")}
        </Badge>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {isConnecting ? (
              <Loader2 className="h-5 w-5 animate-spin text-blue-600 flex-shrink-0" />
            ) : isRegistered ? (
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
            ) : (
              <XCircle className="h-5 w-5 text-destructive flex-shrink-0" />
            )}
            <div className="min-w-0">
              <p className="font-semibold text-sm">{t("dashboard.sipStatus")}</p>
              {sipServer && (
                <p className="text-xs text-muted-foreground truncate">
                  {sipServer}
                </p>
              )}
            </div>
          </div>
          <Badge
            className="flex-shrink-0 whitespace-nowrap"
            variant={
              isConnecting
                ? "secondary"
                : isRegistered
                ? "default"
                : "destructive"
            }
          >
            {isConnecting
              ? t("dashboard.connecting")
              : isRegistered
              ? `${t("dashboard.registered")}${extension ? ` (${extension})` : ""}`
              : t("dashboard.disconnected")}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
