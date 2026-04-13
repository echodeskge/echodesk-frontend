"use client";

import type { EmailMessage } from "@/hooks/api/useSocial";

import { CardContent } from "@/components/ui/card";
import { EmailViewContentActions } from "./email-view-content-actions";
import { EmailViewContentBody } from "./email-view-content-body";
import { EmailViewContentFooter } from "./email-view-content-footer";
import { EmailViewContentHeader } from "./email-view-content-header";

interface EmailViewContentProps {
  email: EmailMessage;
  filter: string;
}

export function EmailViewContent({ email, filter }: EmailViewContentProps) {
  return (
    <CardContent className="p-3 space-y-3 overflow-hidden">
      <EmailViewContentActions email={email} />
      <EmailViewContentHeader email={email} />
      <EmailViewContentBody email={email} />
      <EmailViewContentFooter email={email} filter={filter} />
    </CardContent>
  );
}
