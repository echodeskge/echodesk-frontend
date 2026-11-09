"use client";

/**
 * Timeline rows (design B feed, D155–D165, DC28–DC30).
 *
 * - `EventRow`: a 14px ring dot on the rail, a 16px `primary/0.1` avatar,
 *   "**who** action", the time at the end (28px min-height, 12px muted).
 * - `CommentRow`: a dot in the avatar colour, a 28px `primary/0.1` avatar,
 *   author + time + the amber Internal badge, and the bubble (amber tint when
 *   internal, `muted` otherwise; radius 4/12/12/12). "(edited)", mention
 *   chips, and edit / delete for the author or staff (WS11).
 */
import { useState, type KeyboardEvent } from "react";
import { Lock, Pencil, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { initials } from "../../../_components/primitives/initials";
import { formatDateTime, formatRelative } from "../../../_lib/format";
import type { ActivityComment } from "../../../_lib/types";
import { activityUserName, splitMentions, type EventParts } from "./activity-format";

function When({ value, now }: { value: string; now: Date }) {
  const locale = useLocale();
  return (
    <time dateTime={value} title={formatDateTime(value, locale)} className="whitespace-nowrap tabular-nums">
      {formatRelative(value, locale, now)}
    </time>
  );
}

export function EventRow({
  parts,
  userInitials,
  createdAt,
  action,
  now,
}: {
  parts: EventParts;
  userInitials: string;
  createdAt: string;
  action: string;
  now: Date;
}) {
  return (
    <li
      data-slot="feed-event"
      data-action={action}
      className="relative flex min-h-7 items-center gap-2.5 py-0.5 pl-3.5 text-xs leading-5 text-muted-foreground"
    >
      <span
        aria-hidden="true"
        className="absolute -left-2.5 top-1/2 size-3.5 -translate-y-1/2 rounded-full border-2 border-border bg-background"
      />
      <span
        aria-hidden="true"
        data-slot="feed-event-avatar"
        className="flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[7px] font-semibold text-primary"
      >
        {userInitials}
      </span>
      <span className="min-w-0 flex-1 break-words">
        {parts.before}
        <span className="font-medium text-foreground">{parts.name}</span>
        {parts.after}
      </span>
      <span className="ml-auto shrink-0">
        <When value={createdAt} now={now} />
      </span>
    </li>
  );
}

export function CommentText({ text, names }: { text: string; names: Map<string, string> }) {
  return (
    <>
      {splitMentions(text).map((seg, i) =>
        seg.type === "text" ? (
          <span key={i}>{seg.text}</span>
        ) : (
          <span
            key={i}
            data-slot="mention"
            title={seg.email}
            className="rounded bg-primary/10 px-1 font-medium text-primary"
          >
            @{names.get(seg.email.toLowerCase()) ?? seg.email}
          </span>
        ),
      )}
    </>
  );
}

export interface CommentRowProps {
  item: ActivityComment;
  now: Date;
  canModify: boolean;
  /** email (lower-case) → display name, for mention chips. */
  names: Map<string, string>;
  onSave: (text: string) => Promise<unknown>;
  onDelete: () => Promise<unknown>;
  saving?: boolean;
  deleting?: boolean;
}

export function CommentRow({ item, now, canModify, names, onSave, onDelete, saving, deleting }: CommentRowProps) {
  const t = useTranslations("ticketsScreen.activity");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.text);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const internal = item.is_internal !== false;
  const name = activityUserName(item.user, { system: t("system"), deleted: t("deletedUser") });
  const userInitials = item.user?.initials || initials(name);

  const startEdit = () => {
    setDraft(item.text);
    setEditing(true);
  };
  const save = async () => {
    const text = draft.trim();
    if (!text) return;
    if (text === item.text.trim()) {
      setEditing(false);
      return;
    }
    try {
      await onSave(text);
      setEditing(false);
    } catch {
      // the mutation shows the toast; keep the editor open
    }
  };
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void save();
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setEditing(false);
    }
  };

  return (
    <li
      id={`comment-${item.comment_id}`}
      data-slot="feed-comment"
      data-internal={internal}
      className="group/comment relative flex scroll-mt-4 gap-2.5 py-2 pl-3.5"
    >
      <span aria-hidden="true" className="absolute -left-2.5 top-3.5 size-3.5 rounded-full border-2 border-background bg-primary/10" />
      <span
        aria-hidden="true"
        data-slot="feed-comment-avatar"
        className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[9px] font-semibold text-primary"
      >
        {userInitials}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex min-h-5 flex-wrap items-baseline gap-x-1.5 text-xs">
          <span className="font-semibold">{name}</span>
          <span className="text-muted-foreground">
            <When value={item.created_at} now={now} />
          </span>
          {internal && (
            <span
              data-slot="internal-badge"
              className="inline-flex h-[18px] items-center gap-1 self-center rounded px-1.5 text-[10px] font-semibold text-[#b45309] bg-[#f59e0b1a] dark:text-amber-400"
            >
              <Lock aria-hidden="true" size={10} />
              {t("internal")}
            </span>
          )}
          {item.edited && <span className="text-muted-foreground">({t("edited")})</span>}
          {canModify && !editing && (
            <span className="ml-auto flex items-center gap-0.5 self-center opacity-0 transition-opacity group-hover/comment:opacity-100 group-focus-within/comment:opacity-100 [@media(hover:none)]:opacity-100">
              <button
                type="button"
                onClick={startEdit}
                aria-label={t("edit")}
                title={t("edit")}
                className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Pencil aria-hidden="true" size={13} />
              </button>
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                aria-label={t("delete")}
                title={t("delete")}
                className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Trash2 aria-hidden="true" size={13} />
              </button>
            </span>
          )}
        </div>
        {editing ? (
          <div className="flex flex-col gap-2">
            <Textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKey}
              aria-label={t("edit")}
              className="min-h-[72px] text-[13px] leading-5"
            />
            <div className="flex justify-end gap-2">
              <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditing(false)}>
                {t("cancel")}
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-7 text-xs"
                onClick={() => void save()}
                disabled={saving || !draft.trim()}
              >
                {t("save")}
              </Button>
            </div>
          </div>
        ) : (
          <div
            data-slot="comment-bubble"
            className={cn(
              "whitespace-pre-wrap break-words rounded-[4px_12px_12px_12px] border px-3.5 py-2.5 text-[13px] leading-5 [text-wrap:pretty]",
              internal ? "border-[#f59e0b33] bg-[#f59e0b0f]" : "border-transparent bg-muted",
            )}
          >
            <CommentText text={item.text} names={names} />
          </div>
        )}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={(open) => !deleting && setConfirmOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteConfirm")}</AlertDialogTitle>
            <AlertDialogDescription className="line-clamp-3 whitespace-pre-wrap">{item.text}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                onDelete()
                  .then(() => setConfirmOpen(false))
                  .catch(() => {});
              }}
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}
