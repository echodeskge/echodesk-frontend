"use client";

import { useEffect, useMemo } from "react";
import { Loader2 } from "lucide-react";

import {
  useEmailAction,
  useEmailMessageDetail,
  useEmailThreadMessages,
} from "@/hooks/api/useSocial";
import { defaultExpandedIds, sortThreadMessages } from "@/lib/email-reading";
import { Card, CardContent } from "@/components/ui/card";
import { EmailNotFound } from "./email-not-found";
import { EmailThread } from "./email-thread";
import { EmailViewContentActions } from "./email-view-content-actions";
import { EmailViewHeader } from "./email-view-header";

interface EmailViewProps {
  emailId: number;
  filter: string;
}

export function EmailView({ emailId, filter }: EmailViewProps) {
  const { data: email, isLoading, error } = useEmailMessageDetail(emailId);
  // Whole conversation (received + our Sent replies) for the reading pane.
  const { data: threadData } = useEmailThreadMessages(
    email?.thread_id,
    email?.connection_id
  );

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

  if (isLoading) {
    return (
      <Card className="flex-1 w-full md:w-auto flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  if (error || !email) return <EmailNotFound />;

  return (
    <Card className="flex-1 w-full md:w-auto overflow-auto">
      <EmailViewHeader email={email} filter={filter} />
      <CardContent className="p-3 space-y-3 overflow-hidden">
        <EmailViewContentActions email={email} filter={filter} />
        <EmailThread
          key={emailId}
          messages={messages}
          openedId={emailId}
          filter={filter}
        />
      </CardContent>
    </Card>
  );
}
