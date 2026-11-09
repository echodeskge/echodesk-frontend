"use client";

/**
 * Fills the app header for the detail page (plan E22, FE-09):
 * - `breadcrumb`: back (board name) / `#id` (mono) · "x of n" (hidden below sm);
 * - `meta`: the "X is editing" presence chip (hidden below md);
 * - `icons`: prev / next (K / J; hidden below sm, where the global header
 *   icons leave no room), the timer (FE-13), copy link (inside ⋮ below sm,
 *   DC20) and the ⋮ menu: Transfer to board (only with
 *   `can_transfer`, DC19), History & transfers, Delete (only with `can_delete`).
 *
 * The tenant header renders the slot outside the tickets route providers.
 * This bridge runs every hook and passes plain data and callbacks (through a
 * ref, so the slot never calls a stale closure), and it re-provides the
 * route's intl messages around the slot so FE-13's `TimerButton` can use
 * `useTranslations("ticketsScreen…")` there. The dialogs the menu opens are
 * rendered by the screen, inside the providers.
 */
import { useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown, ChevronUp, EllipsisVertical, History, Link2, Trash2 } from "lucide-react";
import { NextIntlClientProvider, useLocale, useMessages, useTimeZone, useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useHeaderActions } from "@/contexts/HeaderActionsContext";
import { cn } from "@/lib/utils";
import { BELOW_SM, useMediaQuery } from "../../_components/header/use-media-query";
import { TimerButton } from "../../_components/timer/timer-button";
import type { ViewerPermissions } from "../../_lib/types";
import { TransferMenuSection, type TransferTarget } from "./transfer-menu";

export interface DetailHeaderProps {
  ticketId: number;
  boardName: string;
  perms: ViewerPermissions;
  backHref: string;
  position: number | null;
  total: number | null;
  prevId: number | null;
  nextId: number | null;
  onPrev: () => void;
  onNext: () => void;
  /** Other accessible boards (the current one excluded). */
  transferBoards: TransferTarget[];
  onTransferPick: (board: TransferTarget) => void;
  onOpenHistory: () => void;
  onDelete: () => void;
  /** Another user editing this ticket, if any. */
  editingName?: string | null;
}

const ICON_BUTTON =
  "inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40";

