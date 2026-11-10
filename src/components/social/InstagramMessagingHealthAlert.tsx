"use client";

import { useTranslations } from "next-intl";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { ActionButton } from "@/components/redesign/settings";

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
    <ActionButton icon={RefreshCw} onClick={onRecheck} disabled={rechecking} className={rechecking ? "mt-2.5 [&_svg]:animate-spin" : "mt-2.5"}>
      {t("recheck")}
    </ActionButton>
  ) : null;

  // Design CONNECTIONS alert banner, in the destructive tone (DMs stopped).
  const banner =
    "flex items-start gap-3 rounded-[10px] border border-destructive/40 bg-destructive/[0.06] px-3.5 py-3";
  const titleCls = "text-[13px] font-semibold text-destructive dark:text-red-400";
  const textCls = "mt-0.5 text-xs leading-[17px] text-foreground/85";

  return (
    <div className="flex flex-col gap-3">
      {disabled.length > 0 && (
        <div role="alert" className={banner} data-testid="instagram-messaging-disabled">
          <AlertTriangle className="mt-px h-4 w-4 shrink-0 text-destructive dark:text-red-400" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className={titleCls}>
              {t("disabledTitle", { accounts: disabled.map((a) => `@${a.username}`).join(", ") })}
            </p>
            <div className={textCls}>
              <p>{t("disabledDescription")}</p>
              <ol className="mt-1.5 list-decimal space-y-0.5 ps-5">
                {ENABLE_STEPS.map((step) => (
                  <li key={step}>{t(`steps.${step}`)}</li>
                ))}
              </ol>
              <p className="mt-1.5">{t("afterEnabling")}</p>
            </div>
            {recheckButton}
          </div>
        </div>
      )}
      {failing.length > 0 && (
        <div role="alert" className={banner} data-testid="instagram-messaging-error">
          <AlertTriangle className="mt-px h-4 w-4 shrink-0 text-destructive dark:text-red-400" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className={titleCls}>
              {t("errorTitle", { accounts: failing.map((a) => `@${a.username}`).join(", ") })}
            </p>
            <div className={textCls}>
              <p>{t("errorDescription")}</p>
              {failing.map((a) =>
                a.messaging_error ? (
                  <p key={a.id} className="mt-1 opacity-80">
                    @{a.username}: {a.messaging_error}
                  </p>
                ) : null,
              )}
            </div>
            {disabled.length === 0 && recheckButton}
          </div>
        </div>
      )}
    </div>
  );
}
