"use client";

import { useTranslations } from "next-intl";
import type { EmailMessage } from "@/hooks/api/useSocial";

import { cn } from "@/lib/utils";

/**
 * "Answered" / "New" tag for inbox rows. Answered = the business replied at
 * least once in the thread — from EchoDesk (has_business_reply) or from an
 * external email client (Sent-folder sync feeds the same flag; is_answered
 * additionally covers the IMAP \Answered marker). Business-sent rows (the
 * Sent folder view) get no tag.
 */
export function EmailAnsweredBadge({
  email,
  className,
}: {
  email: EmailMessage;
  className?: string;
}) {
  const t = useTranslations("email.list");

  if (email.is_from_business) return null;

  const answered = !!email.has_business_reply || email.is_answered;

  return (
    <span
      className={cn(
        "inline-flex h-4 shrink-0 items-center rounded border px-[5px] text-[10px] font-semibold leading-none",
        answered
          ? "border-green-600/30 bg-green-500/10 text-green-700 dark:text-green-400"
          : "border-primary/20 bg-primary/10 text-primary",
        className
      )}
    >
      {answered ? t("answered") : t("new")}
    </span>
  );
}
