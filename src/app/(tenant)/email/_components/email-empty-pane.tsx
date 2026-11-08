"use client";

import { useTranslations } from "next-intl";
import { MailOpen } from "lucide-react";

const kbd = "rounded border border-border px-1 font-mono text-[11px] leading-4 text-foreground";

/** Design empty reading pane with the keyboard hint. */
export function EmailEmptyPane() {
  const t = useTranslations("email.view");
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center" data-testid="email-empty-pane">
      <span className="mb-1 flex h-11 w-11 items-center justify-center rounded-xl bg-muted">
        <MailOpen className="h-5 w-5 text-muted-foreground" />
      </span>
      <p className="text-[13px] font-medium">{t("emptyPane")}</p>
      <p className="hidden items-center gap-1 text-xs text-muted-foreground md:flex">
        <kbd className={kbd}>J</kbd> / <kbd className={kbd}>K</kbd> {t("shortcutMove")} ·{" "}
        <kbd className={kbd}>E</kbd> {t("shortcutArchive")} · <kbd className={kbd}>R</kbd> {t("shortcutReply")} ·{" "}
        <kbd className={kbd}>C</kbd> {t("shortcutCompose")}
      </p>
    </div>
  );
}
