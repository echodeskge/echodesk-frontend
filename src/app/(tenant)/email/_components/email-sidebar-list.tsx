"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { CircleDashed, Star, Ticket, UserCheck } from "lucide-react";

import { useEmailMessages } from "@/hooks/api/useSocial";
import type { FolderRole } from "@/lib/email-reading";
import { useEmailContext } from "../_hooks/use-email-context";
import { useFolderLabel } from "../_hooks/use-folder-label";
import { useSidebarFolders } from "../_hooks/use-sidebar-folders";
import { getFolderIcon } from "../constants";
import { EmailSidebarItem } from "./email-sidebar-item";

const ROLE_ICON: Record<Exclude<FolderRole, "custom">, string> = {
  inbox: "Inbox",
  drafts: "Pencil",
  sent: "Send",
  trash: "Trash2",
  junk: "AlertCircle",
  archive: "Archive",
};

/**
 * Outlook-style folder list: Inbox, Drafts, Sent Items, Deleted Items, Junk,
 * Archive, then custom folders alphabetically, each with its unread badge.
 * Drafts opens the EchoDesk drafts list (virtual "drafts" route).
 */
export function EmailSidebarList() {
  const { currentConnectionId, lastFilter } = useEmailContext();
  const params = useParams();
  const rawFilter = params.filter as string | undefined;
  // Compose has no folder in the URL: keep the folder the list shows.
  const filterParam = rawFilter ? decodeURIComponent(rawFilter) : lastFilter;
  const t = useTranslations("email.sidebar");
  const folderLabel = useFolderLabel();

  // Folder names only known from synced messages (e.g. before the server
  // LIST answers, or folders the server no longer reports).
  const { data: emailsData } = useEmailMessages({
    page: 1,
    connection_id: currentConnectionId ?? undefined,
  });
  const dbFolders = useMemo(
    () =>
      Array.from(
        new Set(
          (emailsData?.results ?? [])
            .map((email) => email.folder)
            .filter((f): f is string => !!f)
        )
      ),
    [emailsData]
  );

  const { folders, isLoading } = useSidebarFolders(currentConnectionId, dbFolders);

  const views = [
    { name: "starred", label: t("starred"), icon: Star },
    { name: "assigned", label: t("assignedToMe"), icon: UserCheck },
    { name: "unassigned", label: t("unassigned"), icon: CircleDashed },
    { name: "ticketed", label: t("ticketed"), icon: Ticket },
  ];

  return (
    <nav className="flex flex-col gap-0.5" aria-label={t("title")}>
      <ul className="flex flex-col gap-0.5">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="h-[30px] animate-pulse rounded-md bg-muted" />
            ))
          : folders.map((folder) => (
              <EmailSidebarItem
                key={`${folder.role}:${folder.name}`}
                name={folder.name}
                displayName={folderLabel(folder)}
                iconName={
                  folder.role === "custom"
                    ? getFolderIcon(folder.name)
                    : ROLE_ICON[folder.role]
                }
                isActive={filterParam === folder.name}
                // Outlook shows no unread count on Sent Items.
                unreadCount={folder.role === "sent" ? 0 : folder.unreadCount}
                strongCount={folder.role === "inbox"}
              />
            ))}
      </ul>
      <h4 className="mt-2 flex h-6 items-center px-2 text-[11px] font-medium uppercase tracking-[.04em] text-muted-foreground">
        {t("views")}
      </h4>
      <ul className="flex flex-col gap-0.5">
        {views.map((view) => (
          <EmailSidebarItem
            key={view.name}
            name={view.name}
            displayName={view.label}
            iconName={view.name}
            isActive={filterParam === view.name}
            lucideIcon={view.icon}
          />
        ))}
      </ul>
    </nav>
  );
}
