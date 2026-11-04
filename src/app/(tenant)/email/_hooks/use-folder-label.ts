"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";

import { customFolderLabel, type SidebarFolder } from "@/lib/email-reading";

const ROLE_LABEL_KEYS = {
  inbox: "inbox",
  drafts: "drafts",
  sent: "sentItems",
  trash: "deletedItems",
  junk: "junk",
  archive: "archive",
} as const;

/** Localised Outlook folder label: role folders get fixed names, custom keep theirs. */
export function useFolderLabel() {
  const t = useTranslations("email.sidebar");
  return useCallback(
    (folder: Pick<SidebarFolder, "role" | "name" | "serverName">) => {
      if (folder.role !== "custom") return t(ROLE_LABEL_KEYS[folder.role]);
      return customFolderLabel(folder.serverName || folder.name);
    },
    [t]
  );
}
