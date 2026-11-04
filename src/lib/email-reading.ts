/**
 * Pure helpers for the Outlook-style email reading experience: folder roles
 * and ordering, conversation (thread) ordering/collapse, list counterparty
 * ("To: …" in Sent Items) and safe HTML rendering (cid: images, remote image
 * blocking, links in a new tab).
 *
 * Kept free of React so the sidebar, list rows, reading pane and unit tests
 * share one implementation.
 */
import DOMPurify from "dompurify";

import type { EmailMessage } from "@/hooks/api/useSocial";

// ---------------------------------------------------------------------------
// Folder roles
// ---------------------------------------------------------------------------

export type FolderRole =
  | "inbox"
  | "drafts"
  | "sent"
  | "trash"
  | "junk"
  | "archive"
  | "custom";

/** Outlook sidebar order: Inbox, Drafts, Sent Items, Deleted Items, Junk, Archive, then custom. */
export const FOLDER_ROLE_ORDER: FolderRole[] = [
  "inbox",
  "drafts",
  "sent",
  "trash",
  "junk",
  "archive",
  "custom",
];

const KNOWN_ROLES = new Set<string>(FOLDER_ROLE_ORDER);

/**
 * Canonical DB folder names (C4): sync stores special folders under these
 * names, so the list filter for that role must use them.
 */
export const CANONICAL_FOLDER_BY_ROLE: Partial<Record<FolderRole, string>> = {
  inbox: "INBOX",
  sent: "Sent",
  trash: "Trash",
  junk: "Junk",
  archive: "Archive",
};

/** Virtual route for drafts (EmailDraft rows, not synced IMAP Drafts). */
export const DRAFTS_ROUTE = "drafts";

const SPECIAL_USE_FLAGS: Record<string, FolderRole> = {
  "\\sent": "sent",
  "\\trash": "trash",
  "\\junk": "junk",
  "\\drafts": "drafts",
  "\\archive": "archive",
};

/** Strip provider namespaces such as "[Gmail]/" or "INBOX." from a folder name. */
function folderLeaf(name: string): string {
  return name
    .replace(/^\[(gmail|google mail)\][/.]/i, "")
    .replace(/^INBOX[/.]/i, "")
    .trim();
}

/**
 * Classify a folder by IMAP special-use flags first, then by well-known names
 * (English + Georgian variants used by local providers).
 */
export function classifyFolderRole(
  name: string | null | undefined,
  flags?: string[] | null
): FolderRole {
  for (const flag of flags ?? []) {
    const role = SPECIAL_USE_FLAGS[String(flag).toLowerCase()];
    if (role) return role;
  }
  if (!name) return "custom";
  if (name.toUpperCase() === "INBOX") return "inbox";
  const leaf = folderLeaf(name).toLowerCase();
  if (/^(sent|sent items|sent mail|sent messages|გაგზავნილი)$/.test(leaf)) return "sent";
  if (/^(trash|deleted|deleted items|deleted messages|bin|წაშლილი)$/.test(leaf)) return "trash";
  if (/^(junk|junk e-?mail|spam|bulk mail|სპამი)$/.test(leaf)) return "junk";
  if (/^(drafts?|მონახაზები)$/.test(leaf)) return "drafts";
  if (/^(archive|archives|all mail|არქივი)$/.test(leaf)) return leaf === "all mail" ? "custom" : "archive";
  return "custom";
}

export function isTrashFolder(name: string | null | undefined): boolean {
  return classifyFolderRole(name) === "trash";
}

export function isSentFolder(name: string | null | undefined): boolean {
  return classifyFolderRole(name) === "sent";
}

/** One folder as returned by GET /email/folders/ — string (legacy) or object (C5). */
export interface RawFolderEntry {
  name?: string;
  display_name?: string;
  role?: string;
  flags?: string[];
  unread_count?: number;
  total_count?: number;
  /** Decoded server name when `name` is the DB folder name (folder_details). */
  server_name?: string;
  /** Raw modified UTF-7 server name (folder_details). */
  raw_name?: string;
}

export interface SidebarFolder {
  /** Value used in the /email/<filter> route and as the list `folder` filter. */
  name: string;
  /** Name on the IMAP server (target for a server move). */
  serverName: string;
  role: FolderRole;
  unreadCount: number;
  totalCount: number;
}

