"use client";

import { useLocale, useTranslations } from "next-intl";
import type { EmailMessage } from "@/hooks/api/useSocial";

import { avatarTone, emailInitials, fullTime } from "@/lib/email-ui";

interface EmailViewContentHeaderProps {
  email: EmailMessage;
}

/** Design message header: avatar, name + address, to / cc line, time. */
export function EmailViewContentHeader({ email }: EmailViewContentHeaderProps) {
  const senderName = email.from_name || email.from_email;
  const t = useTranslations("email.view");
  const locale = useLocale();
  // Always show the recipient's email address (not the display name): the To
  // name is set by each sender's own address book, so it's inconsistent across
  // messages — some carry a label, some don't. The address is stable.
  const toList = (email.to_emails ?? [])
    .map((a: { email: string }) => a.email)
    .join(", ");
  const ccList = (email.cc_emails ?? [])
    .map((c: { email: string }) => c.email)
    .join(", ");

  return (
    <>
      <span
        aria-hidden
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${avatarTone(senderName)}`}
      >
        {emailInitials(senderName)}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex min-w-0 items-baseline gap-1.5">
          <span className="shrink-0 text-[13px] font-semibold">{senderName}</span>
          {email.from_name && (
            <span className="truncate text-xs text-muted-foreground">{email.from_email}</span>
          )}
        </span>
        {(toList || ccList) && (
          <span className="truncate text-xs text-muted-foreground">
            {toList && `${t("to")}: ${toList}`}
            {toList && ccList && " · "}
            {ccList && `${t("cc")}: ${ccList}`}
          </span>
        )}
      </span>
      <span className="shrink-0 text-xs text-muted-foreground">{fullTime(email.timestamp, locale)}</span>
    </>
  );
}
