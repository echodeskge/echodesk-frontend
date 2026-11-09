"use client";

/**
 * Composer "Saved reply" (plan FE-11, DC31): a searchable list of the quick
 * replies managed in Settings → Templates (`social/quick-replies/`). Picking
 * one fills its variables on the server (`/use/`) and inserts the text; if
 * that call fails, the raw text is inserted. The caller hides the button
 * when the tenant lacks the social feature (the API is social-gated).
 */
import { useState } from "react";
import { Loader2, Search, Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useQuickReplies, useUseQuickReply, type QuickReply, type QuickReplyUseParams } from "@/hooks/api/useSocial";

export function filterQuickReplies(replies: QuickReply[], search: string): QuickReply[] {
  const q = search.trim().toLowerCase();
  if (!q) return replies;
  return replies.filter(
    (r) =>
      r.title.toLowerCase().includes(q) ||
      r.message.toLowerCase().includes(q) ||
      (r.shortcut ?? "").toLowerCase().includes(q),
  );
}

export interface SavedReplyPickerProps {
  variables: QuickReplyUseParams;
  onInsert: (text: string) => void;
  /** Called when the popover closes, to give the textarea its focus back. */
  onClose?: () => void;
  className?: string;
}

export function SavedReplyPicker({ variables, onInsert, onClose, className }: SavedReplyPickerProps) {
  const t = useTranslations("ticketsScreen.composer");
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const replies = useQuickReplies(undefined);
  const useReply = useUseQuickReply();
  const items = filterQuickReplies(replies.data ?? [], search);

  const close = () => {
    setOpen(false);
    setSearch("");
  };

  const pick = (reply: QuickReply) => {
    useReply.mutate(
      { id: reply.id, variables },
      {
        onSuccess: (res) => {
          close();
          onInsert(res?.processed_message ?? reply.message);
        },
        onError: () => {
          close();
          onInsert(reply.message);
        },
      },
    );
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          close();
          onClose?.();
        } else setOpen(true);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t("savedReply")}
          title={t("savedReply")}
          data-slot="composer-saved-reply"
          className={className}
        >
          <Zap aria-hidden="true" size={14} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="top"
        collisionPadding={16}
        className="w-[min(320px,calc(100vw-32px))] p-0"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="relative border-b">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
          />
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("savedReplySearch")}
            aria-label={t("savedReplySearch")}
            className="h-9 w-full bg-transparent pe-2 ps-8 text-[13px] outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="max-h-[280px] overflow-y-auto p-1" role="listbox" aria-label={t("savedReply")}>
          {replies.isLoading ? (
            <div className="flex justify-center p-4">
              <Loader2 aria-hidden="true" className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <p className="p-4 text-center text-xs text-muted-foreground">{t("savedReplyEmpty")}</p>
          ) : (
            items.map((reply) => (
              <button
                key={reply.id}
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => pick(reply)}
                disabled={useReply.isPending}
                className="flex w-full flex-col items-start gap-0.5 rounded-md px-2 py-1.5 text-start hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
              >
                <span className="text-[13px] font-medium">{reply.title}</span>
                <span className="line-clamp-2 text-xs text-muted-foreground">{reply.message}</span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
