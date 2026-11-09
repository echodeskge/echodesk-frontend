"use client";

import { Plus } from "lucide-react";

/** Primary "New ticket" button (32px, Plus 14); icon only below `sm`. Header slot content: props only. */
export function NewTicketButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      data-testid="new-ticket"
      className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-md bg-primary px-2.5 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
    >
      <Plus aria-hidden="true" size={14} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
