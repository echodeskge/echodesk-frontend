"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, Loader2, Pencil, Plus, Search, Trash2, Zap } from "lucide-react";

import {
  useDeleteQuickReply,
  useQuickReplies,
  useReorderQuickReplies,
  type QuickReply,
} from "@/hooks/api/useSocial";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { QuickReplyForm } from "@/components/social/QuickReplyForm";

const CHANNEL_LABELS: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  email: "Email",
  tiktok: "TikTok",
  telegram: "Telegram",
  widget: "Widget",
};

const iconBtn =
  "inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40";

/** Replies in display order (position, then title) — the order the pickers show. */
export function sortReplies(replies: QuickReply[]): QuickReply[] {
  return [...replies].sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || a.title.localeCompare(b.title));
}

/** Positions after moving `id` one step up / down (every row renumbered 0..n-1). */
export function movedPositions(replies: QuickReply[], id: number, direction: -1 | 1): Array<{ id: number; position: number }> | null {
  const order = sortReplies(replies);
  const from = order.findIndex((r) => r.id === id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= order.length) return null;
  const next = order.slice();
  [next[from], next[to]] = [next[to], next[from]];
  return next.map((r, position) => ({ id: r.id, position }));
}

/**
 * Saved replies (quick replies) management: the list agents pick from in the
 * chat composer and the email composer's Template button. Design list page:
 * bordered table, 36px uppercase header, 48px rows.
 */
export function SavedRepliesTab() {
  const t = useTranslations("settings.templatesPage.replies");
  const tQr = useTranslations("chat.quickReplies");
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<QuickReply | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<QuickReply | null>(null);

  const { data: replies = [], isLoading } = useQuickReplies();
  const remove = useDeleteQuickReply();
  const reorder = useReorderQuickReplies();

  const ordered = useMemo(() => sortReplies(replies), [replies]);
  const query = search.trim().toLowerCase();
  const visible = query
    ? ordered.filter((r) =>
        [r.title, r.message, r.shortcut, r.category].some((v) => (v || "").toLowerCase().includes(query))
      )
    : ordered;

  function openForm(reply: QuickReply | null) {
    setEditing(reply);
    setFormOpen(true);
  }

  function move(reply: QuickReply, direction: -1 | 1) {
    const items = movedPositions(replies, reply.id, direction);
    if (!items) return;
    reorder.mutate(items, {
      onError: () => toast({ title: t("reorderFailed"), variant: "destructive" }),
    });
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    remove.mutate(deleteTarget.id, {
      onSuccess: () => toast({ title: tQr("deleted") }),
      onError: () => toast({ title: tQr("deleteFailed"), variant: "destructive" }),
      onSettled: () => setDeleteTarget(null),
    });
  }

  return (
    <div className="flex flex-col gap-3" data-testid="saved-replies">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute start-2 top-1/2 h-[13px] w-[13px] -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tQr("searchPlaceholder")}
            aria-label={tQr("searchPlaceholder")}
            className="h-8 w-full rounded-md border border-input bg-background pe-2 ps-7 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
          />
        </div>
        <button
          type="button"
          onClick={() => openForm(null)}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
          data-testid="new-saved-reply"
        >
          <Plus className="h-3.5 w-3.5" />
          {t("new")}
        </button>
      </div>

      <div className="overflow-hidden rounded-[10px] border border-border">
        <div className="hidden h-9 grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_minmax(0,1fr)_64px_112px] items-center gap-3 bg-muted/40 px-3.5 text-[11px] font-medium uppercase tracking-[.03em] text-muted-foreground md:grid">
          <span>{t("colTitle")}</span>
          <span>{t("colChannels")}</span>
          <span>{t("colCategory")}</span>
          <span className="text-end">{t("colUses")}</span>
          <span />
        </div>
        {isLoading ? (
          <div className="flex justify-center p-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-12 text-center" data-testid="saved-replies-empty">
            <Zap className="mb-2 h-6 w-6 text-muted-foreground" />
            <p className="text-[13px] font-medium">{query ? tQr("noMatches") : tQr("empty")}</p>
            {!query && <p className="mt-0.5 text-xs text-muted-foreground">{t("emptyHint")}</p>}
          </div>
        ) : (
          <ul>
            {visible.map((reply) => {
              const index = ordered.findIndex((r) => r.id === reply.id);
              const channels = !reply.platforms?.length || reply.platforms.includes("all")
                ? [tQr("allPlatforms")]
                : reply.platforms.map((p) => CHANNEL_LABELS[p] ?? p);
              return (
                <li
                  key={reply.id}
                  className="grid min-h-12 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-border px-3.5 py-1.5 text-[13px] first:border-t-0 hover:bg-muted/40 md:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_minmax(0,1fr)_64px_112px] md:first:border-t"
                  data-testid={`saved-reply-${reply.id}`}
                >
                  <button type="button" onClick={() => openForm(reply)} className="min-w-0 text-start">
                    <span className="block truncate font-medium">{reply.title}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {reply.shortcut ? <span className="font-mono">/{reply.shortcut.replace(/^\//, "")} · </span> : null}
                      {reply.message}
                    </span>
                  </button>
                  <div className="hidden min-w-0 flex-wrap gap-1 md:flex">
                    {channels.map((label) => (
                      <span key={label} className="inline-flex h-5 items-center rounded border border-border px-1.5 text-[11px]">
                        {label}
                      </span>
                    ))}
                  </div>
                  <span className="hidden truncate text-muted-foreground md:block">{reply.category || "—"}</span>
                  <span className="hidden text-end tabular-nums text-muted-foreground md:block">{reply.use_count ?? 0}</span>
                  <div className="flex items-center justify-end gap-0.5">
                    <button type="button" className={cn(iconBtn, "hidden sm:inline-flex")} aria-label={t("moveUp")} disabled={!!query || index <= 0 || reorder.isPending} onClick={() => move(reply, -1)}>
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" className={cn(iconBtn, "hidden sm:inline-flex")} aria-label={t("moveDown")} disabled={!!query || index >= ordered.length - 1 || reorder.isPending} onClick={() => move(reply, 1)}>
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" className={iconBtn} aria-label={tQr("edit")} onClick={() => openForm(reply)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className={cn(iconBtn, "hover:bg-destructive/10 hover:text-destructive")}
                      aria-label={tQr("delete")}
                      onClick={() => setDeleteTarget(reply)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {visible.length > 0 && (
        <p className="text-[11px] text-muted-foreground">{t("footer", { count: visible.length })}</p>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? tQr("edit") : tQr("new")}</DialogTitle>
            <DialogDescription>{editing ? tQr("editDescription") : tQr("createDescription")}</DialogDescription>
          </DialogHeader>
          <QuickReplyForm
            editingReply={editing}
            onSuccess={() => setFormOpen(false)}
            onCancel={() => setFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteBody", { title: deleteTarget?.title ?? "" })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tQr("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {tQr("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
