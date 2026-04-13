"use client";

import type { EmailMessage } from "@/hooks/api/useSocial";

import { useEmailContext } from "../_hooks/use-email-context";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody } from "@/components/ui/table";
import { EmailListRowDesktop } from "./email-list-row-desktop";

interface EmailListContentDesktopProps {
  emails: EmailMessage[];
  filter: string;
}

export function EmailListContentDesktop({
  emails,
  filter,
}: EmailListContentDesktopProps) {
  const { selectedEmailIds } = useEmailContext();
  const selectedSet = new Set(selectedEmailIds);

  return (
    <ScrollArea className="h-[calc(100vh-16.5rem)]">
      <Table>
        <TableBody>
          {emails.map((email) => (
            <EmailListRowDesktop
              key={email.id}
              email={email}
              filter={filter}
              isSelected={selectedSet.has(email.id)}
            />
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}
