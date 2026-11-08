"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Check, Paperclip, Star } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { KeyboardEvent, MouseEvent } from "react";
import type { EmailMessage } from "@/hooks/api/useSocial";

import { cn } from "@/lib/utils";
import { useEmailAction } from "@/hooks/api/useSocial";
import { getListCounterparty, hasAttachments, messageSnippet } from "@/lib/email-reading";
import { avatarTone, emailInitials, listTime } from "@/lib/email-ui";
import { useEmailContext } from "../_hooks/use-email-context";
import { EmailAnsweredBadge } from "./email-answered-badge";
import { EmailListRowDeleteButton } from "./email-list-row-delete-button";
import { EmailTicketChip } from "./email-ticket-chip";

interface EmailListRowProps {
  email: EmailMessage;
  filter: string;
  isSelected: boolean;
  /** The conversation open in the reading pane. */
  isOpen?: boolean;
}

/**
 * Design conversation row: accent bar, checkbox, sender avatar; name + time;
 * tag + subject + paperclip; snippet + assignee + star.
 */
export function EmailListRow({ email, filter, isSelected, isOpen = false }: EmailListRowProps) {
  const { handleToggleSelectEmail } = useEmailContext();
  const emailAction = useEmailAction();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const t = useTranslations("email.list");
  const counterparty = getListCounterparty(email, filter);
  const unread = !email.is_read;
  const name =
    counterparty.kind === "to"
      ? `${t("toPrefix")} ${counterparty.label || t("noRecipients")}`
      : counterparty.label;

  function handleNavigate() {
    if (unread) {
      emailAction.mutate({ message_ids: [email.id], action: "mark_read" });
    }
    const qs = searchParams.toString();
    router.push(`/email/${encodeURIComponent(filter)}/${email.id}${qs ? `?${qs}` : ""}`);
  }

  function handleOnKeyDown(e: KeyboardEvent) {
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleNavigate();
    }
  }

  function handleToggleStar(e: MouseEvent) {
    e.stopPropagation();
    emailAction.mutate({
      message_ids: [email.id],
      action: email.is_starred ? "unstar" : "star",
    });
  }

  return (
    <li
      className={cn(
        "group relative flex cursor-pointer gap-2.5 border-b border-border py-2.5 pe-3 ps-3 outline-none transition-colors hover:bg-muted/50 focus-visible:bg-muted/50",
        (isOpen || isSelected) && "bg-muted hover:bg-muted"
      )}
      data-unread={unread || undefined}
      data-open={isOpen || undefined}
      data-testid={`email-row-${email.id}`}
      onClick={handleNavigate}
      onKeyDown={handleOnKeyDown}
      tabIndex={0}
      aria-current={isOpen ? "true" : undefined}
    >
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-0 start-0 w-[3px]",
          isOpen ? "bg-primary" : unread ? "bg-primary/70" : "bg-transparent"
        )}
      />
      <button
        type="button"
        role="checkbox"
        aria-checked={isSelected}
        aria-label={t("selectEmail")}
        onClick={(e) => {
          e.stopPropagation();
          handleToggleSelectEmail(email.id);
        }}
        className={cn(
          "mt-2.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-input transition-colors",
          isSelected && "border-primary bg-primary text-primary-foreground"
        )}
      >
        {isSelected && <Check className="h-3 w-3" />}
      </button>
      <span
        aria-hidden
        className={cn(
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
          avatarTone(counterparty.initialsSource)
        )}
      >
        {emailInitials(counterparty.initialsSource)}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-2">
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-[13px] leading-[18px]",
              unread ? "font-semibold text-foreground" : "font-normal text-foreground/90"
            )}
          >
            {name}
          </span>
          <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
            {listTime(email.timestamp, locale)}
          </span>
        </span>
        <span className="flex min-w-0 items-center gap-1.5">
          {email.ticket ? <EmailTicketChip ticket={email.ticket} /> : <EmailAnsweredBadge email={email} />}
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-[13px] leading-[18px]",
              unread ? "font-medium text-foreground" : "text-foreground/80"
            )}
          >
            {email.subject || t("noSubject")}
          </span>
          {hasAttachments(email) && (
            <Paperclip className="h-3 w-3 shrink-0 text-muted-foreground" aria-label={t("hasAttachments")} />
          )}
        </span>
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="min-w-0 flex-1 truncate text-xs leading-4 text-muted-foreground">
            {messageSnippet(email, 120)}
          </span>
          {email.assignee && (
            <span
              className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[7px] font-semibold text-primary"
              title={t("assignedTo", { name: email.assignee.name })}
              aria-label={t("assignedTo", { name: email.assignee.name })}
            >
              {email.assignee.initials}
            </span>
          )}
          <EmailListRowDeleteButton email={email} filter={filter} className="-my-1 h-5 w-5 max-md:hidden [&_svg]:h-3.5 [&_svg]:w-3.5" />
          <button
            type="button"
            onClick={handleToggleStar}
            aria-label={email.is_starred ? t("unstarEmail") : t("starEmail")}
            className={cn(
              "shrink-0 transition-colors hover:text-[#eab308]",
              email.is_starred ? "text-[#eab308]" : "text-muted-foreground/60"
            )}
          >
            <Star className={cn("h-3.5 w-3.5", email.is_starred && "fill-current")} />
          </button>
        </span>
      </span>
    </li>
  );
}
