"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Forward, Reply, ReplyAll } from "lucide-react";
import type { EmailMessage } from "@/hooks/api/useSocial";

interface EmailViewContentFooterProps {
  email: EmailMessage;
  filter: string;
}

const outline =
  "inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-[13px] font-medium transition-colors hover:bg-muted";

/** Design outline Reply / Reply all / Forward buttons under the conversation. */
export function EmailViewContentFooter({ email }: EmailViewContentFooterProps) {
  const router = useRouter();
  const t = useTranslations("email.view");

  return (
    <div className="flex flex-wrap gap-1.5" data-testid="email-reply-actions">
      <button type="button" className={outline} onClick={() => router.push(`/email/compose?reply_to=${email.id}`)}>
        <Reply className="h-3.5 w-3.5" />
        <span>{t("reply")}</span>
      </button>
      <button type="button" className={outline} onClick={() => router.push(`/email/compose?reply_all=${email.id}`)}>
        <ReplyAll className="h-3.5 w-3.5" />
        <span>{t("replyAll")}</span>
      </button>
      <button type="button" className={outline} onClick={() => router.push(`/email/compose?forward=${email.id}`)}>
        <Forward className="h-3.5 w-3.5" />
        <span>{t("forward")}</span>
      </button>
    </div>
  );
}