/** Normalise one folder entry (string or object) to a SidebarFolder. */
export function toSidebarFolder(entry: string | RawFolderEntry): SidebarFolder | null {
  const raw: RawFolderEntry = typeof entry === "string" ? { name: entry } : entry ?? {};
  const dbName = String(raw.name ?? "").trim();
  if (!dbName) return null;
  const serverName = String(raw.server_name ?? "").trim() || dbName;
  const role: FolderRole =
    raw.role && KNOWN_ROLES.has(raw.role)
      ? (raw.role as FolderRole)
      : classifyFolderRole(serverName, raw.flags);
  const name =
    role === "drafts" ? DRAFTS_ROUTE : CANONICAL_FOLDER_BY_ROLE[role] ?? dbName;
  return {
    name,
    serverName,
    role,
    unreadCount: Number(raw.unread_count) || 0,
    totalCount: Number(raw.total_count) || 0,
  };
}

type FolderListShape = {
  folders?: Array<string | RawFolderEntry>;
  folder_details?: Array<RawFolderEntry & { display_name?: string }>;
};

/** One connection's entries: `folder_details` (C5) when present, else `folders`. */
function entriesOf(d: FolderListShape): Array<string | RawFolderEntry> {
  if (Array.isArray(d.folder_details) && d.folder_details.length > 0) {
    return d.folder_details.map((f) => ({
      ...f,
      server_name: f.server_name ?? f.display_name ?? f.name,
    }));
  }
  return Array.isArray(d.folders) ? d.folders : [];
}

/**
 * Pull the folder entries out of a /email/folders/ response, whichever shape
 * it has: `{folders, folder_details}` for one connection,
 * `{connections: [{folders, folder_details}]}` for all. `folder_details`
 * (C5) carries the DB name, role, unread_count and total_count and is
 * preferred; the plain `folders` names are the legacy fallback.
 */
export function extractFolderEntries(data: unknown): Array<string | RawFolderEntry> {
  if (!data || typeof data !== "object") return [];
  const d = data as FolderListShape & {
    connections?: Array<FolderListShape & { success?: boolean }>;
  };
  if (Array.isArray(d.folders) || Array.isArray(d.folder_details)) return entriesOf(d);
  if (Array.isArray(d.connections)) {
    return d.connections.flatMap((c) => (c && c.success !== false ? entriesOf(c) : []));
  }
  if (Array.isArray(data)) return data as Array<string | RawFolderEntry>;
  return [];
}

/** Drop pure namespace parents (e.g. "[Gmail]" when "[Gmail]/Sent Mail" exists). */
function isNamespaceOnly(name: string, all: string[]): boolean {
  if (name.toUpperCase() === "INBOX") return false;
  return all.some(
    (other) =>
      other !== name && (other.startsWith(name + "/") || other.startsWith(name + "."))
  );
}

/**
 * Merge server folders (+ DB-only folder names seen on messages) into the
 * Outlook sidebar: one entry per special role in fixed order, then custom
 * folders alphabetically. Inbox, Drafts, Sent, Trash and Junk are always shown.
 * Counts of entries that collapse into one role are summed.
 */
export function buildSidebarFolders(
  entries: Array<string | RawFolderEntry>,
  extraDbFolders: string[] = []
): SidebarFolder[] {
  const parsed = [
    ...entries.map(toSidebarFolder),
    ...extraDbFolders.map((n) => toSidebarFolder(n)),
  ].filter((f): f is SidebarFolder => !!f);

  const allServerNames = parsed.map((f) => f.serverName);
  const byKey = new Map<string, SidebarFolder>();
  for (const folder of parsed) {
    if (folder.role === "custom" && isNamespaceOnly(folder.serverName, allServerNames)) continue;
    const key = folder.role === "custom" ? `custom:${folder.name}` : folder.role;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { ...folder });
      continue;
    }
    existing.unreadCount += folder.unreadCount;
    existing.totalCount += folder.totalCount;
    // Prefer a real server name over the canonical DB alias for moves.
    if (existing.serverName === existing.name && folder.serverName !== folder.name) {
      existing.serverName = folder.serverName;
    }
  }

  for (const role of ["inbox", "drafts", "sent", "trash", "junk"] as FolderRole[]) {
    if (!byKey.has(role)) {
      const name = role === "drafts" ? DRAFTS_ROUTE : CANONICAL_FOLDER_BY_ROLE[role]!;
      byKey.set(role, { name, serverName: name, role, unreadCount: 0, totalCount: 0 });
    }
  }

  return sortFoldersByRole([...byKey.values()]);
}