export function ticketUrl(ticketId: number): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/tickets/${ticketId}`;
}

export function DetailHeaderBridge(props: DetailHeaderProps) {
  const t = useTranslations("ticketsScreen.detail.header");
  const tToasts = useTranslations("tickets.toasts");
  const messages = useMessages();
  const locale = useLocale();
  const timeZone = useTimeZone();
  const belowSm = useMediaQuery(BELOW_SM);

  const handlers = useRef(props);
  useEffect(() => {
    handlers.current = props;
  });

  const labels = {
    back: t("back", { board: props.boardName }),
    position:
      props.position !== null && props.total !== null ? t("position", { index: props.position, total: props.total }) : null,
    prev: t("prev"),
    next: t("next"),
    copyLink: t("copyLink"),
    more: t("more"),
    transferTo: t("transferTo"),
    history: t("historyTransfers"),
    delete: t("delete"),
    editing: props.editingName ? t("editing", { name: props.editingName }) : null,
    linkCopied: tToasts("linkCopied"),
    copyFailed: tToasts("saveError"),
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(ticketUrl(handlers.current.ticketId));
      toast.success(labels.linkCopied);
    } catch {
      toast.error(labels.copyFailed);
    }
  };

  const { ticketId, boardName, backHref, prevId, nextId, perms, transferBoards } = props;
  const canTransfer = perms.can_transfer && transferBoards.length > 0;
  const boardsKey = transferBoards.map((b) => `${b.id}:${b.name}:${b.color}`).join("|");

  const withRouteIntl = (node: ReactNode) => (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone={timeZone}>
      {node}
    </NextIntlClientProvider>
  );

  useHeaderActions(
    {
      breadcrumb: (
        <span data-slot="detail-breadcrumb" className="flex min-w-0 items-center gap-1.5">
          <Link
            href={backHref}
            aria-label={labels.back}
            title={labels.back}
            data-testid="detail-back"
            className="-ml-1 inline-flex h-7 min-w-0 shrink-0 items-center gap-1.5 rounded-md px-2 text-[13px] font-normal text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft aria-hidden="true" size={14} className="shrink-0" />
            <span className="hidden max-w-[180px] truncate sm:inline">{boardName}</span>
          </Link>
          <span aria-hidden="true" className="hidden text-[13px] font-normal text-muted-foreground sm:inline">
            /
          </span>
          <span data-testid="detail-id" className="shrink-0 font-mono text-[13px] font-semibold">
            #{ticketId}
          </span>
          {labels.position && (
            <span
              data-testid="detail-position"
              className="ml-1.5 hidden whitespace-nowrap text-xs leading-5 font-normal tabular-nums text-muted-foreground sm:inline"
            >
              {labels.position}
            </span>
          )}
        </span>
      ),
      meta: labels.editing ? (
        <span
          data-testid="detail-editing"
          className="hidden h-6 items-center gap-1.5 rounded-full bg-muted px-2 text-xs text-muted-foreground md:inline-flex"
        >
          <span aria-hidden="true" className="size-1.5 animate-pulse rounded-full bg-amber-500" />
          {labels.editing}
        </span>
      ) : undefined,
      icons: withRouteIntl(
        <span data-slot="detail-icons" className="flex items-center gap-1">
          {!belowSm && (
            <>
              <button
                type="button"
                className={ICON_BUTTON}
                aria-label={labels.prev}
                title={labels.prev}
                disabled={!prevId}
                data-testid="detail-prev"
                onClick={() => handlers.current.onPrev()}
              >
                <ChevronUp aria-hidden="true" size={15} />
              </button>
              <button
                type="button"
                className={ICON_BUTTON}
                aria-label={labels.next}
                title={labels.next}
                disabled={!nextId}
                data-testid="detail-next"
                onClick={() => handlers.current.onNext()}
              >
                <ChevronDown aria-hidden="true" size={15} />
              </button>
              <span aria-hidden="true" className="mx-1.5 h-4 w-px bg-border" />
            </>
          )}
          <TimerButton ticketId={ticketId} />
          {!belowSm && (
            <button
              type="button"
              className={ICON_BUTTON}
              aria-label={labels.copyLink}
              title={labels.copyLink}
              data-testid="detail-copy-link"
              onClick={copyLink}
            >
              <Link2 aria-hidden="true" size={15} />
            </button>
          )}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger
              className={cn(ICON_BUTTON, "data-[state=open]:bg-accent data-[state=open]:text-foreground")}
              aria-label={labels.more}
              title={labels.more}
              data-testid="detail-more"
            >
              <EllipsisVertical aria-hidden="true" size={15} />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              data-testid="detail-menu"
              className="flex w-[220px] flex-col gap-0.5 rounded-lg bg-background p-1 shadow-popover-sm"
            >
              {canTransfer && (
                <>
                  <TransferMenuSection
                    boards={transferBoards}
                    label={labels.transferTo}
                    onPick={(b) => handlers.current.onTransferPick(b)}
                  />
                  <DropdownMenuSeparator className="my-1" />
                </>
              )}
              <DropdownMenuItem
                className="h-[30px] gap-2 rounded-md px-2 text-[13px]"
                data-testid="detail-menu-history"
                onSelect={() => handlers.current.onOpenHistory()}
              >
                <History aria-hidden="true" size={14} />
                {labels.history}
              </DropdownMenuItem>
              {belowSm && (
                <>
                  {/* Phones: prev/next move into the menu (no room in the header row, DC20). */}
                  <DropdownMenuItem
                    className="h-[30px] gap-2 rounded-md px-2 text-[13px]"
                    data-testid="detail-menu-prev"
                    disabled={!prevId}
                    onSelect={() => handlers.current.onPrev()}
                  >
                    <ChevronUp aria-hidden="true" size={14} />
                    {labels.prev}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="h-[30px] gap-2 rounded-md px-2 text-[13px]"
                    data-testid="detail-menu-next"
                    disabled={!nextId}
                    onSelect={() => handlers.current.onNext()}
                  >
                    <ChevronDown aria-hidden="true" size={14} />
                    {labels.next}
                  </DropdownMenuItem>
                </>
              )}
              {belowSm && (
                <DropdownMenuItem
                  className="h-[30px] gap-2 rounded-md px-2 text-[13px]"
                  data-testid="detail-menu-copy-link"
                  onSelect={copyLink}
                >
                  <Link2 aria-hidden="true" size={14} />
                  {labels.copyLink}
                </DropdownMenuItem>
              )}
              {perms.can_delete && (
                <>
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuItem
                    variant="destructive"
                    className="h-[30px] gap-2 rounded-md px-2 text-[13px]"
                    data-testid="detail-menu-delete"
                    onSelect={() => handlers.current.onDelete()}
                  >
                    <Trash2 aria-hidden="true" size={14} />
                    {labels.delete}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </span>,
      ),
    },
    [
      ticketId,
      boardName,
      backHref,
      labels.position,
      labels.editing,
      labels.back,
      prevId,
      nextId,
      canTransfer,
      boardsKey,
      perms.can_delete,
      belowSm,
      locale,
      messages,
      timeZone,
    ],
  );

  return null;
}
