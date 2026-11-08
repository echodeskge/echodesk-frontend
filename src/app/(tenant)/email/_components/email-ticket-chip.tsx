"use client";

import Link from "next/link";
import { Ticket } from "lucide-react";

import type { EmailThreadTicket } from "@/hooks/api/useSocial";
import { cn } from "@/lib/utils";

/** Design tag chip for the ticket a conversation became ("#1234"). */
export function EmailTicketChip({
  ticket,
  size = "sm",
  link = false,
  className,
}: {
  ticket: EmailThreadTicket;
  size?: "sm" | "md";
  link?: boolean;
  className?: string;
}) {
  const classes = cn(
    "inline-flex shrink-0 items-center gap-1 rounded border border-blue-500/25 bg-blue-500/10 font-semibold leading-none text-blue-700 dark:text-blue-300",
    size === "sm" ? "h-4 px-[5px] text-[10px]" : "h-5 px-1.5 text-[11px]",
    link && "hover:bg-blue-500/20",
    className
  );
  const content = (
    <>
      {size === "md" && <Ticket className="h-3 w-3" />}#{ticket.id}
    </>
  );
  if (link) {
    return (
      <Link href={`/tickets/${ticket.id}`} className={classes} title={ticket.title} onClick={(e) => e.stopPropagation()}>
        {content}
      </Link>
    );
  }
  return (
    <span className={classes} title={ticket.title}>
      {content}
    </span>
  );
}
