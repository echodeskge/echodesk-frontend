"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import axios from "@/api/axios";

import { useEmailAction, type EmailMessage } from "@/hooks/api/useSocial";
import { Card } from "@/components/ui/card";
import { EmailNotFound } from "./email-not-found";
import { EmailViewContent } from "./email-view-content";
import { EmailViewHeader } from "./email-view-header";

interface EmailViewProps {
  emailId: number;
  filter: string;
}

export function EmailView({ emailId, filter }: EmailViewProps) {
  const {
    data: email,
    isLoading,
    error,
  } = useQuery<EmailMessage>({
    queryKey: ["email-message", emailId],
    queryFn: async () => {
      const response = await axios.get(`/api/social/email-messages/${emailId}/`);
      return response.data;
    },
  });

  const emailAction = useEmailAction();

  // Mark as read on mount
  useEffect(() => {
    if (email && !email.is_read) {
      emailAction.mutate({ message_ids: [emailId], action: "mark_read" });
    }
  }, [emailId, email?.is_read]); // eslint-disable-line react-hooks/exhaustive-deps

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
      <EmailViewContent email={email} filter={filter} />
    </Card>
  );
}
