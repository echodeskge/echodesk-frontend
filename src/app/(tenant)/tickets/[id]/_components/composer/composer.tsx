"use client";

/**
 * Composer bar (plan FE-11; design B composer, D167–D175; E34, U2, DC28–DC32).
 *
 * - The bar: border-top, background, padding 12/40/14/40 (16px gutters below
 *   `sm`, D203); inside, max-width 780: my avatar (solid primary) and the box.
 * - The box (radius 10) changes border and background when internal and
 *   when focused (DC29). The textarea is `MentionTextarea` (`@` opens the
 *   board's users).
 * - Toolbar: the internal toggle (on by default; staff can turn it off; for
 *   everyone else it is locked on with the `internalForced` tooltip), Attach
 *   (uploads to the ticket's attachments and inserts "📎 name"), Mention
 *   (inserts `@` and opens the list), Saved reply (social feature only), the
 *   ⌘↵ / Ctrl↵ hint and Post. ⌘↵ / Ctrl↵ posts.
 * - The draft is kept per ticket in sessionStorage.
 * - Mobile: the shell makes the bar sticky; a `visualViewport` listener pads
 *   it above the on-screen keyboard.
 */
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { AtSign, Loader2, Lock, LockOpen, Paperclip } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { MentionTextarea, type MentionTextareaHandle } from "@/components/MentionTextarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useUserProfile } from "@/hooks/useUserProfile";
import { cn } from "@/lib/utils";
import { initials } from "../../../_components/primitives/initials";
import { useTicketPermissions } from "../../../_hooks/use-ticket-permissions";
import { useTicketPickers } from "../../../_hooks/use-ticket-pickers";
import { uploadAttachment } from "../../../_lib/api";
import { issueMutationId } from "../../../_lib/mutation-id";
import { tk } from "../../../_lib/query-keys";
import type { ComposerProps } from "../section-contracts";
import { useCommentMutations } from "../activity/use-comment-mutations";
import { SavedReplyPicker } from "./saved-reply-picker";

const DRAFT_PREFIX = "echodesk.tickets.draft.";

export function draftKey(ticketId: number): string {
  return `${DRAFT_PREFIX}${ticketId}`;
}

export function readDraft(ticketId: number): string {
  try {
    return window.sessionStorage.getItem(draftKey(ticketId)) ?? "";
  } catch {
    return "";
  }
}

export function writeDraft(ticketId: number, text: string): void {
  try {
    if (text) window.sessionStorage.setItem(draftKey(ticketId), text);
    else window.sessionStorage.removeItem(draftKey(ticketId));
  } catch {
    // storage blocked (private mode, quota): the draft just isn't kept
  }
}

export function isMacPlatform(nav: Pick<Navigator, "platform" | "userAgent"> | undefined): boolean {
  if (!nav) return false;
  return /Mac|iPhone|iPad|iPod/i.test(nav.platform || nav.userAgent || "");
}

/** Height of the on-screen keyboard (0 when none), from `visualViewport`. */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!vv) return;
    const update = () => {
      const next = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
      // Ignore small differences (browser chrome collapsing).
      setInset(next > 80 ? next : 0);
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);
  return inset;
}

const ICON_BUTTON =
  "inline-flex size-[26px] shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50";

export function Composer({ ticket, perms }: ComposerProps) {
  // Remount per ticket: J/K keep the screen mounted, but the draft and the
  // toggle belong to one ticket.
  return <ComposerInner key={ticket.id} ticket={ticket} perms={perms} />;
}

