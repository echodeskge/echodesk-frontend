"use client";

import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useTicketsRealtime } from "../../../_contexts/tickets-realtime-context";
import { useTicketMutations } from "../../../_hooks/use-ticket-mutations";

/** Backend `Ticket.title` is a CharField(max_length=255). */
export const TITLE_MAX_LENGTH = 255;

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Grow the textarea to its content (no inner scroll, no clipping). */
export function autoGrow(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight + (el.offsetHeight - el.clientHeight)}px`;
}

export interface DetailTitleProps {
  ticketId: number;
  title: string;
  canEdit: boolean;
}

/**
 * The title (D123, DC23): an auto-growing textarea styled as the design's
 * input. 20/28 on phones, 24/32 from `sm`; weight 600, letter-spacing −.02em;
 * a border on hover and a border plus a 3px ring on focus.
 *
 * Enter saves (no newline), blur saves, Esc reverts. An empty title is
 * rejected with a message. Focus sends `ticket_editing`, blur
 * `ticket_editing_stopped`. Read-only without `can_edit`.
 */
export function DetailTitle({ ticketId, title, canEdit }: DetailTitleProps) {
  const t = useTranslations("ticketsScreen.detail.main");
  const { patchTicket } = useTicketMutations();
  const { sendTicketEditing, sendTicketEditingStopped } = useTicketsRealtime();
  const ref = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState(title);
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState(false);
  const skipBlurSave = useRef(false);

  // Follow the server value (realtime, refetch) while not editing.
  useEffect(() => {
    if (!focused) setDraft(title);
  }, [title, focused]);

  useIsoLayoutEffect(() => {
    autoGrow(ref.current);
  }, [draft]);

  // Re-measure when the column width changes (wrapping changes the height).
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => autoGrow(el));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /** Returns false when the value was rejected. */
  const commit = (): boolean => {
    const value = draft.replace(/\s+/g, " ").trim();
    if (!value) {
      setError(true);
      return false;
    }
    setError(false);
    if (value !== draft) setDraft(value);
    if (value !== title) patchTicket.mutate({ id: ticketId, body: { title: value } });
    return true;
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (commit()) {
        skipBlurSave.current = true;
        ref.current?.blur();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setDraft(title);
      setError(false);
      skipBlurSave.current = true;
      ref.current?.blur();
    }
  };

  const onBlur = () => {
    setFocused(false);
    sendTicketEditingStopped(ticketId);
    if (skipBlurSave.current) {
      skipBlurSave.current = false;
      return;
    }
    if (!commit()) setDraft(title);
  };

  return (
    <div data-slot="detail-title" className="flex flex-col gap-1">
      <textarea
        ref={ref}
        rows={1}
        value={draft}
        maxLength={TITLE_MAX_LENGTH}
        readOnly={!canEdit}
        aria-label={t("titleLabel")}
        aria-invalid={error || undefined}
        aria-describedby={error ? `ticket-title-error-${ticketId}` : undefined}
        placeholder={t("titlePlaceholder")}
        onChange={(e) => {
          setDraft(e.target.value.replace(/\r?\n/g, " "));
          if (error) setError(false);
        }}
        onFocus={() => {
          if (!canEdit) return;
          setFocused(true);
          sendTicketEditing(ticketId, "title");
        }}
        onBlur={canEdit ? onBlur : undefined}
        onKeyDown={canEdit ? onKeyDown : undefined}
        className={cn(
          "-ml-2 block w-full resize-none overflow-hidden whitespace-pre-wrap break-words rounded-md border border-transparent bg-transparent px-2 py-0.5",
          "text-xl font-semibold leading-7 tracking-[-0.02em] text-foreground outline-none placeholder:text-muted-foreground sm:text-2xl sm:leading-8",
          canEdit
            ? "hover:border-border focus:border-border focus:shadow-[0_0_0_3px_hsl(var(--foreground)/0.08)]"
            : "cursor-default",
          error && "border-destructive hover:border-destructive focus:border-destructive",
        )}
      />
      {error && (
        <p id={`ticket-title-error-${ticketId}`} role="alert" className="text-xs text-destructive">
          {t("titleRequired")}
        </p>
      )}
    </div>
  );
}
