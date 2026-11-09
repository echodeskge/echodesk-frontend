/**
 * Pure helpers for the detail main column (FE-10): names, file sizes and
 * types, upload validation, description HTML and checklist ordering.
 */
import { File as FileIcon, FileArchive, FileAudio, FileSpreadsheet, FileText, FileVideo, Image as ImageIcon } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { TicketChecklistItem, TicketDetail } from "../../../_lib/types";

/** Per-batch upload limits (same as the old detail's dropzone). */
export const MAX_FILES = 10;
export const MAX_FILE_MB = 10;
export const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;

type NamedUser = { first_name?: string | null; last_name?: string | null; email?: string | null; name?: string | null };

/** "First Last", else the email, else "". */
export function userName(user: NamedUser | null | undefined): string {
  if (!user) return "";
  if (user.name) return user.name;
  const full = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
  return full || user.email || "";
}

/** "240 KB", "1.2 MB" (bytes below 1 KB read as "1 KB"). */
export function formatFileSize(bytes: number | null | undefined): string {
  const n = Number(bytes) || 0;
  if (n >= 1024 * 1024) {
    const mb = n / (1024 * 1024);
    return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(n / 1024))} KB`;
}

export function isImageType(contentType: string | null | undefined): boolean {
  return !!contentType && contentType.startsWith("image/");
}

/** Types a browser tab shows inline; everything else gets `download` (DC26). */
export function isPreviewable(contentType: string | null | undefined): boolean {
  if (!contentType) return false;
  return (
    contentType.startsWith("image/") ||
    contentType.startsWith("video/") ||
    contentType.startsWith("audio/") ||
    contentType === "application/pdf" ||
    contentType === "text/plain"
  );
}

export function fileIcon(contentType: string | null | undefined, name = ""): LucideIcon {
  const type = contentType ?? "";
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (type.startsWith("image/")) return ImageIcon;
  if (type.startsWith("video/")) return FileVideo;
  if (type.startsWith("audio/")) return FileAudio;
  if (/zip|rar|7z|tar|gzip/.test(type) || ["zip", "rar", "7z", "tar", "gz"].includes(ext)) return FileArchive;
  if (/sheet|excel|csv/.test(type) || ["xls", "xlsx", "csv", "ods"].includes(ext)) return FileSpreadsheet;
  if (type.startsWith("text/") || /pdf|word|document/.test(type) || ["pdf", "doc", "docx", "txt", "md", "rtf"].includes(ext)) {
    return FileText;
  }
  return FileIcon;
}

export interface FileValidation {
  accepted: File[];
  /** More than MAX_FILES were picked: only the first MAX_FILES are kept. */
  tooMany: boolean;
  /** Files over MAX_FILE_BYTES (skipped). */
  tooLarge: File[];
}

export function validateFiles(files: File[]): FileValidation {
  const tooMany = files.length > MAX_FILES;
  const first = files.slice(0, MAX_FILES);
  const tooLarge = first.filter((f) => f.size > MAX_FILE_BYTES);
  const accepted = first.filter((f) => f.size <= MAX_FILE_BYTES);
  return { accepted, tooMany, tooLarge };
}

/** True when a drag carries files from the OS (not a text/element drag). */
export function dragHasFiles(dt: DataTransfer | null | undefined): boolean {
  if (!dt) return false;
  const types = Array.from(dt.types ?? []);
  return types.includes("Files");
}

// ---------------------------------------------------------------------------
// Description
// ---------------------------------------------------------------------------

const HTML_TAG = /<\/?[a-z][\s\S]*>/i;

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Plain text → paragraphs, so the rich editor keeps the line breaks. */
export function plainToHtml(text: string): string {
  if (!text.trim()) return "";
  return text
    .split(/\n{2,}/)
    .map((para) => `<p>${escapeHtml(para).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export interface DescriptionSource {
  /** The stored value: HTML when `isHtml`, otherwise plain text. */
  value: string;
  isHtml: boolean;
}

/**
 * Where the description lives. HTML tickets (the create sheet, this editor)
 * carry it in `description` and often in `rich_description` as a string;
 * plain tickets (email, chat, API) only in `description`.
 */
export function descriptionSource(ticket: Pick<TicketDetail, "description" | "rich_description" | "description_format">): DescriptionSource {
  const rich = typeof ticket.rich_description === "string" ? ticket.rich_description : "";
  const plain = ticket.description ?? "";
  if (ticket.description_format === "html") return { value: rich || plain, isHtml: true };
  if (rich && HTML_TAG.test(rich)) return { value: rich, isHtml: true };
  if (HTML_TAG.test(plain)) return { value: plain, isHtml: true };
  return { value: plain, isHtml: false };
}

/** The editor's starting HTML for a ticket. */
export function descriptionEditorHtml(src: DescriptionSource): string {
  return src.isHtml ? src.value : plainToHtml(src.value);
}

/** Tiptap's empty document is "<p></p>". */
export function isEmptyHtml(html: string): boolean {
  return html.replace(/<p>(\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, "").trim() === "";
}

// ---------------------------------------------------------------------------
// Checklist
// ---------------------------------------------------------------------------

/** Server order: position, then creation time, then id. */
export function sortChecklist(items: TicketChecklistItem[] | null | undefined): TicketChecklistItem[] {
  return [...(items ?? [])].sort(
    (a, b) =>
      (a.position ?? 0) - (b.position ?? 0) ||
      String(a.created_at).localeCompare(String(b.created_at)) ||
      a.id - b.id,
  );
}

/** Position for a new item: after the last one. */
export function nextChecklistPosition(items: TicketChecklistItem[]): number {
  return items.reduce((max, i) => Math.max(max, (i.position ?? 0) + 1), 0);
}

/**
 * The `position` to send to `reorder/` when the item at `from` is dropped at
 * `to` (indexes in server order). The server shifts the items between the old
 * and the new position, so the target neighbour's position is the answer; when
 * positions collide (legacy rows all at 0) the index is the best guess.
 */
export function reorderTargetPosition(items: TicketChecklistItem[], from: number, to: number): number {
  const positions = items.map((i) => i.position ?? 0);
  const distinct = new Set(positions).size === positions.length;
  if (!distinct) return to;
  return positions[to];
}

/** Move an item and renumber positions locally (optimistic order). */
export function moveChecklistItem(items: TicketChecklistItem[], from: number, to: number): TicketChecklistItem[] {
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next.map((item, index) => ({ ...item, position: index }));
}

export function checklistProgress(items: TicketChecklistItem[]): { done: number; total: number; percent: number } {
  const total = items.length;
  const done = items.filter((i) => i.is_checked).length;
  return { done, total, percent: total ? Math.round((done / total) * 100) : 0 };
}
