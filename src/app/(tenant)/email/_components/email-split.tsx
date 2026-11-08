"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { useParams, usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { useEmailContext } from "../_hooks/use-email-context";
import { useEmailShortcuts } from "../_hooks/use-email-shortcuts";
import { EmailFolderColumn } from "./email-folder-column";
import { EmailHeaderBridge } from "./email-header-bridge";
import { EmailListPane } from "./email-list-pane";

interface EmailSplitProps {
  /** Folder or view route shown in the list. */
  filter: string;
  /** Reading pane / composer content. */
  children: ReactNode;
  /** Force the pane open (compose). Otherwise: open when a message id is in the URL. */
  paneOpen?: boolean;
}

/**
 * Design three-pane layout: folders (200px) | conversation list (~372px) |
 * reading pane. Below md the folder column is hidden (header folder picker)
 * and list / pane show one at a time.
 */
export function EmailSplit({ filter, children, paneOpen }: EmailSplitProps) {
  const { setLastFilter, handleClearSelection } = useEmailContext();
  const params = useParams();
  const pathname = usePathname();
  const openId = params?.id ? Number(params.id) : null;
  const isPaneOpen = paneOpen || openId != null || pathname?.endsWith("/compose");

  useEffect(() => {
    if (!paneOpen) setLastFilter(filter);
  }, [filter, paneOpen, setLastFilter]);

  // A new folder starts without a selection.
  useEffect(() => {
    handleClearSelection();
  }, [filter, handleClearSelection]);

  useEmailShortcuts({ filter, openId });

  return (
    <>
      <EmailHeaderBridge filter={filter} />
      <EmailFolderColumn filter={filter} />
      <EmailListPane
        filter={filter}
        openId={openId}
        className={cn(isPaneOpen ? "hidden md:flex" : "flex")}
      />
      <section
        className={cn(
          "min-w-0 flex-1 flex-col overflow-hidden bg-background",
          isPaneOpen ? "flex" : "hidden md:flex"
        )}
        data-testid="email-pane"
      >
        {children}
      </section>
    </>
  );
}
