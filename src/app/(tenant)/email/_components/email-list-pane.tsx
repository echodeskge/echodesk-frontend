"use client";

import { cn } from "@/lib/utils";
import { EmailListContent } from "./email-list-content";
import { EmailListFooter } from "./email-list-footer";

interface EmailListPaneProps {
  filter: string;
  openId: number | null;
  className?: string;
}

/** Design conversation list: toolbar, rows, 32px footer. */
export function EmailListPane({ filter, openId, className }: EmailListPaneProps) {
  return (
    <section
      className={cn(
        "w-full min-w-0 shrink-0 flex-col border-r border-border bg-background md:w-[340px] lg:w-[372px]",
        className
      )}
      data-testid="email-list-pane"
    >
      <EmailListContent filter={filter} openId={openId} />
      <EmailListFooter filter={filter} />
    </section>
  );
}
