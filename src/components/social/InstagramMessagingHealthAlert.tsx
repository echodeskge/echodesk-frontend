"use client";

import { useTranslations } from "next-intl";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export type InstagramMessagingStatus = "unknown" | "ok" | "messaging_disabled" | "error";

export interface InstagramAccountHealth {
  id: number;
  username: string;
  is_active: boolean;
  messaging_status?: InstagramMessagingStatus;
  messaging_error?: string;
}

interface Props {
  accounts: InstagramAccountHealth[];
  onRecheck?: () => void;
  rechecking?: boolean;
}

// Steps in the Instagram app to turn messaging access back on. Rendered as
// an ordered list so the owner can follow them one tap at a time.
const ENABLE_STEPS = ["step1", "step2", "step3", "step4", "step5"] as const;

/**
 * Warns when Meta reports that an active Instagram account can't be used for
 * messaging. The common cause is the owner turning off "Allow access to
 * messages" (Graph #200 / 2534041) — DMs then silently stop arriving.
 */
export function InstagramMessagingHealthAlert({ accounts, onRecheck, rechecking }: Props) {
  const t = useTranslations("social.instagramHealth");

  const active = accounts.filter((a) => a.is_active);
  const disabled = active.filter((a) => a.messaging_status === "messaging_disabled");
  const failing = active.filter((a) => a.messaging_status === "error");
  if (disabled.length === 0 && failing.length === 0) return null;

  const recheckButton = onRecheck ? (
    <Button size="sm" variant="outline" onClick={onRecheck} disabled={rechecking} className="mt-3">
      <RefreshCw className={rechecking ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />
      {t("recheck")}
    </Button>
  ) : null;

  return (
    <div className="space-y-3">
      {disabled.length > 0 && (
        <Alert variant="destructive" data-testid="instagram-messaging-disabled">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            {t("disabledTitle", { accounts: disabled.map((a) => `@${a.username}`).join(", ") })}
          </AlertTitle>
          <AlertDescription>
            <p>{t("disabledDescription")}</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              {ENABLE_STEPS.map((step) => (
                <li key={step}>{t(`steps.${step}`)}</li>
              ))}
            </ol>
            <p className="mt-2">{t("afterEnabling")}</p>
            {recheckButton}
          </AlertDescription>
        </Alert>
      )}
      {failing.length > 0 && (
        <Alert variant="destructive" data-testid="instagram-messaging-error">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            {t("errorTitle", { accounts: failing.map((a) => `@${a.username}`).join(", ") })}
          </AlertTitle>
          <AlertDescription>
            <p>{t("errorDescription")}</p>
            {failing.map((a) =>
              a.messaging_error ? (
                <p key={a.id} className="mt-1 text-xs opacity-80">
                  @{a.username}: {a.messaging_error}
                </p>
              ) : null,
            )}
            {disabled.length === 0 && recheckButton}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
