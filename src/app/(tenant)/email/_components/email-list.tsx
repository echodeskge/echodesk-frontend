"use client";

import { Card } from "@/components/ui/card";
import { EmailListContent } from "./email-list-content";
import { EmailListFooter } from "./email-list-footer";
import { EmailListHeader } from "./email-list-header";

interface EmailListProps {
  filter: string;
}

export function EmailList({ filter }: EmailListProps) {
  return (
    <Card className="flex-1 w-full flex flex-col md:w-auto">
      <EmailListHeader filter={filter} />
      <EmailListContent filter={filter} />
      <EmailListFooter filter={filter} />
    </Card>
  );
}
