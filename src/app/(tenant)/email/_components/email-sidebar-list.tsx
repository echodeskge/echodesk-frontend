"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { Star, Pencil } from "lucide-react";

import { useEmailFolders, useEmailMessages } from "@/hooks/api/useSocial";
import { useEmailContext } from "../_hooks/use-email-context";
import { getFolderIcon } from "../constants";
import { EmailSidebarItem } from "./email-sidebar-item";
import type { EmailFolder } from "@/hooks/api/useSocial";

/** Clean up IMAP folder names for display */
function getDisplayName(name: string): string {
  if (name === "INBOX") return "Inbox";
  let display = name
    .replace(/^\[Gmail\]\//i, "")
    .replace(/^INBOX\//i, "")
    .replace(/^INBOX\./i, "")
    .replace(/\./g, " / ");
  return display || name;
}

export function EmailSidebarList() {
  const { currentConnectionId } = useEmailContext();
  const params = useParams();
  const rawFilter = params.filter as string | undefined;
  const filterParam = rawFilter ? decodeURIComponent(rawFilter) : undefined;

  const { data: folders, isLoading } = useEmailFolders(currentConnectionId);
  // Also fetch first page of emails to discover folders not in IMAP list
  const { data: emailsData } = useEmailMessages({
    page: 1,
    connection_id: currentConnectionId ?? undefined,
  });

  const visibleFolders = useMemo(() => {
    const imapFolders = folders ?? [];
    const folderNames = new Set(imapFolders.map((f) => f.name));

    // Add folders found in actual emails that aren't in IMAP list
    const emailFolders: EmailFolder[] = [];
    if (emailsData?.results) {
      for (const email of emailsData.results) {
        if (email.folder && !folderNames.has(email.folder)) {
          folderNames.add(email.folder);
          emailFolders.push({
            name: email.folder,
            display_name: email.folder,
          });
        }
      }
    }

    const allFolders = [...imapFolders, ...emailFolders];
    return allFolders
      .filter((folder) => {
        // Filter out namespace-only folders (e.g. "[Gmail]" parent)
        // But always keep INBOX even if subfolders like INBOX/Invoices exist
        if (folder.name === "INBOX") return true;
        const isNamespaceOnly = allFolders.some(
          (other) =>
            other.name !== folder.name &&
            other.name.startsWith(folder.name + "/")
        );
        return !isNamespaceOnly;
      })
      .sort((a, b) => {
        if (a.name === "INBOX") return -1;
        if (b.name === "INBOX") return 1;
        return a.name.localeCompare(b.name);
      });
  }, [folders, emailsData]);

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
            {visibleFolders.map((folder) => (
              <EmailSidebarItem
                key={folder.name}
                name={folder.name}
                displayName={getDisplayName(folder.name)}
                iconName={getFolderIcon(folder.name)}
                isActive={filterParam === folder.name}
              />
            ))}

            <div>
              <h4 className="mt-4 mb-1 ms-4 text-sm font-medium text-muted-foreground">
                Virtual
              </h4>
              <EmailSidebarItem
                name="starred"
                displayName="Starred"
                iconName="Star"
                isActive={filterParam === "starred"}
                lucideIcon={Star}
              />
              <EmailSidebarItem
                name="drafts"
                displayName="Drafts"
                iconName="Pencil"
                isActive={filterParam === "drafts"}
                lucideIcon={Pencil}
              />
            </div>
          </>
        )}
      </nav>
    </ul>
  );
}
