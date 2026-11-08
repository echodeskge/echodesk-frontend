"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronDown, PenLine, RefreshCw } from "lucide-react";

import { useHeaderActions } from "@/contexts/HeaderActionsContext";
import { useEmailStatus, useSyncEmail } from "@/hooks/api/useSocial";
import { toSidebarFolder } from "@/lib/email-reading";
import { cn } from "@/lib/utils";
import { useEmailContext } from "../_hooks/use-email-context";
import { useFolderLabel } from "../_hooks/use-folder-label";
import { EmailAccountPill } from "./email-account-pill";

const VIRTUAL_LABEL_KEYS: Record<string, string> = {
  starred: "starred",
  drafts: "drafts",
  assigned: "assignedToMe",
  unassigned: "unassigned",
  ticketed: "ticketed",
};

/**
 * Fills the app header for the email screen: "Email / {folder}" (the folder is
 * the mobile folder picker), the account pill, Compose and Sync.
 */
export function EmailHeaderBridge({ filter }: { filter: string }) {
  const t = useTranslations("email");
  const folderLabel = useFolderLabel();
  const { currentConnectionId, setCurrentConnectionId, setIsEmailSidebarOpen } = useEmailContext();
  const { data: status } = useEmailStatus();
  const sync = useSyncEmail();

  const virtualKey = VIRTUAL_LABEL_KEYS[filter];
  const folder = virtualKey ? null : toSidebarFolder(filter);
  const label = virtualKey
    ? t(`sidebar.${virtualKey}`)
    : folder
      ? folderLabel(folder)
      : filter;

  const accounts = (status?.connections ?? []).map((c) => ({
    id: c.id,
    label: c.display_name || c.email_address,
  }));
  const accountsKey = accounts.map((a) => `${a.id}:${a.label}`).join("|");
  const syncing = sync.isPending;

  const composeLabel = t("sidebar.compose");
  const syncLabel = t("list.syncEmails");
  const allAccounts = t("sidebar.allAccounts");
  const switchAccount = t("header.switchAccount");
  const pickFolder = t("header.pickFolder");

  useHeaderActions(
    {
      breadcrumb: (
        <span className="flex min-w-0 items-center">
          <button
            type="button"
            onClick={() => setIsEmailSidebarOpen(true)}
            className="inline-flex h-6 min-w-0 items-center gap-1 rounded-md px-1 text-[13px] font-semibold hover:bg-muted md:pointer-events-none"
            aria-label={pickFolder}
            data-testid="email-folder-label"
          >
            <span className="truncate">{label}</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground md:hidden" />
          </button>
          <EmailAccountPill
            accounts={accounts}
            currentId={currentConnectionId}
            onChange={setCurrentConnectionId}
            labels={{ allAccounts, switchAccount }}
          />
        </span>
      ),
      primary: (
        <Link
          href="/email/compose"
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-2.5 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
          aria-label={composeLabel}
          data-testid="email-compose"
        >
          <PenLine className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{composeLabel}</span>
        </Link>
      ),
      icons: (
        <button
          type="button"
          onClick={() => sync.mutate(currentConnectionId ?? undefined)}
          disabled={syncing}
          title={syncLabel}
          aria-label={syncLabel}
          className="hidden h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-60 sm:inline-flex"
          data-testid="email-sync"
        >
          <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
        </button>
      ),
    },
    [label, accountsKey, currentConnectionId, syncing, composeLabel, syncLabel, allAccounts, switchAccount, pickFolder]
  );

  return null;
}
