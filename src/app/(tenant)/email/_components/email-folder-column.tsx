"use client";

import { EmailSidebarList } from "./email-sidebar-list";

/** Design folder column: 200px, tinted, desktop only (mobile uses the header folder picker). */
export function EmailFolderColumn({ filter: _filter }: { filter: string }) {
  return (
    <nav
      className="hidden w-[200px] shrink-0 flex-col overflow-y-auto border-r border-border bg-muted/35 px-2 py-2.5 md:flex"
      data-testid="email-folder-column"
    >
      <EmailSidebarList />
    </nav>
  );
}
