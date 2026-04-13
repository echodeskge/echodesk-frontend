"use client";

import type { EmailMessage } from "@/hooks/api/useSocial";

import { formatDate, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface EmailViewContentHeaderProps {
  email: EmailMessage;
}

export function EmailViewContentHeader({ email }: EmailViewContentHeaderProps) {
  const senderName = email.from_name || email.from_email;
  const toList = email.to_emails
    .map((t) => t.name || t.email)
    .join(", ");

  return (
    <Card className="py-1">
      <CardHeader className="flex-row items-center gap-2 py-3">
        <Avatar>
          <AvatarFallback>{getInitials(senderName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <CardTitle>{senderName}</CardTitle>
          <CardDescription className="truncate">
            {email.from_email}
          </CardDescription>
          {toList && (
            <CardDescription className="truncate text-xs">
              To: {toList}
            </CardDescription>
          )}
        </div>
        <CardDescription className="ms-auto shrink-0">
          {formatDate(email.timestamp)}
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
