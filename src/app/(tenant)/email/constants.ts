export const PAGE_SIZE = 10;

export const FOLDER_ICON_MAP: Record<string, string> = {
  INBOX: "Inbox",
  Sent: "Send",
  Draft: "Pencil",
  Drafts: "Pencil",
  Spam: "AlertCircle",
  Junk: "AlertCircle",
  Trash: "Trash2",
  Deleted: "Trash2",
  Archive: "Archive",
};

/** Match a folder name to an icon, falling back to "Folder" */
export function getFolderIcon(folderName: string): string {
  // Exact match first
  if (FOLDER_ICON_MAP[folderName]) return FOLDER_ICON_MAP[folderName];
  // Case-insensitive partial match
  const lower = folderName.toLowerCase();
  for (const [pattern, icon] of Object.entries(FOLDER_ICON_MAP)) {
    if (lower.includes(pattern.toLowerCase())) return icon;
  }
  return "Folder";
}

/** Saved views over conversations: route name → backend `view` filter. */
export const EMAIL_VIEWS = {
  assigned: "assigned_to_me",
  unassigned: "unassigned",
  ticketed: "ticketed",
} as const;
export type EmailViewRoute = keyof typeof EMAIL_VIEWS;

export function isEmailViewRoute(name: string): name is EmailViewRoute {
  return Object.prototype.hasOwnProperty.call(EMAIL_VIEWS, name);
}

/** Virtual folder names that don't map to real IMAP folders */
export const VIRTUAL_FOLDERS = ["starred", "drafts", "assigned", "unassigned", "ticketed"] as const;
export type VirtualFolder = (typeof VIRTUAL_FOLDERS)[number];

export function isVirtualFolder(name: string): name is VirtualFolder {
  return VIRTUAL_FOLDERS.includes(name as VirtualFolder);
}
