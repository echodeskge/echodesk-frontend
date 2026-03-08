"use client";

import { useTranslations } from "next-intl";
import { AlertTriangle, CheckCircle, ExternalLink } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { usePublishingStatus, useStartPublishingOAuth } from "@/hooks/api/useAutoPost";
import { toast } from "sonner";

export function PublishingStatusBanner() {
  const t = useTranslations("autoPosting");
  const { data: status, isLoading } = usePublishingStatus();
  const startOAuth = useStartPublishingOAuth();

  if (isLoading || !status) return null;

  const allFbHavePermission = status.facebook_pages.length > 0 &&
    status.facebook_pages.every(p => p.has_publishing_permission);
  const allIgHavePermission = status.instagram_accounts.length > 0 &&
    status.instagram_accounts.every(a => a.has_publishing_permission);

  const noConnections = status.facebook_pages.length === 0 && status.instagram_accounts.length === 0;

  if (noConnections) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{t("noConnections")}</AlertDescription>
      </Alert>
    );
  }

  if (allFbHavePermission && allIgHavePermission) {
    return (
      <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800 dark:text-green-200">
          {t("publishingEnabled")}
        </AlertDescription>
      </Alert>
    );
  }

  const handleEnablePublishing = async () => {
    try {
      const data = await startOAuth.mutateAsync();
      if (data.oauth_url) {
        window.open(data.oauth_url, "_blank", "width=600,height=700");
      }
    } catch {
      toast.error(t("oauthError"));
    }
  };

  return (
    <Alert className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
      <AlertTriangle className="h-4 w-4 text-yellow-600" />
      <AlertDescription className="flex items-center justify-between">
        <div className="text-yellow-800 dark:text-yellow-200">
          <p className="font-medium">{t("publishingRequired")}</p>
          <div className="mt-1 text-sm space-y-1">
            {status.facebook_pages.filter(p => !p.has_publishing_permission).map(p => (
              <p key={p.id}>{t("fbMissing", { name: p.page_name })}</p>
            ))}
            {status.instagram_accounts.filter(a => !a.has_publishing_permission).map(a => (
              <p key={a.id}>{t("igMissing", { name: a.username })}</p>
            ))}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleEnablePublishing}
          disabled={startOAuth.isPending}
          className="ml-4 shrink-0"
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          {t("enablePublishing")}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