function ComposerInner({ ticket }: ComposerProps) {
  const t = useTranslations("ticketsScreen.composer");
  const tTickets = useTranslations("tickets");
  const qc = useQueryClient();
  const { data: profile } = useUserProfile();
  const { isStaff, hasSocialFeature } = useTicketPermissions();
  const boardId = ticket.board?.id ?? ticket.column?.board ?? null;
  const pickers = useTicketPickers(boardId);
  const { createComment } = useCommentMutations(ticket.id, boardId);

  const [draft, setDraft] = useState(() => readDraft(ticket.id));
  const [internalChoice, setInternalChoice] = useState(true);
  const [focused, setFocused] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [mac, setMac] = useState(false);
  const textRef = useRef<MentionTextareaHandle>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const keyboardInset = useKeyboardInset();

  // Non-staff comments are always internal (U2); the server forces it too.
  const internal = isStaff ? internalChoice : true;

  useEffect(() => {
    setMac(isMacPlatform(typeof navigator !== "undefined" ? navigator : undefined));
  }, []);

  const changeDraft = (text: string) => {
    setDraft(text);
    writeDraft(ticket.id, text);
  };

  const canPost = draft.trim().length > 0 && !createComment.isPending;

  const post = () => {
    const text = draft.trim();
    if (!text || createComment.isPending) return;
    createComment.mutate(
      { comment: text, is_internal: internal },
      {
        onSuccess: () => {
          changeDraft("");
        },
      },
    );
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      post();
    }
  };

  const insertLine = (text: string) => {
    const el = textRef.current?.element;
    const caret = el?.selectionStart ?? draft.length;
    const before = draft.slice(0, caret);
    const prefix = before && !before.endsWith("\n") ? "\n" : "";
    textRef.current?.insertText(`${prefix}${text}`);
  };

  const attach = async (files: FileList | null) => {
    const list = Array.from(files ?? []);
    if (fileRef.current) fileRef.current.value = "";
    for (const file of list) {
      setUploading((n) => n + 1);
      try {
        await uploadAttachment(ticket.id, file, undefined, issueMutationId());
        insertLine(`📎 ${file.name}`);
        qc.invalidateQueries({ queryKey: tk.ticket(ticket.id) });
        qc.invalidateQueries({ queryKey: tk.activity(ticket.id) });
      } catch {
        toast.error(t("attachFailed", { name: file.name }));
      } finally {
        setUploading((n) => n - 1);
      }
    }
  };

  const myName =
    profile?.full_name?.trim() || `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() || profile?.email || "";

  const toggle = (
    <button
      type="button"
      data-slot="composer-internal"
      aria-pressed={internal}
      aria-disabled={!isStaff || undefined}
      title={internal ? t("internalNote") : t("publicNote")}
      onClick={() => {
        if (isStaff) setInternalChoice((v) => !v);
      }}
      className={cn(
        "inline-flex h-[26px] min-w-0 max-w-[60%] shrink items-center gap-[5px] rounded-md px-2 text-xs leading-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:max-w-none",
        internal
          ? "bg-[#f59e0b1a] text-[#b45309] dark:text-amber-400"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
        isStaff ? "cursor-pointer" : "cursor-not-allowed",
      )}
    >
      {internal ? <Lock aria-hidden="true" size={12} className="shrink-0" /> : <LockOpen aria-hidden="true" size={12} className="shrink-0" />}
      <span className="truncate">{internal ? t("internalNote") : t("publicNote")}</span>
    </button>
  );

  return (
    <div
      data-slot="composer"
      data-ticket-id={ticket.id}
      data-internal={internal}
      data-focused={focused}
      className="border-t bg-background pb-3.5 pl-4 pe-fab-safe pt-3 text-sm sm:pl-10 lg:pe-10"
      style={keyboardInset ? { paddingBottom: `${14 + keyboardInset}px` } : undefined}
    >
      <div className="flex max-w-[780px] gap-2.5">
        <span
          aria-hidden="true"
          data-slot="composer-avatar"
          className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-[9px] font-semibold text-primary-foreground"
        >
          {initials(myName)}
        </span>
        <div
          data-slot="composer-box"
          className={cn(
            "flex min-w-0 flex-1 flex-col rounded-[10px] border transition-colors duration-150",
            internal
              ? focused
                ? "border-[#f59e0b99] bg-[#f59e0b08]"
                : "border-[#f59e0b4d] bg-background"
              : focused
                ? "border-ring bg-background"
                : "border-input bg-background",
          )}
        >
          <MentionTextarea
            ref={textRef}
            value={draft}
            onChange={changeDraft}
            onKeyDown={onKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            users={pickers.users}
            placement="above"
            rows={2}
            aria-label={tTickets("addComment")}
            placeholder={internal ? t("placeholderInternal") : t("placeholderPublic")}
            className="min-h-14 resize-none rounded-none border-0 bg-transparent px-3 pb-1 pt-2.5 text-[13px] leading-[19px] shadow-none focus-visible:ring-0"
          />
          <div className="flex min-w-0 items-center gap-1 px-1.5 pb-1.5 pt-1">
            {isStaff ? (
              toggle
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>{toggle}</TooltipTrigger>
                <TooltipContent>{t("internalForced")}</TooltipContent>
              </Tooltip>
            )}
            <button
              type="button"
              data-slot="composer-attach"
              aria-label={t("attach")}
              title={t("attach")}
              className={ICON_BUTTON}
              onClick={() => fileRef.current?.click()}
              disabled={uploading > 0}
            >
              {uploading > 0 ? (
                <Loader2 aria-hidden="true" size={14} className="animate-spin" />
              ) : (
                <Paperclip aria-hidden="true" size={14} />
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              multiple
              hidden
              data-testid="composer-file-input"
              onChange={(e) => void attach(e.target.files)}
            />
            <button
              type="button"
              data-slot="composer-mention"
              aria-label={t("mention")}
              title={t("mention")}
              className={ICON_BUTTON}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => textRef.current?.openMention()}
            >
              <AtSign aria-hidden="true" size={14} />
            </button>
            {hasSocialFeature && (
              <SavedReplyPicker
                className={ICON_BUTTON}
                variables={{
                  customer_name: ticket.customer?.name || undefined,
                  agent_name: myName || undefined,
                }}
                onInsert={(text) => textRef.current?.insertText(text)}
              />
            )}
            <kbd
              data-slot="composer-hint"
              title={mac ? t("hintMac") : t("hintOther")}
              className="ml-auto hidden shrink-0 font-sans text-[11px] text-muted-foreground sm:inline"
            >
              {mac ? "⌘↵" : "Ctrl↵"}
            </kbd>
            <button
              type="button"
              data-slot="composer-post"
              onClick={post}
              disabled={!canPost}
              aria-label={internal ? t("postInternal") : t("post")}
              className="ml-auto inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium leading-5 text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 sm:ml-0"
            >
              {createComment.isPending && <Loader2 aria-hidden="true" size={12} className="animate-spin" />}
              {t("post")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
