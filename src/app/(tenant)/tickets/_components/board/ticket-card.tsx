"use client";

/**
 * Kanban card (plan §3 Kanban, U3, E25, W38–W42).
 *
 * Row 1: mono `#id`, priority pill, up to 3 label chips then "+n".
 * Row 2: title, clamped to two lines (300ms HoverCard with `description_preview`).
 * Row 3: 20px avatars or the dashed "Unassigned" circle, due chip, checklist
 *        n/m, then (pushed right) comment count (always), attachment count
 *        (> 0) and the created date.
 *
 * Actions: a focusable ⋮ button (visible on hover/focus, always on touch) and
 * a right-click context menu, both with Open / Copy link / Delete. Shift+F10
 * and the ContextMenu key open the ⋮ menu on a focused card. Delete is
 * admin-only (staff / superuser), as today.
 *
 * The card is presentational: the column wraps it in a hello-pangea
 * `Draggable` and passes the drag props through `...rest` and `ref`.
 */
import { forwardRef, useCallback, useState, type HTMLAttributes, type KeyboardEvent, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ContextMenu as ContextMenuPrimitive } from "radix-ui";
import { EllipsisVertical, ExternalLink, Link2, MessageCircle, Paperclip, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";
import { AvatarStack, ChecklistCount, DueChip, LabelChips, PriorityPill, initials } from "../primitives";
import { formatShortDate } from "../../_lib/format";
import type { TicketCard as TicketCardData } from "../../_lib/types";

export const HOVER_PREVIEW_DELAY_MS = 300;

export interface CardPresence {
  kind: "editing" | "moving";
  userName: string;
}

export interface TicketCardProps extends HTMLAttributes<HTMLDivElement> {
  card: TicketCardData;
  /** Query string (no "?") carried to the detail URL so back and J/K keep the source order. */
  query?: string;
  /** Delete is offered only when true (admin-only, see header). */
  canDelete?: boolean;
  onDelete?: (card: TicketCardData) => void;
  presence?: CardPresence | null;
  isDragging?: boolean;
}

/** Elements inside the card whose clicks must not open the ticket (W41). */
const INTERACTIVE = "button, a, input, textarea, select, [role='menu'], [role='menuitem'], [data-card-menu]";

export function ticketHref(id: number, query?: string): string {
  return query ? `/tickets/${id}?${query}` : `/tickets/${id}`;
}

function isCoarsePointer(): boolean {
  try {
    return typeof window !== "undefined" && !!window.matchMedia?.("(pointer: coarse)").matches;
  } catch {
    return false;
  }
}

const MENU_CONTENT =
  "z-50 min-w-[160px] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-popover-sm";
const MENU_ITEM =
  "relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-[13px] outline-hidden focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:size-3.5 [&_svg]:shrink-0 [&_svg]:text-muted-foreground";

export const TicketCard = forwardRef<HTMLDivElement, TicketCardProps>(function TicketCard(
  { card, query, canDelete = false, onDelete, presence, isDragging = false, className, onClick, onKeyDown, ...rest },
  ref,
) {
  const t = useTranslations("ticketsScreen.card");
  const tToasts = useTranslations("tickets.toasts");
  const tPresence = useTranslations("tickets.presence");
  const locale = useLocale();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const href = ticketHref(card.id, query);

  const open = useCallback(() => router.push(href), [router, href]);

  const copyLink = useCallback(async () => {
    const url = typeof window !== "undefined" ? `${window.location.origin}/tickets/${card.id}` : `/tickets/${card.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(tToasts("linkCopied"));
    } catch {
      toast.error(tToasts("saveError"));
    }
  }, [card.id, tToasts]);

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || e.button !== 0) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest(INTERACTIVE) && target.closest(INTERACTIVE) !== e.currentTarget) return;
    if (e.metaKey || e.ctrlKey) {
      window.open(href, "_blank", "noopener");
      return;
    }
    open();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented || e.target !== e.currentTarget) return;
    if ((e.shiftKey && e.key === "F10") || e.key === "ContextMenu") {
      e.preventDefault();
      setMenuOpen(true);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      open();
    }
  };

  const assignees = card.assignees ?? [];
  const presenceLabel = presence
    ? tPresence(presence.kind === "editing" ? "editing" : "moving", { name: presence.userName })
    : null;

  const items = (Item: typeof DropdownMenuItem | typeof ContextMenuPrimitive.Item, Separator: typeof DropdownMenuSeparator | typeof ContextMenuPrimitive.Separator) => (
    <>
      <Item className={MENU_ITEM} onSelect={open} data-testid="card-menu-open">
        <ExternalLink aria-hidden="true" />
        {t("open")}
      </Item>
      <Item className={MENU_ITEM} onSelect={() => void copyLink()} data-testid="card-menu-copy">
        <Link2 aria-hidden="true" />
        {t("copyLink")}
      </Item>
      {canDelete && (
        <>
          <Separator className="-mx-1 my-1 h-px bg-border" />
          <Item
            className={cn(MENU_ITEM, "text-destructive focus:bg-destructive/10 focus:text-destructive [&_svg]:text-destructive")}
            onSelect={() => onDelete?.(card)}
            data-testid="card-menu-delete"
          >
            <Trash2 aria-hidden="true" />
            {t("delete")}
          </Item>
        </>
      )}
    </>
  );

  const body = (
    <div
      ref={ref}
      {...rest}
      data-testid="ticket-card"
      data-ticket-id={card.id}
      data-presence={presence?.kind}
      data-dragging={isDragging ? "true" : undefined}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        "group/card relative flex cursor-grab flex-col gap-1.5 rounded-md border bg-card px-2.5 py-2 text-left outline-none",
        "transition-[box-shadow,opacity] duration-150 hover:shadow-[0_1px_3px_rgb(0_0_0/.08),0_4px_10px_rgb(0_0_0/.06)]",
        "focus-visible:ring-2 focus-visible:ring-ring/50",
        isDragging && "cursor-grabbing shadow-[0_4px_12px_rgb(0_0_0/.12),0_8px_24px_rgb(0_0_0/.10)]",
        presence && "border-amber-400/70",
        className,
      )}
    >
      {/* Row 1 */}
      <div className={cn("flex min-w-0 flex-wrap items-center gap-1.5", presence ? "pr-12" : "pr-5")}>
        <span className="font-mono text-[11px] text-muted-foreground">#{card.id}</span>
        <PriorityPill priority={card.priority} />
        <LabelChips labels={card.tags ?? []} max={3} />
      </div>

      {/* Row 2 */}
      {card.description_preview ? (
        <HoverCard openDelay={HOVER_PREVIEW_DELAY_MS} closeDelay={0} open={isDragging ? false : undefined}>
          <HoverCardTrigger asChild>
            <p className="line-clamp-2 break-words text-[13px] font-medium leading-[18px]" data-testid="card-title">
              {card.title}
            </p>
          </HoverCardTrigger>
          <HoverCardContent
            side="right"
            align="start"
            className="w-72 p-3 text-[12px] leading-[18px] text-muted-foreground shadow-popover-sm"
            data-testid="card-preview"
          >
            <p className="mb-1 text-[13px] font-medium text-foreground">{card.title}</p>
            <p className="line-clamp-6 whitespace-pre-line break-words">{card.description_preview}</p>
          </HoverCardContent>
        </HoverCard>
      ) : (
        <p className="line-clamp-2 break-words text-[13px] font-medium leading-[18px]" data-testid="card-title">
          {card.title}
        </p>
      )}

      {/* Row 3 */}
      <div className="flex min-h-5 flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-muted-foreground">
        <AvatarStack users={assignees} size={20} max={3} ringColor="card" emptyLabel={t("unassigned")} />
        <DueChip date={card.due_date} overdue={!!card.is_overdue_task} compact />
        <ChecklistCount done={card.completed_checklist_items_count ?? 0} total={card.checklist_items_count ?? 0} />
        <span className="ml-auto inline-flex items-center gap-2.5">
          <span
            className="inline-flex items-center gap-[3px] tabular-nums"
            data-testid="card-comments"
            aria-label={t("comments", { count: card.comments_count ?? 0 })}
            title={t("comments", { count: card.comments_count ?? 0 })}
          >
            <MessageCircle aria-hidden="true" size={12} />
            <span aria-hidden="true">{card.comments_count ?? 0}</span>
          </span>
          {(card.attachments_count ?? 0) > 0 && (
            <span
              className="inline-flex items-center gap-[3px] tabular-nums"
              data-testid="card-attachments"
              aria-label={t("attachments", { count: card.attachments_count })}
              title={t("attachments", { count: card.attachments_count })}
            >
              <Paperclip aria-hidden="true" size={12} />
              <span aria-hidden="true">{card.attachments_count}</span>
            </span>
          )}
          <span className="tabular-nums" data-testid="card-date">
            {formatShortDate(card.created_at, locale)}
          </span>
        </span>
      </div>

      {/* ⋮ actions */}
      <div className="absolute right-1 top-1" data-card-menu>
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen} modal={false}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={t("actions")}
              data-testid="card-menu-trigger"
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "inline-flex size-6 items-center justify-center rounded text-muted-foreground transition-opacity",
                "hover:bg-muted hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                "opacity-0 group-hover/card:opacity-100 group-focus-within/card:opacity-100 data-[state=open]:opacity-100 data-[state=open]:bg-muted",
                "[@media(hover:none)]:opacity-100",
              )}
            >
              <EllipsisVertical aria-hidden="true" size={14} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className={MENU_CONTENT} onClick={(e) => e.stopPropagation()}>
            {items(DropdownMenuItem, DropdownMenuSeparator)}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {presence && presenceLabel && (
        <span
          role="img"
          aria-label={presenceLabel}
          title={presenceLabel}
          data-testid="card-presence"
          className="absolute right-8 top-[7px] flex size-[18px] items-center justify-center rounded-full bg-amber-100 text-[8px] font-semibold text-amber-900 ring-2 ring-amber-400 dark:bg-amber-900 dark:text-amber-50"
        >
          {initials(presence.userName)}
        </span>
      )}
    </div>
  );

  return (
    <ContextMenuPrimitive.Root modal={false}>
      <ContextMenuPrimitive.Trigger asChild disabled={isDragging || isCoarsePointer()}>
        {body}
      </ContextMenuPrimitive.Trigger>
      <ContextMenuPrimitive.Portal>
        <ContextMenuPrimitive.Content
          className={MENU_CONTENT}
          data-testid="card-context-menu"
          onClick={(e) => e.stopPropagation()}
        >
          {items(ContextMenuPrimitive.Item, ContextMenuPrimitive.Separator)}
        </ContextMenuPrimitive.Content>
      </ContextMenuPrimitive.Portal>
    </ContextMenuPrimitive.Root>
  );
});
