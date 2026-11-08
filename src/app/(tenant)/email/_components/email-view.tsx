"use client";

import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronLeft, Loader2 } from "lucide-react";

import {
  useEmailAction,
  useEmailMessageDetail,
  useEmailThreadMessages,
  useMoveEmail,
} from "@/hooks/api/useSocial";
import { defaultExpandedIds, sortThreadMessages } from "@/lib/email-reading";
import { useEmailContext } from "../_hooks/use-email-context";
import { useSidebarFolders } from "../_hooks/use-sidebar-folders";
import { EmailNotFound } from "./email-not-found";
import { EmailThread } from "./email-thread";
import { archiveTargets, EmailViewContentActions } from "./email-view-content-actions";
import { EmailViewContentFooter } from "./email-view-content-footer";
import { EmailTicketChip } from "./email-ticket-chip";

interface EmailViewProps {
  emailId: number;
  filter: string;
}

/** Design reading pane: toolbar, subject, message cards, reply buttons. */
export function EmailView({ emailId, filter }: EmailViewProps) {
  const t = useTranslations("email");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { paneActions } = useEmailContext();
  const { data: email, isLoading, error } = useEmailMessageDetail(emailId);
  // Whole conversation (received + our Sent replies) for the reading pane.
  const { data: threadData } = useEmailThreadMessages(
    email?.thread_id,
    email?.connection_id
  );
  const { folders } = useSidebarFolders(email?.connection_id);
  const moveEmail = useMoveEmail();

  const messages = useMemo(
    () => (email ? sortThreadMessages(threadData ?? [], email) : []),
    [threadData, email]
  );

  const emailAction = useEmailAction();

  // Mark the messages shown expanded on open (opened + latest) as read.
  const unreadOnOpen = useMemo(() => {
    const expanded = defaultExpandedIds(messages, emailId);
    return messages
      .filter((m) => expanded.has(m.id) && !m.is_read)
      .map((m) => m.id);
  }, [messages, emailId]);
  const unreadKey = unreadOnOpen.join(",");

  useEffect(() => {
    if (unreadOnOpen.length > 0) {
      emailAction.mutate({ message_ids: unreadOnOpen, action: "mark_read" });
    }
  }, [unreadKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const qs = searchParams.toString();
  const listHref = `/email/${encodeURIComponent(filter)}${qs ? `?${qs}` : ""}`;

  // Keyboard shortcuts (E archive, R reply) act on this conversation.
  useEffect(() => {
    if (!email) return;
    const { archiveFolder } = archiveTargets(email, folders);
    paneActions.current = {
      reply: () => router.push(`/email/compose?reply_to=${email.id}`),
      archive:
        archiveFolder && email.message_id
          ? () =>
              moveEmail.mutate(
                {
                  message_id: email.message_id,
                  source_folder: email.folder || "INBOX",
                  target_folder: archiveFolder.name,
                  connection_id: email.connection_id,
                },
                { onSuccess: () => router.push(listHref) }
              )
          : undefined,
    };
    return () => {
      paneActions.current = {};
    };
  }, [email, folders, listHref]); // eslint-disable-line react-hooks/exhaustive-deps

  const backBar = (
    <button
      type="button"
      onClick={() => router.push(listHref)}
      className="flex h-10 shrink-0 items-center gap-1 border-b border-border px-2 text-[13px] text-muted-foreground hover:text-foreground md:hidden"
      data-testid="email-back"
    >
      <ChevronLeft className="h-4 w-4" />
      {t("view.backToList")}
    </button>
  );

  if (isLoading) {
    return (
      <>
        {backBar}
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  if (error || !email) {
    return (
      <>
        {backBar}
        <EmailNotFound inline />
      </>
    );
  }

  return (
    <>
      {backBar}
      <EmailViewContentActions email={email} filter={filter} />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-5 sm:px-6" data-testid="email-view">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold leading-6 tracking-[-0.01em] [overflow-wrap:anywhere]">
            {email.subject || t("list.noSubject")}
          </h2>
          {email.ticket && <EmailTicketChip ticket={email.ticket} size="md" link />}
        </div>
        <EmailThread key={emailId} messages={messages} openedId={emailId} filter={filter} />
        <div className="mt-4">
          <EmailViewContentFooter email={email} filter={filter} />
        </div>
      </div>
    </>
  );
}
