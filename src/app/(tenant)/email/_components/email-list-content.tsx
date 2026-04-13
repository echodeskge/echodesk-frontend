"use client";

import { useSearchParams } from "next/navigation";
import { useMedia } from "react-use";

import {
  useEmailMessages,
  useEmailDrafts,
  type EmailMessage,
} from "@/hooks/api/useSocial";
import type { EmailDraft } from "@/api/generated/interfaces";
import { useEmailContext } from "../_hooks/use-email-context";
import { buildQueryParams } from "./email-list-header";
import { CardContent } from "@/components/ui/card";
import { EmailListContentHeader } from "./email-list-content-header";
import { EmailListContentDesktop } from "./email-list-content-desktop";
import { EmailListContentMobile } from "./email-list-content-mobile";
import { EmailNotFound } from "./email-not-found";
import { Loader2 } from "lucide-react";

interface EmailListContentProps {
  filter: string;
}

export function EmailListContent({ filter }: EmailListContentProps) {
  const { currentConnectionId } = useEmailContext();
  const searchParams = useSearchParams();
  const isMediumOrSmaller = useMedia("(max-width: 767px)");

  const page = parseInt(searchParams.get("page") ?? "1");
  const search = searchParams.get("search") ?? undefined;

  const isDrafts = filter === "drafts";

  const queryParams = buildQueryParams(
    filter,
    currentConnectionId,
    page,
    search
  );
  const {
    data: messagesData,
    isLoading: messagesLoading,
    error: messagesError,
  } = useEmailMessages(isDrafts ? undefined : queryParams);

  const {
    data: draftsData,
    isLoading: draftsLoading,
    error: draftsError,
  } = useEmailDrafts();

  const isLoading = isDrafts ? draftsLoading : messagesLoading;
  const error = isDrafts ? draftsError : messagesError;

  // For drafts, transform to EmailMessage-like shape
  const drafts = (draftsData?.results ?? []) as EmailDraft[];
  const emails: EmailMessage[] = isDrafts
    ? (drafts.map((draft) => ({
        id: draft.id,
        message_id: "",
        thread_id: "",
        in_reply_to: "",
        references: "",
        from_email: "",
        from_name: draft.created_by_name || "Draft",
        to_emails: Array.isArray(draft.to_emails) ? draft.to_emails : [],
        cc_emails: Array.isArray(draft.cc_emails) ? draft.cc_emails : [],
        bcc_emails: Array.isArray(draft.bcc_emails) ? draft.bcc_emails : [],
        reply_to: "",
        subject: draft.subject || "(No subject)",
        body_text: draft.body_text || "",
        body_html: draft.body_html || "",
        attachments: Array.isArray(draft.attachments) ? draft.attachments : [],
        timestamp: draft.updated_at,
        folder: "Drafts",
        uid: "",
        is_from_business: true,
        is_read: true,
        is_starred: false,
        is_answered: false,
        is_draft: true,
        labels: [],
        is_read_by_staff: true,
        read_by_staff_at: null,
        is_deleted: false,
        deleted_at: null,
        connection_id: draft.connection,
        connection_email: "",
        connection_display_name: "",
        created_at: draft.created_at,
        updated_at: draft.updated_at,
      })) as EmailMessage[])
    : (messagesData?.results ?? []) as EmailMessage[];

  if (isLoading) {
    return (
      <CardContent className="flex-1 h-full flex items-center justify-center p-0">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </CardContent>
    );
  }

  if (error) {
    return (
      <CardContent className="flex-1 h-full flex items-center justify-center p-0">
        <p className="text-destructive">Failed to load emails</p>
      </CardContent>
    );
  }

  if (emails.length === 0) {
    return (
      <CardContent className="flex-1 h-full flex flex-col p-0">
        <EmailListContentHeader emails={emails} />
        <EmailNotFound inline />
      </CardContent>
    );
  }

  return (
    <CardContent className="flex-1 h-full flex flex-col p-0">
      <EmailListContentHeader emails={emails} />
      {isMediumOrSmaller ? (
        <EmailListContentMobile emails={emails} filter={filter} />
      ) : (
        <EmailListContentDesktop emails={emails} filter={filter} />
      )}
    </CardContent>
  );
}
