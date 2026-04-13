"use client";

import type { EmailMessage } from "@/hooks/api/useSocial";

import { useEmailContext } from "../_hooks/use-email-context";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmailListContentItemMobile } from "./email-list-content-item-mobile";

interface EmailListContentMobileProps {
  emails: EmailMessage[];
  filter: string;
}

export function EmailListContentMobile({
  emails,
  filter,
}: EmailListContentMobileProps) {
  const { selectedEmailIds } = useEmailContext();
  const selectedSet = new Set(selectedEmailIds);

  return (
    <ul>
      <ScrollArea className="h-[calc(100vh-18.5rem)]">
        {emails.map((email) => (
          <EmailListContentItemMobile
            key={email.id}
            email={email}
            filter={filter}
            isSelected={selectedSet.has(email.id)}
          />
        ))}
      </ScrollArea>
    </ul>
  );
}
