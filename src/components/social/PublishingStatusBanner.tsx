"use client";

import { useTranslations } from "next-intl";
import { ExternalLink } from "lucide-react";
import { ActionButton, SettingsNote } from "@/components/redesign/settings";
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
      <SettingsNote tone="danger" testId="publishing-status-none">
        {t("noConnections")}
      </SettingsNote>
    );
  }

  if (allFbHavePermission && allIgHavePermission) {
    return (
      <SettingsNote tone="success" testId="publishing-status-ok">
        {t("publishingEnabled")}
      </SettingsNote>
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
    <SettingsNote
      tone="warning"
      testId="publishing-status-required"
      action={
        <ActionButton icon={ExternalLink} onClick={handleEnablePublishing} disabled={startOAuth.isPending}>
          {t("enablePublishing")}
        </ActionButton>
      }
    >
      <p className="font-semibold">{t("publishingRequired")}</p>
      <div className="mt-1 space-y-0.5">
        {status.facebook_pages.filter(p => !p.has_publishing_permission).map(p => (
          <p key={p.id}>{t("fbMissing", { name: p.page_name })}</p>
        ))}
        {status.instagram_accounts.filter(a => !a.has_publishing_permission).map(a => (
          <p key={a.id}>{t("igMissing", { name: a.username })}</p>
        ))}
      </div>
    </SettingsNote>
  );
}
