"use client";

import { useMemo, useState, type KeyboardEvent, type MouseEvent } from "react";
import DOMPurify from "dompurify";
import { Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import { useTicketsRealtime } from "../../../_contexts/tickets-realtime-context";
import { useTicketMutations } from "../../../_hooks/use-ticket-mutations";
import type { TicketDetail } from "../../../_lib/types";
import { descriptionEditorHtml, descriptionSource, isEmptyHtml } from "./main-utils";

// TipTap loads only when someone edits (keeps it out of the detail's first-load JS).
const RichTextEditor = dynamic(() => import("@/components/RichTextEditor").then((m) => m.RichTextEditor), {
  loading: () => <div aria-hidden="true" className="min-h-[136px] rounded-[8px] border border-input bg-background" />,
});

export interface DetailDescriptionProps {
  ticket: Pick<TicketDetail, "id" | "description" | "rich_description" | "description_format">;
  canEdit: boolean;
}

/** Sanitised HTML for the static view (no scripts, handlers or iframes). */
export function sanitizeDescription(html: string): string {
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
}

/**
 * Description (D125–D127, E16).
 *
 * Static: sanitised HTML (or plain text with its line breaks), 14/22, with a
 * `Pencil 13`; a click opens the editor (a click that only selected text, or
 * that hit a link, does not). Hover shows a border and `muted/0.3`.
 *
 * Editing: the shared `RichTextEditor` styled as the design's edit box
 * (min-height 120, radius 8, padding 12×14), Save / Cancel, ⌘/Ctrl+Enter
 * saves, Esc cancels. Saves `description` (HTML), `rich_description` and
 * `description_format: "html"`, so formatting survives (the old detail's
 * plain textarea dropped it). Read-only without `can_edit`.
 */
export function DetailDescription({ ticket, canEdit }: DetailDescriptionProps) {
  const t = useTranslations("ticketsScreen.detail.main");
  const { patchTicket } = useTicketMutations();
  const { sendTicketEditing, sendTicketEditingStopped } = useTicketsRealtime();
  const source = descriptionSource(ticket);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const safeHtml = useMemo(() => (source.isHtml ? sanitizeDescription(source.value) : ""), [source.isHtml, source.value]);
  const empty = source.isHtml ? isEmptyHtml(safeHtml) : !source.value.trim();

  const open = () => {
    if (!canEdit) return;
    setDraft(descriptionEditorHtml(source));
    setEditing(true);
    sendTicketEditing(ticket.id, "description");
  };

  const close = () => {
    setEditing(false);
    sendTicketEditingStopped(ticket.id);
  };

  const save = () => {
    const html = isEmptyHtml(draft) ? "" : draft;
    const unchanged = html === (source.isHtml ? source.value : descriptionEditorHtml(source));
    if (unchanged) {
      close();
      return;
    }
    patchTicket.mutate(
      { id: ticket.id, body: { description: html, rich_description: html, description_format: "html" } },
      { onSuccess: close },
    );
  };

  const onEditorKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      save();
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  };

  if (editing) {
    return (
      <div data-slot="detail-description-editor" className="flex flex-col gap-1.5" onKeyDown={onEditorKeyDown}>
        <RichTextEditor
          content={draft}
          onChange={setDraft}
          placeholder={t("descriptionPlaceholder")}
          className="rounded-[8px] border-input bg-background focus-within:shadow-[0_0_0_3px_hsl(var(--foreground)/0.08)]"
          editorClassName="min-h-[120px] px-3.5 py-3 text-sm leading-[22px] sm:prose-sm"
        />
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={save}
            disabled={patchTicket.isPending}
            className="inline-flex h-[30px] items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {t("save")}
          </button>
          <button
            type="button"
            onClick={close}
            disabled={patchTicket.isPending}
            className="inline-flex h-[30px] items-center rounded-md border px-3 text-xs hover:bg-accent disabled:opacity-60"
          >
            {t("cancel")}
          </button>
          <span className="hidden text-[11px] text-muted-foreground sm:inline">{t("saveHint")}</span>
        </div>
      </div>
    );
  }

  const onStaticClick = (e: MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("a")) return;
    const selection = typeof window !== "undefined" ? window.getSelection() : null;
    if (selection && !selection.isCollapsed && selection.toString().trim()) return;
    open();
  };

  const body = empty ? (
    <p className="flex-1 text-sm leading-[22px] text-muted-foreground">{t("descriptionPlaceholder")}</p>
  ) : source.isHtml ? (
    <div
      data-slot="detail-description-html"
      className="prose prose-sm max-w-none flex-1 break-words text-sm leading-[22px] text-foreground dark:prose-invert [&_a]:text-primary [&_a]:underline"
      // Sanitised above (DOMPurify).
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  ) : (
    <p data-slot="detail-description-text" className="flex-1 whitespace-pre-wrap break-words text-sm leading-[22px] text-foreground">
      {source.value}
    </p>
  );

  if (!canEdit) {
    return (
      <div data-slot="detail-description" data-readonly="true" className="-ml-2 flex items-start gap-2 rounded-[8px] border border-transparent p-2">
        {empty ? <p className="flex-1 text-sm leading-[22px] text-muted-foreground">—</p> : body}
      </div>
    );
  }

  // The box is a mouse convenience (click to edit); the Pencil is the
  // keyboard / screen-reader control, so the text itself stays readable.
  return (
    <div
      data-slot="detail-description"
      title={t("clickToEdit")}
      onClick={onStaticClick}
      className={cn(
        "group -ml-2 flex cursor-text items-start gap-2 rounded-[8px] border border-transparent p-2 transition-colors",
        "hover:border-border hover:bg-muted/30 focus-within:border-border",
      )}
    >
      {body}
      <button
        type="button"
        aria-label={t("editDescription")}
        onClick={(e) => {
          e.stopPropagation();
          open();
        }}
        className="mt-[3px] flex shrink-0 rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Pencil aria-hidden="true" size={13} />
      </button>
    </div>
  );
}
