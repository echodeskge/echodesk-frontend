"use client";

import { Check, ChevronDown, Mail } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface EmailAccountOption {
  id: number;
  label: string;
}

interface EmailAccountPillProps {
  accounts: EmailAccountOption[];
  currentId: number | null;
  onChange: (id: number | null) => void;
  /** Already-translated labels (rendered in the app header, outside the email providers). */
  labels: { allAccounts: string; switchAccount: string };
}

/**
 * Design account pill in the header: Mail icon, account, chevron. Rendered in
 * the layout's header slot, so it takes everything as props.
 */
export function EmailAccountPill({ accounts, currentId, onChange, labels }: EmailAccountPillProps) {
  if (accounts.length === 0) return null;
  const current = accounts.find((a) => a.id === currentId);
  const text = current?.label ?? (accounts.length === 1 ? accounts[0].label : labels.allAccounts);

  const pill = (
    <span className="inline-flex h-6 max-w-[240px] items-center gap-1.5 rounded-full border border-border pe-2 ps-[7px] text-xs font-normal text-muted-foreground">
      <Mail className="h-3 w-3 shrink-0" />
      <span className="hidden truncate text-foreground sm:inline">{text}</span>
      {accounts.length > 1 && <ChevronDown className="h-3 w-3 shrink-0" />}
    </span>
  );

  if (accounts.length === 1) return <span className="ms-2 inline-flex">{pill}</span>;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="ms-2 inline-flex rounded-full hover:bg-muted"
          title={labels.switchAccount}
          aria-label={labels.switchAccount}
          data-testid="email-account-pill"
        >
          {pill}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[220px]">
        {[{ id: null as number | null, label: labels.allAccounts }, ...accounts].map((a) => (
          <DropdownMenuItem
            key={a.id ?? "all"}
            onClick={() => onChange(a.id)}
            className="gap-2 text-[13px]"
          >
            <Check className={cn("h-3.5 w-3.5", a.id === currentId ? "opacity-100" : "opacity-0")} />
            <span className="truncate">{a.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
