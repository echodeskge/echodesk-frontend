"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Forward, Reply, ReplyAll } from "lucide-react";
import type { EmailMessage } from "@/hooks/api/useSocial";

interface EmailViewContentFooterProps {
  /** The message Reply / Reply all / Forward act on (see replyTarget). */
  email: EmailMessage;
  filter: string;
  /** Compact icon buttons (per message card). */
  compact?: boolean;
}

const outline =
  "inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-[13px] font-medium transition-colors hover:bg-muted";

/** Design outline Reply / Reply all / Forward buttons under the conversation. */
const iconBtn =
  "inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

export function EmailViewContentFooter({ email, compact = false }: EmailViewContentFooterProps) {
  const router = useRouter();
  const t = useTranslations("email.view");

  if (compact) {
    return (
      <div className="flex items-center gap-0.5" data-testid={`email-card-actions-${email.id}`}>
        <button type="button" className={iconBtn} aria-label={t("reply")} title={t("reply")} onClick={() => router.push(`/email/compose?reply_to=${email.id}`)}>
          <Reply className="h-3.5 w-3.5" />
        </button>
        <button type="button" className={iconBtn} aria-label={t("replyAll")} title={t("replyAll")} onClick={() => router.push(`/email/compose?reply_all=${email.id}`)}>
          <ReplyAll className="h-3.5 w-3.5" />
        </button>
        <button type="button" className={iconBtn} aria-label={t("forward")} title={t("forward")} onClick={() => router.push(`/email/compose?forward=${email.id}`)}>
          <Forward className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

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
