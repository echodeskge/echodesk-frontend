"use client";

import { useMemo } from "react";

import { useEmailFolders } from "@/hooks/api/useSocial";
import { buildSidebarFolders, type SidebarFolder } from "@/lib/email-reading";

/**
 * Server folders for a connection, normalised to Outlook roles and order
 * (see buildSidebarFolders). `extraDbFolders` adds folder names only known
 * from synced messages.
 */
export function useSidebarFolders(
  connectionId: number | null | undefined,
  extraDbFolders: string[] = []
): { folders: SidebarFolder[]; isLoading: boolean } {
  const { data, isLoading } = useEmailFolders(connectionId ?? null);
  const extraKey = extraDbFolders.join("\u0000");
  const folders = useMemo(
    () => buildSidebarFolders(data ?? [], extraDbFolders),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, extraKey]
  );
  return { folders, isLoading };
}
