"use client";

import type { EmailMessage } from "@/hooks/api/useSocial";

import { CardContent } from "@/components/ui/card";
import { EmailViewContentBody } from "./email-view-content-body";
import { EmailViewContentFooter } from "./email-view-content-footer";
import { EmailViewContentHeader } from "./email-view-content-header";

interface EmailViewContentProps {
  email: EmailMessage;
  filter: string;
}

/** One expanded message of the conversation: header, body, Reply / Reply all / Forward. */
export function EmailViewContent({ email, filter }: EmailViewContentProps) {
  return (
    <CardContent className="p-3 space-y-3 overflow-hidden">
      <EmailViewContentHeader email={email} />
      <EmailViewContentBody email={email} />
      <EmailViewContentFooter email={email} filter={filter} />
    </CardContent>
  );
}
