"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Star } from "lucide-react";

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
  const { currentConnectionId } = useEmailContext();
  const params = useParams();
  const rawFilter = params.filter as string | undefined;
  const filterParam = rawFilter ? decodeURIComponent(rawFilter) : undefined;
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

  return (
    <ul className="p-3 pt-0">
      <nav className="space-y-1.5">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-9 bg-muted animate-pulse rounded-md"
            />
          ))
        ) : (
          <>
            {folders.map((folder) => (
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
              />
            ))}

            <div>
              <h4 className="mt-4 mb-1 ms-4 text-sm font-medium text-muted-foreground">
                {t("virtual")}
              </h4>
              <EmailSidebarItem
                name="starred"
                displayName={t("starred")}
                iconName="Star"
                isActive={filterParam === "starred"}
                lucideIcon={Star}
              />
            </div>
          </>
        )}
      </nav>
    </ul>
  );
}