export function sortFoldersByRole<T extends { role: FolderRole; name: string }>(folders: T[]): T[] {
  return [...folders].sort((a, b) => {
    const ra = FOLDER_ROLE_ORDER.indexOf(a.role);
    const rb = FOLDER_ROLE_ORDER.indexOf(b.role);
    if (ra !== rb) return ra - rb;
    return a.name.localeCompare(b.name);
  });
}

/** Human label for a custom folder (namespace prefixes removed). */
export function customFolderLabel(name: string): string {
  const display = name
    .replace(/^\[Gmail\]\//i, "")
    .replace(/^INBOX\//i, "")
    .replace(/^INBOX\./i, "")
    .replace(/\./g, " / ");
  return display || name;
}

/** Folder (server name) for an EmailMessage's DB folder, for IMAP moves. */
export function resolveServerFolderName(dbFolder: string, folders: SidebarFolder[]): string {
  const role = classifyFolderRole(dbFolder);
  const match =
    folders.find((f) => f.name === dbFolder) ??
    (role !== "custom" ? folders.find((f) => f.role === role) : undefined);
  return match?.serverName ?? dbFolder;
}

// ---------------------------------------------------------------------------
// Conversation (thread) view
// ---------------------------------------------------------------------------

function ts(value: string | null | undefined): number {
  const t = value ? Date.parse(value) : NaN;
  return Number.isNaN(t) ? 0 : t;
}

/**
 * Oldest → newest, de-duplicated by id, soft-deleted rows dropped. The opened
 * message is always included even if the thread request missed it.
 */
export function sortThreadMessages<T extends Pick<EmailMessage, "id" | "timestamp"> & { is_deleted?: boolean }>(
  messages: T[] | null | undefined,
  current?: T | null
): T[] {
  const byId = new Map<number, T>();
  for (const m of messages ?? []) {
    if (m && !m.is_deleted) byId.set(m.id, m);
  }
  if (current && !byId.has(current.id)) byId.set(current.id, current);
  return [...byId.values()].sort((a, b) => ts(a.timestamp) - ts(b.timestamp) || a.id - b.id);
}

/**
 * Ids expanded when the conversation opens (Outlook): the latest message, plus
 * the message the user explicitly opened. Everything else starts collapsed.
 */
export function defaultExpandedIds(
  sorted: Array<Pick<EmailMessage, "id">>,
  openedId?: number | null
): Set<number> {
  const ids = new Set<number>();
  if (sorted.length > 0) ids.add(sorted[sorted.length - 1].id);
  if (openedId != null && sorted.some((m) => m.id === openedId)) ids.add(openedId);
  return ids;
}

/** One-line preview of a collapsed message. */
export function messageSnippet(
  message: Pick<EmailMessage, "body_text" | "body_html">,
  max = 140
): string {
  let text = message.body_text || "";
  if (!text.trim() && message.body_html) {
    text = message.body_html
      .replace(/<(style|script|head)[^>]*>[\s\S]*?<\/\1>/gi, " ")
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");
  }
  const collapsed = text.replace(/\s+/g, " ").trim();
  return collapsed.length > max ? `${collapsed.slice(0, max - 1)}…` : collapsed;
}

// ---------------------------------------------------------------------------
// List counterparty
// ---------------------------------------------------------------------------

type Address = { email?: string; name?: string } | string;

function addressLabel(addr: Address): string {
  if (typeof addr === "string") return addr;
  return (addr?.name || addr?.email || "").trim();
}

export interface ListCounterparty {
  kind: "from" | "to";
  /** Text to display next to the "To:" prefix (or the sender). */
  label: string;
  /** Source for avatar initials. */
  initialsSource: string;
}

/**
 * Who to show in a list row. In Sent Items (or any message we sent) Outlook
 * shows the recipients, not ourselves: "To: Ann (+2)".
 */
export function getListCounterparty(
  email: Pick<EmailMessage, "from_name" | "from_email" | "to_emails" | "is_from_business" | "folder">,
  filter?: string | null
): ListCounterparty {
  const sentContext =
    isSentFolder(filter ?? "") || (!!email.is_from_business && isSentFolder(email.folder));
  if (sentContext) {
    const recipients = (Array.isArray(email.to_emails) ? email.to_emails : [])
      .map((a) => addressLabel(a as Address))
      .filter(Boolean);
    if (recipients.length > 0) {
      const extra = recipients.length - 1;
      return {
        kind: "to",
        label: extra > 0 ? `${recipients[0]} (+${extra})` : recipients[0],
        initialsSource: recipients[0],
      };
    }
    return { kind: "to", label: "", initialsSource: email.from_name || email.from_email };
  }
  const sender = email.from_name || email.from_email;
  return { kind: "from", label: sender, initialsSource: sender };
}

export function hasAttachments(
  email: Pick<EmailMessage, "attachments"> & { attachments_count?: number }
): boolean {
  if (Array.isArray(email.attachments) && email.attachments.length > 0) return true;
  return (email.attachments_count ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// HTML rendering
// ---------------------------------------------------------------------------

export interface EmailAttachmentLike {
  filename?: string;
  url?: string;
  content_type?: string;
  size?: number;
  content_id?: string | null;
  cid?: string | null;
  is_inline?: boolean;
}

function normalizeCid(value: string | null | undefined): string {
  return (value || "")
    .trim()
    .replace(/^cid:/i, "")
    .replace(/^<|>$/g, "")
    .trim()
    .toLowerCase();
}

/**
 * Resolve a `cid:` reference to an attachment: by Content-ID first, then by
 * filename (the cid itself or its part before "@", as Outlook names them
 * "image001.png@01D9…").
 */
export function findCidAttachment<T extends EmailAttachmentLike>(
  src: string,
  attachments: T[] | null | undefined
): T | null {
  if (!/^cid:/i.test(src.trim())) return null;
  const cid = normalizeCid(src);
  if (!cid) return null;
  const list = attachments ?? [];
  const byId = list.find((a) => {
    const id = normalizeCid(a.content_id ?? a.cid);
    return !!id && id === cid;
  });
  if (byId) return byId;
  let decoded = cid;
  try {
    decoded = decodeURIComponent(cid);
  } catch {
    /* keep raw */
  }
  const local = decoded.split("@")[0];
  return (
    list.find((a) => {
      const fn = (a.filename || "").trim().toLowerCase();
      return !!fn && (fn === decoded || fn === local);
    }) ?? null
  );
}

export function mapCidToAttachmentUrl(
  src: string,
  attachments: EmailAttachmentLike[] | null | undefined
): string | null {
  const match = findCidAttachment(src, attachments);
  return match?.url || null;
}

const REMOTE_URL = /^\s*(https?:)?\/\//i;
const CSS_REMOTE_URL = /url\(\s*(['"]?)\s*(?:https?:)?\/\/[^)]*?\1\s*\)/gi;

export function isRemoteUrl(value: string | null | undefined): boolean {
  return !!value && REMOTE_URL.test(value);
}

/** Replace remote url(...) references in CSS text; returns the new text and the count. */
export function blockRemoteCssUrls(css: string): { css: string; count: number } {
  let count = 0;
  const out = css.replace(CSS_REMOTE_URL, () => {
    count += 1;
    return "none";
  });
  return { css: out, count };
}

/**
 * CSP for the iframe while remote images are blocked: nothing may be fetched
 * except inline/data images and the attachment storage (cid: images). It
 * backs up the markup rewriting above against forms it can't see (CSS
 * escapes such as `\\75rl(`, `@\\69mport`, …), so opens never reach trackers.
 */
export function blockingCsp(attachments?: EmailAttachmentLike[] | null): string {
  const origins = new Set<string>();
  for (const a of attachments ?? []) {
    const url = a?.url;
    if (!url || !REMOTE_URL.test(url)) continue;
    try {
      const origin = new URL(url, "https://invalid.local").origin;
      if (/^https?:\/\//.test(origin)) origins.add(origin);
    } catch {
      /* ignore malformed URLs */
    }
  }
  const imgSrc = ["'self'", "data:", "blob:", ...origins].join(" ");
  return (
    `default-src 'none'; img-src ${imgSrc}; style-src 'unsafe-inline'; ` +
    "font-src data:; media-src 'none'"
  );
}

export interface PreparedEmailHtml {
  /** Full HTML document for the iframe's srcdoc. */
  srcDoc: string;
  /** Number of remote resources (images / CSS backgrounds) that were blocked. */
  blockedCount: number;
  /** Attachments that were shown inline through a cid: reference. */
  inlineAttachmentUrls: string[];
}

export interface PrepareEmailHtmlOptions {
  attachments?: EmailAttachmentLike[] | null;
  allowRemoteImages?: boolean;
  /** Extra CSS appended inside the iframe (quote styling etc.). */
  extraCss?: string;
}

const BASE_IFRAME_CSS = `
  html, body { margin: 0; padding: 0; background: #ffffff; color: #1f2937; }
  body { padding: 4px 2px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; font-size: 14px; line-height: 1.5; overflow-wrap: anywhere; word-break: break-word; }
  img { max-width: 100%; height: auto; }
  table { max-width: 100%; }
  pre { white-space: pre-wrap; }
  a { color: #2563eb; }
`;

/**
 * Sanitise an email's HTML and turn it into an isolated document for a
 * sandboxed iframe: scripts/handlers removed (DOMPurify), <style> kept but
 * contained by the iframe, links forced to open in a new tab, cid: images
 * mapped to attachment URLs, and remote images / CSS backgrounds blocked
 * unless `allowRemoteImages`.
 */
export function prepareEmailHtml(
  html: string,
  { attachments, allowRemoteImages = false, extraCss = "" }: PrepareEmailHtmlOptions = {}
): PreparedEmailHtml {
  let blockedCount = 0;
  const inlineUrls = new Set<string>();

  const hook = (node: Element) => {
    const tag = node.tagName ? node.tagName.toLowerCase() : "";
    if (tag === "a" && node.hasAttribute("href")) {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer");
    }
    if (tag === "img") {
      const src = node.getAttribute("src") || "";
      if (/^cid:/i.test(src.trim())) {
        const url = mapCidToAttachmentUrl(src, attachments);
        if (url) {
          node.setAttribute("src", url);
          inlineUrls.add(url);
        } else {
          node.removeAttribute("src");
        }
      } else if (!allowRemoteImages && isRemoteUrl(src)) {
        node.setAttribute("data-echodesk-blocked-src", src);
        node.removeAttribute("src");
        blockedCount += 1;
      }
      if (!allowRemoteImages && node.hasAttribute("srcset")) {
        node.removeAttribute("srcset");
      }
    }
    if (tag === "source" && !allowRemoteImages) {
      // <picture><source srcset> would fetch even with the <img> blocked.
      for (const attr of ["srcset", "src"]) {
        const value = node.getAttribute(attr);
        if (value) {
          node.removeAttribute(attr);
          if (attr === "src" ? isRemoteUrl(value) : /(https?:)?\/\//i.test(value)) blockedCount += 1;
        }
      }
    }
    if (!allowRemoteImages) {
      const bg = node.getAttribute("background");
      if (bg && isRemoteUrl(bg)) {
        node.removeAttribute("background");
        blockedCount += 1;
      }
      const style = node.getAttribute("style");
      if (style) {
        const res = blockRemoteCssUrls(style);
        if (res.count > 0) {
          node.setAttribute("style", res.css);
          blockedCount += res.count;
        }
      }
      if (tag === "style" && node.textContent) {
        const res = blockRemoteCssUrls(node.textContent);
        if (res.count > 0) {
          node.textContent = res.css;
          blockedCount += res.count;
        }
      }
    }
  };

  DOMPurify.addHook("afterSanitizeAttributes", hook);
  let doc: HTMLElement;
  try {
    doc = DOMPurify.sanitize(html || "", {
      WHOLE_DOCUMENT: true,
      RETURN_DOM: true,
      ADD_TAGS: ["style"],
      ADD_ATTR: ["target"],
      FORBID_TAGS: [
        "script", "iframe", "frame", "object", "embed", "form", "base", "meta", "link",
        // Fetch remote resources the image blocking can't see (poster, src).
        "input", "video", "audio", "track",
      ],
    }) as HTMLElement;
  } finally {
    DOMPurify.removeHook("afterSanitizeAttributes", hook);
  }

  const body = doc.querySelector("body");
  // @import pulls remote CSS (and is a tracking vector) — never allowed.
  const styles = Array.from(doc.querySelectorAll("style"))
    .map((s) => (s.textContent || "").replace(/@import[^;]*;?/gi, ""))
    .join("\n");
  // Keep the email's own styles but drop the <style> nodes from the body so
  // we can emit them once, in <head>, after our base styles.
  doc.querySelectorAll("style").forEach((s) => s.remove());
  const bodyHtml = body ? body.innerHTML : doc.innerHTML;

  const srcDoc =
    "<!doctype html><html><head><meta charset=\"utf-8\">" +
    (allowRemoteImages ? "" : `<meta http-equiv="Content-Security-Policy" content="${blockingCsp(attachments)}">`) +
    "<meta name=\"color-scheme\" content=\"light\">" +
    "<base target=\"_blank\">" +
    `<style>${BASE_IFRAME_CSS}${extraCss}</style>` +
    (styles ? `<style>${styles.replace(/<\/style/gi, "<\\/style")}</style>` : "") +
    `</head><body>${bodyHtml}</body></html>`;

  return { srcDoc, blockedCount, inlineAttachmentUrls: [...inlineUrls] };
}
