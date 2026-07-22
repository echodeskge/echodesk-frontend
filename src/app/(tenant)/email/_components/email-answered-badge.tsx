"use client";

import { useTranslations } from "next-intl";
import type { EmailMessage } from "@/hooks/api/useSocial";

import { Badge } from "@/components/ui/badge";
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
    <Badge
      variant={answered ? "outline" : "default"}
      className={cn(
        "shrink-0 text-xs",
        answered && "border-green-600/40 text-green-700 dark:text-green-400",
        className
      )}
    >
      {answered ? t("answered") : t("new")}
    </Badge>
  );
}
