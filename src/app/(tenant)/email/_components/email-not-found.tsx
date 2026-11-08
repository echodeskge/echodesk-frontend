"use client";

import { MailX } from "lucide-react";
import { useTranslations } from "next-intl";

interface EmailNotFoundProps {
  inline?: boolean;
}

/** The message could not be loaded (deleted, no access). */
export function EmailNotFound(_props: EmailNotFoundProps) {
  const t = useTranslations("email.list");
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6">
      <MailX className="h-10 w-10 text-muted-foreground/60" />
      <p className="text-center text-[13px] text-muted-foreground">{t("notFound")}</p>
    </div>
  );
}
